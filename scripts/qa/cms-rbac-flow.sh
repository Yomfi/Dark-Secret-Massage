#!/usr/bin/env bash
# Authenticated CMS/RBAC flow against a local PHP API + MySQL scratch DB.
# Requires: DS_API_BASE (default http://127.0.0.1:8088/api), cookie jar dir.
set -euo pipefail

API="${DS_API_BASE:-http://127.0.0.1:8088/api}"
JAR_DIR="${DS_QA_JAR_DIR:-/tmp/ds-qa/jars-rbac}"
OUT_DIR="${DS_QA_OUT:-/tmp/ds-qa/rbac}"
PASS="${DS_QA_PASSWORD:-CmsRbacTestPass9!}"
mkdir -p "$JAR_DIR" "$OUT_DIR"

json() { python3 -c 'import json,sys; print(json.load(sys.stdin))' 2>/dev/null || cat; }

req() {
  local method=$1 path=$2 jar=$3 data=${4:-} extra=${5:-}
  local args=(-sS -c "$jar" -b "$jar" -X "$method" -H 'Content-Type: application/json' -H "Origin: http://127.0.0.1:8088")
  if [[ -n "$data" ]]; then
    args+=(-d "$data")
  fi
  # shellcheck disable=SC2086
  curl "${args[@]}" $extra "$API$path"
}

login() {
  local email=$1 jar=$2
  req POST /auth/login.php "$jar" "{\"identifier\":\"$email\",\"password\":\"$PASS\"}" >"$OUT_DIR/login-$(basename "$jar").json"
  python3 - <<PY
import json
d=json.load(open("$OUT_DIR/login-$(basename "$jar").json"))
assert d.get("success"), d
print(d["data"]["user"]["role"], d["data"]["user"].get("staffRole"), d["data"]["user"].get("permissions", [])[:3])
PY
}

echo "== seed via PHP =="
php scripts/qa/seed-local-accounts.php --local-only --password="$PASS" | tee "$OUT_DIR/seed.txt"

ADMIN_JAR="$JAR_DIR/admin.txt"
EDITOR_JAR="$JAR_DIR/editor.txt"
OPS_JAR="$JAR_DIR/ops.txt"
rm -f "$JAR_DIR"/*.txt

echo "== admin login =="
login qa-admin@local.test "$ADMIN_JAR"

echo "== staff invite content_editor =="
INVITE_EMAIL="qa-editor-$(date +%s)@local.test"
req POST /admin/staff.php "$ADMIN_JAR" "{\"action\":\"invite\",\"email\":\"$INVITE_EMAIL\",\"firstName\":\"Edit\",\"lastName\":\"Or\",\"staffRole\":\"content_editor\"}" | tee "$OUT_DIR/invite-editor.json"
python3 - <<PY
import json
d=json.load(open("$OUT_DIR/invite-editor.json"))
assert d.get("success"), d
print("invited", d["data"]["userId"], d["data"]["staffRole"])
PY

# Accept invite using token from staff_invitations via DB helper
TOKEN=$(php -r '
require "public/api/config/bootstrap.php";
$row = ds_pdo()->query("SELECT id, email FROM staff_invitations WHERE accepted_at IS NULL ORDER BY created_at DESC LIMIT 1")->fetch();
if (!$row) { fwrite(STDERR, "no invite\n"); exit(1); }
# Token is hashed; recreate by issuing a known token for test
$raw = bin2hex(random_bytes(32));
$hash = hash("sha256", $raw);
ds_pdo()->prepare("UPDATE staff_invitations SET token_hash=? WHERE id=?")->execute([$hash, $row["id"]]);
echo $raw;
')
req POST /auth/accept-staff-invite.php "$EDITOR_JAR" "{\"token\":\"$TOKEN\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\"}" | tee "$OUT_DIR/accept-editor.json"
python3 - <<PY
import json
d=json.load(open("$OUT_DIR/accept-editor.json"))
assert d.get("success"), d
u=d["data"]["user"]
assert u.get("isStaff") or u.get("staffRole")=="content_editor", u
print("accepted", u.get("staffRole"), "perms", len(u.get("permissions") or []))
PY

echo "== content_editor can content, cannot staff.write =="
req GET /admin/content.php "$EDITOR_JAR" | tee "$OUT_DIR/editor-content.json" >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/ds-qa/rbac/editor-content.json"))
assert d.get("success"), d
print("content ok", len(d["data"].get("pages",[])))
PY
CODE=$(curl -sS -o "$OUT_DIR/editor-staff.json" -w "%{http_code}" -c "$EDITOR_JAR" -b "$EDITOR_JAR" -X POST -H 'Content-Type: application/json' -H 'Origin: http://127.0.0.1:8088' -d '{"action":"invite","email":"x@local.test","staffRole":"support"}' "$API/admin/staff.php")
echo "editor staff.write http=$CODE"
python3 - <<PY
import json
d=json.load(open("$OUT_DIR/editor-staff.json"))
assert not d.get("success"), d
assert d["error"]["code"] in ("FORBIDDEN","VALIDATION_ERROR"), d
print("blocked", d["error"]["code"])
PY

echo "== invite booking_ops =="
OPS_EMAIL="qa-ops-$(date +%s)@local.test"
req POST /admin/staff.php "$ADMIN_JAR" "{\"action\":\"invite\",\"email\":\"$OPS_EMAIL\",\"firstName\":\"Book\",\"lastName\":\"Ops\",\"staffRole\":\"booking_ops\"}" | tee "$OUT_DIR/invite-ops.json" >/dev/null
TOKEN2=$(php -r '
require "public/api/config/bootstrap.php";
$row = ds_pdo()->query("SELECT id FROM staff_invitations WHERE accepted_at IS NULL ORDER BY created_at DESC LIMIT 1")->fetch();
$raw = bin2hex(random_bytes(32));
ds_pdo()->prepare("UPDATE staff_invitations SET token_hash=? WHERE id=?")->execute([hash("sha256", $raw), $row["id"]]);
echo $raw;
')
req POST /auth/accept-staff-invite.php "$OPS_JAR" "{\"token\":\"$TOKEN2\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\"}" | tee "$OUT_DIR/accept-ops.json" >/dev/null
CODE=$(curl -sS -o "$OUT_DIR/ops-reviews.json" -w "%{http_code}" -c "$OPS_JAR" -b "$OPS_JAR" "$API/admin/provider-reviews.php")
echo "ops reviews http=$CODE"
python3 - <<PY
import json
d=json.load(open("$OUT_DIR/ops-reviews.json"))
assert not d.get("success"), d
print("ops blocked reviews", d["error"]["code"])
PY
req GET /admin/bookings.php "$OPS_JAR" | tee "$OUT_DIR/ops-bookings.json" >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/ds-qa/rbac/ops-bookings.json"))
assert d.get("success"), d
print("ops bookings ok", d["data"].get("total"))
PY

echo "== last-admin protection =="
ADMIN_ID=$(php -r 'require "public/api/config/bootstrap.php"; echo ds_pdo()->query("SELECT id FROM users WHERE email=\"qa-admin@local.test\"")->fetch()["id"];')
# Make qa-admin the sole active full_admin (demote other admins in DB for the test).
php -r '
require "public/api/config/bootstrap.php";
$pdo = ds_pdo();
$now = ds_now_sql();
$adminId = $pdo->query("SELECT id FROM users WHERE email=\"qa-admin@local.test\"")->fetch()["id"];
$pdo->prepare("INSERT INTO staff_profiles (user_id, staff_role, is_active, created_at, updated_at) VALUES (?,?,1,?,?) ON DUPLICATE KEY UPDATE staff_role=\"full_admin\", is_active=1, updated_at=VALUES(updated_at)")->execute([$adminId,"full_admin",$now,$now]);
foreach ($pdo->query("SELECT id FROM users WHERE role=\"admin\" AND id <> ".$pdo->quote($adminId))->fetchAll() as $row) {
    $pdo->prepare("INSERT INTO staff_profiles (user_id, staff_role, is_active, created_at, updated_at) VALUES (?,?,0,?,?) ON DUPLICATE KEY UPDATE staff_role=\"support\", is_active=0, updated_at=VALUES(updated_at)")->execute([$row["id"],"support",$now,$now]);
    $pdo->prepare("UPDATE users SET role=\"support_admin\", updated_at=? WHERE id=?")->execute([$now, $row["id"]]);
}
echo ds_count_active_full_admins();
'
# Try self-deactivate
req POST /admin/staff.php "$ADMIN_JAR" "{\"action\":\"deactivate\",\"userId\":\"$ADMIN_ID\"}" | tee "$OUT_DIR/self-deact.json"
python3 - <<'PY'
import json
d=json.load(open("/tmp/ds-qa/rbac/self-deact.json"))
assert not d.get("success"), d
assert d["error"]["code"] == "SELF_LOCKOUT", d
print("self-deact blocked", d["error"]["code"])
PY
# Sole full_admin cannot demote self
req POST /admin/staff.php "$ADMIN_JAR" "{\"action\":\"set_role\",\"userId\":\"$ADMIN_ID\",\"staffRole\":\"support\"}" | tee "$OUT_DIR/self-demote.json"
python3 - <<'PY'
import json
d=json.load(open("/tmp/ds-qa/rbac/self-demote.json"))
assert not d.get("success"), d
assert d["error"]["code"] == "LAST_ADMIN", d
print("self-demote blocked", d["error"]["code"])
PY

echo "== announcements =="
req POST /admin/announcements.php "$ADMIN_JAR" '{"action":"save","title":"Studio hours update","bodyHtml":"<p>Open Saturdays.</p>"}' | tee "$OUT_DIR/ann-save.json"
ANN_ID=$(python3 -c 'import json; print(json.load(open("/tmp/ds-qa/rbac/ann-save.json"))["data"]["id"])')
req POST /admin/announcements.php "$ADMIN_JAR" "{\"action\":\"publish\",\"id\":\"$ANN_ID\"}" | tee "$OUT_DIR/ann-pub.json"
curl -sS "$API/public/content.php" | tee "$OUT_DIR/public-content.json" >/dev/null
python3 - <<PY
import json
d=json.load(open("$OUT_DIR/public-content.json"))
assert d.get("success"), d
titles=[a["title"] for a in d["data"].get("announcements",[])]
assert "Studio hours update" in titles, titles
print("public announcement ok")
PY

echo "== customer notes + privacy =="
CUST_ID=$(php -r 'require "public/api/config/bootstrap.php"; echo ds_pdo()->query("SELECT id FROM users WHERE email=\"qa-customer@local.test\"")->fetch()["id"];')
req POST /admin/customers.php "$ADMIN_JAR" "{\"action\":\"add_note\",\"userId\":\"$CUST_ID\",\"body\":\"Called about reschedule preference.\"}" | tee "$OUT_DIR/note.json"
req POST /admin/customers.php "$ADMIN_JAR" "{\"action\":\"privacy_request\",\"userId\":\"$CUST_ID\",\"requestType\":\"export\",\"notes\":\"Customer asked for copy of bookings.\"}" | tee "$OUT_DIR/privacy.json"
req GET "/admin/customers.php?id=$CUST_ID" "$ADMIN_JAR" | tee "$OUT_DIR/customer-detail.json" >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/ds-qa/rbac/customer-detail.json"))
assert d.get("success"), d
assert len(d["data"]["notes"])>=1
assert len(d["data"]["privacyRequests"])>=1
print("notes", len(d["data"]["notes"]), "privacy", len(d["data"]["privacyRequests"]))
PY

echo "== media alt text =="
# create tiny png
PNG=/tmp/ds-qa/tiny.png
python3 - <<'PY'
import struct,zlib
def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
raw=b'\x00'+b'\x00\x00\x00'+b'\x00'
open('/tmp/ds-qa/tiny.png','wb').write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
PY
curl -sS -c "$ADMIN_JAR" -b "$ADMIN_JAR" -H 'Origin: http://127.0.0.1:8088' -F "file=@$PNG" "$API/admin/media.php" | tee "$OUT_DIR/media-up.json"
MEDIA_ID=$(python3 -c 'import json; print(json.load(open("/tmp/ds-qa/rbac/media-up.json"))["data"]["id"])')
curl -sS -c "$ADMIN_JAR" -b "$ADMIN_JAR" -X PATCH -H 'Content-Type: application/json' -H 'Origin: http://127.0.0.1:8088' -d "{\"id\":\"$MEDIA_ID\",\"altText\":\"Gold studio mark\"}" "$API/admin/media.php" | tee "$OUT_DIR/media-alt.json"
python3 - <<'PY'
import json
d=json.load(open("/tmp/ds-qa/rbac/media-alt.json"))
assert d.get("success"), d
assert d["data"]["altText"]=="Gold studio mark"
print("media alt ok")
PY

echo "RBAC_FLOW_OK"

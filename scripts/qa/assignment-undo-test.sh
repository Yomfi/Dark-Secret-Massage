#!/usr/bin/env bash
# Assignment lifecycle + safe undo/redo verification (local QA fixtures only).
# Usage: API=http://127.0.0.1:8791 ./scripts/qa/assignment-undo-test.sh
set -euo pipefail

API="${API:-http://127.0.0.1:8791}"
ORIGIN="${ORIGIN:-$API}"
ADMIN_EMAIL="${ADMIN_EMAIL:-qa-admin@local.test}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ReviewQA!2026}"
CUSTOMER_EMAIL="${CUSTOMER_EMAIL:-qa-customer@local.test}"
CUSTOMER_PASSWORD="${CUSTOMER_PASSWORD:-CustomerQA!2026}"
JAR="$(mktemp)"
CUSTOMER_JAR="$(mktemp)"
trap 'rm -f "$JAR" "$CUSTOMER_JAR"' EXIT

pass=0
fail=0
check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ok   $label ($actual)"
    pass=$((pass + 1))
  else
    echo "  FAIL $label (expected $expected, got $actual)"
    [ -f /tmp/qa-body.json ] && echo "       body: $(head -c 240 /tmp/qa-body.json)"
    fail=$((fail + 1))
  fi
}

post() {
  local jar="$1" path="$2" body="$3"
  curl -sS -o /tmp/qa-body.json -w '%{http_code}' -b "$jar" -c "$jar" \
    -H 'Content-Type: application/json' -H "Origin: $ORIGIN" \
    --data-binary "$body" "$API$path"
}

field() {
  python3 -c "import json,sys;d=json.load(open('/tmp/qa-body.json'));print(eval(sys.argv[1]))" "$1" 2>/dev/null || true
}

db_scalar() {
  php -r 'require "public/api/config/bootstrap.php"; $id=trim(stream_get_contents(STDIN)); echo ds_pdo()->query("SELECT " . $argv[1] . " FROM provider_assignments WHERE id=" . ds_pdo()->quote($id))->fetchColumn();' "$1" <<< "$2"
}

db_count() {
  php -r 'require "public/api/config/bootstrap.php"; echo (int) ds_pdo()->query("SELECT COUNT(*) FROM " . $argv[1])->fetchColumn();' "$1"
}

login_body=$(printf '{"identifier":"%s","email":"%s","password":"%s"}' "$ADMIN_EMAIL" "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
staff_login=$(post "$JAR" /api/auth/login.php "$login_body")
if [ "$staff_login" != "200" ]; then
  echo "Cannot sign in as QA admin ($staff_login)."
  exit 1
fi

customer_id=$(php -r 'require "public/api/config/bootstrap.php"; echo ds_pdo()->query("SELECT id FROM users WHERE email=" . ds_pdo()->quote($argv[1]))->fetchColumn();' "$CUSTOMER_EMAIL")
providers=$(php -r 'require "public/api/config/bootstrap.php"; require "public/api/config/assignments.php"; foreach (ds_pdo()->query("SELECT p.id FROM provider_profiles p JOIN users u ON CAST(u.id AS BINARY)=CAST(p.user_id AS BINARY) WHERE u.account_status=\"active\" AND p.removed_at IS NULL ORDER BY p.created_at ASC") as $r) { $e=ds_assignment_provider_eligible((string) $r["id"]); if (!empty($e["ok"])) { echo $r["id"], "\n"; } }' | head -3)
provider_a=$(echo "$providers" | sed -n '1p')
provider_b=$(echo "$providers" | sed -n '2p')
if [ -z "$customer_id" ] || [ -z "$provider_a" ] || [ -z "$provider_b" ]; then
  echo "Missing QA fixtures (customer='$customer_id', providers='$provider_a'/'$provider_b')."
  exit 1
fi
bookings_before=$(db_count bookings)
payments_before=$(db_count provider_verification_payments)

echo "Assignment create + undo/redo"
create_body=$(printf '{"action":"create","customerUserId":"%s","providerProfileId":"%s","reason":"QA lifecycle verification"}' "$customer_id" "$provider_a")
check "create returns 200" 200 "$(post "$JAR" /api/admin/assignments.php "$create_body")"
assignment_id=$(field "d['data']['assignment']['id']")
create_undo=$(field "d['data']['undoActionId']")
check "create returns undoActionId" "yes" "$([ -n "$create_undo" ] && echo yes || echo no)"
check "created status is proposed" "proposed" "$(field "d['data']['assignment']['status']")"

undo_body=$(printf '{"actionId":"%s","mode":"undo"}' "$create_undo")
check "undo create returns 200" 200 "$(post "$JAR" /api/admin/actions.php "$undo_body")"
check "undo create preserves provider" "$provider_a" "$(db_scalar provider_profile_id "$assignment_id")"
check "undo create sets cancelled" "cancelled" "$(db_scalar status "$assignment_id")"
check "second undo is refused" 409 "$(post "$JAR" /api/admin/actions.php "$undo_body")"
redo_body=$(printf '{"actionId":"%s","mode":"redo"}' "$create_undo")
check "redo create returns 200" 200 "$(post "$JAR" /api/admin/actions.php "$redo_body")"
check "redo restores proposed" "proposed" "$(db_scalar status "$assignment_id")"

echo "Reassign + status undo"
reassign_body=$(printf '{"action":"reassign","assignmentId":"%s","providerProfileId":"%s","note":"QA reassignment"}' "$assignment_id" "$provider_b")
check "reassign returns 200" 200 "$(post "$JAR" /api/admin/assignments.php "$reassign_body")"
reassign_undo=$(field "d['data']['undoActionId']")
check "reassign changes provider" "$provider_b" "$(field "d['data']['assignment']['providerProfileId']")"
accept_body=$(printf '{"action":"update_status","assignmentId":"%s","status":"accepted","note":"QA accept"}' "$assignment_id")
check "accept returns 200" 200 "$(post "$JAR" /api/admin/assignments.php "$accept_body")"
status_undo=$(field "d['data']['undoActionId']")
check "status change returns undoActionId" "yes" "$([ -n "$status_undo" ] && echo yes || echo no)"
status_undo_body=$(printf '{"actionId":"%s","mode":"undo"}' "$status_undo")
check "undo accept returns 200" 200 "$(post "$JAR" /api/admin/actions.php "$status_undo_body")"
check "undo accept restores proposed" "proposed" "$(db_scalar status "$assignment_id")"
cancel_no_note=$(printf '{"action":"cancel","assignmentId":"%s","note":""}' "$assignment_id")
check "cancel requires a reason" 400 "$(post "$JAR" /api/admin/assignments.php "$cancel_no_note")"

echo "Workflow guards"
check "accept again" 200 "$(post "$JAR" /api/admin/assignments.php "$accept_body")"
complete_body=$(printf '{"action":"update_status","assignmentId":"%s","status":"completed","note":"QA complete"}' "$assignment_id")
check "complete returns 200" 200 "$(post "$JAR" /api/admin/assignments.php "$complete_body")"
check "completed cannot be cancelled" 409 "$(post "$JAR" /api/admin/assignments.php "$cancel_no_note")"
stale_body=$(printf '{"actionId":"%s","mode":"undo"}' "$reassign_undo")
check "stale undo is refused after later edits" 409 "$(post "$JAR" /api/admin/actions.php "$stale_body")"
check "detail returns event history" "yes" "$(curl -sS -b "$JAR" -H "Origin: $ORIGIN" "$API/api/admin/assignments.php?id=$assignment_id" | python3 -c "import json,sys;d=json.load(sys.stdin);print('yes' if len(d['data']['events'])>0 else 'no')")"
check "assignment created no booking" "$bookings_before" "$(db_count bookings)"
check "assignment created no payment" "$payments_before" "$(db_count provider_verification_payments)"

echo "Permissions"
customer_login_body=$(printf '{"identifier":"%s","email":"%s","password":"%s"}' "$CUSTOMER_EMAIL" "$CUSTOMER_EMAIL" "$CUSTOMER_PASSWORD")
customer_login=$(post "$CUSTOMER_JAR" /api/auth/login.php "$customer_login_body")
if [ "$customer_login" = "200" ]; then
  check "customer cannot read assignments" 403 "$(curl -sS -o /dev/null -w '%{http_code}' -b "$CUSTOMER_JAR" -H "Origin: $ORIGIN" "$API/api/admin/assignments.php")"
  check "customer cannot undo" 403 "$(post "$CUSTOMER_JAR" /api/admin/actions.php "$stale_body")"
else
  echo "  skip customer permission checks (login $customer_login)"
fi
check "anonymous cannot read assignments" 401 "$(curl -sS -o /dev/null -w '%{http_code}' -H "Origin: $ORIGIN" "$API/api/admin/assignments.php")"
cross_body='{"action":"create"}'
check "cross-origin write is refused" 403 "$(curl -sS -o /dev/null -w '%{http_code}' -b "$JAR" -H 'Content-Type: application/json' -H 'Origin: https://evil.example' --data-binary "$cross_body" "$API/api/admin/assignments.php")"

echo "Passed: $pass  Failed: $fail"
[ "$fail" -eq 0 ]

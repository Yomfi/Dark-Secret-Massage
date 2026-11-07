#!/usr/bin/env bash
# Provider review state machine — authenticated end-to-end test.
#
# Usage:
#   DS_QA_ADMIN_PASSWORD='...' scripts/qa/provider-review-state-test.sh [base-url] [admin-email]
#
# Requires the disposable fixture account qa-review-fixture@local.test (created by
# the local QA seed). It never touches real accounts and changes only that fixture.
set -euo pipefail

BASE="${1:-http://127.0.0.1:8791}"
ADMIN_EMAIL="${2:-qa-admin@local.test}"
ADMIN_PASSWORD="${DS_QA_ADMIN_PASSWORD:?Set DS_QA_ADMIN_PASSWORD to the local QA admin password}"
FIXTURE_EMAIL="qa-review-fixture@local.test"
PHP_BIN="${PHP_BIN:-php}"
COOKIE="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$COOKIE" "$BODY"' EXIT

PROVIDER_ID="$("$PHP_BIN" -r 'require "public/api/config/bootstrap.php"; $s=ds_pdo()->prepare("SELECT id FROM users WHERE email = ?"); $s->execute([getenv("FIXTURE_EMAIL") ?: "qa-review-fixture@local.test"]); echo (string)$s->fetchColumn();')"
[ -n "$PROVIDER_ID" ] || { echo "FAIL fixture account missing"; exit 1; }

login_code="$(curl -s -o "$BODY" -w '%{http_code}' -c "$COOKIE" \
  -H 'Content-Type: application/json' -H "Origin: $BASE" \
  -d "{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  "$BASE/api/auth/login.php")"
[ "$login_code" = "200" ] || { echo "FAIL login HTTP $login_code: $(cat "$BODY")"; exit 1; }
echo "PASS login"

api() {
  local action="$1" reason="${2:-}"
  curl -s -o "$BODY" -w '%{http_code}' -b "$COOKIE" \
    -H 'Content-Type: application/json' -H "Origin: $BASE" \
    -d "{\"providerUserId\":\"$PROVIDER_ID\",\"action\":\"$action\",\"rejectionReason\":\"$reason\"}" \
    "$BASE/api/admin/provider-reviews.php"
}

expect() {
  local label="$1" want="$2" got="$3"
  if [ "$got" != "$want" ]; then
    echo "FAIL $label: expected HTTP $want, got $got — $(cat "$BODY")"
    exit 1
  fi
  echo "PASS $label"
}

json() { python3 -c "import sys,json; d=json.load(open('$BODY')); print($1)"; }

# Normalise to a decided state whether the fixture starts pending or decided.
api reopen "QA test normalise" >/dev/null || true

expect "approve" 200 "$(api approve 'QA state test')"
[ "$(json 'd["data"]["verificationStatus"]')" = "verified" ] || { echo "FAIL approve status"; exit 1; }
echo "PASS approve transitions to verified"

expect "duplicate approve rejected" 409 "$(api approve)"
[ "$(json 'd["error"]["code"]')" = "INVALID_REVIEW_STATE" ] || { echo "FAIL duplicate code"; exit 1; }
echo "PASS duplicate decision returns INVALID_REVIEW_STATE"

expect "reject without reason" 400 "$(api reject)"
[ "$(json 'd["error"]["code"]')" = "REASON_REQUIRED" ] || { echo "FAIL reason code"; exit 1; }
echo "PASS reject requires a reason"

expect "reopen decided application" 200 "$(api reopen 'QA state test reopen')"
expect "request changes" 200 "$(api request_changes 'Add clearer identity documents')"
[ "$(json 'd["data"]["verificationStatus"]')" = "changes_requested" ] || { echo "FAIL changes status"; exit 1; }
echo "PASS request changes"

expect "reject with reason" 200 "$(api reject 'Documents do not match the profile')"
[ "$(json 'd["data"]["verificationStatus"]')" = "rejected" ] || { echo "FAIL reject status"; exit 1; }
echo "PASS reject with reason"

pending_count="$(curl -s -b "$COOKIE" "$BASE/api/admin/provider-reviews.php?scope=pending" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for r in d['data']['pending'] if r['email']=='$FIXTURE_EMAIL'))")"
[ "$pending_count" = "0" ] || { echo "FAIL decided fixture still pending"; exit 1; }
echo "PASS decided application leaves the pending queue"

echo "REVIEW_STATE_OK"

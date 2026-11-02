#!/usr/bin/env bash
# Authenticated four-role flow against a local MySQL instance.
# JSON is written to files so shell quoting can never corrupt a body.
set -u

BASE="${BASE:-http://127.0.0.1:8791}"
J="${J:-/tmp/ds-qa/jars3}"
SEED="${SEED:-/tmp/ds-qa/seed.json}"
PW=$(php -r 'echo json_decode(file_get_contents($argv[1]),true)["password"]??"";' "$SEED")
mkdir -p "$J"
rm -f "$J"/*

json() { php -r '$f=$argv[1]; $i=$argv[2]??null; $d=json_decode(file_get_contents($f),true); echo $i===null?json_encode($d):($d[$i]??"");' "$SEED" "$1"; }
body() { python3 -c 'import json,sys; json.dump(json.loads(sys.argv[1]), open(sys.argv[2],"w"))' "$1" "$2"; }
code() { curl -s -o "$3" -w '%{http_code}' -b "$J/$1" -H 'Content-Type: application/json' -H "Origin: $BASE" -d @"$4" "$BASE/api/$2"; }
login() { body "{\"identifier\":\"$2\",\"password\":\"$PW\"}" /tmp/ds-qa/login.json; curl -s -c "$J/$1" -H 'Content-Type: application/json' -d @/tmp/ds-qa/login.json "$BASE/api/auth/login.php" > /tmp/ds-qa/login-out.json; }

login admin qa-admin@local.test
login cust qa-customer@local.test
login cust2 qa-customer2@local.test
login ind qa-individual@local.test
login agency qa-agency@local.test

echo "admin_role=$(php -r '$d=json_decode(file_get_contents("/tmp/ds-qa/login-out.json"),true); echo $d["data"]["user"]["role"]??"FAIL";')"
DATE=$(php -r '$d=json_decode(file_get_contents("/tmp/ds-qa/r2.json"),true); echo substr($d["data"]["scheduledAt"],0,10);')
BOOKING=$(php -r '$d=json_decode(file_get_contents("/tmp/ds-qa/r2.json"),true); echo $d["data"]["bookingId"];')
IND=$(json individual); AGENCY=$(json agencyProfile); TEAM=$(json teamMember)
echo "booking=$BOOKING date=$DATE"

# 1. Admin creates a studio service and it appears publicly.
body '{"name":"QA Release Massage","description":"Created by release verification","durationMinutes":60,"price":275,"active":true}' /tmp/ds-qa/b.json
echo "service_create=$(code admin admin/services.php /tmp/ds-qa/svc.json /tmp/ds-qa/b.json)"
echo "public_has_service=$(curl -s "$BASE/api/public/content.php" | grep -c 'QA Release Massage')"

# 2. Provider saves a working pattern, admin publishes, public lists it.
body '{"providerType":"individual","gender":"female","displayName":"Esi Mensah","city":"Accra","region":"Greater Accra","country":"Ghana","about":"Local verification provider","workingDays":"Mon-Sat","workingHours":"09:00-17:00","services":[],"serviceSetting":["studio"]}' /tmp/ds-qa/b.json
echo "provider_profile=$(code ind provider/profile.php /tmp/ds-qa/prof.json /tmp/ds-qa/b.json)"
body "{\"providerUserId\":\"$IND\",\"action\":\"publish\"}" /tmp/ds-qa/b.json
echo "provider_publish=$(code admin admin/providers.php /tmp/ds-qa/pub.json /tmp/ds-qa/b.json)"
echo "public_provider_visible=$(curl -s "$BASE/api/public/providers.php" | grep -c 'Esi Mensah')"

# 3. Persistence + reschedule.
echo "customer_list_has_booking=$(curl -s -b "$J/cust" "$BASE/api/customer/bookings.php" | grep -c "$BOOKING")"
body "{\"action\":\"reschedule\",\"bookingId\":\"$BOOKING\",\"scheduledAt\":\"${DATE}T00:00:00\",\"timeSlotId\":\"slot-1400\"}" /tmp/ds-qa/b.json
echo "reschedule=$(code cust customer/bookings.php /tmp/ds-qa/rs.json /tmp/ds-qa/b.json)"
echo "reschedule_body=$(head -c 160 /tmp/ds-qa/rs.json)"
echo "rescheduled_slot=$(/opt/homebrew/bin/mysql -uroot -pdsqa ds_qa -N -e "SELECT slot_id FROM bookings WHERE id='$BOOKING'" 2>/dev/null)"

# 4. Cross-account denial.
body "{\"action\":\"cancel\",\"bookingId\":\"$BOOKING\"}" /tmp/ds-qa/b.json
echo "cross_account_cancel=$(code cust2 customer/bookings.php /tmp/ds-qa/x.json /tmp/ds-qa/b.json)"
echo "cross_account_list=$(curl -s -b "$J/cust2" "$BASE/api/customer/bookings.php" | grep -c "$BOOKING")"

# 5. Agency team assignment.
body "{\"action\":\"assign\",\"bookingId\":\"$BOOKING\",\"providerProfileId\":\"$AGENCY\",\"teamMemberId\":\"$TEAM\"}" /tmp/ds-qa/b.json
echo "team_assign=$(code admin admin/bookings.php /tmp/ds-qa/as.json /tmp/ds-qa/b.json)"
echo "team_assign_body=$(head -c 160 /tmp/ds-qa/as.json)"
echo "assigned_row=$(/opt/homebrew/bin/mysql -uroot -pdsqa ds_qa -N -e "SELECT provider_profile_id, team_member_id FROM bookings WHERE id='$BOOKING'" 2>/dev/null | head -1)"

# 6. CMS publish.
body '{"action":"save_page","slug":"qa-release-page","title":"QA Release Page","bodyHtml":"<p>Release body</p>","seoTitle":"QA page title","seoDescription":"QA page description"}' /tmp/ds-qa/b.json
echo "page_save=$(code admin admin/content.php /tmp/ds-qa/pg.json /tmp/ds-qa/b.json)"
PAGEID=$(php -r '$d=json_decode(file_get_contents("/tmp/ds-qa/pg.json"),true); echo $d["data"]["id"]??"";')
body "{\"action\":\"publish_page\",\"id\":\"$PAGEID\"}" /tmp/ds-qa/b.json
echo "page_publish=$(code admin admin/content.php /tmp/ds-qa/pg2.json /tmp/ds-qa/b.json)"
echo "public_page_visible=$(curl -s "$BASE/api/public/content.php" | grep -c 'qa-release-page')"

# 7. Role boundaries.
echo "anon_admin=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/admin/services.php")"
echo "customer_admin=$(curl -s -o /dev/null -w '%{http_code}' -b "$J/cust" "$BASE/api/admin/services.php")"
echo "agency_customer_booking_list=$(curl -s -b "$J/agency" "$BASE/api/customer/bookings.php" | grep -c "$BOOKING")"
echo FLOW_DONE

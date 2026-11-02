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
ADMIN_ROLE=$(php -r '$d=json_decode(file_get_contents("/tmp/ds-qa/login-out.json"),true); echo $d["data"]["user"]["role"]??"FAIL";')
login cust qa-customer@local.test
login cust2 qa-customer2@local.test
login ind qa-individual@local.test
login agency qa-agency@local.test

echo "admin_role=$ADMIN_ROLE"
# A fresh booking owned by the customer session used for ownership checks.
# Pick a real day where both the create and reschedule slots are free, so a
# previous QA run cannot make this run fail for the wrong reason.
DATE=$(php -r '
for ($i = 1; $i <= 21; $i++) {
    $d = date("Y-m-d", strtotime("+{$i} day"));
    $url = "http://127.0.0.1:8791/api/public/availability.php?date={$d}&serviceId=qa-studio-60&durationMinutes=60";
    $j = json_decode((string) @file_get_contents($url), true);
    $ids = array_column($j["data"]["slots"] ?? [], "id");
    if (in_array("slot-0900", $ids, true) && in_array("slot-1400", $ids, true)) { echo $d; break; }
}')
if [ -z "$DATE" ]; then echo "no free QA date found"; exit 1; fi
IND=$(json individual); AGENCY=$(json agencyProfile); TEAM=$(json teamMember)
php -r 'file_put_contents("/tmp/ds-qa/b.json", json_encode(["action"=>"create","serviceId"=>"qa-studio-60","scheduledAt"=>$argv[1]."T00:00:00","timeSlotId"=>"slot-0900","timeSlot"=>"09:00","locationType"=>"studio","customerName"=>"QA Customer","customerPhone"=>"+233200000009"]));' "$DATE"
echo "booking_create=$(code cust customer/bookings.php /tmp/ds-qa/fresh.json /tmp/ds-qa/b.json)"
BOOKING=$(php -r '$d=json_decode(file_get_contents("/tmp/ds-qa/fresh.json"),true); echo $d["data"]["bookingId"]??"";')
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

rm -r ../data/$APPNAME/b_nav_cus/
mkdir ../data/$APPNAME/b_nav_cus/
#mkdir ../data/$APPNAME-ev/sim_responses/
#mkdir ../data/$APPNAME-ev/ev_responses/
node ../node_modules/testcafe/bin/testcafe.js 'chrome' customized_replayer.js \
-e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 1500

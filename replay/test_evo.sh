rm -r ../data/$APPNAME/b_nav/
mkdir ../data/$APPNAME/b_nav/
#mkdir ../data/$APPNAME-ev/sim_responses/
#mkdir ../data/$APPNAME-ev/ev_responses/
TOKEN_MODE=0 node ../node_modules/testcafe/bin/testcafe.js 'chrome' replayer.js \
-e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 200

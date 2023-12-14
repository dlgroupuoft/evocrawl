#rm -r ../data/$APPNAME-ev/a_nav/
#mkdir ../data/$APPNAME-ev/a_nav/
#mkdir ../data/$APPNAME-ev/sim_responses/
#mkdir ../data/$APPNAME-ev/ev_responses/
node ../node_modules/testcafe/bin/testcafe.js 'chrome --headless' ../replay/replayer.js \
-e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 200

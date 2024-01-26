APPNAME=$1
rm -r ../data/$APPNAME/b_nav_cus/
rm -r ../data/$APPNAME/b_nav/
mkdir ../data/$APPNAME/b_nav/
mkdir ../data/$APPNAME/b_nav_cus/
#mkdir ../data/$APPNAME-ev/sim_responses/
#mkdir ../data/$APPNAME-ev/ev_responses/
CRAWLER_MODE='ev' APPNAME=$1 node ../node_modules/testcafe/bin/testcafe.js 'chrome --headless' ../replay/replayer.js \
-e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 200
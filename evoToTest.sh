export NODE_OPTIONS="--max-old-space-size=5121"
APPNAME=$1
if [ -z "$APPNAME" ]
    then
        echo "no APP assigned";
    else
        rm -rf data/$APPNAME
        mkdir -p data/$APPNAME/ev_log
        mkdir -p data/$APPNAME/ev_set
        mkdir -p data/$APPNAME/ev_responses
        DEBUG_PRINT=1 BLIND=2 APPNAME=$APPNAME USER_MODE='a' ENABLE_KAFKA=0 REPLAY=0 MODE=0 node node_modules/testcafe/bin/testcafe.js 'chrome --headless' crawl/evolutionarycrawler.js \
        -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 100
fi 

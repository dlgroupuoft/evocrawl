export NODE_OPTIONS="--max-old-space-size=5120"
if [ -z "$1" ]
    then
        echo "no APP assigned";
    else
        rm $PWD/data/$1_bw/a_sim_crawler_cache.json
        rm $PWD/data/$1_bw/sim.log
        DATA_FOLDER=$PWD/data/$1_bw/ DEBUG_PRINT=1 BLIND=0 APPNAME=$1 USER_MODE='a' ENABLE_KAFKA=0 REPLAY=0 MODE=3 node node_modules/testcafe/bin/testcafe.js 'chrome'  crawl/event_checker.js \
        -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 200 
fi 

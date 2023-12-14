export NODE_OPTIONS="--max-old-space-size=5120"
if [ -z "$1" ]
    then
        echo "no APP assigned";
    else
        #rm -r data/$1/coordinator
        mkdir -p data/$1/coordinator
        DATA_FOLDER=$PWD/data/$1/coordinator/ DEBUG_PRINT=1 BLIND=0 APPNAME=$1 USER_MODE='a' ENABLE_KAFKA=0 REPLAY=0 MODE=0 node node_modules/testcafe/bin/testcafe.js 'chrome'  crawl/coordinator.js \
        -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 1000 
fi

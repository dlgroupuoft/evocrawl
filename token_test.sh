export NODE_OPTIONS="--max-old-space-size=5120"
if [ -z "$1" ]
    then
        echo "no APP assigned";
    else
        rm -r data/$1/token
        mkdir -p data/$1/token
        DATA_FOLDER=$PWD/data/$1/ DEBUG_PRINT=1 APPNAME=$1 USER_MODE='a' INDEPENDENT=1 node node_modules/testcafe/bin/testcafe.js 'chrome' crawl/token_capture.js \
        -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 1500
fi
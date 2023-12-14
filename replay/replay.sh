#!/bin/bash  
export NODE_OPTIONS="--max-old-space-size=5120"
if [ -z "$1" ]
  then
    echo "No target app supplied."
    echo "Usage: > ./main.sh <appname>"
    echo "Available <appname> options: gitlab,openstack,hotcrp,overleaf,dokuwiki,humhub,kanboard"
  else
    echo Testing $1
    rm -r ../data/$1/a_nav
    rm -r ../data/$1/b_nav
    rm ../data/$1/*current.json
    mkdir -p ../data/$1/a_nav
    mkdir -p ../data/$1/b_nav
    DBG_PRNT=1 
    MARGIN=0.1
    BLIND=2
    DATA_FOLDER=$PWD/../data/$1/
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='a' DEBUG_PRINT=$DBG_PRNT CRAWLER_MODE='sim' MF=$MARGIN pm2 start test_evo.sh --name aSC_$1 --no-autorestart
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='b' DEBUG_PRINT=$DBG_PRNT CRAWLER_MODE='sim'  MF=$MARGIN pm2 start test_evo.sh --name bSC_$1 --no-autorestart
    sleep 3m
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='a' DEBUG_PRINT=$DBG_PRNT CRAWLER_MODE='ev' MF=$MARGIN pm2 start test_evo.sh --name aEC_$1 --no-autorestart
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='b' DEBUG_PRINT=$DBG_PRNT CRAWLER_MODE='ev'  MF=$MARGIN pm2 start test_evo.sh --name bEC_$1 --no-autorestart

fi


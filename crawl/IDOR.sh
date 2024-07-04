#!/bin/bash  
export NODE_OPTIONS="--max-old-space-size=5120"
if [ -z "$1" ]
  then
    echo "No target app supplied."
    echo "Usage: > ./main.sh <appname>"
    echo "Available <appname> options: gitlab,openstack,hotcrp,overleaf,dokuwiki,humhub,kanboard"
  else
    echo Testing $1
    DBG_PRNT=1
    KAFKA=1
    MARGIN=0.1
    BLIND=2
    TOKEN_MODE=0
    MODE=1
    REPLAY=1
    DATA_FOLDER=$PWD/../data/$1/
    rm -rf $PWD/../data/$1
    mkdir -p ${DATA_FOLDER}sim_log
    mkdir -p ${DATA_FOLDER}ev_log
    mkdir -p ${DATA_FOLDER}sim_set
    mkdir -p ${DATA_FOLDER}ev_set
    mkdir -p ${DATA_FOLDER}sim_responses
    mkdir -p ${DATA_FOLDER}ev_responses
    mkdir -p ${DATA_FOLDER}b_nav
    mkdir -p ${DATA_FOLDER}b_nav_cus
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='a' DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN REPLAY=$REPLAY MODE=$MODE pm2 start simCrawler.sh --name aSC_$1 #--no-autorestart
    sleep 2m
    #start the replayer for simCrawler
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='b' DEBUG_PRINT=$DBG_PRNT CRAWLER_MODE='sim'  MF=$MARGIN TOKEN_MODE=$TOKEN_MODE pm2 start nav.sh --name bSC_$1 #--no-autorestart
    sleep 1m
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='a' DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN BLIND=$BLIND REPLAY=$REPLAY MODE=$MODE pm2 start evoCrawler.sh --name aEC2_$1 #--no-autorestart
    sleep 2m
    #start the replayer for evolutionary crawler
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='b' DEBUG_PRINT=$DBG_PRNT CRAWLER_MODE='ev'  MF=$MARGIN TOKEN_MODE=$TOKEN_MODE pm2 start nav.sh --name bEC_$1 
fi
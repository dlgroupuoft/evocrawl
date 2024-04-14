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
    KAFKA=0
    MARGIN=0.1
    BLIND=2
    TOKEN_MODE=0
    INPUTS_DETECTION=1
    TRACK_DEPENDENCY=0
    MODE=0 #3
    REPLAY=0
    DATA_FOLDER=$PWD/../data/$1/
    DATA_FOLDER_EV2=$PWD/../data/$1/ev_instance_2/
    INSERT_FOLDER=$PWD/../inputs_detection/
    rm -rf $PWD/../data/$1
    rm -r $INSERT_FOLDER/data/*
    mkdir -p ${DATA_FOLDER}sim_log
    mkdir -p ${DATA_FOLDER}ev_log
    mkdir -p ${DATA_FOLDER}sim_set
    mkdir -p ${DATA_FOLDER}ev_set
    mkdir -p ${DATA_FOLDER}coordinator
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER USER_MODE='a' DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN REPLAY=$REPLAY MODE=$MODE pm2 start simCrawler.sh --name aSC_$1 #--no-autorestart
    sleep 1m
    APPNAME=$1 DATA_FOLDER=$DATA_FOLDER INSERT_FOLDER=$INSERT_FOLDER USER_MODE='a' DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN BLIND=$BLIND REPLAY=$REPLAY MODE=$MODE INPUTS_DETECTION=$INPUTS_DETECTION TRACK_DEPENDENCY=$TRACK_DEPENDENCY pm2 start evoCrawler.sh --name aEC2_$1 #--no-autorestart
    #APPNAME=$1 DATA_FOLDER=$DATA_FOLDER_EV2 USER_MODE='a' DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN BLIND=2 REPLAY=$REPLAY MODE=$MODE pm2 start evoCrawler.sh --name aEC2_$1
    #sleep 30m
    #APPNAME=$1 DATA_FOLDER=${DATA_FOLDER}coordinator/ USER_MODE='a' DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN BLIND=$BLIND REPLAY=$REPLAY MODE=$MODE pm2 start coordinator.sh --name aCO_$1
fi
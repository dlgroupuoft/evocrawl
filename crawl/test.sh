#!/bin/bash  
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
    BLIND=0
    APPNAME=$1 USER_MODE=b DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN pm2 start run_simplecrawler.sh --name bSC_$1
    sleep 5m
    APPNAME=$1 USER_MODE=b DEBUG_PRINT=$DBG_PRNT ENABLE_KAFKA=$KAFKA MF=$MARGIN BLIND=$BLIND pm2 start run_evolutionarycrawler.sh --name bEC_$1

while getopts "i:a:m:s:h" option; do
   case ${option} in
      i) # input insertion choice
         INPUT=$OPTARG;;
      a) # Enter web appname
         webapp=$OPTARG;;
      m) #enter canner mode
         mode=$OPTARG;;
      s) #enable restart of broker and zookeeper
         enable_s=$OPTARG;;
      h) #enable restart of broker and zookeeper
         printf "i: 1 or 0 for input insertion choice.\nw: web application name (note: this name must be registered at the login_information.json first).\nm: mode of the crawler (Crawler or XSS or IDOR).\ns: 1 or 0 to enable restart of broker and zookeeper. \nh: help"
         exit;;
     \?) # Invalid option
         echo "Error: Invalid option. Run with -h to see the available options."
         exit;;
   esac
done
az_folder=evocrawl
cd kafka*/
if [ $enable_s = 1 ]
then
   echo "kill broker and zookeeper processes since we want to restart them."
   rm -r /tmp/kafka-logs/*
   for session in $(screen -ls | grep pts | cut -d. -f1); do screen -S "${session}" -X quit; done
   sleep 10
   echo start zookeeper
   screen -dmS pts-zookeeper bin/zookeeper-server-start.sh config/zookeeper.properties #start zookeeper
   sleep 30
   echo start broker
   screen -dmS pts-broker bin/kafka-server-start.sh config/server.properties #start broker
   sleep 30
fi

echo start monitor process
cd ../crawl
screen -dmS pts-monit-$webapp python3 monit.py --APP $webapp --MODE $mode
sleep 15

echo start observer
if [ $INPUT = 1 ]
then
   cd ../inputs_detection
   screen -dmS pts-insert-observer python3 extract_injected_inputs.py
fi
sleep 15

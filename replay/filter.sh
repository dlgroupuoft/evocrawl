rm ../data/$APPNAME-test2/a_sim_cache.json
rm ../data/$APPNAME-test2/a_cache.json
APPNAME=$1 
#APPNAME=$APPNAME pm2 start test_sim.sh --name aFsim_$1 --no-autorestart
#sleep 10m
APPNAME=$APPNAME pm2 start test_evo.sh --name aFevo_$1 --no-autorestart

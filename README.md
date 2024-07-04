## Pre-requisites ##

Install npm
```
sudo apt install npm
```

Install nodejs
```
sudo apt install nodejs
```

Update node to latest stable 
```
npm cache clean -f
npm install -g n
n stable
```

Increase memory limit for nodejs
```
export NODE_OPTIONS="--max-old-space-size=5120"
```

Install pm2 package
```
npm install pm2
```

Install difflib
```
npm install difflib
```

Install jsdom
```
npm install jsdom@19.0.0
```

Install rrweb

```
npm install rrweb@2.0.0-alpha.1
```

Install custom testcafe
```
npm install testcafe-current.tgz # use the custom testcafe-current.tgz package in evocrawl git repo
```

Install kafkajs client
```
npm install kafkajs@1.14.0
```

Install java jdk
```
sudo apt-get install openjdk-8-jre
```

Get kafka server
```
wget https://dlcdn.apache.org/kafka/2.8.1/kafka_2.13-2.8.1.tgz
tar -xzf kafka_2.13-2.8.1.tgz
cd kafka_2.13-2.8.1
```

Make sure zookeeper and kafka are running.
We use screen to run multiple processes (you can use other tools as well)
```
screen -dmS zookeeper bin/zookeeper-server-start.sh config/zookeeper.properties #start zookeeper
screen -dmS broker bin/kafka-server-start.sh config/server.properties #start broker
```
or you can run the `start_kafka` script.

Kafka additional info : https://kafka.apache.org/quickstart


## How to run ##
*Enable Input Insertions Detection*. EvoCrawl supports using the number of insertions into the database as a feedback for the evolutionary crawler. To enable this feature, the mysql or other sql-like databases needs to be configured to output binary logs to a folder. The current ```inputs_detection/loop_insert.sh``` only supports mysql binary logs. If the application requires other databases, the script can also be modified. Additionally, please set the ```INPUTS_DETECTION=1``` inside the ```crawl/XSS.sh or crawl/Crawler.sh```, if you want to enable Input Insertions Detection. This is an optional feature, set ```INPUTS_DETECTION=0```, if you do not need it.

Add a user role object - ```Web applications login URL, User login credentials and login element identifiers (css)``` in the file `login.js and login_information.json`
(Current Implementation already includes login element identifiers for WordPress, Drupal, ImpressCMS, HotCRP, Gitlab, OpenCart, Dokuwiki, Kanboard and phpBB. You only need to modify the login URL and credentials inside the `login_information.json` file for testing on these applications. We currently don't support automatic login, but will add the module in the future)

Then run the monit.py under the `crawl/` folder with the following command

```
cd crawl/
screen -dmS [your_screen_process_name] python3 monit.py --APP [appname] --MODE [Crawler or IDOR or XSS]
```
The monit.py will stop all crawler processes after 24 hour.

On another terminal window, you can monitor the crawler programs using `pm2 monit`

To stop all current programs - `pm2 stop all` and shutdown the monit.py process as well.

List all running programs - `pm2 ls`

The crawler logs and output files are saved under `data/[APPNAME]` inside the project folder.
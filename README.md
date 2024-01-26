## Pre requisites ##

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
npm install testcafe-current.tgz # use the custom testcafe-current.tgz package in authzee git repo
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

Kafka additional info : https://kafka.apache.org/quickstart

Now run AuthZee in another terminal


## How to run ##

Add a user role object - ```User A,B,C login credentials and login element identifiers (css)``` in the file `login.js and login_information.json`
(We currently don't support automatic login, but will add the module in the future)
Then run ./main.sh

```./main.sh <appname>```

Here <appname> is the same name you used for the user role object

On another terminal window, you can monitor the crawler programs using `pm2 monit` cmd
To stop all current programs - `pm2 stop all`
List all running programs - `pm2 ls`
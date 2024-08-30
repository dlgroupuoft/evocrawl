
# Artifact for EvoCrawl #
This repository contains the code used to run experiments for the paper: "EvoCrawl: Exploring Web Application Code and State using Evolutionary Search". The results presented in the paper were obtained by running EvoCrawl on 10 different web applications. In this repository, we provide the configuration steps for one of these tested applications. For testing other applications, please refer to their respective documentation for installation guidance. Additionally, we include instructions on configuring EvoCrawl for the example application as well as for other web applications. Finally, we provide the steps to analyze the testing results.

## Setup Database and Enable Binary Logs ##
Below provides the installation of a database (MySQL 5.7) instance with binary log enabled. If you are using a different version of database, please consult the respective documentation for installation guidance.

Please execute the following command to install the mysql-5.7 instance container. The container will have the binary log mode enabled and mount the volumn `/var/lib/mysql` within the container to the store location within the host, for easier access to the output binary logs.
```
mkdir mysql_storage/ #you can choose your own storage name
docker run -d --name mysql-test -e MYSQL_ROOT_PASSWORD=root --network bridge -v $PWD/mysql_storage:/var/lib/mysql mysql:5.7-debian mysqld --datadir=/var/lib/mysql --server-id=1 --log-bin=/var/lib/mysql/mysql-bin.log --binlog-ignore-db=mysql --binlog-ignore-db=information_schema
```

Here are the example commands for creating empty databases for benchmarks:

```
docker exec -it mysql-test bash
mysql -u root -proot
#below commands are executed by mysql
CREATE DATABASE kanboard; #you can change the database name "kanboard" to other names, but you need to use the make the name consistent on the kanboard configuration file
quit;
exit;
```

## Installation of an example web application instance (Kanboard) ##
Below provides the installation of a example tested application for EvoCrawl with the coverage tracking enabled. If you want use EvoCrawl on other web applications, please consult the respective documentation for installation guidance.

The commands to install the Kanboard Container. The command should be executed under the `kanboard/` directory.
```
cd experiments/kanboard
docker build . -t kanboard_cov_image
docker run --name kanboard_ins -p 8300:80 -d --network bridge kanboard_cov_image #replace 8300 with your own port number if you like
cd ../../
```

The commands for configuring the Kanboard instance:
```
docker exec -it kanboard_ins bash
#the command below are executed inside the container
cd /var/www/html
cp config.default.php config.php
```
Finally you need to modify several parameters inside the config.php file. Specifically, Set `DB_DRIVER` to `mysql` (the default is `sqlite`), Set `DB_USERNAME` to `root` (you can set to other database users if you want to.), Set `DB_PASSWORD` to the password value of your database user (the default password for root is 'root'), and Set `DB_HOSTNAME` to the IP of your mysql container (something looks like 172.17.0.X). You can get the internal IPs for all the containers with this command.

```
docker network inspect bridge #replace bridge with other names if you have connected the container to other networks. default should be the bridge
```

Now Browse to localhost:8300/ to see whether the installation succeed. Please replace 8300 with your own port number.
The default admin user for Kanboard instance are: `{username: admin, password: admin}`.

If you want to run the scanner for the detection of IDOR vulnerability, you need to register two additional users with a lower privilege than the admin user, but these two users must be at the same privilege level. (admin privilege > userA privilege = userB privilege). Please make all three users have the same login password.

## Install dependencies for EvoCrawl ##

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
tar -xzf kafka_2.13-2.8.1.tgz
```

Kafka additional info : https://kafka.apache.org/quickstart


## Configure the EvoCrawl ##
**Enable Input Insertions Detection**. EvoCrawl supports using the number of insertions into the database as a feedback for the evolutionary crawler. To enable this feature, the mysql or other sql-like databases needs to be configured to output binary logs to a folder. The current ```inputs_detection/extract_injected_inputs.py``` only supports mysql binary logs. If the application requires other databases, the script can also be modified. Additionally, please set the ```INPUTS_DETECTION=1``` inside the ```crawl/XSS.sh or crawl/Crawler.sh```, if you want to enable Input Insertions Detection. This is an optional feature, set ```INPUTS_DETECTION=0```, if you do not need it.

Note: the process will not stop until manual interruption, since we want the process keep monitoring the database to provide feedback for the crawler. 

Please run the following command to configure the binary log analysis:
```
cd inputs_detection/
mkdir data/
docker cp docker_log_convert.sh mysql-test:/home
```

Add a user role object - ```Web applications login URL, User login credentials and login element selectors (CSS selector)``` in the file `login.js and login_information.json`
(Current Implementation already includes login element selectors for WordPress, Drupal, ImpressCMS, HotCRP, Gitlab, OpenCart, Dokuwiki, Kanboard and phpBB. You only need to modify the login URL and credentials inside the `login_information.json` file for testing on these applications. We currently don't support automatic detection on login element selectors, but will add the module in the future). The `crawler` property inside the `login_information.json` should be updated to the username of your registerd admin username. The `password` property should be set to your the admin user's password.

IDOR - If you run the crawler in IDOR MODE, the two addtional users username should be placed at the `filter` and the `userB` properties inside the `login_information.json` file.

## Start the Experiments ##

Then run the start_process.sh to start the scanning with the following command

```
./start_process.sh -h #this command will list the options for each argument.
./start_process.sh -i [0 or 1] -a [APPNAME] -m [Crawler or XSS or IDOR] -s [0 or 1]
# an example command for kanboard
./start_process.sh -i 1 -a kanboard -m Crawler -s 1
```

The monit.py (invoked by start_process.sh) will stop all crawler processes after 24 hour.

On another terminal window, you can monitor the crawler programs using `pm2 monit` or inspect the crawler logs.

To stop all current programs - `pm2 stop all` and shutdown the monit.py process as well.

List all running programs - `pm2 ls`

The crawler logs and output files are saved under `data/kanboard` inside the project folder or `data/[tested_application_name]` if you are running evocrawl on other applicaiton.


## Coverage Collection ##
Collecting Coverage - The coverage files are logged per request. To aggregate all the coverage files, execute the following command inside the benchmark container:
```
docker exec -it kanboard-ins bash
cd /var/www/codecoverage
python3 collect.py #this process may take a while
``` 

## Collect Number of HTML forms ##
The commond to collect number of HTML forms submitted by EvoCrawl
```
cd ../inputs_detection/
mkdir data/kanboard
python3 parse.py kanboard
node deduplication kanboard
```

The submitted forms should be inside `de_kanboard.json` file within the `../inputs_detection/data/kanboard` folder.
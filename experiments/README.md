This file describe the steps of installing databases and benchmarks for the experiments, and also the steps for analyzing the results.
## Setup Database and Enable Binary Logs ##
Execute the following command to install the mysql-5.7 instance container. The container will have the binary log mode enabled and mount the volumn `/var/lib/mysql` within the container to the store location within the host, for easier access to the output binary logs.
```
mkdir [your_directory_for_storing_binary_logs]
docker run -d --name mysql-test -e MYSQL_ROOT_PASSWORD=root --network bridge -v [your_directory_for_storing_binary_logs]:/var/lib/mysql mysql:5.7-debian mysqld --datadir=/var/lib/mysql --server-id=1 --log-bin=/var/lib/mysql/mysql-bin.log --binlog-ignore-db=mysql --binlog-ignore-db=information_schema
```

Here are the example commands for creating empty databases for benchmarks:

```
docker exec -it mysql-test bash
mysql -u root -proot
#below commands are executed by mysql
CREATE DATABASE [your_database_name_for_benchmark];
quit;
```

## Installation of Kanboard ##
The command to install the Kanboard Container. The command should be executed under the `kanboard/` directory.
```
cd experiments/kanboard
docker build . -t [your_kanboard_image_name]
docker run --name [your_kanboard_container_name ] -p 8300:80 -d --network bridge [your_kanboard_image_name] #replace 8300 with your own port number
```

## Configuration of Kanboard ##
The commands for configuring the benchmark instance:
```
docker exec -it [your_kanboard_container_name] bash
#the command below are executed inside the container
cd /var/www/html
cp config.default.php config.php
```
Finally you need to modify several parameters inside the config.php file. Specifically, Set `DB_DRIVER` to `mysql` (the default is `sqlite`), Set `DB_USERNAME` to `root` (you can set to other database users if you want to.), Set `DB_PASSWORD` to the password value of your database user, and Set `DB_HOSTNAME` to the IP of your mysql container (something looks like 172.17.0.X).

Now Browse to localhost:8300/ to see whether the installation succeed. Please replace 8300 with your own port number.
The default admin user for Kanboard instance are: `{username: admin, password: admin}`

## Start the Experiments ##
**Enable Input Insertions Detection for the crawler (optional)**. EvoCrawl supports using the number of insertions into the database as a feedback for the evolutionary crawler. To enable this feature, the mysql or other sql-like databases needs to be configured to output binary logs to a folder. Please set the ```INPUTS_DETECTION=1``` inside the ```crawl/XSS.sh or crawl/Crawler.sh```, if you want to enable Input Insertions Detection. This is an optional feature, set ```INPUTS_DETECTION=0```, if you do not need it.

Note: the process will not stop until manual interruption, since we want the process keep monitoring the database to provide feedback for the crawler. The `extract_injected_inputs.py` will execute the `c_insert.sh` script to convert the binary logs of the database into a more readable format. To read the binary logs, the `c_insert.sh` file require sudo privilege. Please update the sudo password field inside the `c_insert.sh` if you need the input sertions detection feature.

Command for starting the input insertions detection process:
```
cd inputs_detection/
screen -dmS pts-insertion-detection python3 extract_injected_inputs.py [your_directory_for_storing_binary_logs]
```

Please modify the login URL and credentials for kanboard inside the `utils-evo/login_information.json` file for testing on these applications. The `crawler` property inside the `utils-evo/login_information.json` should be updated to the username of your registerd admin username on kanboard. The `password` property should be set to your the admin user's password on kanboard.

Then run the monit.py under the `crawl/` folder with the following command

```
cd crawl/
screen -dmS [your_screen_process_name] python3 monit.py --APP kanboard --MODE [Crawler or IDOR or XSS]
```

IDOR - If you run the crawler in IDOR MODE, the two addtional users username should be placed at the `filter` and the `userB` properties inside the `login_information.json` file.

The monit.py will stop all crawler processes after 24 hour.

On another terminal window, you can monitor the crawler programs using `pm2 monit` or inspect the crawler logs.

To stop all current programs - `pm2 stop all` and shutdown the monit.py process as well.

List all running programs - `pm2 ls`

The crawler logs and output files are saved under `data/kanboard` inside the project folder.


## Coverage Collection ##
Collecting Coverage - The coverage files are logged per request. To aggregate all the coverage files, execute the following command inside the benchmark container:
```
docker exec -it [your_kanboard_container_name] bash
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
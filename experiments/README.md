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

## Enable Coverage Tracking on Benchmarks ##
We provide example Dockerfiles and the installation guide for WordPress and Kanboard within the `wordpress/` and the `kanboard/` folder. The Dockerfiles inside the two folders will also setup the environments for tracking the coverage of the benchmarks

For other benchmarks, please use the Dockerfile within the `cov-tracking/` folder. the Dockerfile will build an Ubuntu image with apache2, php, and several php extensions installed. In addition, the php xdebug extension will log which lines have been executed for the (php) web application running inside the container. The logged coverage files are saved in `/var/www/codecoverage/coverages/` inside the container. 

## Start the Experiments ##
Please refer to the `README` file of the project root directory for starting experiments.

## Coverage Collection ##
Collecting Coverage - The coverage files are logged per request. To aggregate all the coverage files, execute the following command inside the benchmark container:
```
docker exec -it [your_benchmark_container_name] bash
cd /var/www/codecoverage
python3 collect.py #this process may take a while
``` 

The `target_path` variable inside the `collect.py` should be the path where you upload your web application. The default is `/var/www/html`
## Collect Number of HTML forms ##
The commond to collect number of HTML forms submitted by EvoCrawl
```
cd ../inputs_detection/
mkdir data/[benchmark_name]
python3 parse.py [benchmark_name]
node deduplication [benchmark_name]
```

The submitted forms should be inside `de_[benchmarkname].json` file within the `../inputs_detection/data/[benchmark_name]` folder.
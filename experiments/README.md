## Enable Coverage Tracking on Benchmarks ##
The `cov-tracking/Dockerfile` will build an Ubuntu image with apache2, php, and several php extensions installed. In addition, the php xdebug extension will log which lines have been executed for the (php) web application running inside the container. The logged coverage files are saved in `/var/www/codecoverage/coverages/` inside the container. 

We provide example Dockerfiles and the installation guide for WordPress and Kanboard within the `wordpress/` and the `kanboard/` folder. The Dockerfiles will also setup the envirouments for tracking the coverage of the benchmarks

For other benchmarks, the workflow for installing the benchmarks and enabling the coverage tracking is:
```
cd cov-tracking/
docker build . -t [your_image_name]
docker run --name [your_container_name ] -p 8080:80 -d --network bridge [your_image_name] #replace 8080 with your own port number
docker exec -it [your_container_name] bash

```
Then, install the target web application inside the container, please upload the web application to the container: /var/www/html folder for the convenience of coverage collection. (The installation steps can be referred to the installation guideline of each web application's website).


Collecting Coverage - The coverage files are logged per request. To aggregate all the coverage files, run the following command inside the container:
```
cd /var/www/codecoverage
python3 collect.py
``` 

The target_path variable inside the `collect.py` should be the path where you upload your web application. The default is `/var/www/html`
## Enable Binary Loggin for mysql-5.7 ##
The workflow for installing the mysql-5.7 container with binary log enabled.

## Installation ##
The workflow for installing the benchmarks (other than WordPress and Kanboard) and enabling the coverage tracking is:
```
cd cov-tracking/
docker build . -t [your_image_name]
docker run --name [your_container_name ] -p 8080:80 -d --network bridge [your_image_name] #replace 8080 with your own port number
docker exec -it [your_container_name] bash

```
Then, install the target web application inside the container, please upload the web application to the `container: /var/www/html folder` for the convenience of coverage collection. (The installation steps can be referred to the installation guideline of each web application's website).
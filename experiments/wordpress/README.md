## Installation ##
The command to install the WordPress Container. The command should be executed under the `wordpress/` directory.
```
docker build . -t [wordpress_image_name]
docker run --name [wordpress_container_name ] -p 8200:80 -d --network bridge [wordpress_image_name] #replace 8200 with your own port number
```
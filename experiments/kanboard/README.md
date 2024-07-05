## Installation ##
The command to install the Kanboard Container. The command should be executed under the `kanboard/` directory.
```
docker build . -t [kanboard_image_name]
docker run --name [kanboard_container_name ] -p 8300:80 -d --network bridge [kanboard_image_name] #replace 8300 with your own port number
```

## Configuration ##
The commands for configuring the benchmark instance:
```
docker exec -it [kanboard_container_name] bash
#the command below are executed inside the container
cd /var/www/html
cp config.default.php config.php
```
Finally you need to modify several parameters inside the config.php file. Specifically, Set `DB_DRIVER` to `mysql` (the default is `sqlite`), Set `DB_USERNAME` to `root` (you can set to other database users if you want to.), Set `DB_PASSWORD` to the password value of your database user, and Set `DB_HOSTNAME` to the IP of your mysql container (something looks like 172.17.0.X).

Now Browse to localhost:8300/ to see whether the installation succeed. Replace 8300 with your own port number.
The default admin user for Kanboard instance are: `{username: admin, password: admin}`
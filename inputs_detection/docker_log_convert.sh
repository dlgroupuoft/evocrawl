filename=`(ls /var/lib/mysql/mysql-bin.0* | tail -n 1)`
mysqlbinlog --base64-output=decode-rows --verbose $filename > /home/data/log.txt
 if [ $1 == 'dokuwiki' ]; then
     docker cp dokuwiki-ins:/var/www/html/data data/dokuwiki_data
     python3 test_dokuwiki.py
 fi
 binlog_path='/var/lib/mysql2/mysql-bin.0*'
 for filename in $binlog_path; do
     echo $filename
     echo 'your_sudo_password' | sudo -S mysqlbinlog --base64-output=decode-rows --verbose $filename > data/log.txt
     python3 'collect_type.py' 'data' $1 #app name
 done
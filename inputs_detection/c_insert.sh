#rm -r dokuwiki_data/
#rm data2/a_insertions.json
#sleep $1
#docker cp dokuwiki-ins:/var/www/html/data dokuwiki_data
#python3 test_dokuwiki.py
#ls /var/lib/mysql/mysql-bin.0* | tail -n 1
filename=`(ls $1/mysql-bin.0* | tail -n 1)`
echo $filename
echo 'sudo_password' | sudo -S mysqlbinlog --base64-output=decode-rows --verbose $filename > data/log.txt
#python3 'extract_injected_inputs.py' 'data'
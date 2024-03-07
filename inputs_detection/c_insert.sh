rm -r dokuwiki_data/
rm data2/a_insertions.json
sleep $1
docker cp dokuwiki-ins:/var/www/html/data dokuwiki_data
python3 test_dokuwiki.py
binlog_path='/var/lib/mysql3/mysql-bin.0*'
for filename in $binlog_path; do
    echo $filename
    echo 'vmuser' | sudo -S mysqlbinlog --base64-output=decode-rows --verbose $filename > data2/log.txt
    python3 'test.py'
done

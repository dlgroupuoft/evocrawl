#rm -r dokuwiki_data/
#rm data2/a_insertions.json
#sleep $1
#docker cp dokuwiki-ins:/var/www/html/data dokuwiki_data
#python3 test_dokuwiki.py
#ls /var/lib/mysql/mysql-bin.0* | tail -n 1
docker exec -it mysql-test bash -c "/home/docker_log_convert.sh"
docker cp mysql-test:/home/data/log.txt data/
#python3 'extract_injected_inputs.py' 'data'
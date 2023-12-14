#rm -rf data/$1
#mkdir -p data/$1
node ../node_modules/testcafe/bin/testcafe.js 'chrome --headless' evolutionarycrawler.js \
-e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 200

$Env:APPNAME= Read-Host -Prompt "Enter target AppName"
$Env:DEBUG_PRINT=1
$Env:ENABLE_KAFKA=0 
$Env:USER_MODE='a'
$Env:BLIND=2
$Env:DATA_FOLDER="data/$Env:APPNAME/"
$Env:MODE=0
$Env:REPLAY=0
Remove-Item data/$Env:APPNAME -Recurse
mkdir data/$Env:APPNAME
mkdir data/$Env:APPNAME/ev_log
mkdir data/$Env:APPNAME/ev_set
mkdir data/$Env:APPNAME/ev_responses
node .\node_modules\testcafe\bin\testcafe.js "chrome" .\crawl\evolutionarycrawler.js `
-e -u --disable-multiple-windows -q --ajax-request-timeout 500 --selector-timeout 100
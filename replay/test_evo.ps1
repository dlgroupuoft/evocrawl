$Env:APPNAME= Read-Host -Prompt "Enter target AppName"
$Env:DEBUG_PRINT=1
$Env:DATA_FOLDER="../data/$Env:APPNAME/"
$Env:TOKEN_MODE=0 
$Env:USER_MODE='b'
$Env:CRAWLER_MODE="sim"
Remove-Item "../data/$Env:APPNAME/b_nav" -Recurse
mkdir "../data/$Env:APPNAME/b_nav"

node ../node_modules/testcafe/bin/testcafe.js 'chrome' replayer.js `
-e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 200
const loadfile = function (name, user=USER_MODE) {
    const fs = require('fs');
        try {
            if(fs.existsSync(DATA_FOLDER+user+'_'+name)){
                //console.log(`file ${user+'_'+name} detected.`);
                return JSON.parse(fs.readFileSync(DATA_FOLDER+user+'_'+name));
            }            
        } catch (err) {
            console.log(`error loading file - ${DATA_FOLDER+user+'_'+name}`)
            console.log(err);
        }
        //console.error(`${user+'_'+name} not found`);
        return false
}

const printObject = function(obj, name, folder=DATA_FOLDER) {
    //if(DEBUG_PRINT){console.log("Printing Object = "+USER_MODE+'_'+name)}
    const fs = require('fs');
    fs.writeFileSync(folder+USER_MODE+'_'+name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const cookies_analyzer = function(cookie_arr, name){
    let cookie_values = [];
    for(let i = 0; i < cookie_arr.length; i++){
        let cookie_set = cookie_arr[i];
        cookie_set = cookie_set.replace(/ /g, "");
        let cookie_list = cookie_set.split(";");
        for(let j = 0; j < cookie_list.length; j++){
            let value = parser(cookie_list[j], name);
            if(value){
                cookie_values.push(value);
            }
        }
    }
    return cookie_values;
}

const parser = function(cookie, name){
    let arr = cookie.split("=")
    let cookie_name = arr[0];
    let cookie_value = arr[1];
    if(cookie_name == name){
        cookie_value = cookie_value.replace(/%7C/g, "|");
        cookie_value = cookie_value.replace(/%2C/g, ',');
        return cookie_value;
    }
    else{
        return false;
    }
}

let APPNAME = "app";
let cookie_name = process.argv[3];
APPNAME = process.argv[2];
const DATA_FOLDER = "../data/" + APPNAME + "/";
const USER_MODE = 'a';
let sim_cookies = loadfile("sim_cookies.json")
let ev_cookies = loadfile("ev_cookies.json")
sim_cookies = sim_cookies ? sim_cookies: [];
ev_cookies = ev_cookies ? ev_cookies : [];
for(let i = 0; i < ev_cookies.length; i++){
    sim_cookies.push(ev_cookies[i]);
}
let cookie_values = cookies_analyzer(sim_cookies, cookie_name);
printObject(cookie_values, APPNAME + ".json", "../buffers/");
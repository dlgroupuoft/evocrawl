let target_folder = process.argv[2]
apps = ['wordpress', 'drupal', 'hotcrp', 'opencart', 'phpbb', 'humhub', 'impresscms', 'kanboard']
const mode = "data/" + target_folder + "/"
const DATA_FOLDER = mode
const DST_FOLDER = mode + "/de_forms/"

const loadfile = function (name, folder = DATA_FOLDER) {
    const fs = require('fs');
        try {
            if(fs.existsSync(folder + name)){
                //console.log(`file ${user+'_'+name} detected.`);
                return JSON.parse(fs.readFileSync(folder + name));
            }            
        } catch (err) {
            console.log(`error loading file - ${folder + name}`)
            console.log(err);
        }
        //console.error(`${user+'_'+name} not found`);
        return false
}

const printObject = function(obj, name, folder=DATA_FOLDER) {
    //if(DEBUG_PRINT){console.log("Printing Object = "+USER_MODE+'_'+name)}
    const fs = require('fs');
    fs.writeFileSync(folder + name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const search_mode_inside_value = function(value, search_mode){
    for(let i = 0; i < search_mode.length; i++){
        if(value.includes(search_mode[i])){
            return true;
        }
    }
    return false;
}

const check_whether_string_is_number = function(value){
    return /^\d+$/.test(value);
}

const replaceRandom = function(url, random_names, rand="", appname){
    let fragment_list = url.split('#');
    let url_list = fragment_list[0].split('?');
    let query_parameter = "";
    let path = url_list[0];
    random_names["random"] = 1;
    let search_mode = ["jk", 'api']
    let mode1 = 's' + appname[0] + appname[1]
    let mode2 = 'e' + appname[0] + appname[1]
    search_mode.push(mode1)
    search_mode.push(mode2)
    path = path.replace("http://", "");
    path_components = path.split("/");
    for (let i = 0; i < path_components.length; i++){
        let component = path_components[i];
        if(search_mode_inside_value(component, search_mode) || check_whether_string_is_number(component)){
            path_components[i] = rand;
        }
    }
    path = path_components.join("/");
    if(!url.includes('?')){
        return path;
    }
    if(url_list.length > 1)
    {
        query_parameter = url_list[1];
    }
    for(let token in random_names){
        let parameter_list = query_parameter.split('&');
        let new_parameter_list = [];
        for(let i = 0; i < parameter_list.length; i++){
            let parameter = parameter_list[i];
            let name = parameter.split('=')[0];
            let value = parameter.split('=')[1];
            if(name == token || search_mode_inside_value(value, search_mode)){
                parameter = name + "=" + rand;
            }
            new_parameter_list.push(parameter);
        }
        query_parameter = new_parameter_list.join("&");
    }
    /*else{
        if(query_parameter != "") query_parameter = query_parameter + "&"
        query_parameter += token + "=" + token_value; 
    }*/
    let new_url = path + "?" + query_parameter;
    if(fragment_list.length > 1) {
        new_url += "#" + fragment_list[1];
    }
    //console.log(new_url);
    return new_url;
}

let random_names_m = loadfile("randoms.json", "");
let appname = target_folder;
let random_names = random_names_m[appname];
let test_urls = loadfile("all_" + appname + ".json");
let deduplicate_urls = {}

for(let i = 0; i < test_urls.length; i ++){
    let initial_url = test_urls[i];
    let end_url = replaceRandom(initial_url, random_names, "token", appname);
    if(end_url.length != 0){
        deduplicate_urls[end_url] = 1;
    }
}


printObject(deduplicate_urls, "de_" + appname + ".json", mode);

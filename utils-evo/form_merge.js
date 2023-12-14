const utils = require('./utils');
const login_info = require('./login_information.json');
const random = require('./random_names.json');
const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab';
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + '-ev/';
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE:'c';
const CRAWLER_MODE = process.env.CRAWLER_MODE?process.env.CRAWLER_MODE:'sim';
/* const LOG_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_log/";
const NAV_FOLDER = DATA_FOLDER + USER_MODE + "_nav/";
const CUS_FOLDER = DATA_FOLDER + USER_MODE + "_nav_cus/";
const EV_SET = DATA_FOLDER + 'ev_set/';
const SIM_SET = DATA_FOLDER + 'sim_set/';

const deny_info = require('../utils-evo/40X_sentences.json'); 
const { CompressionTypes } = require("kafkajs");
const EV_RESPONSE_FOLDER = DATA_FOLDER + 'ev' + "_responses/";
const SIM_RESPONSE_FOLDER = DATA_FOLDER + 'sim' + "_responses/"; */
const token_name = login_info['token'];
let random_names = random[APPNAME];
if(random_names == undefined){
    random_names = {};
}

const loadfile = function (name, user=USER_MODE, folder = DATA_FOLDER, crawler=CRAWLER_MODE) {
    const fs = require('fs');
        try {
            if(fs.existsSync(folder + user+'_'+ crawler + '_' + name)){
                //console.log(`file ${user+'_'+ crawler + '_' + name} detected.`);
                return JSON.parse(fs.readFileSync(folder+user+'_'+ crawler + '_' + name));
            }            
        } catch (err) {
            console.log(`error loading file - ${folder+user+'_'+ crawler + '_' + name}`)
            console.log(err);
        }
        //console.error(`file ${user+'_'+ crawler + '_' + name} not found`);
        return false
}

const printObject = function(obj, name, folder=DATA_FOLDER) {
    const fs = require('fs');
    fs.writeFileSync(folder+USER_MODE+'_'+ CRAWLER_MODE + '_' + name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const process_form = function(forms){
    
}

ev_forms = loadfile("forms.json", "a", DATA_FOLDER, "ev");
console.log(ev_forms);
// windows > testcafe chrome:headless simplecrawler.js -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 5000 > tests.log
// ubuntu  > testcafe 'chrome --headless --no-sandbox' simplecrawler.js -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 5000 > tests.log
// ubuntu custom testcafe - 
// > node ../../testcafe/bin/testcafe.js 'chrome --headless --no-sandbox' simplecrawler.js -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 5000
// current issues : Done --> 1. browser hangs for some actions; testcafe handles this by restarting browser however
//                  the number of restarts are limited to three.
//                  2. Handle <a> links that are invisible initially but become visible after some user action
//                      Ex. choosing from drop down menu, nav bar, modals, pop up dialog forms...
//                  3. The number of unique urls may depend on user activity. Ex. creating new resource creates 
//                      a new url to get/modify/delete that resource
// install testcafe $ npm i testcafe@1.10.1
// with pm2 : 
// > pm2 start run_simplecrawler.sh --name <appname>

import PriorityQueue from './pqueue'
import { Selector, RequestLogger, ClientFunction, Role } from 'testcafe';
import {login, extractBaseUrl, second_login} from '../utils-evo/login';
import http from 'http';
import { time } from 'console';
import { loadLogFile } from '../utils-evo/utils';
import element_AZ from '../utils-evo/element';

const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab'; // default gitlab
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE.toLowerCase():'a'; // default 'userA'
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + "/";
const LOG_FOLDER = DATA_FOLDER + "sim_log/";
const SET_FOLDER = DATA_FOLDER + 'sim_set/';
const JS_FOLDER = 'js/';
const RESPONSE_FOLDER = DATA_FOLDER + 'sim_responses/';
const KAFKA_ALLTOPIC = APPNAME+'-'+USER_MODE+'-allurls-topic';
const KAFKA_PAGETOPIC = APPNAME+'-'+USER_MODE+'-pageurls-topic';
const REPLAY = process.env.REPLAY?process.env.REPLAY:0;
const KAFKA_CLIENT_ID = APPNAME+'-'+USER_MODE+'-SC'
const KAFKA_CONSUMER_GROUP = APPNAME+'-'+USER_MODE+'-SC'
const MARGIN_FACTOR = process.env.MF?process.env.MF:0.1;
const MODE = process.env.MODE?process.env.MODE:3;

const DEBUG_PRINT = process.env.DEBUG_PRINT=="1"?true:false;  // default - disable debug logs
const ENABLE_KAFKA = process.env.ENABLE_KAFKA=="1"?true:false;  // default - disable kafka connection

const applogin = require('./userroles.js');
const rrweb = require('../utils-evo/rrweb_events');
const utils = require('../utils-evo/utils');
const login_info = require('../utils-evo/login_information.json');
const token_info = require('../utils-evo/token_names.json');
const path_info = require('../utils-evo/path.json');
const pathoptimizer = require("../replay/pathoptimizer");
const form_success = require("../utils-evo/form_success.json");
const global_form_queue = require("../utils-evo/form_queue.json");
let baseURI = extractBaseUrl(login_info[APPNAME]);
let folder = login_info['folder'];
baseURI = baseURI + folder;
let baseRE = new RegExp(baseURI.slice(0, -1));
var urlobj = new URL(baseURI)
let path = path_info[APPNAME];
path = path?path:"";
let form_app_keywords = form_success[APPNAME];
const PORT = urlobj.port?urlobj.port:'80';
let cache = {page: "", seq: 0, form: 0, action: "", stat: "", href: "", navSet: 0, log: 0};
let replay_cache = {seq: 0, stat: "", visibility: false};
let random_names = {};
let token_name = "";
let token_value = '';
let test_cookies = [];
let test_tokens = [];
let url_400 = [];
let common_elements = {admin: [], userA: [], userB: []}
let xss_PV = {};
let xss_sources = {};
let url_event = {};
let form_actions = {};
let js_events_global = {};
let success_forms = {html: [], url: []};
let sim_forms = {};
let global_element_info = {};
let typed_texts = [];
let form_texts = {};
let form_queue = [];
//const USERA = applogin[APPNAME].userA
//const USERB = applogin[APPNAME].userB
//const USERC = applogin[APPNAME].userC


const elementsOfInterest = ['input','button','textarea','select','a'];

var request_log_count = 0;
let navigationSet = [];
let nav_edge = "";
const heavy_pages = login_info["heavy_pages"];
//const heavy_pages = [];
const logout_keywords = login_info["logout_keywords"];
const logger = RequestLogger(request => {
        // console.log(request.headers.accept)
        const hostname = new URL(request.url).hostname; const basehostname = new URL(baseURI).hostname;
        return (hostname===basehostname) 
            && ( /text\/html/.test(request.headers.accept) || /text\/plain/.test(request.headers.accept) 
            /*|| /image\//.test(request.headers.accept)*/ || /application\/json/.test(request.headers.accept))
    },
    {
        logRequestHeaders: true,
        logRequestBody: true,
        stringifyRequestBody: true,
        logResponseHeaders: true,
        logResponseBody: true,
        stringifyResponseBody: APPNAME==="humhub"?true:false,  // humhub does not need to uncompress before stringify
});
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(DATA_FOLDER + "sim.log", {flags : 'a'});
var log_stdout = process.stdout;

console.log = function(d) {
    let date = new Date().toLocaleTimeString();
    let message = ''
    for(let i = 0; i < arguments.length; i++)
    {
        message = message + ' ' + JSON.stringify(arguments[i]);
    }
    message = date + ": " + message;
    log_file.write(util.format(message) + '\n');
    log_stdout.write(util.format(message) + '\n');
};
console.error = function(d) {
    let message = ''
    for(let i = 0; i < arguments.length; i++)
    {
        message = message + ' ' + JSON.stringify(arguments[i]);
    }
    log_file.write(util.format(message) + '\n');
    log_stdout.write(util.format(message) + '\n');
};

const BW_JS = function(prefix="", set_name=""){
    let scripts = [];
    const fs = require('fs');
    let files = fs.readdirSync(prefix + set_name);
    files.forEach(file => {
        scripts.push(set_name + "/" +file);
    });
    return scripts;
}

// return response - outerhtml, json or error 
const executeRequest = (userArequest, url, reqMethod, reqBody, otherUserCookie) => {
    return new Promise(resolve => {
        var url_obj = new URL(url);
        var headers = userArequest.headers;
        if(otherUserCookie != 'admin') {
            headers['cookie'] = otherUserCookie;
            if(headers['x-csrf-token']){delete headers['x-csrf-token']};
        }
        if(headers['accept-encoding']){delete headers['accept-encoding']};
        if(headers['x-requested-with']){delete headers['x-requested-with']};
        if(headers['content-type']){delete headers['content-type']};
        if(headers['content-length']){delete headers['content-length']};
        // delete headers['referer'];
        const options = {
            hostname: url_obj.hostname,
            port:     PORT,
            path:     url_obj.pathname + url_obj.search,
            method:   reqMethod.toUpperCase(),
            headers: headers,
            body: reqBody
        };
        var results = ''; 
        const req = http.request(options, res => {
            if(0){console.log('statusCode:', res.statusCode);}
            //if(res.statusCode > 300 && res.statusCode < 400) console.log('headers:', res.headers);
            res.on('data', function (chunk) {
                results = results + chunk;
            });
            res.on('end', function () {
                resolve({response: JSON.stringify(results), status: res.statusCode, location: res.headers.location});
            });
            
        });
        
        req.on('error', e => {
            // console.error(e);
            resolve({error: e, response: results, status: 'error'});
        });

        //console.log(req);

        req.end();
    });
};

const printObject = function(obj, name, folder=DATA_FOLDER) {
    //if(DEBUG_PRINT){console.log("Printing Object = "+USER_MODE+'_'+name)}
    const fs = require('fs');
    fs.writeFileSync(folder+USER_MODE+'_'+name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const saveConfig = () => {
    let timeStamp = new Date().getTime();
    printObject({
            APPNAME: APPNAME, 
            USER_MODE: USER_MODE,
            baseURI: baseURI, 
            DATA_FOLDER:DATA_FOLDER, 
            DEBUG_PRINT:DEBUG_PRINT,
            ENABLE_KAFKA:ENABLE_KAFKA,
            KAFKA_ALLTOPIC:KAFKA_ALLTOPIC, 
            KAFKA_PAGETOPIC:KAFKA_PAGETOPIC,
            KAFKA_CLIENT_ID:KAFKA_CLIENT_ID,
            KAFKA_CONSUMER_GROUP:KAFKA_CONSUMER_GROUP,
            MARGIN_FACTOR:MARGIN_FACTOR,
            MODE: MODE,
            START_TIME: timeStamp,
            TOKEN_NAME: token_name
        },
        "scconfig.json");
}

const appendObjecttoFile = async function(obj, name) {
    // name is filename that contains array of obj
    var fs = require('fs');
    var logStream = fs.createWriteStream(DATA_FOLDER+USER_MODE+'_'+name, {flags: 'a'});
    // use {flags: 'a'} to append and {flags: 'w'} to erase and write a new file
    logStream.write(JSON.stringify(obj)+'\n');
    logStream.end();
}

// Returns the number of requests logged since last calling this function
const checkRequestLogs = function () {
    if (request_log_count != logger.requests.length){
        var num_req_generated = logger.requests.length - request_log_count ;
        request_log_count = logger.requests.length
        return num_req_generated
    }
    return 0
}

const array_get = function(){
    let temp_events = events;
    events = [];
    return temp_events;
}

const catch_payload = function(){
    let temp_xss = nums_authzee;
    nums_authzee = [];
    return temp_xss;
}

const catch_events = function(){
    let resps = catch_properties();
    return resps;
}

const event_listeners = function(){
    callbackWrap(Element.prototype, "addEventListener", 1, addEventListenerWrapper);
}

const getURL = ClientFunction(() => window.location.href);
const getPageHTML = ClientFunction(() => document.documentElement.outerHTML);
const getEvents = ClientFunction(() => JSON.stringify(added_events))
const eventRecord = ClientFunction(array_get);
const catchPayload = ClientFunction(catch_payload);
const catchEvents = ClientFunction(catch_events);
const addEventListener = ClientFunction(event_listeners);

var urltable = {};          // stores urls of all requests logged including ajax requests
var urlscoretable = {};     // stores urls of only web pages and not ajax/xhr
// var url_responsemap = {}; // stores url->response mapping
var queue = new PriorityQueue();             // stores hrefs that are to be visited in the future
var next_eid = 0;           // stores the next element to visit for simple crawler
var num_runs = 0;           // stores number of times the test was rerun
var consumer = '';
var producer = '';
var requestSet = [];
let pages_html = {};
// setup kafka
if(ENABLE_KAFKA){
    const { Kafka } = require('kafkajs')
    // const { Kafka, logLevel } = require('kafkajs')
    const kafka = new Kafka({
        clientId: KAFKA_CLIENT_ID,
        brokers: ['0.0.0.0:9092'],
        // logLevel: logLevel.DEBUG_PRINT
    })
    producer = kafka.producer()
    consumer = kafka.consumer({   groupId: KAFKA_CONSUMER_GROUP,
                                        // minBytes: 1,
                                        // maxBytes: 1e6, 
                                        // maxWaitTimeInMs: 100,  // wait for at most 100ms before receiving new data
                                    })
}

const run = async () => {
    await consumer.connect()
    await consumer.subscribe({ topic: KAFKA_PAGETOPIC, fromBeginning: true })
    await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        var pageurl = message.key.toString(); var score = parseInt(message.value);
        if(DEBUG_PRINT){
            console.log({
                topic: topic,
                partition: partition,
                url: pageurl,
                score: score
            })
        }
        // queue = loadfile('queue.json');
        // queue = queue?queue:[];
        //urlscoretable[pageurl] = score;
        if (urlscoretable[pageurl] === undefined && score == -1){
            queue.push({key: pageurl, event: "", val: score});
            urlscoretable[pageurl] = score;
            printObject(urlscoretable, 'urlscoretable.json');
            printObject(queue, 'queue.json');
        }
        if(score > 0){
            queue.update_val(pageurl, score);
            urlscoretable[pageurl] = score;
            printObject(urlscoretable, 'urlscoretable.json');
            printObject(queue, 'queue.json');
        }
        // console.log(queue.length)
        // printObject(queue, 'queue.json')
    },
    })
}

if(ENABLE_KAFKA){ 
    run().catch(console.error); 
}

const loadCache = function () {
    // returns true if all json files were found and read otherwise false
    var successflag = true;
    var temp_pq = loadfile('queue.json');
    if (temp_pq._heap === undefined) {  // is empty or error loading
        successflag = false;
    } else {
        queue.setheap(temp_pq._heap);
    }
    form_queue = loadfile('form_queue.json');
    form_queue = form_queue?form_queue:global_form_queue[APPNAME];
    next_eid = loadfile('next_eid.json');
    // successflag = next_eid?true:false;   // dont restart crawler if next_eid fails to load
    next_eid = next_eid?next_eid:0;
    urltable = loadfile('urltable.json');
    // successflag = urltable?true:false;  // dont restart crawler if urlscoretable fails to load
    urltable = urltable?urltable:{};
    urlscoretable = loadfile('urlscoretable.json');
    successflag &= urlscoretable?true:false;  
    urlscoretable = urlscoretable?urlscoretable:{};
    //ajax_obj = loadfile('ajax_elements.json');
    //ajax_obj = ajax_obj?ajax_obj:{};
    url_event = loadfile("url_event.json");
    url_event = url_event?url_event:{};
    common_elements = loadfile('public_elements.json');
    common_elements = common_elements?common_elements:{admin: [], userA: [], userB: []};
    cache = loadfile('sim_crawler_cache.json');
    cache = cache?cache:{page: "", seq: 0, form: 0, action: "", stat: "", href: "", navSet: 0, log: 0};
    navigationSet = utils.loadLogFile(cache.navSet + ".json", USER_MODE, SET_FOLDER);
    navigationSet = navigationSet?navigationSet:[];
    xss_PV = loadfile('sim_sinks.json');
    xss_PV = xss_PV?xss_PV:{};
    xss_sources = loadfile('sim_sources.json');
    xss_sources = xss_sources?xss_sources:{};
    //sim_exploredpages = loadfile('sim_exploredpages.json');
    //sim_exploredpages=sim_exploredpages?sim_exploredpages:[];
    form_actions = loadfile('form_actions.json');
    form_actions = form_actions?form_actions:{};
    success_forms = loadfile('success_forms.json');
    success_forms = success_forms?success_forms: {html: [], url: []};
    sim_forms = loadfile('sim_forms.json');
    sim_forms = sim_forms?sim_forms:{};
    form_texts = loadfile('sim_form_texts.json');
    form_texts = form_texts?form_texts:{};
    form_app_keywords = form_app_keywords?form_app_keywords:[];
    for(let i = 0; i < form_app_keywords.length; i++){
        let sentence = form_app_keywords[i];
        sentence = sentence.toLowerCase();
        sentence = sentence.replace(/[^a-z0-9]/gi, '');
        form_app_keywords[i] = sentence;
    }
    // url_responsemap = loadfile('url_responsemap.json');
    // url_responsemap = url_responsemap?url_responsemap:{};
    if(successflag){
        if(DEBUG_PRINT){console.log('Loaded cache successfully.')}
        return true;
    }
    return false; 
}

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

const sendtotopic = async function(producer, pageurl, topic, score) {
    await producer.connect()
    await producer.send({
        topic: topic,
        messages: [
            { key: pageurl, value: score + ''},  // convert score to string
        ],
    })
    await producer.disconnect()
}

const getpagescore = async function (t) {
    // await t.navigateTo(url);    
    var score = 0
    for (let i=0; i<elementsOfInterest.length; i++){
        if(elementsOfInterest[i] == 'a'){
            continue;
        }
        const elements = Selector(elementsOfInterest[i])
        score += await elements.count
    }
    return score;
}


const run_triad = async function(req_url, currentpageurl, req, map=[]){
    let log_req_url = utils.replaceToken(req_url, token_name, "token");
    let log_req_name = utils.extractLogName(log_req_url, baseURI);
    if(replay_cache.visibility == true || MODE != 1){
        if(DEBUG_PRINT) console.log("visbile to attackers, considering it as public pages");
        return 0;
    }
    if(req_url != currentpageurl && !url_400.includes(log_req_url) && !map.includes(log_req_url)){
        let url_A = req.url;
        let url_B = req.url;
        let url_C = req.url;
        if(test_tokens[0] != ""){
            url_A = utils.replaceToken(req_url, token_name, test_tokens[0]);
            url_B = utils.replaceToken(req_url, token_name, test_tokens[1]);
            url_C = utils.replaceToken(req_url, token_name, test_tokens[2]);
        }
        try{
            let respA = await executeRequest(req, url_A, 'get', "", "admin"); 
            let respB = await executeRequest(req, url_B, 'get', "", test_cookies[1]);
            let respC = await executeRequest(req, url_C, 'get', "", test_cookies[2]);
            let responses = utils.loadLogFile(log_req_name, USER_MODE, RESPONSE_FOLDER);
            responses = responses?responses:{}; 
            let triad_responses = {admin: respA.response, userA: respB.response, userB: respC.response}
            let temp = utils.generateReponsePair(responses, triad_responses, common_elements);
            responses = temp[0];
            common_elements = temp[1];
            utils.logObject(responses, log_req_name, RESPONSE_FOLDER);
            printObject(common_elements, "public_elements.json");
            if(respA.status == 400){
                url_400.push(log_req_url);
            }
        }
        catch(e){
            console.error(JSON.stringify(e))
            url_400.push(log_req_url);
        }
    }
}

const payload_detection = function(payloads=[], pageurl=""){
    if(payloads.length != 0){
        if(xss_PV.hasOwnProperty(pageurl)){
            for(let k = 0; k < payloads.length; k++)
            {
                xss_PV[pageurl].push(payloads[k]);
            }
        }
        else{
            xss_PV[pageurl] = payloads;
        }
        printObject(xss_PV, "sim_sinks.json");
    }
}

const waitForReplayer = async function(t){
    cache.stat = "waiting";
    if(DEBUG_PRINT) console.log("waiting for the replayer to check visibility");
    if(DEBUG_PRINT) console.log(cache.seq);
    while(true){
         replay_cache = loadfile('sim_replay_cache.json', 'b');
         replay_cache = replay_cache?replay_cache:{seq: 0, stat: ""};
         if(replay_cache.seq == cache.seq && replay_cache.stat == "checked"){
             break;
         }
         await t.wait(50);
    }
    //console.log("finish waiting");
}

const shuffleQueue = function(){
    for(let i = queue.length - 1; i > 0; i --){
        const j = Math.floor(Math.random() * ( i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }
}

const pathSelection = function(temp_navigationSet){
    let result_navigationSet = [];
    for(let i = 0; i < temp_navigationSet.length; i++){
        let temp_path = temp_navigationSet[i];
        if(temp_path.source == temp_path.sink) continue;
        let rep = 0;
        for(let j = 0; j < result_navigationSet.length; j++){
            let path = result_navigationSet[j];
            if(temp_path.source == path.source && temp_path.sink == path.sink){
                rep = 1;
                break;
            }
        }
        if(rep == 0){
            result_navigationSet.push(temp_path);
        }
    }
    utils.logObject(result_navigationSet, cache.navSet + ".json", SET_FOLDER);
    if(result_navigationSet.length > 200){
        cache.navSet ++;
        result_navigationSet = [];
        printObject(cache, "sim_crawler_cache.json");
    }
    return result_navigationSet;
}

const element_interaction = async function(t, currentpageurl, ele, ele_attr, ele_tagname, attack=1){
    let actions = ['click', 'text', 'upload', 'select'];
    let css_ele = ele_tagname + utils.GenerateCssString(ele_attr).toLowerCase();
    let act_num = 1;
    let page_events = [];
    let innerText = await ele.innerText;
    let log_name = cache.log + ".json";
    let seq_log = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER);
    seq_log = seq_log?seq_log:[];
    if(ele_attr.type == "hidden" || css_ele.includes("password") || css_ele.includes("username")){
        return 0
    }
    if(ele_attr.type == 'submit' || ele_attr.type == 'checkbox' || ele_attr.type == 'button' || ele_attr.type == 'radio' || ele_tagname == 'button' || ele_tagname == 'a'){
        act_num = 0;
    }
    else if(ele_tagname == 'select'){
        act_num = 3;
    }
    else if(css_ele.includes('upload') || ele_attr.type == 'file'){
        act_num = 2;
    }
    if(DEBUG_PRINT) console.log(css_ele + "--->" + actions[act_num]);
    let css_string = (css_ele + innerText).toLowerCase();
    if (!utils.check_url_keywords(css_string, logout_keywords)) {
        return 0;
    }
    if(MODE == 1){
        let timestamp = new Date().getTime();
        try{
            await t.rightClick(ele);
        }catch(e){
            console.log("failed on right-clicking elements");
            return 0;
        }
        page_events = await eventRecord();
        let id_list_right = rrweb.rightClick_analyze(page_events);
        let locators = [];
        //console.log("use element info");
        if(id_list_right.length != 0){
            locators = rrweb.generateLocator(id_list_right[0], global_element_info);
        }else{
            id_list_right.push(0);
            locators = {ancestor: [css_ele], descendants: []};
        }
        locators.innerText = innerText;
        nav_edge = utils.generateEdge(locators.ancestor);
        seq_log.push({css_locators: locators, css_selector: css_ele, action: act_num, timestamp: timestamp, rrwebId: id_list_right[0], edge: nav_edge});
        utils.logObject(seq_log, log_name, LOG_FOLDER);
        if(REPLAY == 1){
            await waitForReplayer(t);
            cache.seq ++;
            printObject(cache, "sim_crawler_cache.json");
        }
    }
    if(actions[act_num] === "text") {
        let innerText = await ele.innerText;
        let css_string = (css_ele + innerText).toLowerCase();
        if (!utils.check_url_keywords(css_string, logout_keywords)) {
            return 0;
        }
        let fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "sim", MODE, APPNAME);
        if(xss_sources[currentpageurl] == undefined){
            xss_sources[currentpageurl] = {};
        }
        if(attack == 0) fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "sim", 0, APPNAME); //this is only for beta-test;
        await t.typeText(ele, fuzz_string, { replace: true, paste: true })
        typed_texts.push(fuzz_string);
        let temp_obj = xss_sources[currentpageurl];
        if(temp_obj[css_ele] == undefined){
            temp_obj[css_ele] = [];
        }
        temp_obj[css_ele].push(fuzz_string);
        xss_sources[currentpageurl] = temp_obj;
        printObject(xss_sources, "sim_sources.json");
        //console.log("Type String: ", fuzz_string);
    }
    if(actions[act_num] === "select"){
        let fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "");
        const options = ele.find('option');
        await t.click(ele);
        await t.click(options.nth(0));
    }
    if(actions[act_num] === "click"){
        if(ele_attr.hasOwnProperty("href")){
            let href_url = ele_attr['href'];
            if(href_url.includes('http') || href_url.includes('www') || href_url.includes('org')){
                let hostname = new URL(href_url).hostname;
                let basehostname = new URL(baseURI).hostname;
                if(hostname != basehostname){
                    return 0;
                }
            }
        }
        if (!utils.check_url_keywords(css_string, heavy_pages) && ele_tagname == "a") {
            return 0;
        }
        await t.click(ele);
    }
    if(actions[act_num] === "upload"){
        await t.setFilesToUpload(ele, ['upload-files/not_kitty.png']);
    }
    return 1;
}

const ajax_elements_interaction = async function(t, currentpageurl, ajax_eles = [], attack){
    let ele_form_interest = ['input', 'textarea', 'select', 'button'];
    let actions = ['click', 'text', 'select', 'upload'];
    if(ajax_eles.length == 0){
        return;
    }
    if(DEBUG_PRINT) console.log("ajax interaction starts");
    for(let i = 0; i < ajax_eles.length; i ++){
        let rrweb_id = ajax_eles[i];
        let element_interact_flag = 0;
        if(global_element_info[rrweb_id] == undefined){
            continue;
        }
        let rrweb_ele = global_element_info[rrweb_id];
        let tagName = rrweb_ele.tag;
        let ele_attr = rrweb_ele.attr;
        if(!ele_form_interest.includes(tagName)){
            continue;
        }
        let css_selector = tagName + utils.GenerateCssString(rrweb_ele.attr);
        const ele = Selector(css_selector).nth(0);
        if(css_selector.includes("hidden") || !(await ele.visible)){
            continue;
        }
        try{
            element_interact_flag = await element_interaction(t, currentpageurl, ele, ele_attr, tagName, attack);
            let page_events = await eventRecord();
            global_element_info = rrweb.record_addtional_element(page_events,  global_element_info)[0];
        }
        catch (e){
            console.error(JSON.stringify(e));
            continue;
        }
    }
    if(DEBUG_PRINT) console.log("ajax interaction finished");
}

const recursive_intercation = async function(t, currentseed={},  eles=Selector(), attack){
    let currentpageurl = currentseed.url;
    let ele_form_interest = ['input', 'textarea', 'select', 'p'];
    let actions = ['click', 'text', 'select', 'upload'];
    let payloads = [];
    let page_events = [];
    if(eles == null){
        return 0;
    }
    let new_element_info = {};
    const elecount = await eles.count;
    for(let j = 0; j < elecount; j ++){
        const ele = eles.nth(j);
        let act_num = 1;
        // let page_events = await eventRecord(); //this is to clear the events.
        if(await ele.visible){
            let page_renew = 0;
            let new_elements = [];
            let ele_attr = await ele.attributes;
            let ele_tagname = await ele.tagName;
            let css_ele = ele_tagname + utils.GenerateCssString(ele_attr).toLowerCase();
            let ele_txt = "";
            if(ele_form_interest.includes(ele_tagname) || (ele_tagname == "button" && css_ele.includes("submit"))){
                try{
                    ele_txt = await ele.innerText;
                }
                catch (e){
                    console.error(JSON.stringify(e))
                    ele_txt = "";
                }
                ele_txt = ele_txt.replace(/[^a-z0-9]/gi,'').toLowerCase();
                if((ele_txt.includes("signin") || ele_txt.includes("login")) && MODE != 5){
                    console.log("signin button detected");
                    await get_cookies(t, login_info[APPNAME]);
                    return 0;
                }
                act_num = 1;
                //console.log(ele_tagname);
                let interact_flag = 1;
                try{
                    interact_flag = await element_interaction(t, currentpageurl, ele, ele_attr, ele_tagname, attack);
                }
                catch(e){
                    console.error(JSON.stringify(e));
                    continue;
                }
                if(interact_flag == 0){
                    if(DEBUG_PRINT) console.log("avoid element");
                    continue;
                }
                let new_url = await getURL();
                payloads = await catchPayload();
                payload_detection(payloads, new_url);
                page_events = await eventRecord();
                //printObject(page_events, "test_events.json");
                if(rrweb.eventURL(page_events) != 0){
                    page_renew = 1;
                    if(DEBUG_PRINT) console.log("page has been renewed");
                    new_element_info = rrweb.handleDOM(page_events);
                    let results = rrweb.record_addtional_element(page_events, new_element_info);
                    new_element_info = results[0];
                    new_elements = results[1];
                    global_element_info = new_element_info;
                }
                else{
                    let results = rrweb.record_addtional_element(page_events,  global_element_info);
                    global_element_info= results[0];
                    new_elements = results[1];
                }
                //console.log(new_elements);
                //printObject(global_element_info, "global_elements.json");
                await ajax_elements_interaction(t, currentpageurl, new_elements, attack);
                new_elements = [];
            }
        }
        let ele_childs = ele.child();
        await recursive_intercation(t, currentseed, ele_childs, attack);
    }
}

const form_submission_check = async function(page_html, form_url, form_method, log_pageurl){
    let sanitized_page = [];
    let end_list = [];
    let form_flag = 0;
    printObject(page_html, "page_html.json");
    try{
        end_list = utils.extractTextFromHTML(page_html, 1);
    }catch{
        console.log("falied to extract text from html");
    }
    let end_flag = 0;
    //printObject(end_list, "sanitized_page.json");
    if(form_texts[form_url] == undefined){
        form_texts[form_url] = typed_texts;
    }
    else{
        for(let i = 0; i < typed_texts.length; i++){
            form_texts[form_url].push(typed_texts[i]);
        }
    }
    printObject(form_texts, "sim_form_texts.json");
    for(let i = 0; i < typed_texts.length; i ++){
        let text = typed_texts[i];
        text = text.split('\\t').join('').split('\\n').join('').split('\\r').join('');
        text = text.replace(/[^a-z0-9]/gi, '');
        for(let j = 0; j < end_list.length; j++){
            let end_node = end_list[j];
            if(end_node.includes(text)){
                end_flag = 1;
                break;
            }
        }
    }
    if(end_flag == 0){
        try{
            sanitized_page = utils.extractTextFromHTML(page_html);
        }catch (e){
            if(DEBUG_PRINT) console.log(e);
        }
        form_flag = utils.check_form_error(sanitized_page, form_app_keywords);
    }
    if(end_flag == 1 || form_flag == 1){
        if(form_method == "post"){
            if(!sim_forms.hasOwnProperty(log_pageurl)){
                sim_forms[log_pageurl] = {};
            }
            let tmp_obj = sim_forms[log_pageurl];
            tmp_obj[form_url] = 1;
            sim_forms[log_pageurl] = tmp_obj;
            printObject(sim_forms, "sim_forms.json");
        }
        appendObjecttoFile(typed_texts, "sim_typed_texts.txt");
    }
}

const crawl_forms = async function(t, currentseed, attack=0){
    logger.clear();
    //request_log_count = 0
    let req_count = checkRequestLogs();
    let element_info = {};
    if(attack == 0) console.log("submit forms")
    if(attack == 1) console.log("attack forms")
    let currentpageurl = currentseed.key;
    let log_pageurl = utils.replaceToken(currentpageurl, token_name, "token");
    await navigate_wrap(t, currentpageurl);
    let event_flag = await event_executor(t, currentseed);
    if(event_flag == 0){
        console.log("js-event execution failed");
        return 0;
    }
    const forms = Selector('form');
    const formcount = await forms.count;
    for(let i = 0; i < formcount; i ++){
        typed_texts = [];
        i = cache.form;
        cache.form ++;
        printObject(cache, "sim_crawler_cache.json");
        if(cache.form > formcount){
            break;
        }
        if(DEBUG_PRINT) console.log("i: ", i, "/", formcount);
        await navigate_wrap(t, currentpageurl);
        await event_executor(t, currentseed);
        let form = forms.nth(i);
        if(!(await form.visible)){
            continue;
        }
        let page_events = await eventRecord();
        element_info = rrweb.handleDOM(page_events);
        element_info = rrweb.DOM_addtional_element(page_events, element_info);
        if(await form.visible){
            let form_attr = await form.attributes;
            let form_url = form_attr.action;
            let form_method = form_attr.method;
            form_url = utils.url_wrapper(form_url, baseURI, path);
            if(form_method == "post"){
                if(!sim_forms.hasOwnProperty(log_pageurl)){
                    sim_forms[log_pageurl] = {};
                }
                let tmp_obj = sim_forms[log_pageurl];
                if(tmp_obj[form_url] == undefined){
                    tmp_obj[form_url] = 0;
                }
                sim_forms[log_pageurl] = tmp_obj;
                printObject(sim_forms, "sim_forms.json");
            }
            if(form_actions[form_attr.action] != undefined){
                form_actions[form_attr.action][0] ++;
            }
            else{
                form_actions[form_attr.action] = [1, 0];
            }
            printObject(form_actions, "form_actions.json");
            if(form_actions[form_attr.action][0] > 10){
                if(DEBUG_PRINT || true) console.log("skip this form, visit more than 10 times");
                continue;
            }
            let css_string = "form" + utils.GenerateCssString(form_attr);
            if(DEBUG_PRINT) console.log(css_string);
            if(css_string.includes("signout")){
                continue;
            }
            let eles = form.child();
            await recursive_intercation(t, currentseed, eles, attack);
            let page_html = await getPageHTML();
            /* let end_list = utils.extractTextFromHTML(page_html, 1);
            printObject(end_list, "end_list.json"); */
            await form_submission_check(page_html, form_url, form_method, log_pageurl)
            /*req_count = checkRequestLogs();
            let deepcopy = JSON.parse(JSON.stringify(logger.requests.slice(logger.requests.length-req_count)));
            for(let j=0; j<req_count; j++) {
                let lastreqlog = deepcopy[deepcopy.length-1-j]
                let req = lastreqlog.request;
                let res = lastreqlog.response;
                if (res === undefined){continue;}
                if(req.method.toLocaleLowerCase() === 'post'){
                    console.log(req);
                }
            }*/

        }   
    }
    let payloads = await catchPayload();
    payload_detection(payloads, currentpageurl);
    cache.form = 0;
    printObject(cache, "sim_crawler_cache.json");
}

const event_executor = async function(t, currentseed, element_info = {}){
    if(currentseed.event.length == 0){
        if(DEBUG_PRINT) console.log("no js event to execute");
        return 1;
    }
    let q_event = currentseed.event;
    let innerText = q_event.innerText;
    let css_pair = [];
    let err_f = 0;
    try {
        css_pair = await pathoptimizer.parseLocator(q_event.attr, baseURI, Selector, q_event.attr, token_name, token_value, innerText, random_names, 1);
    }catch (e){
        console.error(JSON.stringify(e));
        css_pair.push(q_event.attr);
        err_f = 1;
    }
    if(err_f == 1){
        let tmp_cnt = await Selector(css_pair[0]).count;
        css_pair.push(tmp_cnt);
    }
    if(DEBUG_PRINT) console.log(css_pair);
    let element = Selector(css_pair[0]);
    if(css_pair[0].includes("innerText")){
        element = Selector(q_event.tag).withText(innerText);
    }
    let interact_flag = 0;
    if(css_pair[1] > 1){
        if(DEBUG_PRINT) console.log("multiple element selected, select the one that is visible");
        for(let k = 0; k < css_pair[1]; k ++){
            let new_element = element.nth(k);
            if(await new_element.visible) {
                element = new_element
                break;
            }
        }
    }
    if(css_pair[1] == 0){
        if(DEBUG_PRINT) console.log("event element invisible");
        return 0;
    }
    try{
        var elementtag = await element.tagName;
        var elementattr = await element.attributes;
    }
    catch{
        if(DEBUG_PRINT) console.log("failed to capture event_ele attributes");
        return 0;
    }
    try{
        if(DEBUG_PRINT) console.log("execute js event");
        interact_flag = await element_interaction(t, currentseed.url, element, elementattr, elementtag);
        let page_events = await eventRecord();
        global_element_info = rrweb.record_addtional_element(page_events, global_element_info)[0];
    }catch (e){
        console.error(JSON.stringify(e));
        return 0;
    }
    if(interact_flag == 0){
        return 0;
    }
    if(DEBUG_PRINT) console.log("js event execution succeed");
    return 1;
}

const handle_newurl = async function(newpageurl, currentpageurl){
    let log_newurl = utils.replaceToken(newpageurl, token_name, "token");
    let send_url = log_newurl;
    log_newurl = utils.replaceRandom(log_newurl, random_names, "")
    let new_seed = {key: send_url, event: "", val: -1};
    let cluster_results = utils.clusterURL(log_newurl);
    let cluster_flag = cluster_results[0];
    let cluster_url = cluster_results[1];
    if(newpageurl !== currentpageurl && urlscoretable[log_newurl] === undefined && utils.check_url_keywords(log_newurl, heavy_pages)){  // navigate back to current page
        let score = -1;
        //score = Math.floor(Math.random() * 100);
        if(DEBUG_PRINT){console.log("New Page Found: ", newpageurl)};
        if(ENABLE_KAFKA){
            await sendtotopic(producer, send_url , KAFKA_PAGETOPIC, score);
            if(log_newurl != send_url) urlscoretable[log_newurl] = score;
            if(cluster_flag) urlscoretable[cluster_url] = score;
            printObject(urlscoretable, 'urlscoretable.json');
        }
        else{
            urlscoretable[send_url] = score;
            urlscoretable[log_newurl] = score;
            urlscoretable[cluster_url] = score;
            printObject(urlscoretable, 'urlscoretable.json');
            queue.push(new_seed);
            printObject(queue, 'queue.json');
        }
    }
}

const crawl_links = async function(t, currentseed){
    let currentpageurl = currentseed.key;
    console.log("crawl static links");
    await navigate_wrap(t, currentpageurl);
    printObject(logger.requests, "request_logs.json")
    let tmp_html = await getPageHTML();
    printObject(tmp_html, "tmp_html.json");
    let js_flag = await event_executor(t, currentseed);
    if(js_flag == 0){
        console.log("js-event execution failed");
        return 0;
    }
    //let resps = await catchEvents();
    let elements = Selector("a");
    let ele_len = await elements.count;
    if(DEBUG_PRINT) console.log("ele length: ", ele_len);
    for(let i = 0; i < ele_len; i++){
        const ele = elements.nth(i);
        if(!ele.exists){
            continue;
        }
        let ele_attr = await ele.attributes;
        if(ele_attr.hasOwnProperty("href")){
            let href_url = ele_attr['href'];
            if(href_url[0] == "#"){
                continue;
            }
            if(!href_url.includes("http")){
                let tmp_href_components = href_url.split("/");
                let href_components = [];
                for(let k = 0; k < tmp_href_components.length; k++){
                    if(tmp_href_components[k] == "." || tmp_href_components[k] == ".." || tmp_href_components[k] == ""){
                        continue;
                    }
                    href_components.push(tmp_href_components[k]);
                }
                href_url = href_components.join("/");
                href_url = baseURI + path + href_url;
            }
            let hostname = new URL(href_url).hostname;
            let basehostname = new URL(baseURI).hostname;
            if(hostname != basehostname){
                continue;
            }
            let newpageurl = href_url;
            await handle_newurl(newpageurl, currentpageurl);
        }
    }
    //console.log(events);
    //console.log(resps);
}

const crawl_events = async function(t, currentseed){
    let currentpageurl = currentseed.key;
    let js_events = [];
    let req_urlmap = [];
    let count = 0;
    let interact_flag = 0;
    let log_url = utils.replaceToken(currentpageurl, token_name, "token");
    let req_count = checkRequestLogs();
    if(url_event[log_url] != undefined){
        console.log("skip event extraction");
        return 0;
    }
    console.log("crawl events");
    for(let j = 0; j < elementsOfInterest.length; j++){
        await navigate_wrap(t, currentpageurl);
        let elements = Selector(elementsOfInterest[j]);
        let len = await elements.count;
        for(let i = 0; i < len; i++){
            if(DEBUG_PRINT) console.log("ele: ", i, "/", len);
            let element = elements.nth(i);
            if(!await element.visible){
                if(DEBUG_PRINT) console.log("element invisible");
                continue;
            }
            try{
                var elementtag = await element.tagName;
                var elementattr = await element.attributes;
                var elementInnerText = await element.innerText;
            }
            catch{
                console.log("failed to capture the attributes");
                continue;
            }
            if(elementattr.hasOwnProperty('href')){
                if(elementattr['href'].includes('http')){
                    continue;
                }
            }
            let css_ele = elementtag + utils.GenerateCssString(elementattr);
            /* if(css_ele.toLocaleLowerCase().includes("submit")){
                continue;
            } */
            checkRequestLogs();
            try{
                interact_flag = await element_interaction(t, currentpageurl, element, elementattr, elementtag, 0);
                //let ele_az = new element_AZ(element);
                //interact_flag = await ele_az.element_interaction(t);
            }catch(e){
                if(DEBUG_PRINT) console.log("interaction failed");
                console.error(JSON.stringify(e))
            }
            if(interact_flag == 0){
                if(DEBUG_PRINT) console.log("avoid element");
                continue;
            }
            req_count = checkRequestLogs();
            let deepcopy = JSON.parse(JSON.stringify(logger.requests.slice(logger.requests.length-req_count)));
            if (DEBUG_PRINT) console.log("number of requests generated: ", req_count);
            for(let k=0; k<req_count; k++) {
                var lastreqlog = deepcopy[deepcopy.length-1-k]
                var req = lastreqlog.request;
                var res = lastreqlog.response;
                //console.log(req.url);
                if (res === undefined){continue;}
                if(req.method.toLocaleLowerCase() !== 'get'){
                    req_urlmap = [];
                }
                const _hostname = new URL(req.url).hostname; const _basehostname = new URL(baseURI).hostname;
                if((MODE == 1 || MODE == 4) && _hostname == _basehostname && elementtag == "a"){
                    await run_triad(req.url, currentpageurl, req, req_urlmap);
                    let log_req_url = utils.replaceToken(req.url, token_name, "token");
                    let navigationPath = utils.GenerateNavigationPath(nav_edge, log_url, log_req_url);
                    navigationSet.push(navigationPath);
                    req_urlmap.push(log_req_url);
                }
            }
            let url = await getURL();
            if(url != currentpageurl && !url.includes("#")){ //Record the events invoking ajax requests
                await handle_newurl(url, currentpageurl);
                await navigate_wrap(t, currentpageurl);
                continue;
            }
            let events = await eventRecord();
            global_element_info = rrweb.record_addtional_element(events, global_element_info)[0];
            //console.log(events);
            count = rrweb.check_hidden_ele_mark(events);
            //console.log(count);
            let css_selector = {tag: elementtag, attr: css_ele, innerText: elementInnerText};
            if(count > 0){
                let event_identifier = css_selector.attr + css_selector.innerText;
                if(js_events_global[event_identifier] == undefined){
                    js_events_global[event_identifier] = 1;
                }
                else{
                    js_events_global[event_identifier]++;
                }
                printObject(js_events_global, "js_events_global.json");
                if(js_events_global[event_identifier] <= 10){
                    js_events.push(css_selector);
                    let score = -1
                    if(urlscoretable[log_url] != undefined){
                        score = urlscoretable[log_url]
                    }
                    let new_seed = {key: log_url, event: css_selector, val: -1};
                    queue.push(new_seed);
                    printObject(queue, "queue.json");
                }
            }
            await navigate_wrap(t, currentpageurl);
            url_event[log_url] = 1;
            printObject(url_event, "url_event.json");
        }
    }
    navigationSet = pathSelection(navigationSet);
    //console.log(js_events);
}

const navigate_wrap = async function(t, target_url){ //capture the dom after the navigation
    let seqtime = new Date().getTime();
    await t.navigateTo(target_url);
    if(MODE == 1){
        let page_events = await eventRecord();
        let log_name = cache.log + ".json";
        let seq_log = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER);
        seq_log = seq_log?seq_log:[];
        seq_log.push({css_locators: "navigate", timestamp: seqtime}); 
        utils.logObject(seq_log, log_name, LOG_FOLDER);
        if(!rrweb.checkEventCapture(page_events, 2)){
            await t.eval(() => location.reload(true));
            page_events = await eventRecord();
        }
        global_element_info = rrweb.handleDOM(page_events);
        global_element_info = rrweb.DOM_addtional_element(page_events, global_element_info);
    }
}

const loadAndSave = function (key, value, filename) {
    var f = loadfile(filename)
    f = f?f:{}
    f[key] = value
    printObject(f, filename)
}

const check_similarity = async function (url, respA, respB, respC){
    if (!respA.toString() || respA.toString()=="[]" || respA.toString()=="{}"){
        return; // skip triad test on empty responses
    }
    var difflib = require('difflib');
    var simAB = new difflib.SequenceMatcher(null, respA, respB);
    var simBC = new difflib.SequenceMatcher(null, respB, respC);
    var sim_ratioAB = simAB.ratio();
    var sim_ratioBC = simBC.ratio();
    console.log("sim_ratioAB = "+sim_ratioAB)
    console.log("sim_ratioBC = "+sim_ratioBC)
    if (sim_ratioBC-sim_ratioAB <= MARGIN_FACTOR) {  // vulnerable
        console.log("vulnerability found.\n")
        if (ENABLE_KAFKA) {  // send to topic
            await sendtotopic(producer, url, 'triad-topic');
        }
        loadAndSave(url, {simAB: sim_ratioAB, simBC: sim_ratioBC}, 'sc_vulnerable.json')
        // loadAndSave(url, {userA: respA, userB: respB, userC: respC}, 'sc_vulnerable_responses.json')
        // appendObjecttoFile({url: url, simAB: sim_ratioAB, simBC: sim_ratioBC}, 'sc_vulnerable.json')
        appendObjecttoFile({url: url, userA: respA, userB: respB, userC: respC}, 'sc_vulnerable_responses.json')
    }else {
        console.log("Authz passed.\n")
    }
    // for testing MF tuning
    appendObjecttoFile(sim_ratioBC-sim_ratioAB, 'sc_diff.json')
    appendObjecttoFile(sim_ratioBC, 'sc_x.json')
    appendObjecttoFile(sim_ratioAB, 'sc_y.json')
}

const run_triad_on_page = async function(t, url, userAhtml) {
    console.log("Testing page - "+url)
    await t.useRole(USERB)
    await t.navigateTo(url)
    var userBhtml = await getPageHTML();
    await t.useRole(USERC)
    await t.navigateTo(url)
    var userChtml = await getPageHTML();
    
    await check_similarity(url, userAhtml, userBhtml, userChtml);
}

const run_triad_on_req = async function(t, userAlog) {
    var userAreq = userAlog.request
    console.log("Testing request url - "+userAreq.url)
    var respA = ''
    var respAbody = userAlog.response.body
    if(APPNAME !== "humhub") {
        const zlib = require('zlib');
        try {
            respA = zlib.unzipSync(new Buffer.from(respAbody)).toString()  // unzip before converting to string
        }
        catch(err) {
            console.log(err)
            try {  // if the data was not compressed
                var resp = new Buffer.from(respAbody)
                respA = resp.toString()
            }catch(e) {
                console.log(e)
                return
            }
        }
    }else {
        respA = respAbody
    }
    // console.log(respA)
    // console.log(checkRequestLogs())
    await t.useRole(USERB)
    // console.log(checkRequestLogs())
    var userBcookie = logger.requests[logger.requests.length -1].request.headers.cookie
    var respB = await executeRequest(userAreq, userBcookie)
    await t.useRole(USERC)
    // console.log(checkRequestLogs())
    var userCcookie = logger.requests[logger.requests.length -1].request.headers.cookie
    var respC = await executeRequest(userAreq, userCcookie)
    if (respB.status !== 'success' || respC.status !== 'success') {
        if(DEBUG_PRINT){console.log("RespB error = "+respB.error+"\nRespC error = "+respC.error)}
        return;
    }
    respB = respB.response; respC = respC.response; 
    
    await check_similarity(userAreq.url, respA, respB, respC);
}

const get_cookies = async function(t, currenturl){
    let error_url = utils.replaceToken(currenturl, token_name, "token");
    //let error_name = utils.extractLogName(error_url, baseURI);
    let error_name = cache.log + ".json";
    let error_seq = utils.loadLogFile(error_name, USER_MODE, LOG_FOLDER);
    let timeStamp = new Date().getTime();
    let cookie_list = loadfile("sim_cookies.json");
    cookie_list = cookie_list?cookie_list:[];
    error_seq = error_seq?error_seq:[];
    error_seq.push({css_locators: "restart", timestamp: timeStamp});
    utils.logObject(error_seq, error_name, LOG_FOLDER);
    let temp_url = "";
    if(MODE == 1){
        await t.useRole(Role.anonymous());
        await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
        temp_url = await getURL();
        for(let j = 0; j < 5; j++){
            if(APPNAME != "phpbb"){
                break;
            }
            try{
                await login(t, APPNAME, temp_url, login_info['filter'], login_info['password']);
                temp_url = await getURL();
            }
            catch{
                break;
            }
        }
        test_cookies[1] = logger.requests[logger.requests.length -1].request.headers.cookie;
        temp_url = await getURL();
        test_tokens[1] = utils.ExtractToken(temp_url, token_name);

        await t.useRole(Role.anonymous());
        await login(t, APPNAME, login_info[APPNAME], login_info['userB'], login_info['password']);
        temp_url = await getURL();
        for(let j = 0; j < 5; j++){
            if(APPNAME != "phpbb"){
                break;
            }
            try{
                await login(t, APPNAME, temp_url, login_info['userB'], login_info['password']);
                temp_url = await getURL();
            }
            catch{
                break;
            }
        } 
        test_cookies[2] = logger.requests[logger.requests.length -1].request.headers.cookie;
        temp_url = await getURL();
        test_tokens[2] = utils.ExtractToken(temp_url, token_name);
    }
    
    await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
    console.log(currenturl);
    temp_url = await getURL()
    for(let j = 0; j < 5; j++){
        if(APPNAME != "phpbb"){
            break;
        }
        try{
            await login(t, APPNAME, temp_url, login_info['crawler'], login_info['password']);
            temp_url = await getURL();
        }
        catch{
            break;
        }
    }
    await second_login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
    //keep trying login if not succeed, maximum times is set to 5
    for (let j = 0; j < 5; j++){
        try{
            await second_login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
        }
        catch{
            break;
        }
    }
    temp_url = await getURL();
    console.log("url after login: ", temp_url);
    test_tokens[0] = utils.ExtractToken(temp_url, token_name);
    token_value = test_tokens[0]
    let log_temp_url = await utils.replaceToken(temp_url, token_name, "token");
    //console.log(log_temp_url);
    test_cookies[0] = logger.requests[logger.requests.length -1].request.headers.cookie;
    cookie_list.push(test_cookies[0]);
    printObject(cookie_list, "sim_cookies.json")
    console.log(test_cookies);
}


const runcrawler = async function(t) {
    let beginning = 0;
    while (1) {      // Start BFS
        // in case session out
        if(queue.size() == 0){
            await t.wait(5000);
            continue;
        }
        //shuffleQueue();
        let currentseed = queue.shift();
        //sim_exploredpages.push(queue[0]);
        printObject(currentseed, "last_page.json");
        appendObjecttoFile(currentseed, 'sim_exploredpages.txt');
        printObject(queue, 'queue.json');
        cache.seq = 0;
        cache.log++;
        printObject(cache, "sim_crawler_cache.json");
        beginning ++;
        currentseed.key = form_queue.shift();
        currentseed.event = ""
        printObject(form_queue, "form_queue.json");
        /* currentseed = {
            "key": "http://evocrawl1.csl.toronto.edu:8080/wp-admin/post.php?post=1&action=edit",
            "event":""
        }; */
        currentseed.key = utils.replaceToken(currentseed.key, token_name, token_value);
        console.log("current seed: ", JSON.stringify(currentseed));
        if(url_event[currentseed.key] != undefined){
            url_event[currentseed.key] ++;
            printObject(url_event,  "url_event.json");
            if(url_event[currentseed.key] > 15){
                continue;
            }
        }
        cache.page = currentseed.key;
        printObject(cache, "sim_crawler_cache.json");
        //console.log("Current queue length = " + queue.length);
        //MODE=1 --> IDOR, MODE=2 --> TOKEN, MODE=3 --> XSS, MODE=5 --> privacy link extraction
        try{
            await crawl_links(t, currentseed);
        }catch(e){
            console.log(e);
        }
        try{
            if (MODE != 5) await crawl_events(t, currentseed);
        }catch(e){
            console.log(e);
        }
        try{
            if (MODE != 5) await crawl_forms(t, currentseed, 0);
            if(MODE == 3) await crawl_forms(t, currentseed, 1);
        }catch(e){
            console.log(e);
        }
    }
    printObject(queue, 'queue.json');
    console.log("Queue finished! Restarting Simple Crawling!");
    // re iterate through the app starting from baseURI
    //queue.push(baseURI);
    // clear the urlscoretable to allow second run
    urlscoretable = {};   
    printObject(urlscoretable, 'urlscoretable.json');
    urltable = {};
    printObject(urltable, 'urltable.json');
}

//bw_scripts = BW_JS('crawl/', 'js');

fixture `Fuzzer`
    .page(login_info[APPNAME])
    .requestHooks(logger)
    .clientScripts({path: '../node_modules/rrweb/dist/record/rrweb-record.min.js', page: baseRE}, {path: 'attack-js/event.js', page: baseRE});

test
    ('Simple Crawler', async t => {
        if(token_info.hasOwnProperty(APPNAME)){
            token_name = token_info[APPNAME];
        }
        console.log("token_name: ", token_name);
        let start_url = login_info[APPNAME];
        if(MODE != 5) await get_cookies(t, login_info[APPNAME]);
        await t.setNativeDialogHandler(() => true);  // handle pop up dialog boxes;
        await t.maximizeWindow();  // less complex ui when the window size is largest
        // baseURI = await getURL();       
        if(!loadCache()) {
            console.log('Cache files not detected. \nStarting scan from scratch...')
            let initial_url = await getURL();
            saveConfig();
            token_value = utils.ExtractToken(initial_url, token_name);
            initial_url = utils.replaceToken(initial_url, token_name, "token");
            printObject(cache, "sim_crawler_cache.json");
            if(!start_url.includes("login") && APPNAME=="impresscms"){ //make this specifi for impresscms for now.
                initial_url = start_url;
            }
            let q_seed = {key: initial_url, event: "",  score: -1};
            if(ENABLE_KAFKA){
                await sendtotopic(producer, initial_url, KAFKA_PAGETOPIC, -1);
            }
            queue.push(q_seed);  // do not add baseURI to urlscoretable here
            printObject(queue, 'queue.json');
            urlscoretable[initial_url] = 1;
            printObject(urlscoretable, "urlscoretable.json");
            // console.log("Starting queue length = " + queue.length);
        }
        // run the crawler;
        await runcrawler(t);
}).disablePageCaching;

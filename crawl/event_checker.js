import { Selector, RequestLogger, ClientFunction, Role } from 'testcafe';
import {login, extractBaseUrl, second_login} from '../utils-evo/login';
import http from 'http';
import { time } from 'console';
import { loadLogFile } from '../utils-evo/utils';

const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab'; // default gitlab
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE.toLowerCase():'a'; // default 'userA'
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + "_bw/";
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
const XSS_MODE = process.env.XSS_MODE?process.env.XSS_MODE:0;
const DEBUG_PRINT = process.env.DEBUG_PRINT=="1"?true:false;  // default - disable debug logs
const ENABLE_KAFKA = process.env.ENABLE_KAFKA=="1"?true:false;  // default - disable kafka connection

const applogin = require('./userroles.js');
const rrweb = require('../utils-evo/rrweb_events');
const utils = require('../utils-evo/utils');
const login_info = require('../utils-evo/login_information.json');
const token_info = require('../utils-evo/random_names.json');
const path_info = require('../utils-evo/path.json')
const pathoptimizer = require("../replay/pathoptimizer");
const form_error = require("../utils-evo/form_error.json");
const bw_info = require("../utils-evo/bw_info.json");
let baseURI = extractBaseUrl(login_info[APPNAME]);
let folder = login_info['folder'];
baseURI = baseURI + folder;
let baseRE = new RegExp(baseURI.slice(0, -1));
var urlobj = new URL(baseURI)
let bwbaseURI = bw_info[APPNAME]
bwbaseURI=bwbaseURI?bwbaseURI:baseURI;
let path = path_info[APPNAME];
path = path?path:"";
let form_app_keywords = form_error[APPNAME];
const PORT = urlobj.port?urlobj.port:'80';
let cache = {page: "", seq: 0, form: 0, action: "", stat: "", href: "", navSet: 0, log: 0};
let replay_cache = {seq: 0, stat: "", visibility: false};
let random_names = {};
let token_name = login_info['token'];
let token_value = '';
let test_cookies = [];
let test_tokens = [];
let url_400 = [];
let common_elements = {admin: [], userA: [], userB: []}
let xss_PV = {};
let xss_sources = {};
let bw_scripts = [];
let url_event = {};
let sim_exploredpages = [];
let form_actions = {};
let js_events_global = {};
let success_forms = {html: [], url: []};
const elementsOfInterest = ['input','button','textarea','select','a'];
var request_log_count = 0;
let ajax_obj = {};
let error_log = {};
let navigationSet = [];
const block_pages = login_info["block_pages"];
const heavy_pages = login_info["heavy_pages"];

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(DATA_FOLDER + "sim.log", {flags : 'w'});
var log_stdout = process.stdout;
console.log = function(d) {
    let message = ''
    for(let i = 0; i < arguments.length; i++)
    {
        message = message + ' ' + String(arguments[i]);
    }
    log_file.write(util.format(message) + '\n');
    log_stdout.write(util.format(message) + '\n');
};
console.error = function(d) {
    let message = ''
    for(let i = 0; i < arguments.length; i++)
    {
        message = message + ' ' + String(arguments[i]);
    }
    log_file.write(util.format(message) + '\n');
    log_stdout.write(util.format(message) + '\n');
};

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

const BW_JS = function(prefix="", set_name=""){
    let scripts = [];
    const fs = require('fs');
    let files = fs.readdirSync(prefix + set_name);
    files.forEach(file => {
        scripts.push(set_name + "/" +file);
    });
    return scripts;
}


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
            START_TIME: timeStamp
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
var queue = [];             // stores hrefs that are to be visited in the future
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
        var pageurl = message.key.toString(); var score = message.value.toString();
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
        if (urlscoretable[pageurl] === undefined){
            queue.push({url: pageurl, event: ""});
            urlscoretable[pageurl] = 1;
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
    queue = loadfile('event_edge.json');
    successflag = queue?true:false;
    queue = queue?queue:[];
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
    random_names = token_info[APPNAME];
    if(random_names == undefined){
        random_names = {};
    }
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
            { key: pageurl, value: score+'' },  // convert score to string
        ],
    })
    await producer.disconnect()
}



const element_interaction = async function(t, currentpageurl, ele, ele_attr, ele_tagname, element_info, attack=1){
    let actions = ['click', 'text', 'select', 'upload'];
    let css_ele = ele_tagname + utils.GenerateCssString(ele_attr).toLowerCase();
    let act_num = 1;
    if(ele_attr.type == "hidden" || css_ele.includes("password") || css_ele.includes("username")){
        return 0
    }
    if(ele_attr.type == 'submit' || ele_attr.type == 'checkbox' || ele_attr.type == 'button' || ele_attr.type == 'radio' || ele_tagname == 'button' || ele_tagname == 'a'){
        act_num = 0;
    }
    else if(ele_tagname == 'select'){
        act_num = 2;
    }
    else if(css_ele.includes('upload') || ele_attr.type == 'file'){
        act_num = 3;
    }
    if(DEBUG_PRINT) console.log(css_ele + "--->" + actions[act_num]);
    if(actions[act_num] === "text") {
        let innerText = await ele.innerText;
        let css_string = (css_ele + innerText).toLowerCase();
        if (!utils.check_url_keywords(css_string, heavy_pages)) {
            return 0;
        }
        let fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "sim", MODE);
        if(xss_sources[currentpageurl] == undefined){
            xss_sources[currentpageurl] = {};
        }
        if(attack == 0) fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "sim", 0); //this is only for beta-test;
        await t.typeText(ele, fuzz_string, { replace: true, paste: true })
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
        let fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "sim");
        const options = element.find('option');
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
        let innerText = await ele.innerText;
        let css_string = (css_ele + innerText).toLowerCase();
        if (!utils.check_url_keywords(css_string, heavy_pages)) {
            return 0;
        }
        await t.click(ele);
    }
    if(actions[act_num] === "upload"){
        await t.setFilesToUpload(ele, ['upload-files/not_kitty.png']);
    }
    return 1;
}


const event_executor = async function(t, currentseed){
    if(currentseed.event.length == 0){
        if(DEBUG_PRINT) console.log("no js event to execute");
        return 1;
    }
    let q_event = currentseed.event;
    let innerText = q_event.innerText;
    let css_pair = [];
    try {
        css_pair = await pathoptimizer.parseLocator(q_event.attr, baseURI, Selector, q_event.attr, token_name, token_value, innerText, random_names, 1);
    }catch{
        css_pair.push(q_event.attr);
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
        interact_flag = await element_interaction(t, currentseed.url, element, elementattr, elementtag, {});
    }catch{
        if(DEBUG_PRINT) console.log("event interaction failed");
        return 0;
    }
    if(interact_flag == 0){
        return 0;
    }
    if(DEBUG_PRINT) console.log("js event execution succeed");
    return 1;
}

const get_cookies = async function(t, currenturl){
    let cookie_list = loadfile("sim_cookies.json");
    cookie_list = cookie_list?cookie_list:[];
    await login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
    for(let j = 0; j < 5; j++){
        if(APPNAME != "phpbb"){
            break;
        }
        try{
            await login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
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
    let temp_url = await getURL();
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

const getElementsByXPath = Selector(xpath => {
    const iterator = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    const items = [];

    let item = iterator.iterateNext();

    while (item) {
        items.push(item);
        item = iterator.iterateNext();
    }

    return items;
});


const event_extract = function(end_event){
    end_event = end_event.replace("Event", "").replace("(", "").replace(")", "").replace(" ", "");
    let end_event_comps = end_event.split(",");
    let end_event_method = end_event_comps[0];
    let end_event_addr = end_event_comps[1];
    end_event = {method: end_event_method, addr: end_event_addr};
    return end_event
}

const extract_event_url = function(edge){
    let end_node = edge.split('-');
    let raw_url = end_node[end_node.length - 1];
    raw_url = raw_url.replace(/\s/g, "");
    let url = raw_url.split("]")[1];
    return url;
}

const generate_seed = function(currentseed){
    let events = [];
    events.push(event_extract(currentseed.event));
    let cur_url = extract_event_url(currentseed.edge);
    cur_url = cur_url.replace(bwbaseURI, baseURI);
    let event_seed = {url: cur_url, events: events};
    return event_seed
}

const event_check = async function(t, currentseed){
    let seed = generate_seed(currentseed);
    console.log(JSON.stringify(seed));
    await t.navigateTo(seed.url);
    let js_events = await eventRecord();
    let events = seed.events;
    for(let i = 0; i < events.length; i++){
        let event = events[i];
        console.log(event.addr);
        let ele = getElementsByXPath(event.addr)
        let tmp_cnt = await ele.count;
        if(tmp_cnt >= 1){
            await t.click(ele);
            js_events = await eventRecord();
        }
    }
    await t.wait(1000);
}

const runcrawler = async function(t) {
    let beginning = 0;
    cache.seq = 0;
    printObject(cache, "sim_crawler_cache.json");
    for(let i = 0; i < queue.length; i ++) {      // Start BFS
        // in case session out
        i = cache.seq;
        cache.seq ++;
        printObject(cache, "sim_crawler_cache.json");
        let currentseed = queue[0];
        try{
            await event_check(t, currentseed);
        }catch(e){
            console.error(e);
        }
        break;
    }
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
    .page(baseURI)
    .requestHooks(logger)
    .clientScripts({path: '../node_modules/rrweb/dist/record/rrweb-record.min.js', page: baseRE}, {path: 'attack-js/event.js', page: baseRE});

test
    ('Simple Crawler', async t => {
        let start_url = login_info[APPNAME];
        await get_cookies(t, login_info[APPNAME]);
        await t.setNativeDialogHandler(() => true);  // handle pop up dialog boxes;
        await t.maximizeWindow();  // less complex ui when the window size is largest
        loadCache();
        // run the crawler;
        await runcrawler(t);
}).disablePageCaching;
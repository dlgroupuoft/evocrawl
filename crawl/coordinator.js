import { Selector, RequestLogger, ClientFunction, Role, t } from 'testcafe';
import http from 'http';
import {login, extractBaseUrl, extra_steps, second_login} from '../utils-evo/login';
import { url } from 'inspector';

const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab'; // default gitlab
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE.toLowerCase():'a'; // default 'userA'
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + "/coordinator/";
const KAFKA_PAGETOPIC = APPNAME+'-'+USER_MODE+'-pageurls-topic';
const REPLAY = process.env.REPLAY?process.env.REPLAY:0;
const KAFKA_CLIENT_ID = APPNAME+'-'+USER_MODE+'-CO'
const KAFKA_CONSUMER_GROUP = APPNAME+'-'+USER_MODE+'-CO'
const MODE = process.env.MODE?process.env.MODE:3;

const DEBUG_PRINT = process.env.DEBUG_PRINT=="1"?true:false;  // default - disable debug logs
const ENABLE_KAFKA = process.env.ENABLE_KAFKA=="1"?true:false;  // default - disable kafka connection

const rrweb = require('../utils-evo/rrweb_events');
const utils = require('../utils-evo/utils');
const login_info = require('../utils-evo/login_information.json');
const token_info = require('../utils-evo/token_names.json');
const path_info = require('../utils-evo/path.json');
const pathoptimizer = require("../replay/pathoptimizer");
const form_success = require("../utils-evo/form_success.json");

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(DATA_FOLDER + "co.log", {flags : 'a'});
var log_stdout = process.stdout;
var consumer = '';
var producer = '';
let token_name = "";
let token_value = "";
let baseURI = extractBaseUrl(login_info[APPNAME]);
let baseRE = new RegExp(baseURI.slice(0, -1));
let queue = [];
let urlscoretable = {};
let urltable = {};
let explore_pages = [];
let path = path_info[APPNAME];
path = path?path:"";

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

const getURL = ClientFunction(() => window.location.href);
const getPageHTML = ClientFunction(() => document.documentElement.outerHTML);

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
        if(DEBUG_PRINT && false){
            console.log({
                topic: topic,
                partition: partition,
                url: pageurl,
                score: score
            })
        }
        pageurl = utils.replaceToken(pageurl, token_name, "token");
        if (urltable[pageurl] === undefined){
            queue.push({url: pageurl, event: ""});
            urlscoretable[pageurl] = 1;
            urltable[pageurl] = 1;
            utils.logObject(urlscoretable, 'urlscoretable.json', DATA_FOLDER);
            utils.logObject(queue, 'queue.json', DATA_FOLDER);
        }
    },
    })
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

const get_cookies = async function(t, currenturl){
    let temp_url = "";
    await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
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
    token_value = utils.ExtractToken(temp_url, token_name);
    queue.push({url: utils.replaceToken(temp_url, token_name, "token"), event: ""});
    //console.log(log_temp_url);
}

const appendObjecttoFile = async function(obj, name) {
    // name is filename that contains array of obj
    var fs = require('fs');
    var logStream = fs.createWriteStream(DATA_FOLDER+USER_MODE+'_'+name, {flags: 'a'});
    // use {flags: 'a'} to append and {flags: 'w'} to erase and write a new file
    logStream.write(JSON.stringify(obj)+'\n');
    logStream.end();
}

const loadCache = function(){
    queue = utils.loadLogFile("queue.json", USER_MODE, DATA_FOLDER)
    queue = queue?queue:[];
    urlscoretable = utils.loadLogFile("urlscoretable.json", USER_MODE, DATA_FOLDER)
    urlscoretable = urlscoretable?urlscoretable:{};
    explore_pages = utils.loadLogFile("explore_pages.json", USER_MODE, DATA_FOLDER);
    explore_pages = explore_pages?explore_pages:[];
}

const getpagescore = async function(t, pageurl){
    console.log(pageurl)
    pageurl = utils.replaceToken(pageurl, token_name, token_value)
    await t.navigateTo(pageurl);
    let log_url = utils.replaceToken(pageurl, token_name, "token");
    let elements = Selector("a");
    let ele_len = await elements.count;
    let anchor_score = 0;
    for(let i = 0; i < ele_len; i++){
        let flag = false;
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
            href_url = utils.url_wrapper(href_url, baseURI, path);
            href_url = utils.replaceToken(href_url, token_name, "token")
            for(let url in urlscoretable){
                if(utils.string_backward_match(url, href_url)){
                    flag = true;
                    break;
                }
            }
            let hostname = new URL(href_url).hostname;
            let basehostname = new URL(baseURI).hostname;
            if(hostname != basehostname){
                continue;
            }
            if(!flag){
                console.log("new url: ", href_url);
                urlscoretable[href_url] = 1;
                anchor_score += 1;
            }
        }
    }
    let form_elements = Selector("form");
    let form_len = await form_elements.count;
    urlscoretable[log_url] = anchor_score + form_len * 2;
    if(ENABLE_KAFKA){
        try{
            await sendtotopic(producer, log_url, KAFKA_PAGETOPIC, anchor_score + form_len * 3);
        }catch(e){
            console.log("sendtotopic error: ", e);
        }
    }
    utils.logObject(urlscoretable, 'urlscoretable.json', DATA_FOLDER);
    utils.logObject(urltable, "urltable.json", DATA_FOLDER);
}

const coordination = async function(t){
    while(1){
        if(queue.length < 1){ // the score of page can be dynamic, re-evaluate pages when the queue is empty
            await t.wait(5000);
            let length = explore_pages.length;
            let start = Math.floor(Math.random() * length);
            if(length < 500){
                queue = explore_pages;
            }else{
                end = length - 1;
                if (end - start > 500){
                    end = start + 498;
                }
                queue = explore_pages.slice(start, end);
            }
            utils.logObject(queue, 'queue.json', DATA_FOLDER);
            console.log("queue length: ", queue.length);
        }
        console.log("start coordination");
        let currentpage = queue[0];
        appendObjecttoFile(queue[0], 'exploredpages.txt');
        queue.shift();
        if(!explore_pages.includes(currentpage)){
            explore_pages.push(currentpage);
        }
        utils.logObject(explore_pages, 'explore_pages.json', DATA_FOLDER);
        try{
            await getpagescore(t, currentpage.url);
        }catch(e){
            console.log("getpagescore error: ", e);
        }
        utils.logObject(queue, 'queue.json', DATA_FOLDER);
    }
}

if(ENABLE_KAFKA){ 
    run().catch(console.error); 
}


fixture `Fuzzer`
    .page(login_info[APPNAME])
    .clientScripts({path: '../node_modules/rrweb/dist/record/rrweb-record.min.js', page: baseRE}, {path: 'attack-js/event.js', page: baseRE});

test
    ('Coordinator', async t => {
        if(token_info.hasOwnProperty(APPNAME)){
            token_name = token_info[APPNAME];
        }
        loadCache();
        console.log("token_name: ", token_name);
        let start_url = login_info[APPNAME];
        await get_cookies(t, login_info[APPNAME]);
        await t.setNativeDialogHandler(() => true);  // handle pop up dialog boxes;
        await t.maximizeWindow();  // less complex ui when the window size is largest
        // baseURI = await getURL();       
        await coordination(t);
}).disablePageCaching;


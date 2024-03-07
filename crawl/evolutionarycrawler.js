// windows > testcafe chrome:headless evolutionarycrawler.js -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 5000 > tests.log
// ubuntu  > testcafe 'chrome --headless --no-sandbox' main.js -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 5000 > tests.log
// ubuntu custom testcafe - 
// > node ../../testcafe/bin/testcafe.js 'chrome --headless --no-sandbox' main.js -e -u --disable-multiple-windows -q --ajax-request-timeout 4000 --selector-timeout 5000
// current issues : Done --> 1. browser hangs for some actions; testcafe handles this by restarting browser however
//                  the number of restarts are limited to three.
//                  2. Handle <a> links that are invisible initially but become visible after some user action
//                      Ex. choosing from drop down menu, nav bar, modals, pop up dialog forms...
//                  3. The number of unique urls may depend on user activity. Ex. creating new resource creates 
//                      a new url to get/modify/delete that resource
// install testcafe $ npm i testcafe@1.10.1

import PriorityQueue from './pqueue'
import { Selector, RequestLogger, ClientFunction, Role, t } from 'testcafe';
import http from 'http';
import {login, extractBaseUrl, extra_steps, second_login} from '../utils-evo/login';

const applogin = require('./userroles.js');
const login_info = require('../utils-evo/login_information.json');
const utils = require("../utils-evo/utils");
const rrweb = require("../utils-evo/rrweb_events");
const pathoptimizer = require("../replay/pathoptimizer");
const token_info = require('../utils-evo/token_names.json');
const form_success = require("../utils-evo/form_success.json");
const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab'; // default gitlab
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE.toLowerCase():'a'; // default 'userA'
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:'data/'+APPNAME+'/';
const REPLAY = process.env.REPLAY?process.env.REPLAY:0;
const MODE = process.env.MODE?process.env.MODE:3;
const XSS_MODE = process.env.XSS_MODE?process.env.XSS_MODE:0;
const BLIND = process.env.BLIND?process.env.BLIND:0;
const LOG_FOLDER = DATA_FOLDER + 'ev_log/';
const SET_FOLDER = DATA_FOLDER + 'ev_set/';
const RESPONSE_FOLDER = DATA_FOLDER + 'ev_responses/';
const KAFKA_ALLTOPIC = APPNAME+'-'+USER_MODE+'-allurls-topic';
const KAFKA_PAGETOPIC = APPNAME+'-'+USER_MODE+'-pageurls-topic';
const KAFKA_CLIENT_ID = APPNAME+'-'+USER_MODE+'-EC';
const KAFKA_CONSUMER_GROUP = APPNAME+'-'+USER_MODE+'-EC' + BLIND;
const MARGIN_FACTOR = process.env.MF?process.env.MF:0.1;
const DEBUG_PRINT = process.env.DEBUG_PRINT=="1"?true:false;  // default - disable debug logs
const ENABLE_KAFKA = process.env.ENABLE_KAFKA=="1"?true:false;  // default - disable kafka connection
//const heavy_pages = login_info["heavy_pages"];
const heavy_pages = [];
const logout_keywords = login_info["logout_keywords"];
let form_app_keywords = form_success[APPNAME];
let baseURI = extractBaseUrl(login_info[APPNAME]);
baseURI += login_info['folder'];
let baseRE = new RegExp(baseURI.slice(0, -1));
console.log("baseURI: ", baseURI);
var urlobj = new URL(baseURI);
const PORT = urlobj.port?urlobj.port:'80';

const parameters = {
    small: [10, 5, 8], //used to be 5
    medium: [10, 6, 6],
    Large: [10, 6, 6]
}

const GENE_REWARD_NOVELTY = 1;
const GENE_PENALTY_SEVERE = 0.75;
const GENE_PENALTY_MILD = 0.9;
const GENE_PENALTY_NONE = 1;

const SEQ_INIT_SCORE = 100;
const SEQ_REWARD_NEWREQ = 15;
const SEQ_REWARD_FORM = 40;
const SEQ_REWARD_HIDDEN = 15; //15
const SEQ_REWARD_TYPEABLE = 20; //20
const SEQ_REWARD_UPLOADFILE = 20;
const SEQ_REWARD_SELECT = 12;
const SEQ_PENALTY_HIGH = -10;
const SEQ_PENALTY_SMALL = -2;
const SEQ_PENALTY_MEDIUM = -6;

const RAND_POP_GENERATE = 0.5;

var num_runs = 0;

let elementsOfInterest = [];

if(BLIND == 0){
    elementsOfInterest = ['input','button','textarea','select'];
}
else if(BLIND == 2){
    elementsOfInterest = ['input','button','textarea', 'a', 'select'];
}

const interactions = ['click', 'typetext', 'uploadfile', 'select', 'iframe'];

var request_log_count = 0;

let averageFs = [];
let cache = {page: "", seq: 0, action: "", stat: "", href: "", navSet: 0, log: 0};
let replay_cache = {seq: 0, stat: "", visibility: false};
let token_name = "";
let token_value = "";
let test_cookies = [];
let test_tokens = [];
let url_400 = [];
let req_urlmap = [];
let common_elements = {admin: [], userA: [], userB: []}
let temp_identifier = 0;
let random_names = {};
let xss_sources = {};
let xss_sinks = {};
let checked_hidden = [];
let success_forms = {html: [], url: []};
let page_value = 0;
let typed_texts = [];
let ev_forms = {};
let average_scores = [];
let form_texts = {};
let login_status = 0;

const logger = RequestLogger(request => {
    // console.log(request.headers.accept)
    const hostname = new URL(request.url).hostname; const basehostname = new URL(baseURI).hostname;
    return (hostname===basehostname) 
        /* && ( /text\/html/.test(request.headers.accept) || /text\/plain/.test(request.headers.accept) 
        || /application\/json/.test(request.headers.accept)) */
},
{
    logRequestHeaders: true,
    logRequestBody: true,
    stringifyRequestBody: true,
    logResponseHeaders: true,
    logResponseBody: true,
    stringifyResponseBody: APPNAME==="humhub"?true:false,  // humhub does not need to uncompress before stringify
});

const printObject = function(obj, name, folder=DATA_FOLDER) {
    //if(DEBUG_PRINT){console.log("Printing Object = "+USER_MODE+'_'+name)}
    const fs = require('fs');
    fs.writeFileSync(folder+USER_MODE+'_'+name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const appendObjecttoFile = async function(obj, name) {
    // name is filename that contains array of obj
    var fs = require('fs');
    var logStream = fs.createWriteStream(DATA_FOLDER+USER_MODE+'_'+name, {flags: 'a'});
    // use {flags: 'a'} to append and {flags: 'w'} to erase and write a new file
    logStream.write(JSON.stringify(obj)+',\n');
    logStream.end();
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
            MODE: MODE,
            TOKEN: token_name,
            KAFKA_ALLTOPIC:KAFKA_ALLTOPIC, 
            KAFKA_PAGETOPIC:KAFKA_PAGETOPIC,
            KAFKA_CLIENT_ID:KAFKA_CLIENT_ID,
            KAFKA_CONSUMER_GROUP:KAFKA_CONSUMER_GROUP,
            MARGIN_FACTOR:MARGIN_FACTOR,
            START_TIME: timeStamp,
        },
        "evconfig.json");
}


// Returns the number of requests logged since last calling this function
const checkRequestLogs = function () {
    if (request_log_count != logger.requests.length){
        var num_req_generated = logger.requests.length - request_log_count;
        request_log_count = logger.requests.length;
        return num_req_generated
    }
    return 0
}

function array_get(){
    let temp_events = events;
    events = [];
    return temp_events;
}

const catch_payload = function(){
    let temp_xss = nums_authzee;
    nums_authzee = [];
    return temp_xss;
}

const getURL = ClientFunction(() => window.location.href);
const getPageHTML = ClientFunction(() => document.documentElement.outerHTML);
const eventRecord = ClientFunction(array_get);
const catchPayload = ClientFunction(catch_payload);

var ev_urltable = {};          // stores urls of all requests logged including ajax requests
// var urlscoretable = {};     // stores urls of only web pages and not ajax/xhr
var total_ev_urltable = {};

let dynamicElements = {};
let dynamicValues = [];
let error_log = {};
let navigationSet = [];
var pqueue = new PriorityQueue();    // an instance of the PriorityQueue Class in pqueue.js file; stores urls in a priority queue
var visitedpagestable = {}; // stores urls in the exploitqueue as an object for fast O(1) fetch; stores history of urls
var requestSet = [];
var monit_cache = {};
var seq_req_post = {};
var seq_req_other = {};
var seq_req_500 = {};
var total_visitedpagestable = {};
var dependantelements = {}; // key is {e_id, a_id} gene and value is a list of e_ids that become visible after executing that gene
var genescoremap = {};      // stores score of a gene. This score represents the gene's desirability+novelty. 
                            // Used during sanitization/mutation. A gene is a {element_id, action_id} object. 
                            // key is stringified gene, value is score(this is different from sequence score).
                            // We need genescoremap because the genetic algo is slow due to async waits for the server to respond. 
                            // Therefore, we need heuristics/feedback to guide the evolution to get rid of non-promising genes/sequences
var next_gen = 0;        // Next generation id to start from incase testcafe forces a restart
var consumer = '';
var producer = '';
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(DATA_FOLDER + "ev.log", {flags : 'a'});
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

if(ENABLE_KAFKA){
    // var lockFile = require('lockfile')
    // setup kafka
    // const { Kafka } = require('kafkajs')
    const { Kafka, logLevel } = require('kafkajs')
    const kafka = new Kafka({
        clientId: KAFKA_CLIENT_ID,
        brokers: ['0.0.0.0:9092'],
        logLevel: logLevel.DEBUG_PRINT,
        // ssl: {
        //     rejectUnauthorized: false
        // }
    })
    producer = kafka.producer()
    consumer = kafka.consumer({   groupId: KAFKA_CONSUMER_GROUP,
                                        // minBytes: 1,
                                        // maxBytes: 1e6, 
                                        // maxWaitTimeInMs: 100,  // wait for at most 100ms before receiving new data
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

const syncprintpqueue = async function() {
    
    var opts = {wait: 10000} // some big number
    lockFile.lock('pqueue.lock', opts, function (er) {
        // if the er happens, then it failed to acquire a lock.
        // if there was not an error, then the file was created,
        // and won't be deleted until we unlock it.
        console.log("acquiring pqueue.lock")
        if(er) {
            console.log(er)
        }
        printObject(pqueue, 'pqueue.json')
        lockFile.unlock('pqueue.lock', function (er) {
            // er means that an error happened, and is probably bad.
            if(er) {
                console.log("Error while releasing pqueue.lock")
                console.log(er)
            }
        })
        console.log("releasing pqueue.lock")
    })
    console.log("pqueue.json file saved")
}

const runconsumer = async () => {
    await consumer.connect()
    try{
        await consumer.subscribe({ topic: KAFKA_PAGETOPIC, fromBeginning: true })
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                var pageurl = message.key.toString(); var score = parseInt(message.value);
                //console.log("Consumer Received:")
                if(DEBUG_PRINT) console.log({ topic: topic, partition: partition, key: pageurl, value: score})
                if (visitedpagestable[pageurl] === undefined && score == -1){
                    pqueue.push({key: pageurl, val: score});
                    visitedpagestable[pageurl] = score;
                    printObject(pqueue, 'pqueue.json')
                    printObject(visitedpagestable, 'visitedpages.json')
                    // Use lockfile to write
                    // await syncprintpqueue();
                }
                if (score > 0){
                    pqueue.update_val(pageurl, score)
                    visitedpagestable[pageurl] = score;
                    printObject(pqueue, 'pqueue.json')
                    printObject(visitedpagestable, 'visitedpages.json')
                }
            }
        })
    }
    catch{
        console.log("cannot subscribe and run");
    }
}

const loadCache = function () {
    // returns true if all json files were found and read otherwise false
    var successflag = true;
    var temp_pq = loadfile('pqueue.json');
    if (temp_pq._heap === undefined) {  // is empty or error loading
        successflag = false;
    } else {
        pqueue.setheap(temp_pq._heap);
    }
    next_gen = loadfile('next_gen.json');
    next_gen = next_gen?next_gen:0;
    ev_urltable = loadfile('ev_urltable.json');
    // successflag = ev_urltable?true:false;  // dont reset crawler cache/data if urlscoretable fails to load
    ev_urltable = ev_urltable?ev_urltable:{};
    visitedpagestable = loadfile('visitedpages.json');
    // successflag = visitedpagestable?true:false; // dont reset crawler cache/data if urlscoretable fails to load
    visitedpagestable = visitedpagestable?visitedpagestable:{};
    dependantelements = loadfile('dependantelements.json');
    dependantelements = dependantelements?dependantelements:{};
    genescoremap = loadfile('genescoremap.json');
    genescoremap = genescoremap?genescoremap:{};
    common_elements = loadfile('ev_public_elements.json');
    common_elements = common_elements?common_elements:{admin: [], userA: [], userB: []};
    /*pages_html = loadfile('pages_html.json');
    pages_html = pages_html?pages_html:{};*/
    error_log = loadfile('ev_error_log.json');
    error_log = error_log?error_log:{};
    cache = loadfile('ev_crawler_cache.json');
    cache = cache?cache:{page: "", seq: 0, action: "", stat: "", href: "", navSet: 0, log: 0};
    navigationSet = utils.loadLogFile(cache.navSet + ".json", USER_MODE, SET_FOLDER);
    navigationSet = navigationSet?navigationSet:[];
    xss_sinks = loadfile('ev_sinks.json');
    xss_sinks = xss_sinks?xss_sinks:{};
    xss_sources = loadfile('ev_sources.json');
    xss_sources = xss_sources?xss_sources:{};
    ev_forms = loadfile('ev_forms.json');
    ev_forms = ev_forms?ev_forms:{};
    form_texts = loadfile('ev_form_texts.json');
    form_texts = form_texts?form_texts:{};
    form_app_keywords = form_app_keywords?form_app_keywords:[];
    for(let i = 0; i < form_app_keywords.length; i++){
        let sentence = form_app_keywords[i];
        sentence = sentence.toLowerCase();
        sentence = sentence.replace(/[^a-z0-9]/gi, '');
        form_app_keywords[i] = sentence;
    }
    if(ENABLE_KAFKA){
            runconsumer() // run consumer handler after loading data otherwise old data may be lost when the program restarts
        console.log("consuming finished");
    }

    if(successflag){
        if(DEBUG_PRINT){console.log('Loaded cache successfully.')}
        return true;
    }
    return false; 
}

const loadfile = function (name, user=USER_MODE, folder=DATA_FOLDER) {
    const fs = require('fs');
        try {
            if(fs.existsSync(folder+user+'_'+name)){
                //console.log(`file ${user+'_'+name} detected.`);
                return JSON.parse(fs.readFileSync(folder+user+'_'+name));
            }            
        } catch (err) {
            console.log(`error loading file - ${folder+user+'_'+name}`)
            console.log(err);
        }
        //console.error(`file ${user+'_'+name} not found`);
        return false
}

const loadAndSave = function (key, value, filename) {
    var f = loadfile(filename)
    f = f?f:{}
    f[key] = value
    printObject(f, filename)
}

const sanitizeUrlInputs = function (url) {
    // returns url with input values replaced with FUZZ
    var urlobj = new URL(url)
    var sanitized = url
    for(var value of urlobj.searchParams.values()) {
        console.log(value);
        sanitized = sanitized.replace(value, "FUZZ")
    }
    return sanitized
}

const check_similarity = async function (url, respA, respB, respC, method = 'get'){
    if (!respA.toString() || respA.toString()=="[]" || respA.toString()=="{}"){
        return; // skip triad test on empty responses
    }
    var difflib = require('difflib');
    var simAB = new difflib.SequenceMatcher(null, respA, respB);
    var simBC = new difflib.SequenceMatcher(null, respB, respC);
    var sim_ratioAB = simAB.ratio();
    var sim_ratioBC = simBC.ratio();
    console.log(sim_ratioAB)
    console.log(sim_ratioBC)
    if (sim_ratioBC-sim_ratioAB <= MARGIN_FACTOR) {  // vulnerable
        console.log("vulnerability found.\n")
        if (ENABLE_KAFKA) {  // send to topic
            await sendtotopic(producer, url, 'triad-topic');
        }
        loadAndSave(url, {method: method, simAB: sim_ratioAB, simBC: sim_ratioBC}, 'ev_vulnerable.json')
        // loadAndSave(url, {userA: respA, userB: respB, userC: respC}, 'ev_vulnerable_responses.json')
        // appendObjecttoFile({url: url, simAB: sim_ratioAB, simBC: sim_ratioBC}, 'ev_vulnerable.json')
        appendObjecttoFile({url: url, userA: respA, userB: respB, userC: respC}, 'ev_vulnerable_responses.json')
    }else {
        console.log("Authz passed.\n")
    }
    // for testing MF tuning
    appendObjecttoFile(sim_ratioBC-sim_ratioAB, 'ev_diff.json')
    appendObjecttoFile(sim_ratioBC, 'ev_x.json')
    appendObjecttoFile(sim_ratioAB, 'ev_y.json')
}

// return response - outerhtml, json or error 
const executeRequest = (userArequest, url, reqMethod, reqBody, otherUserCookie) => {
    return new Promise(resolve => {
        var url_obj = new URL(url);
        var headers = userArequest.headers;
        headers['cookie'] = otherUserCookie
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
            //if(DEBUG_PRINT){console.log('statusCode:', res.statusCode);}
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

const run_triad_on_page = async function(t, url, userAhtml) {
    console.log("Testing page - "+url)
    await t.useRole(USERB)
    await t.navigateTo(url)
    var userBhtml = await getPageHTML();
    await t.useRole(USERC)
    await t.navigateTo(url)
    var userChtml = await getPageHTML();
    
    await check_similarity(url, userAhtml, userBhtml, userChtml, 'get');
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
    if (respB.status != 'success' || respC.status != 'success') {
        if(DEBUG_PRINT){console.log("RespB error = "+respB.error+"\nRespC error = "+respC.error)}
        return;
    }
    respB = respB.response; respC = respC.response; 
    
    await check_similarity(userAreq.url, respA, respB, respC, userAreq.method);
}

const checkHiddenElements = async function (allelements, h_elements, t, parent_ele = Selector("")) { //for hidden elements other than ajax
    var v_count = 0;
    var v_elements = [];
    let count = 0;
    for (let k=0; k<h_elements.length; k++) {
        count ++;
        if(count >= 100){ // in case checking too many hidden elements
            break;
        }
        var index = h_elements[k]
        var element = allelements[index].element
        /*if (await element.visible){
            v_count++;
            v_elements.push(index);
        }*/
        if(await element.visible){
            v_count++;
            v_elements.push(index);
        }
    }
    var new_visible = {count: v_count, element_ids: v_elements};
    // console.log("NNew v = "+ JSON.stringify(new_visible))
    return new_visible;
}

const convertseqtoname = function (sequence) {
    var seq_readable = []
    for(let i=0; i<sequence.length; i++) {
        var e_id = sequence[i].element_id; var a_id = sequence[i].action_id;
        seq_readable.push({e_id: e_id, action: interactions[a_id], a_id: a_id})
    }
    return seq_readable;
}

const getActionProbabilistically = function() {
    var random_num = Math.random();
    var action;
    if (random_num <= 0.75) {    // TODO: use % input elements in the page to dynamically set this
                                // idea is if a page doesn't have many input elements lower the probability for typetext action
                                // typetext action on wrong elements stalls the framework thus slowing down crawling.
        action = 0  // click
    }else {
        action = 1  // typetext
    }   
    // no probability for uploadfile action because we want to avoid randomly assigning that action
    return action;
}

// Initialize the algorithm with randomly generated population of sequences
// returns array of object {gene array, fs}. 
// A gene is an object containing element id and action id. fs is fitness score of that gene.
const initialize_EA = async function (visibleelementids, p_size, s_size, allelements = {}) {
    // No repetitions?
    var seq_population = []
    let sequence_size = 0;
    let url_map = loadfile('ev_url_map.json');
    url_map = url_map ? url_map : [];
    let flag = 1;
    if(visibleelementids.length < s_size){
        sequence_size = visibleelementids.length;
    }
    else{
        sequence_size = s_size;
    }
    console.log("sequence_size:",  sequence_size);
    for(let i=0; i<p_size; i++) {
        var seq = []
        let random_sequence_size = sequence_size;
        //if(sequence_size == s_size) random_sequence_size = Math.floor((Math.random() + 0.5) * sequence_size);
        for(let j=0; j<random_sequence_size; j++) {
            var rand_visible_index, gene, id, action_id;
            let counter = 0;
            do {
                counter ++;
                if(counter > 50) break;
                flag = false;
                rand_visible_index = Math.floor(Math.random() * visibleelementids.length);
                id = visibleelementids[rand_visible_index];
                let element = allelements[id].element; 
                try{
                    var attr = await element.attributes;
                }
                catch(e){
                    console.log(e);
                    continue;
                }
                if(attr.hasOwnProperty('href')){
                    let href = attr.href;
                    if(href.includes('http') && !href.includes(baseURI)){
                        flag = true;
                        continue;
                    }
                    href = utils.replaceToken(href, token_name, "token");
                    href = href.replace(baseURI, "/");
                    //avoid the element that already tested and logged
                    for(let iter = 0; iter < url_map.length; iter ++){
                        let str1 = url_map[iter];
                        flag = utils.string_backward_match(str1, href);
                        if(flag){
                            break;
                        }   
                    }
                }
            }while((id in seq.map(g=>{return g.element_id})) || flag);
            action_id = getActionProbabilistically();
            gene = {element_id: id, action_id: action_id, css_selector: ''};
            seq.push(gene);
        }
        seq_population.push({seq: seq, fs: 0});     // fs is fitness score
    }
    return seq_population;
}

const evaluateFitness = async function (t, seq_population, allelements, hiddenelementids, currenturl) {
    // var score; var populationscore = 0; var bestscore = 0;
    for(let i=0;i<seq_population.length; i++) {
        if(DEBUG_PRINT) console.log(seq_population[i]);
        seq_population[i].fs = -1  // initialize to undesireable
        printObject(seq_population, 'new_seq_population.json');   // save current population state
        seq_population[i].fs = await getSeqScore(t, seq_population[i].seq, allelements, hiddenelementids, currenturl)
        printObject(seq_population, 'new_seq_population.json');   // save current population states
    }
    return seq_population
}

const iframeOperation = async function(t, element){
    const iframeInterest = ['p']; //can add more element tags
    await t.switchToIframe(element);
    let fuzz_string = utils.GenerateTypeString();
    for(let i = 0; i < iframeInterest.length; i++){
        const elements = Selector(iframeInterest[i]);
        let elecount = 0;
        try{
            elecount = await elements.count;
        }
        catch{
            continue;
        }
        for(let j = 0; j < elecount; j++){
            let element = elements.nth(j);
            try{
                await t.typeText(element, fuzz_string, { replace: true, paste: true });
            }catch{
                console.log("type not succeed");
            }
        }
    }
}


const run_triad = async function(req_url, currentpageurl, req){
    let log_req_url = utils.replaceToken(req_url, token_name, "token");
    let log_req_name = utils.extractLogName(log_req_url, baseURI);
    let respA, respB, respC;
    let triad_responses= {};
    let draft_responses = {};
    if(replay_cache.visibility == true || MODE == 0 || MODE == 3){
        if(DEBUG_PRINT) console.log("visbile to attackers, considering it as public pages");
        return 0;
    }
    if(req_url != currentpageurl && !url_400.includes(log_req_url) && !req_urlmap.includes(log_req_url)){
        let url_A = req.url;
        let url_B = req.url;
        let url_C = req.url;
        if(test_tokens[0] != ""){
            url_A = utils.replaceToken(req_url, token_name, test_tokens[0]);
            url_B = utils.replaceToken(req_url, token_name, test_tokens[1]);
            url_C = utils.replaceToken(req_url, token_name, test_tokens[2]);
        }
        let responses = utils.loadLogFile(log_req_name, USER_MODE, RESPONSE_FOLDER);
        responses = responses?responses:{}; 
        let temp_responses = responses;
        try{
            respA = await executeRequest(req, url_A, 'get', "", test_cookies[0]); 
            respB = await executeRequest(req, url_B, 'get', "", test_cookies[1]);
            respC = await executeRequest(req, url_C, 'get', "", test_cookies[2]);
            triad_responses = {admin: respA.response, userA: respB.response, userB: respC.response}
            let temp = utils.generateReponsePair(responses, triad_responses, common_elements);
            responses = temp[0];
            common_elements = temp[1];
            printObject(common_elements, "ev_public_elements.json");
            if(respA.status == 400){
                url_400.push(log_req_url);
            }
        }
        catch(e){
            //console.error(e);
            responses = temp_responses;
            url_400.push(log_req_url);
        }
        utils.logObject(responses, log_req_name, RESPONSE_FOLDER);
    }
}

const check_new_elements = async function(t, new_elements = [], element_info = {}, allelements, index){ // for ajax elements
    let new_element_selectors = [];
    let new_visible = {};
    let v_elements = [];
    let v_count = 0;
    let new_elements_table = [];
    for(let i = 0; i < new_elements.length; i++){
        let locators = rrweb.generateLocator_addon(new_elements[i], element_info, baseURI);
        locators = locators.ancestor;
        if(locators == undefined){
            continue;
        }
        for(let j = 0; j < locators.length; j++){
            let tag = locators[j].split('[')[0];
            if(elementsOfInterest.includes(tag) && (!locators[j].includes("[type=\"submit\"]"))){
                let new_selector = Selector(locators[j]);
                if(new_elements_table.includes(locators[j])){
                    continue;
                }
                let length = 0
                try{
                    length = await new_selector.count;
                }catch (e){
                    console.log(e);
                    continue;
                }
                let visibility = 0;
                for(let k = 0; k < length; k ++){
                    let element = new_selector.nth(k);
                    if(await element.visible) {
                        new_element_selectors.push(locators[j]);
                        new_elements_table.push(locators[j]);
                        allelements.push({element: element});
                        v_elements.push(allelements.length - 1);
                        v_count ++;
                        break;
                    }
                }
            }
        }
    }
    new_visible = {count: v_count, element_ids: v_elements};
    if (new_visible.count > 0) {
        dependantelements[JSON.stringify({e_id: index})] = new_visible.element_ids;
        printObject(dependantelements, 'dependantelements.json')
    }
    return new_element_selectors;
}

const filteredCssString = function(elementattr, dynamic_values){
    let css_string = '';
    for(const property in elementattr){
        let value = String(elementattr[property]);
        if(value.includes('[')){
            continue;
        }
        let flag = 0;
        for(let i = 0; i < dynamic_values.length; i++){
            let dynamic = String(dynamic_values[i]);
            if(value == dynamic){
                flag = 1;
                break;
            }
        }
        if(flag == 0){
            css_string += '[' + String(property) + '=' + '\"' + String(elementattr[property]) + '\"' + ']';
        }
    }
    return css_string;
}

const waitForReplayer = async function(t){
   cache.stat = "waiting";
   if(DEBUG_PRINT) console.log("waiting for the replayer to check visibility");
   if(DEBUG_PRINT) console.log(cache.seq);
   while(true){
        replay_cache = loadfile('ev_replay_cache.json', 'b');
        replay_cache = replay_cache?replay_cache:{seq: 0, stat: ""};
        if(replay_cache.seq == cache.seq && replay_cache.stat == "checked"){
            break;
        }
        await t.wait(50);
   }
}

const payload_detection = function(payloads=[], pageurl=""){
    if(payloads.length != 0){
        if(xss_sinks.hasOwnProperty(pageurl)){
            for(let k = 0; k < payloads.length; k++)
            {
                xss_sinks[pageurl].push(payloads[k]);
            }
        }
        else{
            xss_sinks[pageurl] = payloads;
        }
        printObject(xss_sinks, "ev_sinks.json");
    }
}

const navSet_incrementor = function (){
    if(navigationSet.length > 200){
        cache.navSet ++;
        navigationSet = [];
        printObject(cache, "ev_crawler_cache.json");
    }
}

const form_submission_check = async function(page_html, form_url, form_method, log_pageurl){
    let sanitized_page = [];
    let end_list = [];
    let form_flag = 0;
    try{
        end_list = utils.extractTextFromHTML(page_html, 1);
    }catch{
        console.log("falied to extract text from html");
    }
    let end_flag = 0;
    //console.log(typed_texts);
    //printObject(end_list, "end_list.json");
    if(form_texts[form_url] == undefined){
        form_texts[form_url] = typed_texts;
    }
    else{
        for(let i = 0; i < typed_texts.length; i++){
            form_texts[form_url].push(typed_texts[i]);
        }
    }
    printObject(form_texts, "ev_form_texts.json");
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
        //printObject(sanitized_page, "sanitized_page.json");
        form_flag = utils.check_form_error(sanitized_page, form_app_keywords);
    }
    if(end_flag == 1 || form_flag == 1){
        if(form_method == "post"){
            if(!ev_forms.hasOwnProperty(log_pageurl)){
                ev_forms[log_pageurl] = {};
            }
            let tmp_obj = ev_forms[log_pageurl];
            tmp_obj[form_url] = 1;
            ev_forms[log_pageurl] = tmp_obj;
            printObject(ev_forms, "ev_forms.json");
        }
        appendObjecttoFile(typed_texts, "ev_typed_texts.txt");
    }
}

const capture_request_url = async function(req_count, currenturl, newurl, elementtag, total_score, nav_edge){
    // Check if new unseen requests logged;
    // if it generates a previously seen post req, give it a negative reward since we don't want to create multiple same kinds of resources
    // if no requests were generated by the click, then check if new elements became visible
    var deepcopy = JSON.parse(JSON.stringify(logger.requests.slice(logger.requests.length-req_count)));  // get reqs generated
    let log_url = utils.replaceToken(currenturl, token_name, "token");
    if (req_count > 0){
        let temp_urls = [];
        let form_flag = false;
        let form_action = "";
        let testurl_flag = 0;
        let page_html = "";
        for(let j=0; j<req_count; j++) {
            var lastreqlog = deepcopy[deepcopy.length-1-j]
            var req = lastreqlog.request;
            var res = lastreqlog.response;
            if (res === undefined){continue;}
            //console.log(req.method);
            if(req.method.toLocaleLowerCase() !== 'get'){
                req_urlmap = [];
            }
            if(req.method.toLocaleLowerCase() === 'post'){
                total_score += SEQ_REWARD_NEWREQ;
                form_flag = true;
                form_action = req.url;
                if(!ev_forms.hasOwnProperty(log_url)){
                    ev_forms[log_url] = {};
                }
                let tmp_obj = ev_forms[log_url];
                if(tmp_obj[form_action] == undefined){
                    tmp_obj[form_action] = 0;
                }
                ev_forms[log_url] = tmp_obj;
                printObject(ev_forms, "ev_forms.json");
                //console.log(form_action);
                page_html = await getPageHTML();
                await form_submission_check(page_html, form_action, 'post', log_url);
            }
            const _hostname = new URL(req.url).hostname; const _basehostname = new URL(baseURI).hostname;
            if(req.url == newurl){
                testurl_flag = 1;
            }
            // convert that to tagname and attributes for readability
            let log_req_url = utils.replaceToken(req.url, token_name, "token");
            let navigationPath = utils.GenerateNavigationPath(nav_edge, log_url, log_req_url);
            if((MODE == 1 || MODE == 4) && elementtag == "a"){
                await run_triad(req.url, currenturl, req);
                req_urlmap.push(log_req_url);
                navigationSet.push(navigationPath);
            }
            if (ev_urltable[log_req_url] === undefined && _hostname === _basehostname) {  // Big Reward
                //total_score += SEQ_REWARD_NEWREQ;   // Tune this hyperparameter later. Try to make it adaptive over some feedback
                ev_urltable[log_req_url] = 1;
                printObject(ev_urltable, 'ev_urltable.json');
                
            }/*else {  // sequence produces previously seen req. Negative Reward
                total_score += SEQ_PENALTY_SMALL  // Tune this hyperparameter later. Try to make it adaptive over some feedback
                updategenescore(seq[i], GENE_PENALTY_MILD);  // avoid genes that generate duplicate requests
            }*/
        }
        if(testurl_flag == 0 && (MODE == 1 || MODE == 4)){
            await run_triad(newurl, currenturl, req);
        }
        if(DEBUG_PRINT && (MODE == 1 || MODE ==4)) console.log("finish triad test");
    }
    return total_score;
}

const random_clickon_submit_buttons = async function(t, typed_texts, total_score, element_info, currenturl){
    let visible_button = [];
    let buttons_submit = Selector("*[type=\"submit\"]");
    let submit_cnt = await buttons_submit.count;
    let page_events = [];
    let nav_edge = "";
    for(let i = 0; i < submit_cnt; i ++){
        let button = buttons_submit.nth(i);
        if(await button.visible){
            visible_button.push(i);
        }
    }
    if(DEBUG_PRINT) console.log("number of visible buttons: ", visible_button.length);
    if(visible_button.length > 0){
        let rand_num = Math.floor(Math.random() * (visible_button.length));
        let opt = visible_button[rand_num];
        let button_ele = buttons_submit.nth(opt);
        let ele_tagname = await button_ele.tagName;
        let ele_attr = await button_ele.attributes;
        let innerText = await button_ele.innerText;
        let css_ele = ele_tagname + utils.GenerateCssString(ele_attr).toLowerCase() + innerText.toLocaleLowerCase();
        if(!utils.check_url_keywords(css_ele, logout_keywords)){
            if(DEBUG_PRINT) console.log("skip logout keywords");
            return 0;
        }
        if(MODE == 1){
            let timestamp = new Date().getTime();
            try{
                await t.rightClick(buttons_submit.nth(opt));
            }catch(e){
                console.log("failed to capture the element with right click");
            }
            page_events = await eventRecord();
            let id_list_right = rrweb.rightClick_analyze(page_events);
            let locators = [];
            console.log(id_list_right);
            if(id_list_right.length != 0){
                locators = rrweb.generateLocator(id_list_right[0], element_info);
            }else{
                id_list_right.push(0);
                locators = {ancestor: [css_ele], descendants: []};
            }
            locators.innerText = innerText;
            nav_edge = utils.generateEdge(locators.ancestor);
            pushToLog({css_locators: locators, css_selector: css_ele, action: 0, timestamp: timestamp, rrwebId: id_list_right[0], edge: nav_edge});
        }
        if(REPLAY == 1){
            await waitForReplayer(t);
            cache.seq ++;
            printObject(cache, "ev_crawler_cache.json");
        }
        if(DEBUG_PRINT){console.log("Click on submit button -->", css_ele);}
        try{
            await t.click(buttons_submit.nth(opt));
        }catch(e){
            console.log("failed to click on submit button at the end");
        }
        let newurl = await getURL();
        let req_cnt = checkRequestLogs();
        if(MODE == 0) await capture_request_url(req_cnt, currenturl, newurl, ele_tagname, total_score, nav_edge)
    }
    let end_html = await getPageHTML();
    let end_list = utils.extractTextFromHTML(end_html, 1);
    for(let i = 0; i < typed_texts.length; i ++){
        let text = typed_texts[i];
        text = text.split('\\t').join('').split('\\n').join('').split('\\r').join('');
        text = text.replace(/[^a-z0-9]/gi, '');
        for(let j = 0; j < end_list.length; j++){
            let end_node = end_list[j];
            if(end_node.includes(text)){
                total_score += SEQ_REWARD_FORM;
                break;
            }
        }
    }
    return total_score;
    //printObject(end_list, "end_list.json");
}

const add_page_to_queue = async function(newurl, currenturl, elementtag, nav_edge){
    if (newurl != currenturl) {
        let log_url = utils.replaceToken(currenturl, token_name, "token");
        let log_newurl = utils.replaceToken(newurl, token_name, "token");
        let newpath = log_newurl.replace(baseURI, "/");
        let send_url = log_newurl
        log_newurl = utils.replaceRandom(log_newurl, random_names, "");
        let cluster_results = utils.clusterURL(log_newurl);
        let cluster_flag = cluster_results[0];
        let cluster_url = cluster_results[1];
        let url_map = loadfile('ev_url_map.json');
        url_map = url_map?url_map:[];
        if(!url_map.includes(newpath)){
            url_map.push(newpath);
            printObject(url_map, "ev_url_map.json");
        }
        //updategenescore(seq[i], GENE_PENALTY_MILD);
        if(DEBUG_PRINT) console.log("check new url: ", newurl);
        let navigationPath = utils.GenerateNavigationPath(nav_edge, log_url, log_newurl);
        if((MODE == 1 || MODE == 4) && elementtag == "a"){
            navigationSet.push(navigationPath);
        }
        //total_score += SEQ_REWARD_TMP; //should change this parameter later
        if(visitedpagestable[log_newurl] === undefined && utils.check_url_keywords(log_newurl , heavy_pages)) {    // make sure no duplicates are inserted in queue
            let seed_name = log_newurl.split("?")[0];
            seed_name = seed_name.split("#")[0];
            seed_name = utils.extractLogName(seed_name, baseURI);
            let pagescore = -1;
            //pagescore = Math.floor(Math.random() * 100); //generate random score for each page, and sort pages based on the score (randomly shuffle)
            if(elementtag == 'a'){
                if(ENABLE_KAFKA) {
                    await sendtotopic(producer, send_url, KAFKA_PAGETOPIC, pagescore);
                    if(log_newurl != send_url) visitedpagestable[log_newurl] = pagescore;
                    if(cluster_flag) visitedpagestable[cluster_url] = pagescore;
                }else {
                    visitedpagestable[send_url] = pagescore;
                    visitedpagestable[log_newurl] = pagescore;
                    visitedpagestable[cluster_url] = pagescore;
                    pqueue.push({key: send_url, val: pagescore});
                    printObject(pqueue, 'pqueue.json');
                }
            }
            else{
                visitedpagestable[log_newurl] = 1;
            }
            printObject(visitedpagestable, "visitedpages.json");
            //total_score += SEQ_REWARD_TMP;
        }
    }
}

// Evaluates fitness for a sequence with reward shaping
// avoid seq with large wait times due to typing a non-typeable element (because of js, testcafe waits for element to be come typeable)
//      --> add time in the fitness evaluation process. Ex. fitness = rewards/totaltimetaken
const getSeqScore = async function (t, seq, allelements, h_elements, currenturl) {
    let page_events = [];
    var total_score = SEQ_INIT_SCORE;
    let element_info = {};
    let seq_log = [];
    let new_page_events = []
    let url_map = loadfile("ev_url_map.json");
    //let log_name = utils.extractLogName(log_url, baseURI);
    let log_name = cache.log + ".json";
    let payloads = [];
    typed_texts = [];
    seq_log = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER);
    seq_log = seq_log?seq_log:[];
    // reset request count
    logger.clear();
    request_log_count = 0
    var req_count = checkRequestLogs();
    currenturl = utils.replaceToken(currenturl, token_name, token_value);
    let seqtime = new Date().getTime();
    if(DEBUG_PRINT) console.log(currenturl);
    await t.navigateTo(currenturl);  // reset url to current url. Also resets typeable input 
    seq_log.push({css_locators: "navigate", timestamp: seqtime}); 
    utils.logObject(seq_log, log_name, LOG_FOLDER);
    page_events = await eventRecord();
    if(!rrweb.checkEventCapture(page_events, 2)){
        await t.eval(() => location.reload(true));
        page_events = await eventRecord();
    }
    if(page_events.length == 0){
        if(DEBUG_PRINT) console.log("rrweb failed to capture the events, we have to abandon this seq (sorry)");
        return 0;
    }
    element_info = rrweb.handleDOM(page_events);
    element_info = rrweb.DOM_addtional_element(page_events, element_info);
    let urlAnchorArray = rrweb.pageElementList(page_events);
    var t0 = new Date().getTime(); // timestamp 0
    let newurl = currenturl;
    for(let i=0; i<seq.length; i++) {
        let new_ele_flag = 0;
        let new_element_info = {};
        let timestamp = 0;
        let navtime = 0;
        let testurl_flag = 0;
        let page_renew = 0;
        let nav_edge = "";
        let locators = {};
        let id_list = [];
        let id_list_right = [];
        let index = seq[i].element_id;
        if(DEBUG_PRINT){console.log("Evaluating Gene "+i)}  
        if(index > allelements.length - 1){
            console.log("gene index surpass the limit, need to fix the bug");
            continue;
        }
        updategenescore(seq[i], GENE_PENALTY_NONE);     // initialize novelty points if the gene is new
        let element = allelements[index].element;
        let new_elements = [];
        /*if(temp_identifier == 0){
            //element = Selector('a').withText("About"); //only for tracing error, remember to comment out this line
            element = Selector("#space-menu").nth(0);
            //temp_identifier = 1;
        }
        else{
            element = Selector("a[href=\"/index.php?r=admin%2Fuser%2Fdisable&id=2\"]");
            temp_identifier = 0;
        }*/
        if (!(await element.visible)) {
            // Penalty for this case
            total_score += SEQ_PENALTY_SMALL;
            if(DEBUG_PRINT){console.log("element in seq not visible")}
            continue;
        }
        try{
            var elementtag = await element.tagName;
            var elementattr = await element.attributes;
            var eleInnerText = await element.innerText;
        }
        catch{
            console.log("failed to capture the attributes");
            continue;
        }
        //dynamicValues = utils.generateDynamicValues(element_info, dynamicElements);
        var css_string = elementtag + utils.GenerateCssString(elementattr);
        let eleInnerText_lower = eleInnerText.toLowerCase();
        seq[i].css_selector = css_string;
        css_string = css_string + eleInnerText_lower;
        if((!utils.check_url_keywords(css_string, heavy_pages) && elementtag == "a") || !utils.check_url_keywords(css_string, logout_keywords)){
            //total_score += SEQ_PENALTY_MEDIUM;
            updategenescore(seq[i], GENE_PENALTY_SEVERE/2);
            continue;
        }
        if(elementattr.hasOwnProperty('href')){
            let flag = false;
            let href = elementattr.href;
            cache.href = href;
            printObject(cache, "ev_crawler_cache.json");
            if(href === "/" || href === ""){
                if(DEBUG_PRINT) console.log("no need to jump to the home page");
                continue;
            }
            if((href.includes('http') || href.includes('.com') || href.includes('.org')) && !href.includes(baseURI)){
                if(DEBUG_PRINT) console.log("element linked to page in other domain, skip");
                updategenescore(seq[i], GENE_PENALTY_SEVERE);
                //total_score += SEQ_PENALTY_MEDIUM;
                continue;
            }
            href = utils.replaceToken(href, token_name, "token");
            href = href.replace(baseURI, "/");
            for(let iter = 0; iter < url_map.length; iter ++){
                let str1 = url_map[iter];
                flag = utils.string_backward_match(str1, href);
                if(flag){
                    break;
                }
            }
            if(flag) {
                if(DEBUG_PRINT) console.log("skip this link, since we already clicked on it");
                updategenescore(seq[i], GENE_PENALTY_SEVERE);
                //total_score += SEQ_PENALTY_SMALL;
                continue;
            }
        }
        if(elementattr.hasOwnProperty('src')){
            let flag = false;
            let href = elementattr.src;
            if((href.includes('http') || href.includes('.com') || href.includes('.org')) && !href.includes(baseURI)){
                console.log("element linked to files in other domain, skip");
                total_score += SEQ_PENALTY_MEDIUM;
                continue;
            }
        }
        if(elementtag === 'a' || elementtag === 'button') {    // Make sure to always click for certain elements
            seq[i].action_id = 0    // click
        }
        if (elementtag === 'input' && (elementattr.type === 'submit' || elementattr.type === 'button' || elementattr.type === 'checkbox' || elementattr.type === 'radio')) {
            seq[i].action_id = 0    // click
        }
        if ((elementtag === 'input' && elementattr.type === 'file') || eleInnerText_lower.includes('upload')) {
            // Since file uploads are very rare, only assigning this action to input elements of type 'file' 
            seq[i].action_id = 2;    // upload file
        }
        if(elementtag === 'input' && (elementattr.type === 'password' || elementattr.type === 'text' || elementattr.type === 'email' || elementattr.type === 'url' || elementattr.type === 'search')){
            seq[i].action_id = 1;
        }
        if(elementtag === 'textarea' || elementtag === 'p')
        {
            seq[i].action_id = 1;
        }
        if (elementtag === 'select') {
            // Since file uploads are very rare, only assigning this action to input elements of type 'file' 
            seq[i].action_id = 3;    // upload file
        }
        if(elementtag === 'iframe'){
            seq[i].action_id = 4;
        }
        var action_id = seq[i].action_id;
        if(DEBUG_PRINT){
            console.log(css_string + "--->" + interactions[action_id]);
        }
        timestamp = new Date().getTime();
        //we use rightclick to record the information of an element that leading to another page.
        try{
            await t.rightClick(element);
            page_events = await eventRecord();
        }
        catch{
            if(DEBUG_PRINT) console.log("click not succeed");
            total_score += SEQ_PENALTY_SMALL;
            continue;
        }
        element_info = rrweb.DOM_addtional_element(page_events, element_info);
        id_list_right = rrweb.rightClick_analyze(page_events);
        //console.log("right click succeed: ", id_list_right);
        //rrweb in few cases cannot capture the right click event, so we skip it (to improve accuracy in the later replay stage).
        if(!element_info.hasOwnProperty(id_list_right[0])){
            console.log("failed to capture right click event, skip this gene");
            continue;
        }
        //console.log(id_list_right);
        if(id_list_right.length != 0){
            //console.log("use element info");
            locators = rrweb.generateLocator(id_list_right[0], element_info);
            locators.innerText = eleInnerText;
            if(DEBUG_PRINT) console.log("successfully generated locators");
            nav_edge = utils.generateEdge(locators.ancestor);
            seq_log.push({css_locators: locators, css_selector: seq[i].css_selector, action: action_id, timestamp: timestamp, rrwebId: id_list_right[0], edge: nav_edge});
            utils.logObject(seq_log, log_name, LOG_FOLDER);
        }
        if(REPLAY == 1){
            await waitForReplayer(t);
            cache.seq ++;
            printObject(cache, "ev_crawler_cache.json");
        }
        if (interactions[action_id] === "click"){
            if(DEBUG_PRINT) console.log("action click");
            if (!(await element.visible)) {total_score += SEQ_PENALTY_SMALL;continue}
            try{
                await t.click(element);
                page_events = await eventRecord();
            }
            catch{
                if(DEBUG_PRINT) console.log("click not succeed");
                total_score += SEQ_PENALTY_SMALL;
                continue;
            }
            if(checked_hidden.includes(index)){
                total_score += SEQ_REWARD_HIDDEN;
            }
            id_list = id_list_right;
            newurl = await getURL();
            cache.href = newurl;
            printObject(cache, "ev_crawler_cache.json");
            newurl = newurl.split("#")[0];
            if(newurl == currenturl){
                if(rrweb.eventURL(page_events) != 0){ //interactions like clicking on the save button, it renews the page but do not change the URL.
                    page_renew = 1;
                    console.log("page has been renewed");
                    new_element_info = rrweb.handleDOM(page_events);
                    let results = rrweb.record_addtional_element(page_events, new_element_info);
                    new_element_info = results[0];
                    new_elements = results[1];
                }
                else{
                    id_list = rrweb.event_analyze(page_events);
                    let results = rrweb.record_addtional_element(page_events, element_info);
                    element_info = results[0];
                    new_elements = results[1];
                }
                //console.log("new elements length: ", new_elements.length);
                if(new_elements.length != 0 && !checked_hidden.includes(index)){
                    //for elements revealed by ajax
                    let new_elements_selector;
                    let tmp_info = element_info
                    if (page_renew == 1) {
                        tmp_info = new_element_info
                    }
                    try{
                        new_elements_selector = await check_new_elements(t, new_elements, tmp_info, allelements, index);
                    }catch(e){
                        console.error(e);
                        console.log("failed to generate element selectors")
                        new_elements_selector = [];
                    }
                    if(DEBUG_PRINT) console.log("new_elements: ", new_elements_selector);
                    if(new_elements_selector.length != 0){
                        checked_hidden.push(index);
                        total_score += SEQ_REWARD_HIDDEN;
                    }
                    new_elements = [];
                }
            }
            else{
                const hostname = new URL(newurl).hostname; const basehostname = new URL(baseURI).hostname;
                if (hostname !== basehostname) {
                    if(DEBUG_PRINT){console.log("Out of domain detected and avoided.")}
                    total_score += SEQ_PENALTY_HIGH;
                    updategenescore(seq[i], GENE_PENALTY_SEVERE);  // avoid genes that take you outside domain
                    navtime = new Date().getTime();
                    await t.navigateTo(currenturl);
                    newurl = currenturl;
                    page_events = await eventRecord();
                    element_info = rrweb.handleDOM(page_events);
                    element_info = rrweb.DOM_addtional_element(page_events, element_info);
                    seq_log.push({css_locators: "navigate", timestamp: navtime}); 
                    utils.logObject(seq_log, log_name, LOG_FOLDER);
                    continue;
                }
                //new_page_events = await eventRecord();
            }
            payloads = await catchPayload();
            payload_detection(payloads, newurl);
            req_count = checkRequestLogs();
            if(DEBUG_PRINT) console.log("number of requests generated: ", req_count);
            if (req_count > 0){
                total_score = await capture_request_url(req_count, currenturl, newurl, elementtag, total_score, nav_edge);
            }else {
                //for hidden elements only revealed by javascript
                if(!checked_hidden.includes(index) && rrweb.check_dom_changes(page_events))
                {
                    if(DEBUG_PRINT) console.log("checking hidden elements");
                    try{
                        var newvisible = await checkHiddenElements(allelements, h_elements, t, element);
                    }
                    catch{
                        if(DEBUG_PRINT) console.log("failed to get hidden elements, set length to 0");
                        var newvisible = {count: 0};
                    }
                    if (newvisible.count > 0) {
                        dependantelements[JSON.stringify({e_id: index})] = newvisible.element_ids;
                        printObject(dependantelements, 'dependantelements.json');
                        total_score += SEQ_REWARD_HIDDEN;  // Small Reward. Try to make it adaptive over some feedback
                        // update the depandant_elements array which is used in mutate() to create dependency satisfying mutations
                        checked_hidden.push(index);
                    }
                    else {
                        updategenescore(seq[i], GENE_PENALTY_MILD);  // avoid genes that don't do anything
                    }
                }
            }
        }
        else if (interactions[action_id] === "typetext") {
            let fuzz_string = utils.GenerateTypeString(elementattr, elementtag, "evo", MODE, APPNAME);
            if(xss_sources[currenturl] == undefined){
                xss_sources[currenturl] = {};
            }
            //let fuzz_string = utils.GenerateTypeString();
            let ele_val = "";
            try{
                await t.typeText(element, fuzz_string, { replace: true, paste: true })
            }
            catch{
                if(DEBUG_PRINT) console.log("typeText not succeed");
                total_score += SEQ_PENALTY_SMALL;
                continue;
            }
            total_score += SEQ_REWARD_TYPEABLE;
            typed_texts.push(fuzz_string);
            let temp_obj = xss_sources[currenturl];
            if(temp_obj[css_string] == undefined){
                temp_obj[css_string] = [];
            }
            temp_obj[css_string].push(fuzz_string);
            xss_sources[currenturl] = temp_obj;
            printObject(xss_sources, "ev_sources.json");
            if(DEBUG_PRINT) console.log("Type String: ", fuzz_string);
            page_events = await eventRecord();
            id_list = rrweb.event_analyze(page_events);
            element_info = rrweb.DOM_addtional_element(page_events, element_info);
        }else if (interactions[action_id] === "uploadfile") {
            if(DEBUG_PRINT) console.log("action upload");    // upload file   
            try{
                await t.setFilesToUpload(element, ['upload-files/not_kitty.png']);
            }catch{
                if(DEBUG_PRINT) console.log("upload not succeed");
                continue;
            }
            total_score += SEQ_REWARD_UPLOADFILE;  // Tune this hyperparameter later
            page_events = await eventRecord();
            if(DEBUG_PRINT){console.log("File uploaded.")}
        }else if (interactions[action_id] === "select") {    // interact with 'select' element
            if(DEBUG_PRINT) console.log("select");
            const options = element.find('option');
            const optioncount = await options.count;
            if(optioncount <= 0){   // no options for the select dropdown element
                updategenescore(seq[i], GENE_PENALTY_MILD);
                total_score += SEQ_PENALTY_SMALL;
                continue;
            }
            //const optrand = Math.floor(Math.random()*optioncount) //assign random number may suffer from the all deletion problem
            const optrand = 0;
            try{
                await t.click(element);
                await t.click(options.nth(optrand));
            }
            catch{
                if(DEBUG_PRINT) console.log("select click not succeed");
                total_score += SEQ_PENALTY_SMALL;
                continue;
            }
            page_events = await eventRecord();
            id_list = rrweb.event_analyze(page_events);
            element_info = rrweb.DOM_addtional_element(page_events, element_info);
        }else if(interactions[action_id] === 'iframe'){
            console.log("iframe");
            try {
                await iframeOperation(t, element);
            } catch (error) {
                if(DEBUG_PRINT) console.log("iframe operation failed");
                continue;
            }
            await t.switchToMainWindow();
            page_events = await eventRecord();
            element_info = rrweb.DOM_addtional_element(page_events, element_info);
        }
        else {
            console.log("Action not supported")
        }

        if(id_list.length != 0 && page_renew == 1){
            element_info = new_element_info; //if page is renewed, update the element_info tracker
        }
        // Check if action lead to routing to another page. Navigate back to currenturl in this case
        await add_page_to_queue(newurl, currenturl, elementtag, nav_edge);
        utils.logObject(navigationSet, cache.navSet + ".json", SET_FOLDER);
        navigationSet = pathoptimizer.pathSelection(navigationSet);
        navSet_incrementor();
    }
    total_score = await random_clickon_submit_buttons(t, typed_texts, total_score, element_info, currenturl);
    var t1 = new Date().getTime(); // timestamp 1
    // want solutions that take min amount of time or optimal length of seqs 
    // (ie. without any unnecessary element-action genes which adds to extra time)
    // hence we add time to overall fitness to ensure unnecessarily longer seq die off over time
    let t_diff = t1-t0;
    if(DEBUG_PRINT) console.log("t_diff: ", t_diff);
    //total_score = (total_score * 100 * seq.length)/t_diff;
    if(DEBUG_PRINT) console.log("total score is: ", total_score)
    return total_score;    //*100 just to make it more readable, need to be proportional to the sequence length
}

const updategenescore = function (gene, score) {
    if (genescoremap[JSON.stringify(gene)] === undefined) {     // new gene
        var noveltyscore = GENE_REWARD_NOVELTY;
        genescoremap[JSON.stringify(gene)] = noveltyscore*score;
    }else {
        genescoremap[JSON.stringify(gene)] *= score;
    }
    printObject(genescoremap, 'genescoremap.json');
}

// Durstenfeld shuffle - https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array
}

// crosses parent seqs randomly for more diversity
// returns new population of seqs
const crossover = async function (seq_population, s_size, visibleelementids, p_size, allelements = []) {
    var new_population = [];
    var parent1, parent2, n, child1, child2, randnum1, randnum2, n1, n2, parent1one, parent2one, parent1two, parent2two;
    var rand_seq_population = shuffleArray(seq_population);
    
    // new_population = new_population.concat(seq_population)
    n = rand_seq_population.length
    // crossover from previous generation to produce new children
    for(let i=0; i < n/2; i++) {
        parent1 = rand_seq_population[i].seq; parent2 = rand_seq_population[n-1-i].seq;
        n1 = parent1.length; n2 = parent2.length;
        // randnum1 = Math.floor(Math.random()*n1); randnum2 = Math.floor(Math.random()*n2);
        // TODO: this can create a lot of duplicates in the seq. Find another approach that is more random mixing and no duplicates
        randnum1 = Math.floor(n1/2); randnum2 = Math.floor(n2/2);
        parent1one = parent1.slice(0, randnum1); parent1two = parent1.slice(randnum1, n1);
        parent2one = parent2.slice(0, randnum2); parent2two = parent2.slice(randnum2, n2);
        child1 = parent1one.concat(parent2two); child2 = parent2one.concat(parent1two);
        new_population.push({seq: child1, fs: 0})
        new_population.push({seq: child2, fs: 0})
    }
    // add some random sequences for explorations
    var random_p_size = Math.floor(p_size*RAND_POP_GENERATE);  // TODO: vary generating this 50% of population randomly with some feedback
    var random_new_population = await initialize_EA(visibleelementids, random_p_size, s_size, allelements)  // generate random sequences
    return new_population.concat(random_new_population);
}

// Creates new seqs by mutating original seq either randomly or based on newly learnt dependency information
const mutate = async function (seq_population, s_size, allelements) {
    // adding relevant dependant elements and removing randomly
    // dependantelements[JSON.stringify({e_id: index, a_id: action_id})] --> returns list of element_id
    var seq;
    let flag = 1;
    let cutOffLength = Math.floor(s_size * 3);
    let url_map = loadfile('ev_url_map.json');
    url_map = url_map?url_map:[];
    for(let i=0; i< seq_population.length; i++) {
        seq = seq_population[i].seq
        var j = 0;
        while( j < cutOffLength) {
            if (j >= seq.length) break;
            var gene = seq[j]
            if (dependantelements[JSON.stringify({e_id: gene.element_id})] !== undefined) {
                var dep_ele = dependantelements[JSON.stringify({e_id: gene.element_id})]
                if (dep_ele.length === 0) { continue; }
                let dep_length = Math.floor(dep_ele.length * Math.random() + 1);
                for(let k = 0; k < dep_length; k ++){
                    for(let t = 0; t < 50; t ++){ 
                        flag = false;
                        var randid = Math.floor(Math.random()*dep_ele.length)
                        var ele_id = dep_ele[randid];
                        if(ele_id > allelements.length - 1){
                            if(DEBUG_PRINT) console.log("we loss track of this dependent element");
                            continue;
                        }
                        let dep_element = allelements[ele_id].element;
                        if(await dep_element.visible){
                            try{
                                var dep_attr = await dep_element.attributes;
                            }
                            catch(e){
                                console.log(e);
                                dep_attr = {};
                            }
                            //check whether this element contains visited href already
                            if(dep_attr.hasOwnProperty('href')){
                                let href = dep_attr.href;
                                if(href.includes('http') && !href.includes(baseURI)){
                                    flag = true;
                                    continue;
                                }
                                href = utils.replaceToken(href, token_name, "token");
                                href = href.replace(baseURI, "/");
                                for(let iter = 0; iter < url_map.length; iter ++){
                                    let str1 = url_map[iter];
                                    flag = utils.string_backward_match(str1, href);
                                    if(flag){
                                        break;
                                    }
                                }
                            }
                        }
                        if(!flag){
                            break;
                        }
                    }
                    var action_id = getActionProbabilistically();
                    seq.splice(j+1, 0, {element_id: dep_ele[randid], action_id: action_id, css_selector: ""});
                    //if(DEBUG_PRINT){console.log('added dependent gene');}
                    // if(DEBUG_PRINT){console.log('new queue size = '+seq.length);}
                }
            }
            j++;
        }
        // in case gene sequence get too long, might need to adjust this code
        if(seq.length > cutOffLength)
        {
            seq = seq.slice(0, cutOffLength);
        }
        // var removeid = Math.floor(Math.random()*seq.length)
        // seq.splice(removeid, 1)
        seq_population[i].seq = seq
    }

    // randomly swap genes
    for(let i=0; i< seq_population.length; i++) {
        seq = seq_population[i].seq
        if (Math.random() <= 0.5) {  // make this range adaptive based on some feedback
            var randswapid1 =  Math.floor(Math.random()*seq.length)
            var randswapid2 =  Math.floor(Math.random()*seq.length)
            var temp = seq[randswapid1]
            seq[randswapid1] = seq[randswapid2]
            seq[randswapid2] = temp
        }
        seq_population[i].seq = seq
    }
    return seq_population
}

// sanitize the population based on predefined rules/constraints
const sanitizePopulation = function (seq_population) {
    var sanitized_population;

    sanitized_population = seq_population;
    // add sanitization rules on the population
    // Done: 1. Must not exist repetitions of element-action gene in the seq
    // Done: 2. Remove the element-action gene that stalls the test execution or takes too long to respond
    //          - ex. typing in a non-typeable element

    for(let i=0; i< sanitized_population.length; i++) {     // remove duplicate genes in sequences
        var seq = sanitized_population[i].seq
        var seen_genes = {}; var j = seq.length-1;
        while(j >= 0) {     // remove the duplicates that appear first in the seq
            if (seen_genes[JSON.stringify(seq[j])] === undefined) {  // gene unique
                seen_genes[JSON.stringify(seq[j])] = 1
            }else {
                //if(DEBUG_PRINT){console.log('removing duplicate gene');}
                seq.splice(j,1)  // remove 1 element starting from index j
                // j++;  // this is needed if traversing from beginning to end in seq
            }
            j--;
        }
        sanitized_population[i].seq = seq
    }

    // use genescoremap to determine which gene to remove - notvisible and taking too long;
    for(let i=0; i< sanitized_population.length; i++) {     
        var seq = sanitized_population[i].seq
        var seen_genes = {}; var j = 0;
        while(j < seq.length) {
            if (genescoremap[JSON.stringify(seq[j])] < 1) {  // remove low scoring genes in sequences;
                if(DEBUG_PRINT){console.log('removing low scoring gene');}
                seq.splice(j,1)  // remove 1 element starting from index j
                j--;
            }
            j++;
        }
        sanitized_population[i].seq = seq
    }

    return sanitized_population;
}

// Picks seqs to proceed in the next iteration
// returns next generation's seq population
const selection = function (seq_population, new_seq_population, currenturl) {
    // half of new population survives to go to next generation/iteration   
    var total_seq_population = seq_population.concat(new_seq_population).sort((a,b)=> { return b.fs - a.fs});  // decending order
    var top_seq_population = total_seq_population.slice(0,seq_population.length);  // return top/best fit solutions
        
    // measure how the fitness in population is changing
    var populationscore = 0; var bestscore = 0;
    let newpopulationscore = 0;
    for(let i = 0; i < new_seq_population.length; i ++){
        newpopulationscore += new_seq_population[i].fs;
    }
    for(let i=0;i<top_seq_population.length; i++) {
        populationscore += top_seq_population[i].fs; bestscore = Math.max(bestscore, top_seq_population[i].fs);
        if(DEBUG_PRINT){console.log('seq '+i+' score: '+top_seq_population[i].fs)}
    }
    appendObjecttoFile({url:currenturl, bscore: bestscore}, 'bestscore.json');
    appendObjecttoFile({url:currenturl, ascore: populationscore/top_seq_population.length}, 'averagescores.json');
    average_scores.push(newpopulationscore / new_seq_population.length);
    return top_seq_population;
}

const getpagescore = async function (t, url) {
   // await t.navigateTo(url);
    var score = 0
    for (let i=0; i<elementsOfInterest.length; i++){
        if(elementsOfInterest[i] === 'a'){
            continue;
        }
        const elements = Selector(elementsOfInterest[i])
        score += await elements.count
    }
    return score;
}

const pushToLog = function(log_object = {}){
    let log_name = cache.log + ".json"
    let seq_log = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER);
    seq_log = seq_log?seq_log:[];
    seq_log.push(log_object);
    utils.logObject(seq_log, log_name, LOG_FOLDER);
}

const check_signin_button = async function(element = {}){
    let element_attr = {};
    try{
        element_attr = await element.attributes;
    }catch(e){
        console.error("e");
    }
    let css_str = utils.GenerateCssString(element_attr);
    css_str = css_str.toLowerCase().replace(/[^a-z0-9]/gi, '');
    //console.log(css_str);
    if(css_str.includes("login") || css_str.includes("signin")){
        console.log("Sigin button detected, need to relogin");
        login_status = 0;
    }
}

const getallelementdata = async function (t, currenturl) {
    var allelements = []
    var hiddenelementids = []
    var visibleelementids = []
    var element_css = [];
    let anchor_object = loadfile("ajax_elements.json");
    let dialog_events = [];
    let element_info = {};
    let element_id = 0;
    let url_map = loadfile('ev_url_map.json');
    let num_elements = 0;
    url_map = url_map ? url_map : [];
    anchor_object = anchor_object?anchor_object:{};
    currenturl = utils.replaceToken(currenturl, token_name, token_value);
    await t.navigateTo(currenturl);
    //await t.eval(() => location.reload(true));
    await t.rightClick(Selector("body"));
    try {
        dialog_events = await eventRecord();
        element_info = rrweb.handleDOM(dialog_events);
        element_info = rrweb.DOM_addtional_element(dialog_events, element_info);
        element_id = rrweb.dialogEvent(dialog_events);
    }
    catch{
        element_id = 0;
        if(DEBUG_PRINT) console.log("failed to detect dialog");
    }
    if(element_id != 0){
        let rrweb_ele = element_info[element_id];
        let css_selector = rrweb_ele.tag + utils.GenerateCssString(rrweb_ele.attr);
        if(rrweb_ele.tag != 'a'){
            try{
                await t.click(Selector(css_selector));
            }
            catch{
                if(DEBUG_PRINT) console.log("dialog click unsucceed");    
            }
        }
    }
    for (let i=0; i<elementsOfInterest.length; i++){
        const elements = Selector(elementsOfInterest[i]);
        const elecount = await elements.count
        {console.log(elementsOfInterest[i], ":", elecount)}
        num_elements += elecount;
        for (let j=0; j<elecount; j++) {
            //console.log(j);
            const element = elements.nth(j);
            allelements.push({element: element});
            /* try{
                let elementtag = await element.tagName;
            }catch(e){
                if(DEBUG_PRINT) console.log(e);
            } */
            if (await element.visible){
                if(elementsOfInterest[i] != 'a') {await check_signin_button(element);} //check whether an element is a login button, if it is, we sign in at next iteration.
                visibleelementids.push(allelements.length -1);
                page_value ++;
            }
            else{
                hiddenelementids.push(allelements.length -1); 
            }
        }
    }
    if(num_elements == 0){
        login_status = 0; //if no elements detected, we might need to relogin
    }
    // printObject(hiddenelementids, 'hiddenelementids.json')
    // printObject(visibleelementids, 'visibleelementids.json')
    return [allelements, hiddenelementids, visibleelementids]
}

const get_cookies = async function(t, currenturl){
    let error_url = utils.replaceToken(currenturl, token_name, "token");
    //let error_name = utils.extractLogName(error_url, baseURI);
    let error_name = cache.log + ".json";
    let error_seq = utils.loadLogFile(error_name, USER_MODE, LOG_FOLDER);
    let timeStamp = new Date().getTime();
    let cookie_list = loadfile("ev_cookies.json");
    let temp_url = "";
    cookie_list = cookie_list?cookie_list:[];
    error_seq = error_seq?error_seq:[];
    error_seq.push({css_locators: "restart", timestamp: timeStamp});
    utils.logObject(error_seq, error_name, LOG_FOLDER);
    console.log("trying to login");
    if(MODE == 1 || MODE == 4){ // MODE == 1 => IDOR, MODE ==4 => IDOR + XSS, MODE == 0 => Crawler-only, MODE == 3 => XSS
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
        for(let j = 0; j < 10; j++){
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
    temp_url = await getURL()
    for(let j = 0; j < 10; j++){
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
    for (let j = 0; j < 10; j++){
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
    printObject(cookie_list, "ev_cookies.json")
    console.log(test_cookies);
}

const analyze_ascores = function(average_scores){
    let len = average_scores.length;
    if(average_scores[len - 1] <= 80){
        return 0;
    }
    /*if(len >= 2){
        if(average_scores[len - 1] == average_scores[len - 2]){
            return 0;
        }
    } */
    return 1;
}

const analyze_seq_population = function(new_seq_population, currenturl, iter){
    appendObjecttoFile("url: " + currenturl, 'new_seq_population.txt');
    appendObjecttoFile("----------------------------------------", 'new_seq_population.txt');
    for(let i = 0; i < new_seq_population.length - 1; i++)
    {
        if(DEBUG_PRINT) appendObjecttoFile(new_seq_population[i], 'new_seq_population.txt');
    }
}

const runevolutionarycrawler = async function (t) {
    console.log("crawler starts");
    let currenturl, page_element_data, allelements, hiddenelementids, visibleelementids, exploreditem;
    var new_seq_population = [], seq_population = [];
    var p_size, s_size, iterations;
    let beginning = 0;
    let url_map = loadfile('ev_url_map.json');
    url_map = url_map?url_map:[];
    while(1) {
        let no_elements = false;
        if(MODE == 1){
            url_map = []
        }
        if(pqueue.size() == 0){
            //wait for new pages, while there is no seeds in the queue
            await t.wait(5000);
            continue;
        }
        //pqueue.sort();
        printObject(pqueue, 'pqueue.json');
        currenturl = pqueue.peek().key;
        //currenturl = "http://webapp2.csl.toronto.edu:8600/modules/system/admin.php?fct=preferences&op=show&confcat_id=12" // overwrite the current url value to test on single page
        page_value = 0;
        cache.page = currenturl;
        printObject(cache, "ev_crawler_cache.json");
        if(login_status == 0){
            await get_cookies(t, currenturl);
            login_status = 1
        }
        beginning++;
        currenturl = utils.replaceToken(currenturl, token_name, token_value);
        console.log(currenturl);
        let map_url = currenturl.replace(baseURI, "/");
        url_map.push(utils.replaceToken(map_url, token_name, 'token'));
        printObject(url_map, "ev_url_map.json");
        let coefficient = [];
        page_element_data = await getallelementdata(t, currenturl);
        coefficient = parameters.small;
        s_size = coefficient[0]; p_size = coefficient[1]; iterations = coefficient[2];
        console.log("sequence size: ", s_size, " population size: ", p_size, " iteration size: ", iterations);
        allelements = page_element_data[0];
        hiddenelementids = page_element_data[1];
        visibleelementids = page_element_data[2];
        console.log("exploit queue size = "+pqueue.size())
        // 1. Initialize    
        //seq_population = loadfile('seq_population.json')
        //new_seq_population = loadfile('new_seq_population.json')
        if (next_gen === 0 || seq_population===false || seq_population.length == 0) {
            try{
                seq_population = await initialize_EA(visibleelementids, p_size, s_size, allelements);
            }catch(e){
                console.log("initialize fault: ", e)
            }
        }
        let seq = seq_population[0].seq;
        if(seq.length == 0){
            no_elements = true; //incase a page doesn't have any elements to interact with.
        }
        console.log("initialization succeed");
        if (new_seq_population === false) {
            new_seq_population = [];
        }
        average_scores = [];
        for (let i=0; i<iterations; i++) {
            i = next_gen;
            if(i >= iterations || no_elements == true){break;}
            console.log("Generation : "+i);
            let timestamp = new Date().getTime();
            await t.navigateTo(currenturl);
            pushToLog({css_locators: "navigate", timestamp: timestamp}); 
            next_gen++;
            printObject(next_gen, 'next_gen.json'); 
            // printObject(pqueue, 'pqueue.json');   // TODO: only save if pqueue was unchanged
            // await syncprintpqueue();
            if (new_seq_population.length != 0 && seq_population.length != 0){
                // 5. selection
                seq_population = selection(seq_population, new_seq_population, currenturl);
                if(!analyze_ascores(average_scores)){
                    console.log("average_scores: ", average_scores);
                    console.log("fitness function get stuck, transit to next page")
                    //break;
                }
                printObject(seq_population, 'seq_population.json');   // save current population state
            }
            console.log("average_scores: ", average_scores);
            // 2. Crossover/mutation TODO: using dynamic feedback, probabilistically perform either crossover or mutation
            try{
                new_seq_population = await crossover(seq_population, s_size, visibleelementids, p_size, allelements);
            }catch(e){
                console.error(e);
                continue;
            }
            try{
                new_seq_population = await mutate(new_seq_population, s_size, allelements);
                new_seq_population = sanitizePopulation(new_seq_population);
            }catch(e){
                console.error(e);
            }
            // 3. Sanitize the population - ex. prevent consecutive duplicate genes in seq
            // 4. Evaluate fitness
            try{
                new_seq_population = await evaluateFitness(t, new_seq_population, allelements, hiddenelementids, currenturl);
            }catch(e){
                console.error(e);
            }
            //analyze_seq_population(new_seq_population, currenturl, i);
            // save evolution state
            // saveEvolutionState(seq_population, {generation: i});
            //checked_hidden = [];

        } // Repeat till termination condition
        console.log("finish current page");
        checked_hidden = [];
        // clear per page data
        //var exploreditem = pqueue.pop();   // remove first item
        cache.seq = 0;
        cache.log ++;
        printObject(cache, "ev_crawler_cache.json");
        let exploredpages = loadfile('ev_exploredpages.json')
        exploredpages = exploredpages?exploredpages:[];
        exploreditem = pqueue.shift();
        exploredpages.push(exploreditem);
        printObject(exploredpages, 'ev_exploredpages.json')
        printObject(pqueue, 'pqueue.json');
        next_gen = 0;
        printObject(next_gen, 'next_gen.json');
        genescoremap = {}
        printObject(genescoremap, 'genescoremap.json');
        dependantelements = {}
        printObject(dependantelements, 'dependantelements.json');
        new_seq_population = []; seq_population = [];
        printObject(seq_population, 'seq_population.json');
        printObject(new_seq_population, 'new_seq_population.json');
        req_urlmap = [];
    }
    console.log("Evolutionary crawler pqueue finished!");
    // re iterate through the app starting from baseURI
    var score = await getpagescore(t, baseURI);
    //pqueue.push({key: baseURI, val: score});
    
    printObject(pqueue, 'pqueue.json')
    // delete record of visited pages so crawler can visit them again
}

fixture `Fuzzer`
    .page(login_info[APPNAME])
    .requestHooks(logger)
    .clientScripts({path: '../node_modules/rrweb/dist/record/rrweb-record.min.js', page: baseRE}, {path: 'attack-js/event.js', page: baseRE});

test
    ('Evolve sequences of interactions per page to modify app state', async t => {
        // record how many times the test is restarted due to error
        if(token_info.hasOwnProperty(APPNAME)){
            token_name = token_info[APPNAME];
        }
        let timestamp = new Date().getTime();
            //await extra_steps(t, APPNAME, login_info[APPNAME]);
        await get_cookies(t, login_info[APPNAME]);
        login_status = 1;
        let redirect_url = await getURL();
        // Explore user actions on each page/url
        // this includes searching for both get<a> and post<button/input/form> methods
        await t.setNativeDialogHandler(() => true);  // handle pop up dialog boxes;
        await t.maximizeWindow();  // less complex ui when the window size is largest
        // baseURI = await getURL();
        if(!loadCache()) {
            saveConfig();
            console.log('Cache files not detected. \nStarting scan from scratch...')
            var score = -1;
            let initial_url = await getURL();
            token_value = utils.ExtractToken(initial_url, token_name);
            initial_url = utils.replaceToken(initial_url, token_name, "token");
            printObject(cache, "ev_crawler_cache.json");
            console.log(baseURI);
            //pqueue.push({key: baseURI, val: score}); 
            // await syncprintpqueue();
            if(ENABLE_KAFKA){
                await sendtotopic(producer, initial_url, KAFKA_PAGETOPIC, score);
            }else{
                pqueue.push({key: initial_url, val: score});
                printObject(pqueue, 'pqueue.json')
                visitedpagestable[initial_url] = score;
                printObject(visitedpagestable, 'visitedpages.json')
            }
            // console.log("Starting queue length = " + queue.length);
        }
        //log the reason for restarting
        let error_url = pqueue.peek().key;
        let error_name = cache.log + ".json";
        let error_seq = utils.loadLogFile(error_name, USER_MODE, LOG_FOLDER);
        error_seq = error_seq?error_seq:[];
        if(error_seq.length != 0){
            if(error_log.hasOwnProperty(error_url)){
                error_log[error_url].push(error_seq[error_seq.length - 1].css_locators);
            }
            else{
                error_log[error_url] = [error_seq[error_seq.length - 1].css_locators];
            }
        }
        if(error_log.hasOwnProperty(error_url) && error_log[error_url].length >= 10){
            pqueue.shift();
        }
        printObject(error_log, "ev_error_log.json");
        //error_seq.push({css_locators: "restart", timestamp: timestamp});
        //utils.logObject(error_seq, error_name, LOG_FOLDER);
        error_log = null; //free the error log, since we alread print it (maybe ).
        error_seq = null;
        console.log("Original pqueue size = "+pqueue.size());
        await runevolutionarycrawler(t);
        console.log('Evolutionary crawler finished.');
    }).disablePageCaching;

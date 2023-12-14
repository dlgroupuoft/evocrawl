import { Selector, RequestLogger, ClientFunction, Role, t } from 'testcafe';
import http from 'http';
import {login, extractBaseUrl} from '../utils-evo/login';
import {ExtractToken, replaceToken, compareAnchorArrays, removeQuery, GenerateTypeString, GenerateCssString} from '../utils-evo/utils';
import { time } from 'console';
const pathoptimizer = require("./pathoptimizer");
const utils = require('../utils-evo/utils');
const rrweb = require('../utils-evo/rrweb_events');
const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab';
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + "/";
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE:'b';
const CRAWLER_MODE = process.env.CRAWLER_MODE?process.env.CRAWLER_MODE:'ev';
const TOKEN_MODE = process.env.TOKEN_MODE?process.env.TOKEN_MODE:0;
const LOG_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_log/";
const NAV_FOLDER = DATA_FOLDER + USER_MODE + "_nav/";
const TOKEN_FOLDER = DATA_FOLDER + "token/";
const RESPONSE_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_responses/";
const DEBUG_PRINT = 1;
const login_info = require('../utils-evo/login_information.json');
const token_info = require('../utils-evo/random_names.json');
const deny_info = require('../utils-evo/40X_sentences.json'); 
const path_info = require('../utils-evo/path.json')
const heavy_pages = login_info["heavy_pages"];
const baseURI = extractBaseUrl(login_info[APPNAME]);
let path = path_info[APPNAME];
path = path?path:"";
var urlobj = new URL(baseURI)
const PORT = urlobj.port?urlobj.port:'80';
const interactions = ['click', 'typetext', 'uploadfile', 'select', 'iframe'];
let elementsOfInterest = ['input','button','textarea','select', 'a'];
let token_name = login_info['token'];
let token_value = "";
let request_log_count = 0;
let page_visible = {};
let vul = {};
let cache = {};
let urltable = {};
let elements_visibility = {};
let navigationSet = [];
let exploredpages = [];
let nav_startTime = 0;
let crawl_startTime = 0;
let test_cookies = [];
let test_tokens = [];
let crawler_cache = {};
let replay_cache = {};
let random_names = {};
let deny_sentences = [];


function array_get(){
    let temp_events = events;
    events = [];
    return temp_events;
}

const getURL = ClientFunction(() => window.location.href);
const getPageHTML = ClientFunction(() => document.documentElement.outerHTML);
const eventRecord = ClientFunction(array_get);

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(NAV_FOLDER + CRAWLER_MODE + "_replay.log", {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) {
    let message = ''
    let date = new Date().toLocaleTimeString();
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


const printObject = function(obj, name, folder=NAV_FOLDER) {
    const fs = require('fs');
    fs.writeFileSync(folder+USER_MODE+'_'+ CRAWLER_MODE + '_' + name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const appendObjecttoFile = async function(obj, name) {
    // name is filename that contains array of obj
    var fs = require('fs');
    var logStream = fs.createWriteStream(NAV_FOLDER+USER_MODE+'_'+name, {flags: 'a'});
    // use {flags: 'a'} to append and {flags: 'w'} to erase and write a new file
    logStream.write(JSON.stringify(obj)+',\n');
    logStream.end();
}

const loadfile = function (name, user=USER_MODE, folder = NAV_FOLDER, crawler=CRAWLER_MODE) {
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
        console.error(`file ${user+'_'+ crawler + '_' + name} not found`);
        return false
}

const checkRequestLogs = function () {
    if (request_log_count != logger.requests.length){
        var num_req_generated = logger.requests.length - request_log_count ;
        request_log_count = logger.requests.length
        return num_req_generated
    }
    return 0
}

const loadAndSave = function (key, value, filename) {
    var f = loadfile(filename)
    f = f?f:{}
    f[key] = value
    printObject(f, filename)
}

const loadCache = function(){
    navigationSet = loadfile('navigationSet.json', 'a', DATA_FOLDER);
    elements_visibility = loadfile('elements_visibility.json');
    elements_visibility = elements_visibility?elements_visibility:{};
    crawler_cache = loadfile('crawler_cache.json', 'a', DATA_FOLDER, CRAWLER_MODE);
    replay_cache = loadfile('replay_cache.json', USER_MODE, DATA_FOLDER);
    replay_cache = replay_cache?replay_cache:{seq: cache.seq, stat: "", visibility: false};
    replay_cache.seq = cache.seq;
    urltable = loadfile('navtable.json')
    urltable = urltable?urltable:{};
    //random_names = utils.loadLogFile("a_random_names.json", USER_MODE, TOKEN_FOLDER);
    //random_names = token_info[APPNAME];
    if(random_names == undefined){
        random_names = {};
    }
    deny_sentences = deny_info[APPNAME];
    if(deny_sentences == undefined){
        deny_sentences = [];
    }
    random_names = random_names?random_names:{};
}

const check_similarity = function (respA, respB, method = 'get'){
    if (!respA.toString() || respA.toString()=="[]" || respA.toString()=="{}"){
        return; // skip triad test on empty responses
    }
    var difflib = require('difflib');
    var simAB = new difflib.SequenceMatcher(null, respA, respB);
    var sim_ratioAB = simAB.ratio();
    return sim_ratioAB;
    // for testing MF tuning
}

const crawl_links = async function(t, currentpageurl){
    console.log("crawl static links");
    await t.navigateTo(currentpageurl);
    let elements = Selector("a");
    let ele_len = await elements.count;
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
            //console.log(newpageurl);
            if(newpageurl != currentpageurl) {
                let log_newurl = utils.replaceToken(newpageurl, token_name, "token");
                urltable[log_newurl] = 1;
            }
            printObject(urltable, "navtable.json");
        }
    }
}

const getallelementdata = async function (t, currenturl) {
    var allelements = []
    let anchor_object = loadfile("ajax_elements.json");
    anchor_object = anchor_object?anchor_object:{};
    let dialog_events = [];
    let element_info = {};
    let element_id = 0;
    await t.navigateTo(currenturl);
    await t.rightClick(Selector("body"));
    try{
        dialog_events = await eventRecord();
        console.log("analyze dialog");
        element_info = rrweb.handleDOM(dialog_events);
        element_info = rrweb.DOM_addtional_element(dialog_events, element_info);
        element_id = rrweb.dialogEvent(dialog_events);
    }
    catch{
        element_id = 0;
        console.log("dialog close failed");
    }
    if(element_id != 0){
        let rrweb_ele = element_info[element_id];
        let css_selector = rrweb_ele.tag + utils.GenerateCssString(rrweb_ele.attr);
        try{
            await t.click(Selector(css_selector));
        }
        catch{
            console.log("dialog click unsucceed");    
        }
    }
    for (let i=0; i<elementsOfInterest.length; i++){
        const elements = Selector(elementsOfInterest[i]);
        const elecount = await elements.count;
        for (let j=0; j<elecount; j++) {
            const element = elements.nth(j);
            allelements.push({element: element});
            // console.log(await element.attributes)
        }
    }
    if(anchor_object.hasOwnProperty(currenturl)){
        let ajax_elements = anchor_object[currenturl];
        for(let i = 0; i < ajax_elements.length; i++){
            console.log(ajax_elements[i]);
            const element = Selector(ajax_elements[i]).nth(0);
            if(await element.visible){    
                allelements.push({element: element});
            }
        }
    }
    // printObject(hiddenelementids, 'hiddenelementids.json')
    // printObject(visibleelementids, 'visibleelementids.json')
    return allelements
}


const iframeOperation = async function(t, element){
    const iframeInterest = ['p']; //can add more element tags
    await t.switchToIframe(element);
    let fuzz_string = GenerateTypeString();
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

const readURLs = function(){
    let tempSet = {};
    let urlSet = {};
    let fileSet = ['urltable.json', 'urlscoretable.json',
                    'ev_urltable.json', 'visitedpages.json'];
    fileSet.forEach(file => {
        tempSet = loadfile(file);
        for(const key in tempSet){
            urlSet[key] = 1;
        }
    })
    return urlSet;
}

const ExecuteRequest = (userArequest, url, reqMethod, reqBody, otherUserCookie) => {
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

const ExecuteMultipleRequests = async function(request_test, private_pages, cookieA, cookieB){
    let temp_obj = {};
    for(let i = 0; i < private_pages.length; i++){
        let respA, respB;
        if(1){
            let url = private_pages[i];  
            let log_url = utils.replaceToken(url, token_name, "token");
            let log_name = utils.extractLogName(log_url, baseURI);
            let url_A = utils.replaceToken(url, token_name, test_tokens[0]);
            let url_B = utils.replaceToken(url, token_name, test_tokens[1]);         
            respA = await ExecuteRequest(request_test, url_A, "get", "", cookieA);
            respB = await ExecuteRequest(request_test, url_B, "get", "", cookieB);
            respA = respA.response;
            respB = respB.response;
            console.log("break point");
            let response_pair = [respA, respB];
            let responses = loadfile(log_name, USER_MODE, RESPONSE_FOLDER, CRAWLER_MODE);
            responses = responses?responses:[];
            responses.push(response_pair);
            printObject(responses, log_name, RESPONSE_FOLDER);
            //console.log(respB);
            //let sim_ratio = check_similarity(respA, respB);
            //vul[url] = sim_ratio;
        }
        /*if(resp.status < 400 && resp.status >= 300){
            let redirect_url = resp.location;
            if(!redirect_url.includes(baseURI)){
                redirect_url = baseURI.slice(0, -1) + resp.location;
            }
            let resp_redirect = await ExecuteRequest(request_test, redirect_url, "get", "");
            if(resp_redirect.status < 300){
                temp_obj['status'] = resp.status;
                temp_obj['source'] = currenturl;
                vul[url] = temp_obj;
            }
        }*/
    }
}

const element_detector = async function(t, item, allelements){
    var element = allelements[item.id].element;
    //var element = Selector(seq[i].css_selector).nth(0);
    var elementtag = await element.tagName;
    var elementattr = await element.attributes;
    var eleInnerText = await element.innerText;
    eleInnerText = eleInnerText.toLowerCase();
    var css_string = elementtag + GenerateCssString(elementattr);
    let lev_ratio = utils.levenshteinDistance(css_string, item.css_selector) / css_string.length;
    if(lev_ratio < 0.1){
        return element;
    }
    element = Selector(item.css_selector).nth(0);
    return element;
}

const detection = async function(test_urls= []){
    let filtered_urls = [];
    let anotherTable = {};
    let temp_request = logger.requests[logger.requests.length -1].request;
    let request = loadfile("request.json", 'a', DATA_FOLDER);
    request = request?request:temp_request;
    if(CRAWLER_MODE == 'ev'){
        anotherTable = loadfile('navtable.json', USER_MODE, NAV_FOLDER, 'sim')
    }
    else{
        anotherTable = loadfile('navtable.json', USER_MODE, NAV_FOLDER, 'ev')
    }
    anotherTable = anotherTable?anotherTable:{};
    for(let i = 0; i < test_urls.length; i++){
        let tmp_url = test_urls[i];
        if(urltable[tmp_url] == undefined && anotherTable[tmp_url] == undefined){
            filtered_urls.push(tmp_url);
        }
    }
    await ExecuteMultipleRequests(request, filtered_urls, test_cookies[0], test_cookies[1]);
}

const relogin = async function(t){
    await t.useRole(Role.anonymous());
    if(USER_MODE == 'a'){
        await login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
    }
    else{
        await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
        for(let j = 0; j < 5; j++){
            if(APPNAME != "phpbb"){
                break;
            }
            try{
                await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
            }
            catch{
                break;
            }
        }
    }
    let temp_url = await getURL();
    token_value = utils.ExtractToken(temp_url, token_name);
    console.log(token_value);
}

const get_cookies = async function(t){
    let cookies = [];
    /*await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
    let cookieA = logger.requests[logger.requests.length -1].request.headers.cookie;
    let temp_url = await getURL();
    test_tokens[0] = utils.ExtractToken(temp_url, token_name);*/
    await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
    for(let j = 0; j < 5; j++){
        if(APPNAME != "phpbb"){
            break;
        }
        try{
            await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
        }
        catch{
            break;
        }
    }
    let cookieB = logger.requests[logger.requests.length -1].request.headers.cookie;
    cookies.push("cookieA");
    cookies.push(cookieB);
    let temp_url = await getURL();
    let temp_html = await getPageHTML();
    token_value = utils.ExtractToken(temp_url, token_name);
    test_tokens[1] = token_value;
    return cookies;
}

const check_page = function(html = ""){
    for(let i = 0; i < deny_sentences.length; i++){
        if(html.includes(deny_sentences[i])){
            console.log(deny_sentences[i]);
            return true;
        }
    }
    return false;
}

const GenerateSubSet = function(url){
    let subset = {};
    for(let i = 0; i < navigationSet.length; i++){
        let path = navigationSet[i];
        if(path.source != url){
            continue;
        }
        if(!subset.hasOwnProperty(path.edge)){
            subset[path.edge] = [path.sink];
        }
        else{
            subset[path.edge].push(path.sink);
        }
    }
    return subset;
}

const generate_random_names = function(ref_url, new_ref_url){
    console.log("ref url: ", ref_url)
    console.log("new ref url: ", new_ref_url)
    if(ref_url != new_ref_url){
        let acc = 0;
        let sum = 0;
        let ref_parameters = utils.extractParameter(ref_url);
        let new_parameters = utils.extractParameter(new_ref_url);
        let new_random_names = loadfile("random_names.json");
        new_random_names = new_random_names?new_random_names:{};
        let non_random_names = loadfile("non_random_names.json");
        non_random_names = non_random_names?non_random_names:{};
        let temp_randoms = new_random_names;
        for(let name in new_parameters){
            sum ++;
            if(ref_parameters[name] == undefined || ref_parameters[name] != new_parameters[name]){
                new_random_names[name] = 1;
                acc ++;
            }
            else{
                non_random_names[name] = 1;
            }
        }
        let dvd = acc / sum;
        if(acc > 1/3) { //we don't expect one url contains too more dynamic parameters. if it does, there might be chances that replayinghappens on the wrong elements.
            new_random_names = temp_randoms;
        }
        printObject(new_random_names, "random_names.json");
        printObject(non_random_names, "non_random_names.json");
    }
}

const edge_execution = async function (t, seq, currenturl, page_eles, log_name){
    var total_score = 0;
    let action_id = 0;
    let num_FP = 0;
    let page_FP = {};
    // reset request count
    //currenturl = replaceToken(currenturl, token, token_value);
    let log_url = utils.replaceToken(currenturl, token_name, "token");
    let newurl = currenturl;
    let crawler_url = log_url;
    let crawler_href = "";
    let crawler_newurl = "";
    let replayer_href = "";
    request_log_count = 0;
    var req_count = checkRequestLogs();
    console.log(seq.length);
    let request = logger.requests[logger.requests.length -1].request;
    await crawl_links(t, currenturl);
    //random_names = utils.loadLogFile("a_random_names.json", USER_MODE, TOKEN_FOLDER);
    //random_names = random_names?random_names:{};
    while(1) {
        //await t.navigateTo(currenturl);
        let element;
        let filtered_locators = [];
        while (cache.edge >= seq.length){
            crawler_cache = loadfile('crawler_cache.json', 'a', DATA_FOLDER, CRAWLER_MODE);
            crawler_url = utils.replaceToken(crawler_cache.page, token_name, "token");
            if(cache.log != crawler_cache.log || crawler_cache.stat == "finished"){
                break;
            }
            seq = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER)
            await t.wait(500);
        }
        if(cache.log != crawler_cache.log){
            console.log("finished current page");
            break;
        }
        if(cache.edge >= seq.length && crawler_cache.stat == "finished"){
            break;
        }
        let clickable = 0;
        let i = cache.edge;
        console.log("element: ", i);
        //console.log(currentTime, nav_startTime, timestamp, crawl_startTime);
        if(seq[i].css_locators == "navigate"){
            console.log("navigate");
            console.log(currenturl);
            await t.navigateTo(currenturl);
            //await t.eval(() => location.reload(true));
            cache.edge ++;
            printObject(cache, "cache.json");
            continue;
        }
        if(seq[i].css_locators == "restart"){
            console.log("restart");
            await relogin(t);
            currenturl = utils.replaceToken(currenturl, token_name, token_value);
            if(CRAWLER_MODE == "ev") await getallelementdata(t, currenturl);
            cache.edge ++;
            printObject(cache, "cache.json");
            continue;
        }
        try{
            filtered_locators = await pathoptimizer.traverseLocators(seq[i].css_locators, baseURI, Selector, seq[i].css_selector, token_name, token_value, random_names, TOKEN_MODE);
        }
        catch(e){
            console.log(e)
            filtered_locators = [seq[i].css_selector];
        }
        console.log(filtered_locators);
        if(filtered_locators.length != 0){
            element = await pathoptimizer.relocateElement(filtered_locators, Selector, seq[i].css_locators.innerText, random_names);
        }
        else{
            element = Selector(seq[i].css_selector);
        }
        let tmp_count = await element.count;
        if(tmp_count > 1){
            console.log("cannot locate element accurately");
            //element = element.nth(0);
        }
        element = element.nth(0);
        console.log("number of returned element: ", tmp_count);
        let visibility = await element.visible;
        replay_cache.stat = "checked";
        replay_cache.visibility = visibility;
        printObject(replay_cache, "replay_cache.json", DATA_FOLDER);
        replay_cache.seq ++;
        cache.seq = replay_cache.seq;
        cache.edge ++;
        printObject(cache, "cache.json");
        if (!visibility || tmp_count == 0) {
            if(true){console.log("element in seq not visible")}
            continue;
        }
        var elementtag = await element.tagName;
        var elementattr = await element.attributes;
        var eleInnerText = await element.innerText;
        if(tmp_count == 1 && TOKEN_MODE == 1 && elementtag == "a"){
            if(elementattr.hasOwnProperty('href')){
                replayer_href = elementattr.href;
            }
            if(crawler_href != crawler_cache.href){
                crawler_href = crawler_cache.href;
            }
            generate_random_names(crawler_href, replayer_href);
            replayer_href = "";
            crawler_href = "";
        }
        var css_string = elementtag + GenerateCssString(elementattr) + eleInnerText.toLowerCase();
        action_id = seq[i].action;
        if (!utils.check_url_keywords(css_string, heavy_pages)) {
            continue;
        }
        if(DEBUG_PRINT){
            console.log(seq[i].css_selector + "--->" + interactions[action_id]);
        }
        if (interactions[action_id] === "click"){
            try{
                await t.click(element);
                clickable = 1;
            }
            catch{
                console.log("click not succeed");
                //continue;
            }
            if(clickable == 1){
                req_count = checkRequestLogs();
                //console.log("generate requests: ", req_count);
                var deepcopy = JSON.parse(JSON.stringify(logger.requests.slice(logger.requests.length-req_count))); 
                /* if(req_count > 0){
                    for(let j=0; j<req_count; j++) {
                        var lastreqlog = deepcopy[deepcopy.length-1-j]
                        var req = lastreqlog.request
                        let log_req_url = utils.replaceToken(req.url, token_name, "token");
                        if(log_req_url != log_url){
                            urltable[log_req_url] = 1;
                            printObject(urltable, "navtable.json");
                        }
                    }
                } */
                if(USER_MODE == 'a'){
                    let temp_headers = logger.requests[logger.requests.length -1].request.headers;
                    for(let property in temp_headers){
                        let headers = request.headers;
                        headers[property] = temp_headers[property];
                        request.headers = headers;
                    }
                    printObject(request, 'request.json', DATA_FOLDER);
                }
            }
        }
        else if (interactions[action_id] === "typetext") {
            let fuzz_string = GenerateTypeString(elementattr, elementtag, CRAWLER_MODE);
            //let fuzz_string = GenerateTypeString();
            try{
                await t.typeText(element, fuzz_string, { replace: true, paste: true })
            }
            catch{
                console.log("typeText not succeed");
                continue;
            }
        }
        else if (interactions[action_id] === "uploadfile") {
            try{
                await t.setFilesToUpload(element, ['upload-files/not_kitty.png']);
            }catch{
                console.log("upload not succeed");
                continue;
            }
            if(DEBUG_PRINT){console.log("File uploaded.")}
        }
        else if (interactions[action_id] === "select") {    // interact with 'select' element
            const options = element.find('option');
            const optioncount = await options.count;
            if(optioncount <= 0){   // no options for the select dropdown element
                updategenescore(seq[i], GENE_PENALTY_MILD);
                continue;
            }
            //const optrand = Math.floor(Math.random()*optioncount) //assign random number may suffer from the all deletion problem
            const optrand = 0;
            try{
                await t.click(element);
                await t.click(options.nth(optrand));
            }
            catch{
                console.log("select click not succeed");
                continue;
            }
        }
        else if(interactions[action_id] === 'iframe'){
            try {
                await iframeOperation(t, element);
            } catch (error) {
                console.log("iframe operation failed");
            }
            await t.switchToMainWindow();
        }
        else {
            console.log("Action not supported")
        }
        newurl = await getURL();
        if(TOKEN_MODE == 1 && newurl != currenturl){
            crawler_cache = loadfile('crawler_cache.json', 'a', DATA_FOLDER, CRAWLER_MODE);
            console.log("Comparing URLs")
            generate_random_names(crawler_cache.href, newurl);
        }
        //let page_html = await getPageHTML();
        let log_newurl = utils.replaceToken(newurl, token_name, "token");
        let inaccessible = 0;
        //inaccessible = check_page(page_html);
        if(clickable == 0 || log_newurl == log_url){
            inaccessible = 0;
        }
        if (inaccessible && false) {
            if(true){console.log("navigate to inaccessible page", log_newurl)}
            if(USER_MODE == 'a'){
                page_eles[seq[i].edge] = 1;
                page_eles[seq[i].rrwebId] = 1;
                printObject(page_eles, "page_eles.json");
            }
            continue;
        }
        else{
            if(USER_MODE == 'b'){
                page_eles[seq[i].edge] = 1;
                page_eles[seq[i].rrwebId] = 1;
                printObject(page_eles, "page_eles.json");
            }
        }
        if(newurl != currenturl) {
            urltable[log_newurl] = 1;
        }
        printObject(urltable, "navtable.json");
    }
    cache.edge = 0;
    cache.seq = 0;
    replay_cache.seq = 0;
    printObject(replay_cache, "replay_cache.json", DATA_FOLDER);
    printObject(cache, "cache.json");
    return page_eles;
}

const navigation = async function(t) {
    loadCache();
    console.log("loaded cache succesfsfully");
    let pages = {};
    let temp_explored = [];
    console.log(cache.page);
    let i = 0;
    await relogin(t);
    while(true){
        crawler_cache = loadfile('crawler_cache.json', 'a', DATA_FOLDER, CRAWLER_MODE);
        console.log("crawler_cache: ", crawler_cache);
        let url = crawler_cache.page;
        if(cache.url.length != 0){
            if(cache.log != crawler_cache.log){
                cache.edge = 0;
                cache.seq = 0;
                replay_cache.seq = 0;
                printObject(replay_cache, "replay_cache.json", DATA_FOLDER);
                printObject(cache, "cache.json");
            }   
        }
        cache.url = url;
        console.log("URL: ", url);
        url = utils.replaceToken(url, token_name, token_value);
        if(CRAWLER_MODE == "ev") await getallelementdata(t, url);
        let log_url = utils.replaceToken(url, token_name, "token");
        //let log_name = utils.extractLogName(log_url, baseURI);
        let log_name = crawler_cache.log + ".json";
        cache.log = crawler_cache.log;
        await t.wait(1000);
        let seq_log = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER);
        let page_eles = loadfile("page_eles.json");
        page_eles = page_eles?page_eles:{};
        if(i == 0){
            crawl_startTime = seq_log[0].timestamp;
            cache['crawl_startTime'] = crawl_startTime;
            printObject(cache, 'cache.json');
            i ++;
        }
        let SubSet = [];
        printObject(SubSet, "SubSet.json");
        crawl_startTime = cache.crawl_startTime;
        console.log("start edge execution");
        try{
            page_eles = await edge_execution(t, seq_log, url, page_eles, log_name);
        }catch(e){
            console.log(e);
        }
        elements_visibility[log_url] = page_eles;
        page_eles = {};
        printObject(page_eles, "page_eles.json");
        printObject(elements_visibility, "elements_visibility.json");
        cache.page ++;
        printObject(cache, "cache.json");
        if(crawler_cache.stat == "finished"){
            console.log("crawler finished, stop the replayer");
            break;
        }
    }
    printObject(0, "current.json", DATA_FOLDER);
}

fixture `Fuzzer`
    .page(baseURI)
    .requestHooks(logger)
    .clientScripts('../node_modules/rrweb/dist/record/rrweb-record.min.js', "../crawl/attack-js/event.js")

test
    ('Follow the navigation graph', async t => {

        cache = loadfile("cache.json");
        //await login(t, APPNAME, login_info[APPNAME], login_info['username'], login_info['password']);
        await t.setNativeDialogHandler(() => true); // handle pop up dialog boxes; 
        await t.maximizeWindow();  // less complex ui when the window size is largest
        cache = cache?cache:{page:0, edge:0, nav_startTime: new Date().getTime(), seq: 0, url: "", log: 0};
        nav_startTime = cache.nav_startTime;
        await navigation(t);
    })

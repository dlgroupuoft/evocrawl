import { Selector, RequestLogger, ClientFunction, Role, t } from 'testcafe';
import http from 'http';
import {login, extractBaseUrl} from './../utils-evo/login';
import {ExtractToken, replaceToken, compareAnchorArrays, removeQuery, GenerateTypeString, GenerateCssString} from './../utils-evo/utils';
const pathoptimizer = require("./pathoptimizer");
const utils = require('./../utils-evo/utils');
const rrweb = require('./../utils-evo/rrweb_events');
const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab';
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + '-ev/';
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE:'b';
const CRAWLER_MODE = process.env.CRAWLER_MODE?process.env.CRAWLER_MODE:'sim';
const LOG_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_log/";
const NAV_FOLDER = DATA_FOLDER + USER_MODE + "_nav/";
const RESPONSE_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_responses/";
const DEBUG_PRINT = 1;
const login_info = require('./../utils-evo/login_information.json');
const baseURI = extractBaseUrl(login_info[APPNAME]);
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


function array_get(){
    let temp_events = events;
    events = [];
    return temp_events;
}

const getURL = ClientFunction(() => window.location.href);
const eventRecord = ClientFunction(array_get);

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

const loadfile = function (name, user=USER_MODE, folder = NAV_FOLDER, crawler=CRAWLER_MODE) {
    const fs = require('fs');
        try {
            if(fs.existsSync(folder + user+'_'+ crawler + '_' + name)){
                console.log(`file ${user+'_'+ crawler + '_' + name} detected.`);
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

const getallelementdata = async function (t, currenturl) {
    var allelements = []
    let anchor_object = loadfile("ajax_elements.json");
    anchor_object = anchor_object?anchor_object:{};
    let dialog_events = [];
    let element_info = {};
    let element_id = 0;
    await t.navigateTo(currenturl);
    await t.rightClick(Selector("body"));
    dialog_events = await eventRecord();
    console.log("analyze dialog");
    element_info = rrweb.handleDOM(dialog_events);
    element_info = rrweb.DOM_addtional_element(dialog_events, element_info);
    element_id = rrweb.dialogEvent(dialog_events);
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
    let counter = 0;
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
            console.log(respB.status);
            if(respB.status < 300){
                counter ++;
            }
            respB = respB.response;
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
    console.log("misclassified: ", counter);
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
    }
    let temp_url = await getURL();
    token_value = utils.ExtractToken(temp_url, token_name);
    console.log(token_value);
}

const get_cookies = async function(t){
    let cookies = [];
    await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['crawler'], login_info['password']);
    let cookieA = logger.requests[logger.requests.length -1].request.headers.cookie;
    let temp_url = await getURL();
    test_tokens[0] = utils.ExtractToken(temp_url, token_name);
    await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
    let cookieB = logger.requests[logger.requests.length -1].request.headers.cookie;
    cookies.push(cookieA);
    cookies.push(cookieB);
    temp_url = await getURL();
    token_value = utils.ExtractToken(temp_url, token_name);
    test_tokens[1] = token_value;
    return cookies;
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

const navigation = async function(t) {
   test_cookies = await get_cookies(t);
   let private_pages = loadfile("private_pages.json", 'b', DATA_FOLDER, 'sim');
   let temp_request = logger.requests[logger.requests.length -1].request;
   let test_urls = [];
   for(let url in private_pages){
        test_urls.push(url);
   }
   console.log(test_urls);
   console.log(test_cookies);
   await ExecuteMultipleRequests(temp_request, test_urls, test_cookies[0], test_cookies[1]);
    /*page_visible = loadfile("page_visible.json");
    for(let i = 0; i < navigationSet.length; i++){
        let path = navigationSet[i];
        for (let url in page_visible){
            if(url == path.source){
                if(page_visible[url].hasOwnProperty(path.edge)){
                    pages[path.sink] = 1;
                }
            }
        }
    }
    for(let url in pages){
        if(pages[url] == 0){
            private_pages[url] = 1;
        }
        else{
            public_pages[url] = 1;
        }
    }*/
    await t.wait(5000);
}

fixture `Fuzzer`
    .page(baseURI)
    .requestHooks(logger)
    .clientScripts('../node_modules/rrweb/dist/record/rrweb-record.min.js', "../crawl/attack-js/event.js")

test
    ('Follow the navigation graph', async t => {

        //await login(t, APPNAME, login_info[APPNAME], login_info['username'], login_info['password']);
        await t.setNativeDialogHandler(() => true); // handle pop up dialog boxes; 
        await t.maximizeWindow();  // less complex ui when the window size is largest
        await navigation(t);
        }
    )

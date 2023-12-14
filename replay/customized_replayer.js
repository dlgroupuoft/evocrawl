import { Selector, RequestLogger, ClientFunction, Role, t } from 'testcafe';
import {login, extractBaseUrl} from '../utils-evo/login';
import {ExtractToken, replaceToken, compareAnchorArrays, removeQuery, GenerateTypeString, GenerateCssString} from '../utils-evo/utils';
const pathoptimizer = require("./pathoptimizer");
const utils = require('../utils-evo/utils');
const rrweb = require('../utils-evo/rrweb_events');
const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab';
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + "/";
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE:'b';
const CRAWLER_MODE = process.env.CRAWLER_MODE?process.env.CRAWLER_MODE:'sim';
const LOG_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_log/";
const NAV_FOLDER = DATA_FOLDER + USER_MODE + "_nav_cus/";
const RESPONSE_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_responses/";
const DEBUG_PRINT = 1;
const login_info = require('../utils-evo/login_information.json');
const token_info = require('../utils-evo/random_names.json');
const deny_info = require('../utils-evo/40X_sentences.json'); 
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
let random_names = {};
let deny_sentences = [];


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
    urltable = loadfile('navtable.json')
    urltable = urltable?urltable:{};
    random_names = token_info[APPNAME];
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

const getallelementdata = async function (t, currenturl) {
    var allelements = []
    let dialog_events = [];
    let element_info = {};
    let element_id = 0;
    await t.navigateTo(currenturl);
    await t.rightClick(Selector("body"));
    console.log('start closing dialoge');
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

const edge_execution = async function (t, seq, currenturl, page_eles, SubSet){
    var total_score = 0;
    let action_id = 0;
    let num_FP = 0;
    let page_FP = {};
    // reset request count
    //currenturl = replaceToken(currenturl, token, token_value);
    let log_url = utils.replaceToken(currenturl, token_name, "token");
    let log_name = utils.extractLogName(log_url, baseURI);
    let newurl = currenturl;
    request_log_count = 0;
    var req_count = checkRequestLogs();
    console.log(seq.length);
    let request = logger.requests[logger.requests.length -1].request;
    for(let i=0; i<seq.length; i++) {
        //await t.navigateTo(currenturl);
        let filtered_locators = [];
        if(cache.edge >= seq.length) break;
        i = cache.edge;
        cache.edge ++;
        console.log("element: ", i);
        printObject(cache, "cache.json");
        let currentTime = new Date().getTime();
        let timestamp = seq[i].timestamp;
        let ano_timestamp = 1;
        //console.log(currentTime, nav_startTime, timestamp, crawl_startTime);
        while((currentTime - nav_startTime) < (timestamp - crawl_startTime)){
            currentTime = new Date().getTime();
            await t.wait(10);
            await t.rightClick(Selector("body"));
            //break;
        }
        //console.log("waiting for another crawler to progress");
        //printObject(timestamp, "current.json", DATA_FOLDER);
        /*while(ano_timestamp != 0 && timestamp > ano_timestamp){
            await t.wait(100);
            await t.rightClick(Selector("body"));
            if(CRAWLER_MODE == 'sim'){
                ano_timestamp = loadfile("current.json", USER_MODE, DATA_FOLDER, 'ev');
            }
            else{
                ano_timestamp = loadfile("current.json", USER_MODE, DATA_FOLDER, 'sim');
            }
            ano_timestamp = ano_timestamp?ano_timestamp:0;
        }*/
        if(seq[i].css_locators == "navigate"){
            console.log("navigate");
            console.log(currenturl);
            await t.navigateTo(currenturl);
            //await t.eval(() => location.reload(true));
            continue;
        }
        if(seq[i].css_locators == "restart"){
            console.log("restart");
            await relogin(t);
            currenturl = utils.replaceToken(currenturl, token_name, token_value);
            await getallelementdata(t, currenturl);
            continue;
        }
        try{
            filtered_locators = await pathoptimizer.traverseLocators(seq[i].css_locators, baseURI, Selector, seq[i].css_selector, token_name, token_value, random_names);
        }
        catch{
            appendObjecttoFile(seq[i].css_locators, "err_locators.json");
            filtered_locators = [seq[i].css_selector];
        }
        console.log(filtered_locators);
        let element;
        if(filtered_locators.length != 0){
            element = await pathoptimizer.relocateElement(filtered_locators, Selector, seq[i].css_locators.innerText, random_names);
        }
        else{
            element = Selector(seq[i].css_selector);
        }
        let tmp_count = await element.count;
        if(tmp_count > 1){
            console.log("cannot locate element accurately");
            element = element.nth(0);
        }
        console.log("number of returned element: ", tmp_count);
        if (!(await element.visible)) {
            // Penalty for this case
            if(true){console.log("element in seq not visible")}
            console.log(seq[i].css_selector);
            if(USER_MODE == 'a'){
                page_eles[seq[i].css_selector] = 1;
                page_eles[seq[i].rrwebId] = 1;
                printObject(page_eles, "page_eles.json");
            }
            continue;
        }
        if(USER_MODE == 'b'){
            page_eles[seq[i].css_selector] = 1;
            page_eles[seq[i].rrwebId] = 1;
            printObject(page_eles, "page_eles.json");
        }
        var elementtag = await element.tagName;
        var elementattr = await element.attributes;
        var eleInnerText = await element.innerText;
        var css_string = elementtag + GenerateCssString(elementattr);
        action_id = seq[i].action;
        if(1){
            console.log(seq[i].css_selector + "--->" + interactions[action_id]);
        }
        // Done: Check if the interaction is novel, reward novelty value if yes
        // Archive the interaction, initialize novelty reward value, decrease (exponentially?) with generation/iteration (similar to simulated annealing)
        if (interactions[action_id] === "click"){
            var eleAttr = elementattr;
            //if (!(await element.visible)) {continue}
            if (eleAttr.href === "/users/sign_out" || (eleAttr.href && (eleAttr.href.includes('signout') || elementattr.href.includes("logout"))) || eleInnerText === "log out" || eleInnerText === "sign out") {
                continue
            }
            try{
                await t.click(element);
            }
            catch{
                console.log("click not succeed");
                continue;
            }
            req_count = checkRequestLogs();
            //console.log("generate requests: ", req_count);
            var deepcopy = JSON.parse(JSON.stringify(logger.requests.slice(logger.requests.length-req_count))); 
            if(req_count > 0){
                for(let j=0; j<req_count; j++) {
                    var lastreqlog = deepcopy[deepcopy.length-1-j]
                    var req = lastreqlog.request
                    let log_req_url = utils.replaceToken(req.url, token_name, "token");
                    //urltable[log_req_url] = 1;
                    //printObject(urltable, "navtable.json");
                }
            }
            if(USER_MODE == 'a'){
                let temp_headers = logger.requests[logger.requests.length -1].request.headers;
                for(let property in temp_headers){
                    let headers = request.headers;
                    headers[property] = temp_headers[property];
                    request.headers = headers;
                }
            }
        }
        else if (interactions[action_id] === "typetext") {
            let fuzz_string = GenerateTypeString(elementattr, elementtag);
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
        let log_newurl = utils.replaceToken(newurl, token_name, "token");
        if(newurl != currenturl) {
            urltable[log_newurl] = 1;
        }
        printObject(urltable, "navtable.json");
    }
    cache.edge = 0;
    printObject(cache, "cache.json");
    return page_eles;
}

const navigation = async function(t) {
    loadCache();
    let pages = {};
    let temp_explored = [];
    exploredpages = loadfile('exploredpages.json', 'a', DATA_FOLDER);
    exploredpages = exploredpages?exploredpages:[];
    console.log(exploredpages.length);
    console.log(cache.page);
    let i = 0;
    while(true){
        if(cache.page >= exploredpages.length) {
            break;
        }
        i = cache.page;
        let url = "";
        if(CRAWLER_MODE == "ev"){
            url = exploredpages[i].key;
        }
        else{
            url = exploredpages[i];
        }
        console.log(url);
        await relogin(t);
        url = utils.replaceToken(url, token_name, token_value);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        let seq_log = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER);
        let page_eles = loadfile("page_eles.json");
        page_eles = page_eles?page_eles:{};
        if(i == 0){
            crawl_startTime = seq_log[0].timestamp;
            cache['crawl_startTime'] = crawl_startTime;
            printObject(cache, 'cache.json');
        }
        let SubSet = [];
        printObject(SubSet, "SubSet.json");
        crawl_startTime = cache.crawl_startTime;
        var allelements = await getallelementdata(t, url);
        console.log("start edge execution");
        page_eles = await edge_execution(t, seq_log, url, page_eles, SubSet);
        elements_visibility[log_url] = page_eles;
        page_eles = {};
        printObject(page_eles, "page_eles.json");
        printObject(elements_visibility, "elements_visibility.json");
        cache.page ++;
        printObject(cache, "cache.json");
        exploredpages = loadfile('exploredpages.json', 'a', DATA_FOLDER);
    }
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
        cache = cache?cache:{page:0, edge:0, nav_startTime: new Date().getTime()};
        nav_startTime = cache.nav_startTime;
        await navigation(t);
        }
    )
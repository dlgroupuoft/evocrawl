import { Selector, RequestLogger, ClientFunction, Role, t } from 'testcafe';
import http from 'http';
import {login, extractBaseUrl} from '../utils-evo/login';
import {ExtractToken, replaceToken, compareAnchorArrays, removeQuery, GenerateTypeString, GenerateCssString} from '../utils-evo/utils';
const pathoptimizer = require("./pathoptimizer");
const utils = require('../utils-evo/utils');
const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab';
const DATA_FOLDER = "../data/" + APPNAME + '-sim/';
const LOG_FOLDER = DATA_FOLDER + 'log/';
const USER_MODE = 'a';
const DEBUG_PRINT = 1;
const login_info = require('../utils-evo/login_information.json');
let baseURI = extractBaseUrl(login_info[APPNAME]);
var urlobj = new URL(baseURI)
const PORT = urlobj.port?urlobj.port:'80';
let token_name = login_info["token"];
let token_value = "";
let request_log_count = 0;
let element_FP = {};
let page_visible = {};
let cache = {};
let vul = {};
let global_count = 0;

const getURL = ClientFunction(() => window.location.href);

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

const printObject = function(obj, name) {
    const fs = require('fs');
    fs.writeFileSync(DATA_FOLDER+USER_MODE+'_'+name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const loadfile = function (name, user=USER_MODE) {
    const fs = require('fs');
        try {
            if(fs.existsSync(DATA_FOLDER+user+'_'+name)){
                console.log(`file ${user+'_'+name} detected.`);
                return JSON.parse(fs.readFileSync(DATA_FOLDER+user+'_'+name));
            }            
        } catch (err) {
            console.log(`error loading file - ${DATA_FOLDER+user+'_'+name}`)
            console.log(err);
        }
        console.error(`file ${user+'_'+name} not found`);
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

const ExecuteRequest = (userArequest, url, reqMethod, reqBody) => {
    return new Promise(resolve => {
        var url_obj = new URL(url);
        var headers = userArequest.headers;
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
                resolve({response: results.toString(), status: res.statusCode, location: res.headers.location});
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

const ExecuteMultipleRequests = async function(request_test, private_pages, currenturl){
    console.log(request_test.headers);
    let temp_obj = {};
    for(let url in private_pages){
        let resp = await ExecuteRequest(request_test, url, "get", "");
        console.log(resp.status);
        if(resp.status < 300){
            temp_obj['status'] = resp.status;
            temp_obj['source'] = currenturl;
            vul[url] = temp_obj;
        }
        if(resp.status < 400 && resp.status >= 300){
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
        }
    }
}

const relogin = async function(t){
    await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
    let temp_url = await getURL();
    let tmp_token_value = utils.ExtractToken(temp_url, token_name);
    if(tmp_token_value != "token"){
        token_value = tmp_token_value;
    }
}


const edge_execution = async function(t, currentpageurl, seq) {
    // console.log("Entered crawler");
    element_FP[currentpageurl] = [];
    await t.navigateTo(currentpageurl);
    console.log("current page url = "+currentpageurl);
    var anchorelements = Selector('a').filterVisible();
    for (let j=0; j<seq.length; j++) {
        let filtered_locators = [];
        if(cache.edge >= seq.length) break;
        j = cache.edge;
        cache.edge ++;
        printObject(cache, "sim_cache.json");
        console.log("Current element id = " + j);
        if(seq[j].css_locators == "navigate"){
            console.log("navigate");
            await t.navigateTo(currentpageurl);
            //await t.eval(() => location.reload(true)); 
            continue;
        }
        if(seq[j].css_locators == "restart"){
            console.log("restart");
            await relogin(t);
            currentpageurl = utils.replaceToken(currentpageurl, token_name, token_value);
            continue;
        }
        //console.log("debugging: ", seq[j].css_selector);
        let t0 = new Date().getTime();
        filtered_locators = await pathoptimizer.traverseLocators(seq[j].css_locators, baseURI, Selector, seq[j].css_selector, token_name, token_value);
        console.log(filtered_locators); 
        let t1 = new Date().getTime(); 
        //console.log("time is ", t1-t0);
        var element = await pathoptimizer.relocateElement(filtered_locators, Selector);
        let tmp_count = await element.count;
        if(tmp_count > 1){
            console.log("cannot locate the element accurately, have to take a risk");
            element = element.nth(0);
        }
        console.log("number of element returned: ", tmp_count);
        // Reset the request generated count
        if (!(await element.exists) || !(await element.visible)){
            if(DEBUG_PRINT){console.log('Element does not exist or not visble');}
            //console.log(seq[j].css_locators);
            continue;
        }
        var elementtag = await element.tagName;
        var elementattr = await element.attributes;
        var css_string = elementtag + GenerateCssString(elementattr);
        let temp_css = seq[j].css_selector;
        let temp_obj = page_visible[currentpageurl];
        temp_obj[temp_css] = 1;
        page_visible[currentpageurl] = temp_obj;
        printObject(page_visible, "sim_page_visible.json");
        if (elementattr.href != undefined && (elementattr.href.includes("logout") || elementattr.href == "set-up-database.php")) {
            continue;
        }
        try{
            await t.click(element);
        }
        catch{
            console.log("click unsucceed");
            continue;
        }
        var newpageurl = await getURL();
        const hostname = new URL(newpageurl).hostname; const basehostname = new URL(baseURI).hostname;
        if (hostname != basehostname) {
            if(DEBUG_PRINT){console.log("Out of domain detected and avoided.")}
            continue;
        }
        // check if new requests found
        // make a deep copy of logger.requests

        //seed selectio
    }
    cache.edge = 0;
    printObject(cache, "sim_cache.json");
}


const navigation = async function(t) {
    /*let navigationSet = require(DATA_FOLDER + 'a_ev_navigationSet.json');
    navigationSet = pathoptimizer.filter_set(navigationSet);
    printObject(navigationSet, 'filtered_navigationSet.json')*/
    let explored_pages = loadfile('sim_exploredpages.json')
    let urlSet =readURLs();
    printObject(urlSet, "urlSet.json");
    console.log(cache.page);
    console.log(explored_pages.length);
    for(let i = 0; i < explored_pages.length; i++){
        if(cache.page >= explored_pages.length) {
            break;
        }
        i = cache.page;
        printObject(cache, "sim_cache.json");
        await relogin(t);
        console.log(token_value);
        let url = explored_pages[i];
        let log_url = url;
        url = utils.replaceToken(url, token_name, token_value);
        //let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        let seq_log = utils.loadLogFile(log_name, USER_MODE, LOG_FOLDER);
        if(!page_visible.hasOwnProperty(url)){
            page_visible[url] = {};
        }
        console.log(url);
        await edge_execution(t, url, seq_log);
        cache.page ++;
    }
    cache.page = 0;
    cache.edge = 0;
    printObject(cache, "sim_cache.json")
    let temp_navigationSet = loadfile("sim_navigationSet.json");
    let navigationSet = pathoptimizer.pathSelection(temp_navigationSet);
    let public_pages = {};
    let private_pages = {};
    let pages = {};
    for(let i = 0; i < navigationSet.length; i++){
        let path = navigationSet[i];
        if(explored_pages.includes(path.source)){    
            pages[path.sink] = 0;
        }
    }
    page_visible = loadfile("sim_page_visible.json");
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
    }
    await relogin(t);
    let loggerLength = logger.requests.length; 
    let request_test = logger.requests[loggerLength - 1].request;
    await ExecuteMultipleRequests(request_test, private_pages);
    printObject(vul, "potential_risks.json");
    printObject(private_pages, "sim_private_pages.json");
    printObject(public_pages, "sim_public_pages.json");
    printObject(pages, "sim_pages.json");
    /*let navigationPath = {
        "source": "http://10.99.0.233/wp-admin/",
        "sink": [
          "http://10.99.0.233/wp-admin/themes.php"
        ],
        "edge": [
          "button[aria-expanded=\"false\"][aria-controls=\"screen-options-wrap\"][class=\"button show-settings\"][id=\"show-settings-link\"][type=\"button\"]",
          "button[aria-describedby=\"dashboard_right_now-handle-order-higher-description\"][aria-disabled=\"false\"][class=\"handle-order-higher\"][type=\"button\"]",
          "p[class=\"community-events-footer\"]",
          "button[aria-describedby=\"dashboard_primary-handle-order-lower-description\"][aria-disabled=\"true\"][class=\"handle-order-lower\"][type=\"button\"]",
          "button[aria-expanded=\"false\"][aria-label=\"Expand Main menu\"][id=\"collapse-button\"][type=\"button\"]",
          "p[id=\"wp-version-message\"]",
          "p[class=\"community-events-footer\"]",
          "button[aria-describedby=\"dashboard_site_health-handle-order-higher-description\"][aria-disabled=\"true\"][class=\"handle-order-higher\"][type=\"button\"]"
        ]
    };*/
}

fixture `Fuzzer`
    .page(baseURI)
    .requestHooks(logger)

test
    ('Follow the navigation graph', async t => {
        console.log("crawling as user: ", login_info['filter']);
        cache = loadfile("sim_cache.json");
        cache = cache?cache:{page:0, edge:0};
        page_visible = loadfile("sim_page_visible.json");
        page_visible = page_visible?page_visible:{};
        if(cache.page == 0 && cache.edge ==0){
            console.log("public filter starts from the beginning, clear the cache of previous run if needed");
            page_visible = {};
            printObject(page_visible, "sim_page_visible.json");
        }
        await login(t, APPNAME, login_info[APPNAME], login_info['filter'], login_info['password']);
        await t
            .setNativeDialogHandler(() => true) // handle pop up dialog boxes;
            .maximizeWindow();  // less complex ui when the window size is largest
        let temp_url = logger.requests[logger.requests.length -1].request.headers.referer;
        await navigation(t);
        }
    );

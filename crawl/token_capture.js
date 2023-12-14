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

// import PriorityQueue from './pqueue'
import { Selector, RequestLogger, ClientFunction, Role } from 'testcafe';
import {login, extractBaseUrl, second_login} from '../utils-evo/login';

const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab'; // default gitlab
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE.toLowerCase():'a'; // default 'userA'
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER + "token/":"../data/" + APPNAME + "/token/";
const PARENT_FOLDER = process.env.DATA_FOLDER;
const DEBUG_PRINT = process.env.DEBUG_PRINT=="1"?true:false;  // default - disable debug logs
const INDEPENDENT = process.env.INDEPENDENT=="1"?true:false;
const ENABLE_KAFKA = process.env.ENABLE_KAFKA=="1"?true:false;

const utils = require('../utils-evo/utils');
const login_info = require('../utils-evo/login_information.json');
var urltable = {};          // stores urls of all requests logged including ajax requests
var urlscoretable = {}; 
var queue = [];           
var next_eid = 0;  
let baseURI = extractBaseUrl(login_info[APPNAME]);
let folder = login_info['folder'];
baseURI = baseURI + folder;
let baseRE = new RegExp(baseURI);
var urlobj = new URL(baseURI)
let token_name = login_info['token'];
let token_value = '';

const block_pages = ['profile', 'plugin-install', 'update', 'password', 'maintenance', 'customize.php', 'xml', 'json', 'rss', 'Tsv', 
                    'user/1/edit', 'user/2/edit', 'user/3/edit', 'users.php', 'UsersManager', 'update', 'help'];
const heavy_pages = ['customize', '.xml', '.rss', '.tsv', '.png', '.jpg'];
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

// return response - outerhtml, json or error 

const printObject = function(obj, name, folder=DATA_FOLDER) {
    //if(DEBUG_PRINT){console.log("Printing Object = "+USER_MODE+'_'+name)}
    const fs = require('fs');
    fs.writeFileSync(folder+USER_MODE+'_'+name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const array_get = function(){
    let temp_events = events;
    events = [];
    return temp_events;
}

const getURL = ClientFunction(() => window.location.href);
const getPageHTML = ClientFunction(() => document.documentElement.outerHTML);
const eventRecord = ClientFunction(array_get);


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
        //console.error(`${user+'_'+name} not found`);
        return false
}

const loadCache = function () {
    // returns true if all json files were found and read otherwise false
    var successflag = true;
    queue = loadfile('queue.json');
    successflag = queue?true:false;
    queue = queue?queue:[];
    next_eid = loadfile('next_eid.json');
    // successflag = next_eid?true:false;   // dont restart crawler if next_eid fails to load
    next_eid = next_eid?next_eid:0;
    if(successflag){
        if(DEBUG_PRINT){console.log('Loaded cache successfully.')}
        return true;
    }
    return false; 
}

const getClickableElement = async function(){
    let visibleelementids = [];
    let elementsOfInterest = ['a', 'button', 'input'];
    for (let i=0; i<elementsOfInterest.length; i++){
        const elements = Selector(elementsOfInterest[i]);
        const elecount = await elements.count
        //if(DEBUG_PRINT){console.log("\n"+elementsOfInterest[i]+"\n")}
        for (let j=0; j<elecount; j++) {
            const element = elements.nth(j);
            if ((await element.visible)){
                visibleelementids.push({element: element}); // id of the element in allelements
            }
            // console.log(await element.attributes)
        }
    }
    return visibleelementids;
}

const crawlerexplorepage = async function(t, currentpageurl) {
    let newpageurl = "";
    console.log("current page url = "+currentpageurl);
    await t.navigateTo(currentpageurl);
    let elements_click = await getClickableElement();
    for (let j=0; j<elements_click.length; j++) {
        j = next_eid;
        if(j >= elements_click.length) { // edge case: if testcafe restarts when clicking on last element, it loops
            break;
        }
        console.log("Current element id = " + j+" / "+elements_click.length);
        let element = elements_click[j].element;
        //const element = Selector("#post-26 > td.title.column-title.has-row-actions.column-primary.page-title > div.row-actions > span.trash > a");
        next_eid++;
        newpageurl = currentpageurl;
        // Reset the request generated count
        if (!(await element.exists) || !(await element.visible)){
            if(DEBUG_PRINT){console.log('Element does not exist or not visble')}
            continue;
        }
        printObject(next_eid, 'next_eid.json');
        printObject(queue, 'queue.json');   // TODO: only save if queue was unchanged
        var elementtag = await element.tagName;
        var elementattr = await element.attributes;
        var css_string = elementtag + utils.GenerateCssString(elementattr);
        var css_string_lower = css_string.toLocaleLowerCase();
        if(DEBUG_PRINT){console.log(css_string_lower);}
        if (css_string_lower.includes("log out") || css_string_lower.includes("logout") || css_string_lower.includes("sign out") || css_string_lower.includes("signout") || elementattr.href == "set-up-database.php") {
            continue;
        }
        if(!utils.check_url_keywords(css_string_lower, heavy_pages)){
            continue;
        }
        if(elementattr.hasOwnProperty('href')){
            let href = elementattr['href'];
            if(href.includes('http')){
                const hrefhost = new URL(href).hostname; const hrefbasename = new URL(baseURI).hostname;
                if(hrefhost != hrefbasename){
                    console.log("element that link to other domain, skip");
                    continue;
                }
            }
        }
        let random_names = {};
        if(elementtag != 'a'){
            try{
                await t.click(element);
            }
            catch{
                console.log("click not succeed");
                continue;
            }
            // check if new requests found
            newpageurl = await getURL();
            let ref_url = newpageurl;
            await login_wrap(t);
            currentpageurl = utils.replaceToken(currentpageurl, token_name, token_value);
            await t.navigateTo(currentpageurl)
            try{
                await t.click(element);
            }
            catch{
                console.log("reclick not succeed");
                continue;
            }
            let new_ref_url = await getURL();
            if(ref_url != new_ref_url){
                let acc = 0;
                let ref_parameters = utils.extractParameter(ref_url);
                let new_parameters = utils.extractParameter(new_ref_url);
                random_names = loadfile("random_names.json");
                random_names = random_names?random_names:{};
                let temp_randoms = random_names;
                for(let name in new_parameters){
                    if(ref_parameters[name] == undefined || ref_parameters[name] != new_parameters[name]){
                        random_names[name] = 1;
                        acc ++;
                    }
                }
                if(acc != 1) { //we don't expect one url contains more than 1 dynamic parameter. if it does, there might be chances that reclicking happens on the wrong elements.
                    random_names = temp_randoms;
                }
                printObject(random_names, "random_names.json");
            }
            if(currentpageurl === newpageurl) {
            }
            else{
                const hostname = new URL(newpageurl).hostname; const basehostname = new URL(baseURI).hostname;
                //page_events = await eventRecord();
                await t.navigateTo(currentpageurl);
                console.log(currentpageurl);
                if (hostname !== basehostname) {
                    if(DEBUG_PRINT){console.log("Out of domain detected and avoided.")}
                    continue;
                }
            }
            // make a deep copy of logger.requests
            //seed selection
            let log_newurl = utils.replaceToken(newpageurl, token_name, "token");
            if(newpageurl !== currentpageurl && urlscoretable[log_newurl] === undefined && utils.check_url_keywords(log_newurl, block_pages)){  // navigate back to current page
                if(DEBUG_PRINT){console.log("New Page Found: ", newpageurl)};
                urlscoretable[log_newurl] = 1;
                printObject(urlscoretable, 'urlscoretable.json');
                //queue.push(log_newurl);
                //printObject(queue, 'queue.json');
            }else{
                if(DEBUG_PRINT){console.log("Page already seen.")}
            }
        }
        else{
            if(!elementattr.hasOwnProperty('href')){
                continue;
            }
            let ref_url = elementattr.href;
            await login_wrap(t);
            currentpageurl = utils.replaceToken(currentpageurl, token_name, token_value);
            await t.navigateTo(currentpageurl)
            let new_attr = await element.attributes;
            if(!new_attr.hasOwnProperty('href')){
                continue;
            }
            let new_ref_url = new_attr.href;
            console.log(ref_url);
            console.log(new_ref_url);
            if(ref_url != new_ref_url){
                let acc = 0;
                let ref_parameters = utils.extractParameter(ref_url);
                let new_parameters = utils.extractParameter(new_ref_url);
                random_names = loadfile("random_names.json");
                random_names = random_names?random_names:{};
                let temp_randoms = random_names;
                for(let name in new_parameters){
                    if(ref_parameters[name] == undefined || ref_parameters[name] != new_parameters[name]){
                        random_names[name] = 1;
                        acc ++;
                    }
                }
                if(acc > 2) { //we don't expect one url contains more than 2 dynamic parameter. if it does, there might be chances that reclicking happens on the wrong elements.
                    random_names = temp_randoms;
                }
                printObject(random_names, "random_names.json");
            }
        }
    }
}

const login_wrap = async function(t) {
    await t.useRole(Role.anonymous());
    await login(t, APPNAME, login_info[APPNAME], login_info['token_user'], login_info['password']);
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
    token_value = utils.ExtractToken(temp_url, token_name);
}

const runcrawler = async function(t) {
    
    while (1) {      // Start BFS
        // in case session out
        let pqueue = loadfile("pqueue.json", USER_MODE, PARENT_FOLDER);
        let sim_exploredpages = loadfile('sim_exploredpages.json', USER_MODE);
        sim_exploredpages=sim_exploredpages?sim_exploredpages:[];
        pqueue = pqueue?pqueue:{"_heap": []};
        pqueue = pqueue["_heap"];
        for(let i = 0; i < pqueue.length; i++){
            let item = pqueue[i];
            if(!queue.includes(item.key) && !sim_exploredpages.includes(item.key)){
                queue.push(item.key);
            }
        }
        if(queue.length == 0){
            await t.wait(5000);
            continue;
        }
        await login_wrap(t);
        let currenturl = utils.replaceToken(queue[0], token_name, token_value);
        //currenturl = "http://10.99.0.191/admin/appearance"; 
        //console.log("Current queue length = " + queue.length);
        console.log("log point");
        await crawlerexplorepage(t, currenturl);
        sim_exploredpages.push(queue[0]);
        printObject(sim_exploredpages, 'sim_exploredpages.json');
        queue.shift();   // remove first item
        printObject(queue, 'queue.json');
        next_eid = 0;
        printObject(next_eid, 'next_eid.json');
    }
    printObject(queue, 'queue.json');
    console.log("Queue finished! Restaring Simple Crawling!");
    // re iterate through the app starting from baseURI
    //queue.push(baseURI);
    // clear the urlscoretable to allow second run
    urlscoretable = {};   
    printObject(urlscoretable, 'urlscoretable.json');
    urltable = {};
    printObject(urltable, 'urltable.json');
}

fixture `Fuzzer`
    .page(baseURI)
    .requestHooks(logger);

test
    ('Simple Crawler', async t => {
        await login(t, APPNAME, login_info[APPNAME], login_info['token_user'], login_info['password']);
        await t.setNativeDialogHandler(() => true);  // handle pop up dialog boxes;
        await t.maximizeWindow();  // less complex ui when the window size is largest
        // baseURI = await getURL();       
        if(!loadCache()) {
            console.log('Cache files not detected. \nStarting scan from scratch...')
            let initial_url = await getURL();
            token_value = utils.ExtractToken(initial_url, token_name);
            initial_url = utils.replaceToken(initial_url, token_name, "token");
            if(urlscoretable[initial_url] === undefined )
            {
                queue.push(initial_url);  // do not add baseURI to urlscoretable here
                printObject(queue, 'queue.json');
                urlscoretable[initial_url] = 1;
                printObject(urlscoretable, "urlscoretable.json")
            }
            // console.log("Starting queue length = " + queue.length);
        }
        //only for debuging (log the restarts due to error), comment out if needed;
        await runcrawler(t);
}).disablePageCaching;

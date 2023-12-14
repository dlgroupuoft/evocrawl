import { Selector, RequestLogger, ClientFunction, Role, t } from 'testcafe';
import {login, extractBaseUrl, second_login} from '../utils-evo/login';
const login_info = require('../utils-evo/login_information.json');
const baseURI = "http://10.99.0.11/"

const DATA_FOLDER = "../data/";
const utils = require("../utils-evo/utils")
const APPNAME='wackopicko'

let global_events = [];

let local_events = [];

let element_info = {};

let id_list = [];

let locator_ids = [];


const printObject = function(obj, name) {
    const fs = require('fs');
    fs.writeFileSync(DATA_FOLDER+'_'+name, JSON.stringify(obj, null, 2) , 'utf-8');
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


function extract_event(type){
    
}



function traverse(node = {}, id = 0, elements_info = {}){
    let length = node.childNodes.length;
    let obj = {tag: node.tagName, attr: node.attributes, parentID: id};
    elements_info[node.id] = obj;
    if(length == 0){
        return elements_info;
    }
    for(let i = 0; i < length; i++){
        let childnode = node.childNodes[i];
        if(childnode.type == 2){
            traverse(childnode, node.id, elements_info);
        }
    }
    return elements_info;
}

function begin(){
    let length = global_events.length
    let event = {}
    for(let i = 0; i < global_events.length; i++){
        //console.dir(global_events[i]);
        if(global_events[i].type == 2){
            event = global_events[i];
        }
    }
    let node = event.data.node;
    let childnodes = node.childNodes;
    let childnode = childnodes[1];
    var t0 = new Date().getTime();
    element_info = traverse(node, 0, element_info);
    var t1 = new Date().getTime();
    console.log("time is ", t1-t0)
    let css_string = "";
    /*let attr = element_info[40].attr;
    let tag = element_info[40].tag;
    let css_string = tag + utils.GenerateCssString(attr);
    console.log(css_string);*/
    return css_string;
}

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

const ClientArrayGet = ClientFunction(array_get);
const catchPayload = ClientFunction(catch_payload);
const getPageHTML = ClientFunction(() => document.documentElement.outerHTML);

const event_logging = async function(t){
    let content = await ClientArrayGet();
    for(let i = 0; i < content.length; i++){
        global_events.push(content[i]);
    }
}

const event_analyze = function(){
    printObject(global_events, "global_events.json")
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        //console.log(event);
        if(event.type == 3){
            let data = event.data;
            if(data.source == 2 && data.type == 2){
                id_list.push(data.id);
            }

        }
        //console.log(JSON.stringify(event));
    }
    for(let i = 0; i < local_events.length; i++){
        let event = local_events[i];
        if(event.type === 3){
            let data = event.data;
            if(data.source === 0 && data.adds.length !== 0){
                let adds = data.adds;
                for(let j = 0; j < adds.length; j++){
                    let obj = adds[j];
                    let node = adds[j].node;
                    let id = obj.parentId;
                    if(node.type === 2){
                        element_info = traverse(node, id, element_info);
                    }
                }
            }
        }
        //console.log(JSON.stringify(event));
    }
}

const searchInfo = function(id){
    if(element_info[id].tag == 'html'){
        return true
    }
    locator_ids.push(id);
    let parentId = element_info[id].parentID;
    searchInfo(parentId);
}

const generateLocator = function(){
    let locators = [];
    for(let i = 0; i < id_list.length; i ++){
        let id = id_list[i];
        searchInfo(id);
    }
    for(let i = 0; i < locator_ids.length; i++){
        let id = locator_ids[i];
        let attr = element_info[id].attr;
        let tag = element_info[id].tag;
        let css_string = tag + utils.GenerateCssString(attr);
        locators.push(css_string);
    }
    console.log(locators);
}



fixture `Fuzzer`
    .page("http://10.99.0.187:8080/")
    .requestHooks(logger);

test
    ('Evolve sequences of interactions per page to modify app state', async t => {
        console.log(APPNAME);
        await login(t, APPNAME, "http://10.99.0.187:8080/users/login.php", login_info['crawler'], login_info['password']);
        await t.setNativeDialogHandler(() => true); 
        await t.maximizeWindow();
        await t.navigateTo("http://10.99.0.114/settings/reviews");
        await t.typeText(Selector('input[value=\"test2\"]'), "<script>alert(1)</script>", { replace: true, paste: true });
        await t.click(Selector("#settingsform > div > nav > div > button"));
        //let payloads = await catchPayload();
        //console.log(payloads);
        console.log(logger.requests);
        for(let i = 0; i < logger.requests.length; i++){
            let obj = logger.requests[i];
            let req = obj.request;
            let headers = req.headers;
            console.log(req);
        }
        //await event_logging(t);
        //let length1 = global_events.length;
        //console.log(length1);
        //await t.click(Selector("#dashboard_quick_press > div.postbox-header > div > button.handlediv"));
        //await event_logging(t);
        //let length2 = global_events.length;
        //console.log(length2);
        //local_events = global_events.slice(length2-length1+1, length2)
        //await t.click(Selector("path[d=\"M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z\"]"));
        /*await t.click(Selector("a[href=\"edit.php\"]"));
        await t.click(Selector("#cat"));
        await t.typeText(Selector("#post-search-input"), "FUZZ8080");
        await event_logging(t);
        await t.click(Selector("#search-submit"));*/
        //await event_logging(t);
        //await t.click(Selector("#search-submit"));
        //await event_logging(t)
        //event_analyze();
        //let css_string = begin();
        //printObject(element_info, "element_info.json");
        //console.log(id_list);
        //generateLocator();
        //console.log(locator_ids);
        //await t.click(Selector(css_string));
    }).disablePageCaching;

    

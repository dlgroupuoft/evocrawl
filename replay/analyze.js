const pathoptimizer = require("./pathoptimizer");
const utils = require('../utils-evo/utils');
const login_info = require('./../utils-evo/login_information.json');
const random = require('../utils-evo/random_names.json');
const APPNAME = process.env.APPNAME?process.env.APPNAME:'gitlab';
const DATA_FOLDER = process.env.DATA_FOLDER?process.env.DATA_FOLDER:"../data/" + APPNAME + '-ev/';
const USER_MODE = process.env.USER_MODE?process.env.USER_MODE:'b';
const CRAWLER_MODE = process.env.CRAWLER_MODE?process.env.CRAWLER_MODE:'sim';
const LOG_FOLDER = DATA_FOLDER + CRAWLER_MODE + "_log/";
const NAV_FOLDER = DATA_FOLDER + USER_MODE + "_nav/";
const CUS_FOLDER = DATA_FOLDER + USER_MODE + "_nav_cus/";
const EV_SET = DATA_FOLDER + 'ev_set/';
const SIM_SET = DATA_FOLDER + 'sim_set/';

const deny_info = require('../utils-evo/40X_sentences.json'); 
const { CompressionTypes } = require("kafkajs");
const EV_RESPONSE_FOLDER = DATA_FOLDER + 'ev' + "_responses/";
const SIM_RESPONSE_FOLDER = DATA_FOLDER + 'sim' + "_responses/";
const token_name = login_info['token'];
const random_names = random[APPNAME];

let pages = {};
let ev_pages = {};
let sim_pages = {};

let public_pages = {};
let ev_public_pages = {};
let sim_public_pages = {};

let private_pages = {};
let ev_private_pages = {};
let sim_private_pages = {};

let navtable = {};
let vul = {};
let sim_visibility = {};
let ev_visibility = {};
let sim_visibility_cus = {};
let ev_visibility_cus = {};
let map_url = {};

let sim_navigationSet = [];
let ev_navigationSet = [];
let sim_exploredpages = [];
let ev_exploredpages = [];
let deny_sentences = [];

let sim_ratios = [];
let ev_ratios = [];

let ev_public_elements = [];
let sim_public_elements = [];

let vul_resp = {};
let pub_resp = {};

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
        //console.error(`file ${user+'_'+ crawler + '_' + name} not found`);
        return false
}

const loadfile2 = function (name, user=USER_MODE, folder = NAV_FOLDER) {
    const fs = require('fs');
        try {
            if(fs.existsSync(folder + user + '_' + name)){
                //console.log(`file ${user+'_'+ crawler + '_' + name} detected.`);
                return JSON.parse(fs.readFileSync(folder + user + '_' + name));
            }            
        } catch (err) {
            console.log(`error loading file - ${folder+user+'_'+ crawler + '_' + name}`)
            console.log(err);
        }
        console.error(`file ${folder + user + '_' + name} not found`);
        return false
}

const printObject = function(obj, name, folder=NAV_FOLDER) {
    const fs = require('fs');
    fs.writeFileSync(folder+USER_MODE+'_'+ CRAWLER_MODE + '_' + name, JSON.stringify(obj, null, 2) , 'utf-8');
}

const extractBaseUrl = function(login_url){
    let url_components = login_url.split('/');
    let base = '';
    for(let i = 0; i < 3; i++){
        base += url_components[i] + '/';
    }
    return base;
}

const check_similarity = function (respA, respB, method = 'get'){
   try{
        if (!respA.toString() || respA.toString()=="[]" || respA.toString()=="{}"){
            return; // skip triad test on empty responses
        }
        var difflib = require('difflib');
        var simAB = new difflib.SequenceMatcher(null, respA, respB);
        var sim_ratioAB = simAB.ratio();
        return sim_ratioAB;
    }catch(e){
        return 0;
    }
    // for testing MF tuning
}

const read_navigationSet = function(set_name){
    const fs = require('fs');
    let nav_set = [];
    let files = fs.readdirSync(set_name);
    files.forEach(file => {
        let tmp_set = utils.loadLogFile(file, 'a', set_name);
        for(let i = 0; i < tmp_set.length; i ++){
            nav_set.push(tmp_set[i]);
        } 
    });
    return nav_set;
}

const preloadData = function(){
    sim_navigationSet = read_navigationSet(SIM_SET);
    ev_navigationSet = read_navigationSet(EV_SET);
    printObject(sim_navigationSet, "sim_navigationSet.json");
    printObject(ev_navigationSet, "ev_navigationSet.json");
    sim_exploredpages = loadfile('exploredpages.json', 'a', DATA_FOLDER, 'sim');
    sim_visibility = loadfile('elements_visibility.json', 'b', NAV_FOLDER, 'sim');
    ev_visibility = loadfile('elements_visibility.json', 'b', NAV_FOLDER, 'ev');
    sim_visibility_cus = loadfile('elements_visibility.json', 'b', CUS_FOLDER, 'sim');
    ev_visibility_cus = loadfile('elements_visibility.json', 'b', CUS_FOLDER, 'ev');
    let ev_navtable = loadfile('navtable.json', 'b', NAV_FOLDER, 'ev');
    navtable = loadfile('navtable.json', 'b', NAV_FOLDER, 'sim');
    ev_public_elements = loadfile('public_elements.json', 'a', DATA_FOLDER, 'ev');
    sim_public_elements = loadfile2('public_elements.json', 'a', DATA_FOLDER);
    let temp_ev_exploredpages = loadfile('exploredpages.json', 'a', DATA_FOLDER, 'ev');
    for(let i = 0; i < temp_ev_exploredpages.length; i++){
        ev_exploredpages.push(temp_ev_exploredpages[i].key);
    }
    for(let url in ev_navtable){
        navtable[url] = 1;
    }
    sim_navigationSet = sim_navigationSet?sim_navigationSet:[];
    ev_navigationSet = ev_navigationSet?ev_navigationSet:[];
    sim_navigationSet = pathoptimizer.pathSelection(sim_navigationSet);
    ev_navigationSet = pathoptimizer.pathSelection(ev_navigationSet);
    for(let url in navtable){
        for(let random_name in random_names){
            url = utils.replaceToken(url, random_name, "");
        }
        map_url[url] = 1;
    }
    printObject(map_url, "map_url.json", NAV_FOLDER);
    deny_sentences = deny_info[APPNAME];
    if(deny_sentences == undefined){
        deny_sentences = [];
    }
    for(let i = 0; i < deny_sentences.length; i++){
        let sentence = deny_sentences[i];
        sentence = sentence.toLowerCase();
        sentence = sentence.replace(/[^a-z0-9]/gi, '');
        deny_sentences[i] = sentence;
    }
    //private_pages = loadfile('private_pages.json', 'b', DATA_FOLDER);
}

const analyze = function(){
    let edge_pages = {};
    for(let i = 0; i < sim_navigationSet.length; i ++){
        let navigationPath = sim_navigationSet[i];
        let source_url = utils.replaceToken(navigationPath.source, token_name, "token")
        if(sim_visibility.hasOwnProperty(source_url)){
            let log_url = utils.replaceToken(navigationPath.sink, token_name, "token")
            if(log_url == source_url){
                continue;
            }
            if(pages[log_url] != 1){
                pages[log_url] = 0;
                sim_pages[log_url] = 0;
            }
            let page_visible = sim_visibility[source_url];
            if(page_visible[navigationPath.edge] == 1 && navigationPath.edge != "a[class=\"visually-hidden focusable skip-link\"][href=\"#main-content\"]"){
                pages[log_url] = 1;
                edge_pages[log_url] = navigationPath.edge;
                sim_pages[log_url] = 1;
            }
        }
        if(sim_visibility_cus.hasOwnProperty(source_url)){
            let log_url = utils.replaceToken(navigationPath.sink, token_name, "token")
            let page_visible = sim_visibility_cus[source_url];
            if(page_visible[navigationPath.edge] == 1){
                pages[log_url] = 1;
                sim_pages[log_url] = 1;
            }
        }
    }
    for(let i = 0; i < ev_navigationSet.length; i ++){
        let navigationPath = ev_navigationSet[i];
        let source_url = utils.replaceToken(navigationPath.source, token_name, "token")
        if(ev_visibility.hasOwnProperty(source_url)){
            let log_url = utils.replaceToken(navigationPath.sink, token_name, "token")
            if(log_url == source_url){
                continue;
            }
            if(pages[log_url] != 1){
                pages[log_url] = 0;
                ev_pages[log_url] = 0;
            }
            let page_visible = ev_visibility[source_url];
            if(page_visible[navigationPath.edge] == 1 && navigationPath.edge != "a[class=\"visually-hidden focusable skip-link\"][href=\"#main-content\"]"){
                pages[log_url] = 1;
                edge_pages[log_url] = navigationPath.edge;
                ev_pages[log_url] = 1;
            }
        }
        if(ev_visibility_cus.hasOwnProperty(source_url)){
            let log_url = utils.replaceToken(navigationPath.sink, token_name, "token")
            let page_visible = ev_visibility_cus[source_url];
            if(page_visible[navigationPath.edge] == 1){
                pages[log_url] = 1;
                ev_pages[log_url] = 1;
            }
        }
    }
    for(let url in pages){
        if(sim_pages[url] == 1 || ev_pages[url] == 1 || navtable[url] == 1){
            pages[url] = 1;
            public_pages[url] = 1;
            if(ev_pages.hasOwnProperty(url)){
                ev_public_pages[url] = 1;
            }
            if(sim_pages.hasOwnProperty(url)){ 
                sim_public_pages[url] = 1;
            }
        }
    }
    for(let url in pages){
        if(public_pages[url] != 1){
            private_pages[url] = 0;
            if(ev_pages.hasOwnProperty(url)){
                ev_private_pages[url] = 0;
            }
            if(sim_pages.hasOwnProperty(url)){ 
                sim_private_pages[url] = 0;
            }
        }
    }
    //pages = cleanup_urls(pages);
    //private_pages = cleanup_urls(private_pages);
    //public_pages = cleanup_urls(public_pages);
    printObject(pages, "allpages.json", DATA_FOLDER);
    printObject(private_pages, "private_pages.json", DATA_FOLDER);
    printObject(public_pages, "public_pages.json", DATA_FOLDER);
    printObject(edge_pages, "edge_pages.json", DATA_FOLDER);
}

const cleanup_urls = function(pages){
    let new_pages = {}
    for(let url in pages){
        let new_url = url;
        for(let random_name in random_names){
            new_url = utils.replaceToken(new_url, random_name, "");
        }
        new_url = utils.replaceToken(new_url, token_name, "token")
        new_pages[new_url] = pages[url];
    }
    return new_pages;
}

const analyze2 = function(){
    let edge_pages = {};
    for(let i = 0; i < sim_navigationSet.length; i ++){
        let navigationPath = sim_navigationSet[i];
        let sink_url = navigationPath.sink;
        sink_url = utils.replaceToken(sink_url, token_name, "token");
        sim_pages[sink_url] = 1;
        pages[sink_url] = 1;
    }
    for(let i = 0; i < ev_navigationSet.length; i ++){
        let navigationPath = ev_navigationSet[i];
        let sink_url = navigationPath.sink;
        sink_url = utils.replaceToken(sink_url, token_name, "token");
        ev_pages[sink_url] = 1;
        pages[sink_url] = 1;
    }
    printObject(pages, "allpages.json", DATA_FOLDER);
    for(let sink_url in pages){
        let url = sink_url;
        for(let random_name in random_names){
            url = utils.replaceToken(url, random_name, "");
        }
        if(map_url[url] == 1){
            public_pages[url] = 1;
            continue;
        }
        if(sim_pages[sink_url] == 1){
            sim_private_pages[sink_url] = 0;
        }
        if(ev_pages[sink_url] == 1){
            ev_private_pages[sink_url] = 0;
        }
        private_pages[sink_url] = 0;
    }
    printObject(private_pages, "private_pages.json", DATA_FOLDER);
}

const cleanup_response = function(resp, mode){
   let temp_resp = [];
   let public_elements = sim_public_elements[mode];
   for(let i = 0; i < resp.length; i++){
        let sentence =resp[i];
        if(!public_elements.includes(sentence)){
            temp_resp.push(sentence);
        }
   }
   return temp_resp;
}

const deduplicate_response = function(resp){
    let temp_resp = [];
    var stringSimilarity = require("string-similarity");
    for(let i = 0; i < resp.length; i++){
        let sentence = resp[i]
        let flag = 0;
        for(let j = 0; j < temp_resp.length; j++){
            let temp_sentence = temp_resp[j];
            if(Math.abs(temp_sentence.length - sentence.length) > 50){
                continue;
            }
            //let distance = utils.levenshteinDistance(sentence, temp_sentence);
            //let ratio = distance * 2 / (temp_sentence.length + sentence.length);
            let ratio = stringSimilarity.compareTwoStrings(sentence, temp_sentence);
            if(ratio > 0.95){
                flag = 1;
                break;
            }
        }
        if(flag == 0){
            temp_resp.push(sentence);
        }
    }
    return temp_resp;
}

const calculate_protected_sentences = function(respA, respB){
    let count  = 0;
    for(let i = 0; i < respA.length ; i++){
        let sentenceA = respA[i];
        let flag = 0;
        for(let j = 0; j < respB.length; j++){
            let sentenceB = respB[j];
            if(sentenceA == sentenceB){
                flag = 1;
                break;
            }
        }
        if(flag == 0){
            count ++;
        }
    }
    return count;
}

const calculate_similarity_diff = function(){
    //sim_private_pages = loadfile2('urltable.json', 'a', DATA_FOLDER);
    //console.log("private: ", sim_private_pages);

    for(let url in sim_private_pages){
        console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', SIM_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB)
                respA = respA.join();
                respAdmin = respAdmin.join();
                respB = respB.join();
                let ratio = check_similarity(respAdmin, respA);
                ratio = ratio - check_similarity(respA, respB);
                ratio = Math.abs(ratio);
                console.log(ratio);
                if(private_pages[url] == 0){
                    private_pages[url] = [ratio];
                    sim_private_pages[url] = [ratio];
                }
                else{
                    private_pages[url].push(ratio);
                    sim_private_pages[url].push(ratio);
                }
                if(ratio < 0.1){
                    if(!vul_resp.hasOwnProperty(url)){
                        vul_resp[url] = [];
                    }
                    vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB - sim_ratioBC;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(private_pages[url] == 0){
                        private_pages[url] = [ratio];
                        sim_private_pages[url] = [ratio];
                    }
                    else{
                        private_pages[url].push(ratio);
                        sim_private_pages[url].push(ratio);
                    }
                    if(ratio > -0.1 && ratio < 0.1){
                        if(!vul_resp.hasOwnProperty(url)){
                            vul_resp[url] = [];
                        }
                        vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                    }
                }
            }
        }
    }
    //ev_private_pages = loadfile2('ev_urltable.json', 'a', DATA_FOLDER);
    for(let url in ev_private_pages){
        console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', EV_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB)
                respA = respA.join();
                respAdmin = respAdmin.join();
                respB = respB.join();
                let ratio = check_similarity(respAdmin, respA);
                let ratio1 = check_similarity(respA, respB);
                ratio = ratio - ratio1;
                ratio = Math.abs(ratio);
                console.log(ratio);
                if(private_pages[url] == 0){
                    private_pages[url] = [ratio];
                    ev_private_pages[url] = [ratio];
                }
                else{
                    private_pages[url].push(ratio);
                }
                if(ratio < 0.1){
                    if(!vul_resp.hasOwnProperty(url)){
                        vul_resp[url] = [];
                    }
                    vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB - sim_ratioBC;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(private_pages[url] == 0){
                        private_pages[url] = [ratio];
                        ev_private_pages[url] = [ratio];
                    }
                    else{
                        private_pages[url].push(ratio);
                    }
                    if(ratio > -0.1 && ratio < 0.1){
                        if(!vul_resp.hasOwnProperty(url)){
                            vul_resp[url] = [];
                        }
                        vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                    }
                }
            }
        }
    }
    printObject(private_pages, "private_pages.json", DATA_FOLDER);
    printObject(vul_resp, "vul_resp.json", DATA_FOLDER);
}

const calculate_similarity = function(){
    //sim_private_pages = loadfile2('urltable.json', 'a', DATA_FOLDER);
    //console.log("private: ", sim_private_pages);

    for(let url in sim_private_pages){
        console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', SIM_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB)
                respA = respA.join();
                respAdmin = respAdmin.join();
                respB = respB.join();
                let ratio = check_similarity(respAdmin, respA);
                ratio = Math.abs(ratio);
                console.log(ratio);
                if(private_pages[url] == 0){
                    private_pages[url] = [ratio];
                    sim_private_pages[url] = [ratio];
                }
                else{
                    private_pages[url].push(ratio);
                    sim_private_pages[url].push(ratio);
                }
                if(ratio > 0.7){
                    if(!vul_resp.hasOwnProperty(url)){
                        vul_resp[url] = [];
                    }
                    vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(private_pages[url] == 0){
                        private_pages[url] = [ratio];
                        sim_private_pages[url] = [ratio];
                    }
                    else{
                        private_pages[url].push(ratio);
                        sim_private_pages[url].push(ratio);
                    }
                    if(ratio > 0.7){
                        if(!vul_resp.hasOwnProperty(url)){
                            vul_resp[url] = [];
                        }
                        vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                    }
                }
            }
        }
    }
    //ev_private_pages = loadfile2('ev_urltable.json', 'a', DATA_FOLDER);
    for(let url in ev_private_pages){
        console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', EV_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB)
                respA = respA.join();
                respAdmin = respAdmin.join();
                respB = respB.join();
                let ratio = check_similarity(respAdmin, respA);
                ratio = Math.abs(ratio);
                console.log(ratio);
                if(private_pages[url] == 0){
                    private_pages[url] = [ratio];
                    ev_private_pages[url] = [ratio];
                }
                else{
                    private_pages[url].push(ratio);
                }
                if(ratio > 0.7){
                    if(!vul_resp.hasOwnProperty(url)){
                        vul_resp[url] = [];
                    }
                    vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(private_pages[url] == 0){
                        private_pages[url] = [ratio];
                        ev_private_pages[url] = [ratio];
                    }
                    else{
                        private_pages[url].push(ratio);
                    }
                    if(ratio > 0.7){
                        if(!vul_resp.hasOwnProperty(url)){
                            vul_resp[url] = [];
                        }
                        vul_resp[url].push({respAdmin: respAdmin, respA: respA, respB: respB});
                    }
                }
            }
        }
    }
    printObject(private_pages, "private_pages.json", DATA_FOLDER);
    printObject(vul_resp, "vul_resp.json", DATA_FOLDER);
}

const check_404_sentences = function(){
    let image_files = ['png', 'jpg', 'jpeg', 'gif'];
    //sim_private_pages = loadfile2('urltable.json', 'a', DATA_FOLDER);
    //console.log("private: ", sim_private_pages);
    let potential_vul = {};

    for(let url in sim_private_pages){
        //console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        let sanitized_url = log_url;
        if(!utils.check_url_keywords(log_url, image_files)){
            if(!vul_resp.hasOwnProperty(sanitized_url)){
                vul_resp[sanitized_url] = [];
            }
            console.log(sanitized_url);
            potential_vul[sanitized_url] = 1;
            continue;
        }
        /*for(let random_name in random_names){
            sanitized_url = utils.replaceToken(sanitized_url, random_name, "");
        }*/
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', SIM_RESPONSE_FOLDER);
        let deny = 0;
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB);
                for(let i = 0; i < respA.length; i++){
                    let resp_sentence = respA[i];
                    for(let j = 0; j < deny_sentences.length; j ++){
                        resp_sentence = resp_sentence.toLowerCase();
                        resp_sentence = resp_sentence.replace(/[^a-z0-9]/gi, '');
                        if(resp_sentence.includes(deny_sentences[j]) || resp_sentence.length == "0"){
                            deny = 1;
                            break;
                        }
                    }
                }
                if(respA.length < 5){
                    deny = 1;
                }
                if(deny == 0){
                    if(!vul_resp.hasOwnProperty(sanitized_url)){
                        vul_resp[sanitized_url] = [];
                    }
                    vul_resp[sanitized_url].push({respAdmin: respAdmin, respA: respA});
                    console.log(sanitized_url);
                    potential_vul[sanitized_url] = 1;
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(private_pages[sanitized_url] == 0){
                        private_pages[sanitized_url] = [ratio];
                        sim_private_pages[url] = [ratio];
                    }
                    else{
                        private_pages[sanitized_url].push(ratio);
                        sim_private_pages[url].push(ratio);
                    }
                }
            }
        }
        else{
            //console.log(log_url, ":response not found");
        }
    }
    //ev_private_pages = loadfile2('ev_urltable.json', 'a', DATA_FOLDER);
    for(let url in ev_private_pages){
        //console.log(url);
        let deny = 0;
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        let sanitized_url = log_url;
        if(!utils.check_url_keywords(log_url, image_files)){
            if(!vul_resp.hasOwnProperty(sanitized_url)){
                vul_resp[sanitized_url] = [];
            }
            console.log(sanitized_url);
            potential_vul[sanitized_url] = 1;
            continue;
        }
        /*for(let random_name in random_names){
            sanitized_url = utils.replaceToken(sanitized_url, random_name, "");
        }*/
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', EV_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB)
                for(let i = 0; i < respA.length; i++){
                    let resp_sentence = respA[i];
                    for(let j = 0; j < deny_sentences.length; j ++){
                        resp_sentence = resp_sentence.toLowerCase();
                        resp_sentence = resp_sentence.replace(/[^a-z0-9]/gi, '');
                        if(resp_sentence.includes(deny_sentences[j])){
                            deny = 1;
                            break;
                        }
                    }
                }
                if(respA.length < 5){
                    deny = 1;
                }
                if(deny == 0){
                    if(!vul_resp.hasOwnProperty(sanitized_url)){
                        vul_resp[sanitized_url] = [];
                    }
                    vul_resp[sanitized_url].push({respAdmin: respAdmin, respA: respA});
                    console.log(sanitized_url);
                    potential_vul[sanitized_url] = 1;
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(private_pages[sanitized_url] == 0){
                        private_pages[sanitized_url] = [ratio];
                        ev_private_pages[url] = [ratio];
                    }
                    else{
                        private_pages[sanitized_url].push(ratio);
                    }
                }
            }
        }
    }
    printObject(private_pages, "private_pages.json", DATA_FOLDER);
    printObject(vul_resp, "vul_resp.json", DATA_FOLDER);
    printObject(potential_vul, "vul_urls.json", DATA_FOLDER);
}

const calculate_similarity2 = function(){
    //sim_private_pages = loadfile2('urltable.json', 'a', DATA_FOLDER);
    //console.log("private: ", sim_private_pages);
    for(let url in sim_public_pages){
        console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', SIM_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB)
                respA = respA.join();
                respAdmin = respAdmin.join();
                respB = respB.join();
                let ratio = check_similarity(respAdmin, respA);
                ratio = Math.abs(ratio);
                console.log(ratio);
                if(public_pages[url] == 1){
                    public_pages[url] = [ratio];
                    sim_public_pages[url] = [ratio];
                }
                else{
                    public_pages[url].push(ratio);
                    sim_public_pages[url].push(ratio);
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(public_pages[url] == 1){
                        public_pages[url] = [ratio];
                        sim_public_pages[url] = [ratio];
                    }
                    else{
                        public_pages[url].push(ratio);
                        sim_public_pages[url].push(ratio);
                    }
                }
            }
        }
    }
    //ev_private_pages = loadfile2('ev_urltable.json', 'a', DATA_FOLDER);
    for(let url in ev_public_pages){
        console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', EV_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            let respB = responses.userB;
            if(respAdmin[0].toLowerCase().includes('html')){
                respAdmin = cleanup_response(respAdmin, 'admin');
                respAdmin = deduplicate_response(respAdmin);
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                respB = cleanup_response(respB, 'userB');
                respB = deduplicate_response(respB)
                respA = respA.join();
                respAdmin = respAdmin.join();
                respB = respB.join();
                let ratio = check_similarity(respAdmin, respA);
                ratio = Math.abs(ratio);
                console.log(ratio);
                if(public_pages[url] == 1){
                    public_pages[url] = [ratio];
                    ev_public_pages[url] = [ratio];
                }
                else{
                    public_pages[url].push(ratio);
                }
            }
            else{
                for(let i = 0; i < respAdmin.length; i++){
                    let sim_ratioAB = check_similarity(respAdmin[i], respA[i]);
                    let sim_ratioBC = check_similarity(respA[i], respB[i]);
                    let ratio = sim_ratioAB;
                    ratio = Math.abs(ratio);
                    sim_ratios.push(ratio);
                    //console.log("pair: ", i, "/", respAdmin.length, ": ", ratio);
                    printObject(sim_ratios, 'ratios.json', DATA_FOLDER);
                    if(public_pages[url] == 1){
                        public_pages[url] = [ratio];
                        ev_public_pages[url] = [ratio];
                    }
                    else{
                        public_pages[url].push(ratio);
                    }
                }
            }
        }
    }
    printObject(public_pages, "public_pages.json", DATA_FOLDER);
    printObject(pub_resp, "pub_resp.json", DATA_FOLDER);
}

const collect_private_identifiers = function(){
    let sentence_count = {};
    for(let url in sim_private_pages){
        //console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', SIM_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            if(respAdmin[0].toLowerCase().includes('html')){
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                for(let i = 0; i < respA.length; i ++){
                    let sentence = respA[i];
                    if(!sentence_count.hasOwnProperty(sentence)){
                        sentence_count[sentence] = 1;
                    }
                    else{
                        sentence_count[sentence] = sentence_count[sentence] + 1;
                    }
                }
            }
        }
    }
    for(let url in ev_private_pages){
        //console.log(url);
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        //let responses = loadfile(log_name, 'b', SIM_RESPONSE_FOLDER, 'sim');
        let responses = utils.loadLogFile(log_name, 'a', EV_RESPONSE_FOLDER);
        if(responses != false){
            let respAdmin = responses.admin;
            let respA = responses.userA;
            if(respAdmin[0].toLowerCase().includes('html')){
                respA = cleanup_response(respA, 'userA');
                respA = deduplicate_response(respA);
                for(let i = 0; i < respA.length; i ++){
                    let sentence = respA[i];
                    if(!sentence_count.hasOwnProperty(sentence)){
                        sentence_count[sentence] = 1;
                    }
                    else{
                        sentence_count[sentence] = sentence_count[sentence] + 1;
                    }
                }
            }
        }
    }
    return sentence_count;
}

const merge_ratio = function(){
    for(let url in private_pages){
        let log_url = utils.replaceToken(url, token_name, "token");
        let log_name = utils.extractLogName(log_url, baseURI);
        if(private_pages[url] != 0){
            let ratio_array = private_pages[url];
            let temp_array = [];
            for(let i = 0; i < ratio_array.length; i++){
                let flag = 1;
                for(let j = 0; j < temp_array.length; j++){
                    if(Math.abs(ratio_array[i] - temp_array[j]) <= 0.01){
                        flag = 0;
                    }
                }
                if(flag == 1){
                    temp_array.push(ratio_array[i]);
                }
            }
            private_pages[url] = temp_array;
        }
    }
}

const baseURI = extractBaseUrl(login_info[APPNAME]);
preloadData();
analyze();
check_404_sentences();
//calculate_similarity_diff();
//calculate_similarity();
//calculate_similarity2();
/*printObject(private_pages, "private_pages_ratios.json", DATA_FOLDER);
merge_ratio();*/
private_pages = loadfile("private_pages.json", 'b', DATA_FOLDER, 'sim');
let values = [];
for(let url in private_pages){
    let ratio_pair = private_pages[url];
    for(let i = 0; i < ratio_pair.length; i++){
        values.push(ratio_pair[i]);
    }
}

let sum = 0;
for(let i = 0; i < values.length; i++){
    let value = values[i];
    sum += value;
}

console.log(sum / values.length);

//let sentence_count = collect_private_identifiers();
//printObject(sentence_count, "sentence_count.json", DATA_FOLDER);
//console.log(private_pages);

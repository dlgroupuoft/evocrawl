const utils = require('../utils-evo/utils');
const APPNAME = 'wordpress';
const DATA_FOLDER = "../data/" + APPNAME + '/';
const USER_MODE = 'a';
const elementsOfInterest = ['input','button','textarea','select','a'];

const filter_set = function(navigationSet){
    let temp_navigationSet = [];
    for(let i = 0; i < navigationSet.length; i++){
        let edge = navigationSet[i].edge;
        let temp_edge = [];
        for(let j = 0; j < edge.length; j++){
            if(edge[j] != null && edge[j] != ""){
                temp_edge.push(edge[j]);
            }
        }
        navigationSet[i].edge = temp_edge;
    }
    for(let i = 0; i < navigationSet.length; i++){
        if(navigationSet[i].sink.length != 0){
            temp_navigationSet.push(navigationSet[i]);
        }
    }
    return temp_navigationSet;
}

const path_processing = function(navigationSet){
    let temp_navigationSet = [];
    let sinks = [];
    for(let i = 0; i < navigationSet.length; i++){
        let temp_sinks = navigationSet.sink;
        for(let j = 0; j < temp_sinks.length; j++){
            sinks.push(temp_sinks[j]);
        }
    }
}

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

const pathSelection = function(temp_navigationSet){
    let navigationSet = [];
    for(let i = 0; i < temp_navigationSet.length; i++){
        let temp_path = temp_navigationSet[i];
        if(temp_path.source == temp_path.sink) continue;
        let rep = 0;
        for(let j = 0; j < navigationSet.length; j++){
            let path = navigationSet[j];
            if(temp_path.source == path.source && temp_path.sink == path.sink){
                rep = 1;
                break;
            }
        }
        if(rep == 0){
            navigationSet.push(temp_path);
        }
    }
    return navigationSet;
}

const traverseLocators = async function(locators, baseURI, Selector, css_string, token_name, token_value, random_names, token_mode=0){
    let target_locators = [];
    let locators_up = locators.descendants.concat(locators.ancestor);
    locators_up = locators.ancestor;
    let flag = 0;
    let innerText = locators.innerText;
    for(let i = 0; i < locators_up.length - 1; i++){
        let locator = locators_up[i];
        let new_locator = await parseLocator(locator, baseURI, Selector, css_string, token_name, token_value, innerText, random_names, token_mode);
        //console.log(new_locator);
        if(new_locator[0] == "") {
            continue;
        }
        if(checkLocatorTag(new_locator[0])){
            flag = 1;
        }
        target_locators.push(new_locator[0]);
        //console.log("new locator", new_locator[1]);
        if((new_locator[1] == 1 || new_locator[1] == 0) && flag == 1){
            return target_locators;
        }
    }
    return target_locators;
}

const extractHref = function(css_string=""){
    let parts = css_string.split("[");
    let tag = parts[0];
    css_string = css_string.replace(tag, "");
    parts = css_string.split("\"]");
    parts.pop();
    for(let i = 0; i < parts.length; i++){
        let parameter = parts[i];
        parameter = parameter.replace('[', '').replace('\"', '');
        let parameter_name = parameter.split(/=(.*)/s)[0];
        let parameter_value = parameter.split(/=(.*)/s)[1];
        if(parameter_name == "href"){
            return parameter_value;
        }
    }
    return false;
}


const parseLocator = async function(locator, baseURI, Selector, css_string, token_name, token_value, innerText="", random_names={}, token_mode=0){
    if(locator == ""){
        return [locator, 0];
    }
    let ele_parts = locator.split("[");
    let attrs_filtered = [];
    let tag = ele_parts[0];
    let dict = ["true", "false"];
    let random_flag = 0;
    if(checkLocatorTag(locator)){
        locator = css_string;
    }
    let tmp_locator = locator.replace(tag, "");
    let attr_counts = {};
    ele_parts = tmp_locator.split("\"]");
    if(ele_parts.length > 1){
        let attrs = ele_parts;
        attrs.pop();
        for(let j = 0; j < attrs.length; j++){
            let attr = attrs[j] + "\"]";
            let attr_name = attr.split(/=(.*)/s)[0];
            let attr_value = attr.split(/=(.*)/s)[1];
            attr_name = attr_name.replace("[", "");
            if(attr.includes('{')){
                continue;
            }
            if(attr_name == "href"){
                let href = attr.replace("[href=\"", "");
                //console.log(href);
                href = href.replace('\"]', "");
                if(token_value != ""){
                    href = utils.replaceToken(href, token_name, token_value);
                }
                if(Object.keys(random_names).length !== 0){
                    let orig_href = href;
                    href = utils.replaceRandom(href, random_names);
                    if(href != orig_href){
                        random_flag = 1;
                    }
                }
                attr = '[href=\"' + href + "\"" + ']';
                if(href.includes('/') || href.includes('?')){
                    attr = '[href^=\"' + href + "\"" + ']';
                }
            }
            else{
                if(attr_value == undefined){
                    continue;
                }
                attr_value = attr_value.replace('\"]', "").replace("\"", "");
                if(attr_value.includes(baseURI)){
                    attr_value = utils.replaceToken(attr_value, token_name, token_value); 
                }
                let flag = 0;
                for(let i = 0; i < dict.length; i++){
                    if(attr_value.toLowerCase().includes(dict[i])){
                        flag = 1;
                        break;
                    }
                }
                let isnum = /^\d+$/.test(attr_value);
                if(attr_value == "" || attr_value == " " || flag == 1  || isnum || attr_value == "-1"){
                    continue;
                }
                attr = '[' + attr_name + "*=" + "\"" + attr_value + "\"]"; 
            }
            let css_selector = tag + attr;
            /*if(attr.includes(baseURI) && attr.includes('href')){
                //console.log(css_selector)
                let count = await Selector(css_selector).count;
                return[css_selector, count];
            }*/
            let element = Selector(css_selector);
            let count = await element.count;
            attr_counts[attr] = count;
            attrs_filtered.push(attr);
        }
    }
    let discard = [];
    let acc = 0;
    for(let attr in attr_counts){
        if(attr_counts[attr] == 0){
            acc ++;
            discard.push(attr);
        }
    }
    let tmp_discard = discard;
    discard = [];
    if(acc == 1 && Object.keys(attr_counts).length > 1){
        let count = 0;
        for(let i = 0; i < tmp_discard.length; i++){
            discard.push(tmp_discard[i]);
            count ++;
            /* let attr_name = tmp_discard[i].split(/=(.*)/s)[0];
            attr_name = attr_name.replace("[", "");
            if(attr_name != "name" && attr_name != "value" && attr_name != "id" && !attr_name.includes("href")){
                discard.push(tmp_discard[i]);
                count ++;
                if(ele_parts.length - count < 3){
                    break;
                }
            } */
        }
    }
    let css = tag;
    for(let i = 0; i < attrs_filtered.length; i++){
        if(!discard.includes(attrs_filtered[i])){
            css += attrs_filtered[i];
        }
    }
    let final_count = 0;
    /* if(checkLocatorTag(tag) && innerText != "" && token_mode != 1){
        let element = "";
        if(tag == 'a'){    
            if(random_flag == 1 || (!css.includes('?') && !css.includes('/'))){
                element = Selector(tag).withText(innerText);
                css = tag + "[innerText=\"" + innerText + "\"]";
            }
            else{
                element = Selector(css);
            }
        }
        else{
            element = Selector(tag).withText(innerText);
            css = tag + "[innerText=\"" + innerText + "\"]";
        }
        final_count = await element.count;
        return [css, final_count];
    } */
    if(token_mode == 1 && innerText != ""){
        let element = {};
        element = Selector(tag).withText(innerText);
        final_count = await element.count;
        if(final_count >= 1){
            let text_css = tag + "[innerText=\"" + innerText + "\"]";
            return [text_css, final_count];
        }
        final_count = await Selector(css).count;
        return [css, final_count];
    }
    try{
        final_count = await Selector(css).count;
    }
    catch{
        console.log("failed to count the elements, weird");
        console.log("css: ", css);
    }
    return [css, final_count];
}

const checkLocatorTag = function(locator){
    let tag = locator.split('[')[0];
    //console.log("tag");
    let tagOfInterest = ['button', 'input', 'textarea', 'a', 'select'];
    if(tagOfInterest.includes(tag)){
        return true;
    }
    else{
        return false;
    }
}

const relocateElement = async function(locators, Selector, innerText, random_names={}){
    let element = Selector(locators[locators.length - 1]);
    let locator = locators[locators.length - 1];
    let tag = locator.split('[')[0];
    if(locator.includes('innerText')){
        element = Selector(tag).withText(innerText);
    }
    else{
        element = Selector(locator);
    }
    let count = await element.count;
    if(checkLocatorTag(locator) && count <= 1){
        return element;
    }
    for(let i = locators.length - 2; i >= 0; i --){
        let element_child = element.find(locators[i]);
        let tag = locators[i].split('[')[0];
        if(locators[i].includes('innerText')){
            element_child = element.find(tag);
            element_child = element_child.withText(innerText);
            /*let temp_count = await element_child.count;
            if(temp_count == 0){
                element_child = element.find(locators[i]);
            }*/
        }
        let child_count = await element_child.count;
        //console.log(locators[i], ": ", child_count);
        if(i == 0){
            return element_child;
        }
        /*if(locators[i].includes(baseURI) && !locators[i].includes('#')){
            return element_child.nth(0);
        } */
        if((child_count <= 1 && checkLocatorTag(locators[i]))){
            return element_child;
        }
        if(child_count == 1){
            element = element_child;
        }
    }
    return element;
}

module.exports = {
    filter_set:filter_set,
    path_processing: path_processing,
    pathSelection: pathSelection,
    parseLocator: parseLocator,
    traverseLocators: traverseLocators,
    relocateElement: relocateElement
};


//const container = document.getElementById("sigma-container");

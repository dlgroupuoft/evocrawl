//import { Selector } from 'testcafe';

const AttributesCompareWrapper = function(object, property, value){
    if(object[property].hasOwnProperty(property)){
        if(object[property] === value){
            return true;
        }
    }
    return false;
}

const GenerateTypeString = function(elementattr={}, elementtag="", cm="", xss_mode=0, appname = ""){
    let random_prefix = Date.now().toString().slice(-6);
    let ele_str = GenerateCssString(elementattr).toLowerCase()
    //let random_prefix = "8080";
    let prefix = cm[0] + appname[0] + appname[1];
    let fuzz_string = prefix + "" + random_prefix;
    if(elementattr.hasOwnProperty("value")){
        let value = elementattr.value;
        let isnum = /^\d+$/.test(value);
        if(isnum){
            return "1";
        }
    }
    if(elementattr.hasOwnProperty("placeholder")){
        let value = elementattr.placeholder;
        let isnum = /^\d+$/.test(value);
        if(isnum){
            return "1";
        }
    }
    if(xss_mode > 2){
        fuzz_string = "xss_az(" + JSON.stringify(fuzz_string) + ")";
        fuzz_string = "<script>" + fuzz_string + "</script>";
    }
    if(ele_str.includes("password")){
        fuzz_string = cm + "Vmuser" + "8080" + "@test";
    }
    if(ele_str.includes("url")){
        fuzz_string = cm + "www.vmuser" + fuzz_string + ".com";
    }
    if(ele_str.includes("email"))
    {
        fuzz_string = cm + "FUZZ" + fuzz_string + "@vmuser.com";
    }
    return fuzz_string;
}

const check_url_keywords = function(url, list){
    for(let i = 0; i < list.length; i++){
        if(url.includes(list[i])){
            return false;
        }
    }
    return true;
}

const generate_absolute_path = function(href_url, baseURI, path){
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
    return href_url;
}

const GenerateCssString = function(elementattr){
    let css_string = '';
    for(const property in elementattr){
        css_string += '[' + String(property) + '=' + JSON.stringify(elementattr[property]) + ']';
    }
    return css_string;
}

const GenerateCsshref = function(elementattr){
    let css_string = '';
    for(const property in elementattr){
        if(property == "href"){
            css_string += '[' + String(property) + '=' + '\"' + String(elementattr[property]) + '\"' + ']';
        }
    }
    return css_string;
}

const GenerateAttackString = function(){
    let random_prefix = (Math.floor(Math.random()*1000)).toString();
    random_prefix = 8080;
    let fuzz_string = "<script>alert("+random_prefix+")</script>"
    return fuzz_string;
}

const ExtractToken = function(url, token){
    if(token == "" || !url.includes(token)){
        return "";
    }
    let remove_fragment = url.split('#');
    let temp_list = remove_fragment[0].split('?');
    let query_parameter = temp_list[1];
    let value = "";
    if(query_parameter.includes(token)){
        let parameter_list = query_parameter.split('&');
        for(let i = 0; i < parameter_list.length; ++i)
        {
            let parameter = parameter_list[i];
            if(parameter.includes(token))
            {
                value = parameter.split('=')[1];
            }
        }
    }
    return value;
}

const generateEdge = function(locators = []){
    let types = ["a", "button", "input", "textarea", "select"];
    let target = "string";
    for(let i = 0; i < locators.length; i++){
        let locator = locators[i];
        let tagName = locator.split('[')[0];
        if(types.includes(tagName)){
            target = locator;
            break;
        }
    }
    if(target == "string"){
        target = locators[0];
    }
    return target;
}

const extractParameter = function(url){
    let parameters = {};
    if(!url.includes("?")){
        return parameters;
    }
    let remove_fragment = url.split('#');
    let temp_list = remove_fragment[0].split('?');
    let query_parameter = temp_list[1];
    let parameter_list = query_parameter.split('&');
    for(let i = 0; i < parameter_list.length; i++){
        let parameter = parameter_list[i];
        let pair = parameter.split('=');
        let name, value;
        if(pair.length == 2){
            name = pair[0];
            value = pair[1];
        }
        else{
            name = pair[0];
            value = "";
        }
        parameters[name] = value;
    }
    return parameters;
}

const replaceToken = function(url, token, token_value){
    if(token == "" || !url.includes(token)){
        return url;
    }
    let fragment_list = url.split('#');
    let url_list = fragment_list[0].split('?');
    let query_parameter = "";
    if(url_list.length > 1)
    {
        query_parameter = url_list[1];
    }
    if(query_parameter.includes(token)){
        let parameter_list = query_parameter.split('&');
        for(let i = 0; i < parameter_list.length; i++){
            let parameter = parameter_list[i];
            if(parameter.includes(token)){
                let components = parameter.split('=');
                components[1] = token_value;
                parameter = components.join("=");
            }
            parameter_list[i] = parameter;
        }
        query_parameter = parameter_list.join("&");
    }
    /*else{
        if(query_parameter != "") query_parameter = query_parameter + "&"
        query_parameter += token + "=" + token_value; 
    }*/
    let new_url = url_list[0] + "?" + query_parameter;
    if(fragment_list.length > 1) new_url += "#" + fragment_list[1];
    return new_url;
}

const clusterURL = function(url){
    let fragment_list = url.split('#');
    let url_list = fragment_list[0].split('?');
    let query_parameter = "";
    let num_flag = false;
    let path = url_list[0];
    let path_list = path.split('/');
    for(let i = 0; i < path_list.length; i++){
        let folder = path_list[i];
        let isnum = /^\d+$/.test(folder);
        if(isnum){
            num_flag = true;
            path_list[i] = "1113";
        }
    }
    url_list[0] = path_list.join("/");
    if(url_list.length > 1)
    {
        query_parameter = url_list[1];
    }
    else{
        url = url_list[0];
        if(fragment_list.length > 1) url += "#" + fragment_list[1];
        return [num_flag, url]
    }
    let parameter_list = query_parameter.split('&');
    for(let i = 0; i < parameter_list.length; i++){
        let parameter = parameter_list[i];
        let components = parameter.split('=');
        let notNum = /[a-zA-Z]/.test(components[1]);
        if(!notNum){
            num_flag = true;
            components[1] = 1113;
        }
        parameter = components.join("=");
        parameter_list[i] = parameter;
    }
    query_parameter = parameter_list.join("&");
    let new_url = url_list[0] + "?" + query_parameter;
    if(fragment_list.length > 1) new_url += "#" + fragment_list[1];
    return [num_flag, new_url];
}

const replaceRandom = function(url, random_names, rand=""){
    if(!url.includes('?')){
        return url;
    }
    let fragment_list = url.split('#');
    let url_list = fragment_list[0].split('?');
    let query_parameter = "";
    random_names["random"] = 1;
    if(url_list.length > 1)
    {
        query_parameter = url_list[1];
    }
    for(let token in random_names){
        if(query_parameter.includes(token) || query_parameter.includes("xss_az") || query_parameter.includes("evo") || query_parameter.includes("sim")){
            let parameter_list = query_parameter.split('&');
            let new_parameter_list = [];
            for(let i = 0; i < parameter_list.length; i++){
                let parameter = parameter_list[i];
                let name = parameter.split('=')[0];
                let value = parameter.split('=')[1];
                if(name == token || value.includes('xss_az') || value.includes('evo')){
                    parameter = name + "=" + rand;
                }
                new_parameter_list.push(parameter);
            }
            query_parameter = new_parameter_list.join("&");
        }
    }
    /*else{
        if(query_parameter != "") query_parameter = query_parameter + "&"
        query_parameter += token + "=" + token_value; 
    }*/
    let new_url = url_list[0] + "?" + query_parameter;
    if(fragment_list.length > 1) {
        new_url += "#" + fragment_list[1];
    }
    //console.log(new_url);
    return new_url;
}

const removeQuery = function(url){
    if(url.includes('#')){
        return url;
    }
    else{
        return url.split('?')[0];
    }
}

const extractLogName = function(url, baseURI){
    url = url.replace(baseURI, '');
    let url_parts = url.split('/');
    let log_name = "log";
    for(let i = 0; i < url_parts.length; i++){
        log_name += "_" + url_parts[i]; 
    }
    //log_name = log_name.replace(/\W/g, '');
    return log_name + ".json";
}

const GenerateNavigationPath = function(seq_cutoff, src, snk){
    let edge = [];
    let navigationPath = {};
    navigationPath.source = src;
    navigationPath.sink = snk;
    /*for(let i = 0; i < seq_cutoff.length; i++){
        edge.push(seq_cutoff[i].css_selector);
    }*/
    edge = seq_cutoff;
    navigationPath.edge = edge;
    return navigationPath;
}

const CountElementUrl = async function(t, url){
    let anchor_list = [];
    let elementsOfInterest = ['input','button','a'];
    //await t.useRole(USERA);
    await t.navigateTo(url);
    for(let j = 0; j < elementsOfInterest.length; j++){
        const elements = Selector(elementsOfInterest[j]).filterVisible();
        const elecount = await elements.count;
        for(let i = 0; i < elecount; i++){
            const element = elements.nth(i);
            if(await element.visible){
                //let elementtag = await element.tagName;
                let eleInnerText = await element.innerText;
                let elementattr = await element.attributes;
                //elementattr["href"] = "Fuzz";
                let ele_string = JSON.stringify(elementattr) + JSON.stringify(eleInnerText);
                anchor_list.push(ele_string);
            }
            /*try{
                await t.expect(element.exists).ok({timeout: 100});
                let eleInnerText = await element.innerText;
                let elementattr = await element.attributes;
                elementattr["href"] = "Fuzz";
                let ele_string = JSON.stringify(elementattr) + JSON.stringify(eleInnerText);
                anchor_list.push(ele_string);
            +}
            catch{
                console.log("not exist");
            }*/
        }
    }
    return anchor_list;
}

const compareAnchorArrays = function(list1, list2){
    let counter = 0;
    let new_eles = [];
    var difflib = require('difflib');
    let acc = 0;
    if(list1.length == 0){
        return 11;
    }
    for(let i = 0; i < list1.length; i++){
       let found = 0;
       for(let j = 0; j < list2.length; j++){
            let edit_distance = levenshteinDistance(list1[i], list2[j]);
            edit_distance = (edit_distance) / (list1[i].length + list2[j].length);
            //var simAB = new difflib.SequenceMatcher(null, list1[i], list2[i]);
            //var edit_distance = simAB.ratio();
            if(edit_distance < 0.1){
                found = 1;
                break
            }
       }
       if(found == 0) {
	   		new_eles.push(list1[i]);
			list2.push(list1[i]);
	   }
       else{
            acc ++;
       }
    }
    let diff = ((list1.length + list2.length) / 2) - acc;
    let length = list1.length + list2.length;
    console.log(diff / length);
    return diff;
}

const compareHTML = function(html1, html2){
    let edit_distance = 0;
    edit_distance = levenshteinDistance(html1, html2);
    return edit_distance; 
}

const loadLogFile = function (name, user='a', DATA_FOLDER) {
    const fs = require('fs');
        try {
            if(fs.existsSync(DATA_FOLDER+name)){
                //console.log(`file ${DATA_FOLDER + user+'_'+name} detected.`);
                return JSON.parse(fs.readFileSync(DATA_FOLDER+name));
            }            
        } catch (err) {
            //console.log(`error loading file - ${DATA_FOLDER+user+'_'+name}`)
            //console.log(err);
        }
        //console.error(`file ${DATA_FOLDER+user+'_'+name} not found`);
        return false
}

const levenshteinDistance = (str1 = '', str2 = '') => {
	 const track = Array(str2.length + 1).fill(null).map(() =>
	 Array(str1.length + 1).fill(null));
	 for (let i = 0; i <= str1.length; i += 1) {
	 	track[0][i] = i;
 	 }
	 for (let j = 0; j <= str2.length; j += 1) {
 	 	track[j][0] = j;
  	 }
	 for (let j = 1; j <= str2.length; j += 1) {
		for (let i = 1; i <= str1.length; i += 1) {
			const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
			track[j][i] = Math.min(
							track[j][i - 1] + 1, // deletion
							track[j - 1][i] + 1, // insertion
							track[j - 1][i - 1] + indicator, // substitution
							);
		}
	 }
	 return track[str2.length][str1.length];
}

const sigmoid = function(z) {  
    return 1 / (1 + Math.exp(-z));
}

const logObject = function(obj, name, folder) {
    //if(DEBUG_PRINT){console.log("Printing Object = "+USER_MODE+'_'+name)}
    const fs = require('fs');
    try{
        fs.writeFileSync(folder + name, JSON.stringify(obj, null, 2) , 'utf-8');
    }
    catch(err){
        console.log(err);
    }
}

const string_backward_match = function(str1 = '', str2 = ''){
   if(str2.length == 0){
        return false;
   }
   let length = str2.length;
   if(str1.length < str2.length && str1.length > 5){
        length = str1.length;
   }
   for(let i = 0; i < length; i++){
        if(str1[str1.length - 1 -i] != str2[str2.length - 1 - i]){
            return false;
        }
   }
   return true;
}

const generateDynamicValues = function(element_info={}, dynamic_elements={}){
    let dynamicValues = [];
    try{
        for(let element_id in dynamic_elements){
            if(!element_info.hasOwnProperty(element_id)){
                continue;
            }
            let attr = element_info[element_id].attr;
            if(attr == undefined){
                continue;
            }
            for(let property in dynamic_elements[element_id]){
                let value = attr[property];
                if(value != undefined){
                    dynamicValues.push(value);
                }
            }
        }
    }catch{
        console.log("error while generating dynamic values");
    }
    return dynamicValues;
}

const traverseChildNodes = function(childNodes, parentTagName, temp_response, text_mode=0){
    childNodes.forEach(node => {
        if(node.hasChildNodes && node.childNodes.length != 0){
            let tagName = node.tagName;
            let output = tagName + '_'
            for(let i = 0; i < node.attributes.length; i++){
                let item = node.attributes.item(i);
                //console.log(item.name, node.getAttribute(item.name));
                output = output + item.name + node.getAttribute(item.name)
            }
            output = output.replace(/[^a-z0-9]/gi, '');
            if(!temp_response.includes(output) && text_mode == 0){
                temp_response.push(output);
            }
            let childNodes = node.childNodes;
            traverseChildNodes(childNodes, tagName, temp_response, text_mode);
        }
        else{
            if(parentTagName != 'SCRIPT')
            {
                let textContent = node.textContent;
                //let textContent = node.textContent.replace(/^([a-zA-Z0-9 _-]+)$/,'');
                textContent = textContent.split('\\t').join('').split('\\n').join('').split('\\r').join('');
                textContent = textContent.replace(/[^a-z0-9]/gi, '');
                //console.log(textContent, "-", parentTagName);
                if(textContent != ''){
                    if(!temp_response.includes(textContent) && text_mode == 0){
                        temp_response.push(textContent);
                    }
                    if(!temp_response.includes(textContent) && text_mode == 1 && parentTagName.toLowerCase() != 'textarea'){
                        temp_response.push(textContent);
                    }
                }
            }
        }
    })
    return temp_response;
}

const check_form_error = function(res_list, keywords){
    for(let i = 0; i < res_list.length; i++){
        let res_item = res_list[i];
        for(let j = 0; j < keywords.length; j ++){
            let error_item = keywords[j];
            if(res_item.includes(error_item)){
                return true;
            }
        }
    }
    return false;
}

const extractTextFromHTML = function (responseA="", text_mode=0){
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    let temp_response = [];
    let response_lowercase = responseA.toLowerCase();
    if(response_lowercase.includes('html') || response_lowercase.includes('div')){
        const {document} = new JSDOM(responseA).window;
        const node = document.body;
        const childNodes = document.childNodes;
        temp_response = traverseChildNodes(childNodes, node.tagName, temp_response, text_mode);
    }
    return temp_response
}

const generateReponsePair = function(responses, triad_resps = {}, common_elements={}){
    for(let user in triad_resps){
        let temp_common_elements = [];
        let response = triad_resps[user];
        let new_response;
        try{
            new_response = extractTextFromHTML(response);
        }
        catch{
            console.log("extract dom failed, using plain text");
            new_response = response;
        }
        if(new_response.length == 0){
            if(responses[user] == undefined){
                responses[user] = [response];
            }
            else{
                responses[user].push(response);
            }
        }
        else{
            if(responses[user] == undefined){
                responses[user] = new_response;
            }
            else{
                for(let i = 0; i < new_response.length; i++){
                    let flag = 0;
                    for(let j = 0; j < response[user].length; j ++){
                        if(response[user][j] == new_response[i]){
                            flag = 1;
                            break;
                        }
                    }
                    if(flag == 0){
                        responses[user].push(new_response[i]);
                    }
                }
            }
            if(response.includes("DOCTYPE html")){
                let flag = 0;
                if(common_elements[user].length == 0){
                    common_elements[user] = new_response;
                }
                else{
                    for(let i = 0; i < new_response.length; i++){
                        if(new_response[i].toLowerCase().includes('redirect')){
                            flag = 1;
                            break;
                        }
                        let common_flag = 0;
                        for(let j = 0; j < common_elements[user].length; j++){
                            if(common_elements[user][j] == new_response[i]){
                                common_flag = 1;
                                break;
                            }
                        }
                        if(common_flag == 1){
                            temp_common_elements.push(new_response[i]);
                        }
                    }
                    if(flag == 0){
                        common_elements[user] = temp_common_elements;
                    }
                }
            }
        }
    }
    return [responses, common_elements];
}

const url_wrapper = function(href_url, baseURI, path){
    if(href_url == undefined){
        return "";
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
    return href_url;
}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}
  

module.exports = {
    AttributesCompareWrapper: AttributesCompareWrapper,
    GenerateTypeString: GenerateTypeString,
    ExtractToken: ExtractToken,
    replaceToken: replaceToken,
    CountElementUrl: CountElementUrl,
    compareAnchorArrays: compareAnchorArrays,
    removeQuery: removeQuery,
    GenerateAttackString: GenerateAttackString,
    GenerateCssString: GenerateCssString,
    GenerateNavigationPath: GenerateNavigationPath,
    check_url_keywords: check_url_keywords,
    levenshteinDistance: levenshteinDistance,
    GenerateCsshref: GenerateCsshref,
    compareHTML: compareHTML,
    sigmoid: sigmoid,
    logObject: logObject,
    loadLogFile: loadLogFile,
    extractLogName: extractLogName,
    string_backward_match: string_backward_match,
    generateDynamicValues: generateDynamicValues,
    replaceRandom: replaceRandom,
    generateReponsePair: generateReponsePair,
    extractParameter, extractParameter,
    generateEdge: generateEdge,
    generate_absolute_path: generate_absolute_path,
    extractTextFromHTML: extractTextFromHTML,
    check_form_error: check_form_error,
    url_wrapper: url_wrapper,
    clusterURL: clusterURL,
    randomIntFromInterval: randomIntFromInterval
};

/*fixture `Fuzzer`
    .page("http://10.99.0.199")

test(
    'test', async t=>{
       let private_anchors = await CountElementUrl(t, "http://10.99.0.199/wp-admin/index.php");
       let public_anchors = await CountElementUrl(t, "http://10.99.0.199/wp-admin/");
       let unsimilarity = compareAnchorArrays(private_anchors, public_anchors)
       console.log(unsimilarity);
    }
)*/

/*urlAnchorArray = loadfile('urlAnchorArray.json');
let list1 = urlAnchorArray["http://10.99.0.233/wp-admin/edit.php?orderby=title&order=asc"];
let list2 = urlAnchorArray['http://10.99.0.233/wp-admin/edit.php?orderby=comment_count&order=asc'];
let unsimilarity = compareAnchorArrays(list1, list2);
console.log(unsimilarity);*/

/*let urlAnchorArray = loadfile('urlAnchorArray.json');
let list1 = urlAnchorArray["http://10.99.0.15/admin/content?title=&type=All&status=All&langcode=All&order=title&sort=asc"];
let list2 = urlAnchorArray["http://10.99.0.15/admin/content?title=&type=All&status=All&langcode=All&order=type&sort=asc"];
let sim = compareAnchorArrays(list1, list2);
console.log(sim);*/

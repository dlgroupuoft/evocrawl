const eventURL = function(global_events=[]){
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        if(event.type === 4){
            let data = event.data;
            return data.href;
        }
    }
    return 0;
}

const mergeEvent = function (event1, event2){
    for(let i = 0; i < event2.length; i ++){
        event1.push(event2[i]);
    }
    return event1;
}

String.prototype.cleanup = function() {
    return this.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "");
}

const traverse = function (node = {}, id = 0, index=0, elements_info = {}){
    if(node.childNodes == undefined){
        return elements_info;
    }
    let length = node.childNodes.length;
    let obj = {tag: node.tagName, attr: node.attributes, parentID: id, index: index};
    elements_info[node.id] = obj;
    let child_index = 0;
    for(let i = 0; i < length; i++){
        let childnode = node.childNodes[i]; 
        if(childnode.type == 3){
            let child_obj = {textContent: childnode.textContent, parentID: id};
            elements_info[childnode.id] = child_obj;
        }
        if(childnode.type == 2){
            elements_info = traverse(childnode, node.id, child_index, elements_info);
            child_index ++;
        }
    }
    return elements_info;
}

const traverse2 = function (node = {}, id = 0, index=0, elements_info = {}, new_elements=[]){
    if(node.childNodes == undefined){
        return elements_info;
    }
    let length = node.childNodes.length;
    let obj = {tag: node.tagName, attr: node.attributes, parentID: id, index: index};
    elements_info[node.id] = obj;
    new_elements.push(node.id);
    let child_index = 0;
    for(let i = 0; i < length; i++){
        let childnode = node.childNodes[i]; 
        if(childnode.type == 3){
            let child_obj = {textContent: childnode.textContent, parentID: id};
            elements_info[childnode.id] = child_obj;
        }
        if(childnode.type == 2){
            let results = traverse2(childnode, node.id, child_index, elements_info, new_elements=[]);
            elements_info = results[0];
            new_elements = results[1];
            child_index ++;
        }
    }
    return [elements_info, new_elements];
}

const page_recorder = function (node = {}, id = 0, element_list = []){
    if(node.childNodes == undefined){
        return elements_info;
    }
    let elementsOfInterest = ['input', 'button', 'a', 'select', 'textarea'];
    let length = node.childNodes.length;
    //console.log(node.tagName);
    if(elementsOfInterest.includes(node.tagName)){    
        let ele_string = node.tagName;
        let attrs = node.attributes;
        for(let attribute in attrs){
            let value = attrs[attribute];
            //ele_string += "-" + attribute + "-" + value;
            ele_string += attribute + value;
            ele_string = ele_string.cleanup();
        }
        //console.log(ele_string)
        //let obj = "test";
        element_list.push(ele_string);
    }
    for(let i = 0; i < length; i++){
        let childnode = node.childNodes[i];
        if(childnode.type == 2){
            element_list = page_recorder(childnode, node.id, element_list);
        }
    }
    return element_list;
}

const check_dom_changes = function(page_events){
    let event = {};
    for(let i = 0; i < page_events.length; i ++){
        event = page_events[i];
        if(event.type == undefined){
            continue;
        }
        if(event.type == 3){
            let data = event.data;
            if(data == undefined){
                continue;
            }
            if(data.source == 0 || data.source === 8){
                return true;
            }
        }
    }
    return false;
}

//handle the DOM structure of the page
const handleDOM = function(global_events){
    let event = {};
    let elements_info = {};
    for(let i = 0; i < global_events.length; i++){
        //console.dir(global_events[i]);
        if(global_events[i].type == undefined){
            continue;
        }
        if(global_events[i].type == 2){
            event = global_events[i];
        }
    }
    if(event.data == undefined){
        return elements_info;
    }
    let node = event.data.node;
    elements_info = traverse(node, 0, 0, elements_info);
    return elements_info;
}

const checkEventCapture = function(global_events, event_type){
    for(let i = 0; i < global_events.length; i++){
        if(global_events[i].type == event_type){
            return true;
        }
    }
    return false;
}

//handle dependable elements
const DOM_addtional_element = function(global_events, elements_info){
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        if(event.type === 3){
            let data = event.data;
            if((data.source === 0 || data.source === 8) && data.adds.length !== 0){
                let adds = data.adds;
                for(let j = 0; j < adds.length; j++){
                    let obj = adds[j];
                    if(!obj.hasOwnProperty("node")){
                        continue;
                    }
                    let node = adds[j].node;
                    let id = obj.parentId;
                    if(node.type === 2){
                        //console.log(node);
                        //console.log(id);
                        elements_info = traverse(node, id, 0, elements_info);
                        //console.log("break");
                    }
                }
            }
        }
        //console.log("break2");
        //console.log(i, "/", global_events.length);
    }
    return elements_info;
}

const record_addtional_element = function(global_events, elements_info){
    let new_elements = [];
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        if(event.type === 3){
            let data = event.data;
            if((data.source === 0 || data.source === 8) && data.adds.length !== 0){
                let adds = data.adds;
                for(let j = 0; j < adds.length; j++){
                    let obj = adds[j];
                    if(!obj.hasOwnProperty("node")){
                        continue;
                    }
                    let node = adds[j].node;
                    let id = obj.parentId;
                    if(node.type === 2){
                        //console.log(node);
                        //console.log(id);
                        let results = traverse2(node, id, 0, elements_info, new_elements);
                        elements_info = results[0];
                        new_elements = results[1];
                        //console.log("break");
                    }
                }
            }
        }
        //console.log("break2");
        //console.log(i, "/", global_events.length);
    }
    return [elements_info, new_elements];
}

const check_hidden_ele_mark = function(global_events){
    let count = 0;
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        if(event.type === 3){
            let data = event.data;
            if((data.source === 0 || data.source === 8) && data.adds.length !== 0){
                count ++;
                break;
            }
        }
        //console.log("break2");
        //console.log(i, "/", global_events.length);
    }
    return count;
}

const event_analyze = function(global_events){
    let id_list = [];
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        //console.log(event);
        if(event.type == 3){
            let data = event.data;
            if(data.source == 2 && data.type == 2){
                id_list.push(data.id);
            }
        }
    }
    return id_list;
}

const rightClick_analyze = function(global_events){
    let id_list = [];
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        //console.log(event);
        if(event.type == 3){
            let data = event.data;
            if(data.source == 2 && data.type == 3){
                id_list.push(data.id);
            }
        }
    }
    return id_list;
}

const option_record = function(global_events){
    let option = '';
    for(let i = 0; i < global_events.length; i++){
        let event = global_events[i];
        //console.log(event);
        if(event.type == 3){
            let data = event.data;
            if(data.source == 5){
                option = data.text;
            }
        }
    }
    return option;
}

const pageElementList = function(global_events){
    let event = {};
    let element_list = [];
    for(let i = 0; i < global_events.length; i++){
        //console.dir(global_events[i]);
        if(global_events[i].type == 2){
            event = global_events[i];
            if(event.data == undefined){
                continue;
            }
            let node = event.data.node;
            element_list = page_recorder(node, 0, element_list);
        }
        if(event.type === 3){
            let data = event.data;
            if((data.source === 0 || data.source === 8) && data.adds.length !== 0){
                let adds = data.adds;
                for(let j = 0; j < adds.length; j++){
                    let obj = adds[j];
                    if(!obj.hasOwnProperty("node")){
                        continue;
                    }
                    let node = adds[j].node;
                    let id = obj.parentId;
                    if(node.type === 2){
                        //console.log(node);
                        //console.log(id);
                        element_list = page_recorder(node, id, element_list);
                        //console.log("break");
                    }
                }
            }
        }
    }
    return element_list;
}

const dialogEvent = function(global_events=[]){
    let event = {};
    let element_id = 0;
    for(let i = 0; i < global_events.length; i++){
        event = global_events[i];
        if(event.type === 3){
            let data = event.data;
            if(data.source === 2 && data.type === 6){
                element_id = data.id;
            }
        }
    }
    if(element_id <= 0){
        element_id = 0; //more compatible, although not really understand why got value < 0
    }
    return element_id;
}

const GenerateCssString = function(elementattr, baseURI=""){
    let css_string = '';
    for(let property in elementattr){
        let value = JSON.stringify(elementattr[property]);
        if(!value.includes('[')){
            css_string += '[' + String(property) + '=' + value + ']';
        }
    }
    return css_string;
}

const CSS_selector_constructor = function(elementattr, baseURI=""){
    let css_string = '';
    //let target_properties = ['id', 'type', 'name', 'class', 'value'];
    for(const property in elementattr){
        if(property == "id" || property == "value"){
            continue
        }
        if(property != 'href'){
            css_string += '[' + String(property) + '=' + JSON.stringify(elementattr[property]) + ']';
        }
        else{
            let value = JSON.stringify(elementattr[property]);
            value = value.replace(baseURI, "");
            css_string += '[' + String(property) + '*=' + value + ']';
        }
    }
    return css_string;
}

const searchInfo = function(id, element_info, locator_ids){
    if(element_info[id].tag == 'html'){
        return locator_ids;
    }
    locator_ids.push(id);
    let parentId = element_info[id].parentID;
    locator_ids = searchInfo(parentId, element_info, locator_ids);
    return locator_ids;
}

const searchDown = function(id, element_info, locator_ids){
    let child_ele = 0;
    for(let ele_id in element_info){
        if(element_info[ele_id].parentID == id){
            locator_ids.push(parseInt(ele_id));
            child_ele = ele_id;
            break;
        }
    }
    if(child_ele == 0){
        return locator_ids;
    }
    else{
        locator_ids = searchDown(child_ele, element_info, locator_ids);
        return locator_ids;
    }
}

const generateLocator = function(id, element_info, baseURI=""){
    let locators = {};
    let locators_up = [];
    let locators_down = [];
    let locator_ids_down = [];
    let locator_ids_up = [];
    locator_ids_down = searchDown(id, element_info, locator_ids_down);
    locator_ids_up = searchInfo(id, element_info, locator_ids_up);
    for(let i = 0; i < locator_ids_up.length; i++){
        let id = locator_ids_up[i];
        let css_string = '';
        if(!element_info[id].hasOwnProperty('textContent')){
            let attr = element_info[id].attr;
            let tag = element_info[id].tag;
            css_string = tag + GenerateCssString(attr, baseURI);
            locators_up.push(css_string);
        }
    }
    for(let i = 0; i < locator_ids_down.length; i++){
        let id = locator_ids_down[i];
        let css_string = 'textContent';
        if(!element_info[id].hasOwnProperty('textContent')){
            let attr = element_info[id].attr;
            let tag = element_info[id].tag;
            if(tag == "option"){
                continue;
            }
            css_string = tag + GenerateCssString(attr, baseURI);
            if(css_string == tag){
                continue;
            }
            locators_down.push(css_string);
        }
    }
    locators_down = locators_down.reverse();
    locators = {ancestor: locators_up, descendants: locators_down};
    return locators;
}

const generateLocator_addon = function(id, element_info, baseURI=""){
    let locators = {};
    let locators_up = [];
    let locators_down = [];
    let locator_ids_down = [];
    let locator_ids_up = [];
    //locator_ids_down = searchDown(id, element_info, locator_ids_down);
    locator_ids_up = searchInfo(id, element_info, locator_ids_up);
    for(let i = 0; i < locator_ids_up.length; i++){
        let id = locator_ids_up[i];
        let css_string = '';
        let tag = '';
        if(!element_info[id].hasOwnProperty('textContent')){
            let attr = element_info[id].attr;
            tag = element_info[id].tag;
            css_string = tag + CSS_selector_constructor(attr, baseURI);
        }
        locators_up.push(css_string);
    }
    locators = {ancestor: locators_up, descendants: locators_down};
    return locators;
}



module.exports = {
    eventURL:eventURL,
    mergeEvent: mergeEvent,
    handleDOM: handleDOM,
    traverse: traverse,
    DOM_addtional_element: DOM_addtional_element,
    event_analyze: event_analyze,
    option_record: option_record,
    pageElementList: pageElementList,
    page_recorder: page_recorder,
    generateLocator: generateLocator,
    dialogEvent: dialogEvent,
    rightClick_analyze: rightClick_analyze,
    check_hidden_ele_mark: check_hidden_ele_mark,
    checkEventCapture: checkEventCapture,
    record_addtional_element: record_addtional_element,
    CSS_selector_constructor: CSS_selector_constructor,
    generateLocator_addon: generateLocator_addon,
    check_dom_changes: check_dom_changes
};

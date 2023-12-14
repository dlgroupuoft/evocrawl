export default class element_AZ{
    constructor(element){
        this.element = element;
        this.DEBUG_PRINT = 1;
        this.heavy_pages = [];
    }
    element_interaction = async function(t, login = false, login_credential = ["admin", "Vmuser8080@utoronto"]){
        const utils = require("../utils-evo/utils")
        let actions = ['click', 'text', 'select', 'upload'];
        let fuzz_string = "";
        if(!await this.element.visible){
            return 0;
        }
        let ele_attr = await this.element.attributes;
        let ele_tagname = await this.element.tagName;
        let ele_innerText = await this.element.innerText;
        let css_ele = utils.GenerateCssString(ele_attr).toLowerCase() + ele_innerText.toLowerCase();
        let act_num = 1;
        if((ele_attr.type == "hidden" || css_ele.includes("password") || css_ele.includes("username")) && login == false){
            return 0
        }
        if(ele_attr.type == 'submit' || ele_attr.type == 'checkbox' || ele_attr.type == 'button' || ele_attr.type == 'radio' || ele_tagname == 'button' || ele_tagname == 'a'){
            act_num = 0;
        }
        else if(ele_tagname == 'select'){
            act_num = 2;
        }
        else if(css_ele.includes('upload') || ele_attr.type == 'file'){
            act_num = 3;
        }
        if(this.DEBUG_PRINT) console.log(css_ele + "--->" + actions[act_num]);
        if(actions[act_num] === "text") {
            fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "sim", 0);
            if(login == true){
                fuzz_string = login_credential[0];
                if(css_ele.includes("pass")){
                    fuzz_string = login_credential[1];
                }
            }
            console.log(fuzz_string);
            await t.typeText(this.element, fuzz_string, { replace: true, paste: true })
        }
        if(actions[act_num] === "select"){
            fuzz_string = utils.GenerateTypeString(ele_attr, ele_tagname, "");
            const options = this.element.find('option');
            await t.click(this.element);
            await t.click(options.nth(0));
        }
        if(actions[act_num] === "click"){
            if(ele_attr.hasOwnProperty("href")){
                let href_url = ele_attr['href'];
                if(href_url.includes('http') || href_url.includes('www') || href_url.includes('org')){
                    let hostname = new URL(href_url).hostname;
                    let basehostname = new URL(baseURI).hostname;
                    if(hostname != basehostname){
                        return 0;
                    }
                }
            }
            let innerText = await this.element.innerText;
            let css_string = (css_ele + innerText).toLowerCase();
            if (!utils.check_url_keywords(css_string, this.heavy_pages)) {
                return 0;
            }
            await t.click(this.element);
        }
        if(actions[act_num] === "upload"){
            await t.setFilesToUpload(this.element, ['upload-files/not_kitty.png']);
        }
        return 1;
    }
}
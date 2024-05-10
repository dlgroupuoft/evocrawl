import { utils } from 'rrweb';
import { Selector, RequestLogger, ClientFunction, Role } from 'testcafe';
import element_AZ from '../utils-evo/element'
const utileva = require('../utils-evo/utils');

const login = async function(t, APPNAME, url, username="admin", password="Vmuser8080@utoronto"){
    const USER_MODE = 'a';
    const AUTO_MODE = 0;
    if(AUTO_MODE == 0){
        await t.navigateTo(url);
        if(APPNAME == 'kibana')
        {
            console.log("inside login");
            username = "elastic";
            password = "elastickibana";
            console.log(username, password);
            if (await Selector('input[name=\"username\"]').visible) {
                console.log("at login");
            }
            try{
                await t.typeText(Selector('input[name=\"username\"]'), username)
                await t.typeText(Selector('input[name=\"password"\]'), password, { replace: true, paste: true })
                await t.click(Selector('button[type=\"submit"\]'));
            }catch(e){
                console.log(e);
            }
            console.log("finished login");
        }
        if(APPNAME == 'hotcrp') 
        {
            if(username == 'admin'){
                username = "vmuser8080@outlook.com";
            }
            if(username == 'userA'){
                username = "userA8080@outlook.com";
            }
            if(username == 'userB'){
                username = "xiangyu.guo@mail.utoronto.ca";
            }
            await t
            .typeText(Selector('input#signin_email'), username, { replace: true, paste: true })
            .typeText(Selector('input#signin_password'), password, { replace: true, paste: true })
            .click(Selector('button#signin_signin'));
        }
        if(APPNAME.includes('wordpress'))
        {
            await t
            .typeText(Selector('input#user_login.input'), username, { replace: true, paste: true })
            .typeText(Selector('input#user_pass.input.password-input'), password, { replace: true, paste: true })
            .click(Selector('input#wp-submit'));
        }
        if(APPNAME == 'humhub')
        {
            await t
            .typeText(Selector('input#login_username'), username, { replace: true, paste: true })
            .typeText(Selector('input#login_password'), password, { replace: true, paste: true })
            .click(Selector('button#login-button'));
        }
        if(APPNAME == 'drupal')
        {
            await t
            .typeText(Selector('input#edit-name'), username, { replace: true, paste: true })
            //.typeText(Selector('input#edit-pass'), 'vmuser')
            .typeText(Selector('input#edit-pass'), password,  { replace: true, paste: true })
            .click(Selector('input[id=\"edit-submit\"][value=\"Log in\"]'));
        }
        if(APPNAME == 'impresscms')
        {
            await t
            .typeText(Selector('input[name=\"uname\"]').nth(0), username, { replace: true, paste: true })
            //.typeText(Selector('input#edit-pass'), 'vmuser')
            .typeText(Selector('input[type=\"password\"]').nth(0), password,  { replace: true, paste: true })
            .click(Selector('input[value=\"User Login\"]').nth(0));
        }
        if(APPNAME == 'matomo')
        {
            await t
            .typeText(Selector('input#login_form_login'), username, { replace: true, paste: true })
            .typeText(Selector('input#login_form_password'), password, { replace: true, paste: true })
            .click(Selector('input#login_form_submit'));
        }
        if(APPNAME == 'gitlab')
        {
            if(username == 'admin'){
                username = "root";
            }
            await t
            .typeText(Selector('input#user_login'), username, { replace: true, paste: true })
            .typeText(Selector('input#user_password'), password, { replace: true, paste: true })
            .click(Selector('button[type=\"submit\"][name=\"button\"]'));
        }
        if(APPNAME == 'opencart'){
            await t
            .typeText(Selector('#input-username'), username, { replace: true, paste: true })
            .typeText(Selector('#input-password'), password, { replace: true, paste: true })
            .click(Selector('#form-login > div.text-end > button'));
        }
        if(APPNAME == 'dokuwiki'){
            await t
            .typeText(Selector('#focus__this'), username, { replace: true, paste: true })
            .typeText(Selector('#dw__login > div > fieldset > label:nth-child(4) > input'), password, { replace: true, paste: true })
            .click(Selector('#dw__login > div > fieldset > button'));
        }
        if(APPNAME == 'kanboard'){
            await t
            .typeText(Selector('#form-username'), username, { replace: true, paste: true })
            .typeText(Selector('#form-password'), password, { replace: true, paste: true })
            .click(Selector('body > div > form > div.form-actions > button'));
        }
        if(APPNAME == 'phpbb'){
            await t
            .typeText(Selector('#username'), username, { replace: true, paste: true })
            .typeText(Selector('#password'), password, { replace: true, paste: true })
            .click(Selector('input[type=\"submit"\][name=\"login\"]'));
        }
        if(APPNAME == 'wackopicko'){
            await t
            .typeText(Selector('input[name=\"username"\]'), username, { replace: true, paste: true })
            .typeText(Selector('input[name=\"password"\]'), password, { replace: true, paste: true })
            .click(Selector('input[type=\"submit"\][value=\"login\"]'));
        }
    }
    else{
        await submit_login_form(t, url, 0, [username, password]);
    }
}

const second_login = async function(t, APPNAME, url, username="admin", password="Vmuser8080@utoronto"){
    if(APPNAME=='phpbb'){
        if(username == 'admin'){
            try{
                await t
                .click(Selector('#nav-main > li:nth-child(3) > a')); //click on the page that jump to the re-authentication page
            }catch{
                console.log("not the first time");
            }
            await t
            //.typeText(Selector('#username'), username, { replace: false, paste: true })
            .typeText(Selector('input[type=\"password\"]'), password, { replace: true, paste: true })
            .click(Selector('input[type=\"submit"\][name=\"login\"]'));
        }
    }
}

const form_intercation = async function(t, currentpageurl, eles=Selector(), element_info={}, attack, login_credential){
    let ele_form_interest = ['input', 'textarea', 'select'];
    if(eles == null){
        return 0;
    }
    const elecount = await eles.count;
    for(let j = 0; j < elecount; j ++){
        const ele = eles.nth(j);
        let act_num = 1;
        if(await ele.visible){
            let ele_attr = await ele.attributes;
            let ele_tagname = await ele.tagName;
            let css_ele = ele_tagname + utileva.GenerateCssString(ele_attr).toLowerCase();
            let ele_txt = "";
            if(ele_form_interest.includes(ele_tagname) || (ele_tagname == "button" && css_ele.includes("submit"))){
                try{
                    ele_txt = await ele.innerText;
                }
                catch (e){
                    console.error(JSON.stringify(e))
                    ele_txt = "";
                }
                ele_txt = ele_txt.replace(/[^a-z0-9]/gi,'').toLowerCase();
                act_num = 1;
                //console.log(ele_tagname);
                let interact_flag = 1;
                try{
                    let ele_az = new element_AZ(ele);
                    interact_flag = await ele_az.element_interaction(t, true, login_credential);
                }
                catch(e){
                    console.error(JSON.stringify(e));
                    continue;
                }
            }
        }
        let ele_childs = ele.child();
        await form_intercation(t, currentpageurl, ele_childs, element_info, attack, login_credential);
    }
}

const submit_login_form = async function(t, currentpageurl, attack=0, login_credential){
    await t.navigateTo(currentpageurl);
    await t.eval(() => location.reload(true));
    const forms = Selector('form');
    const formcount = await forms.count;
    console.log(formcount);
    for(let i = 0; i < formcount; i ++){
        let form = forms.nth(i);
        if(!(await form.visible)){
            continue;
        }
        if(await form.visible){
            let form_attr = await form.attributes;
            let css_string = "form" + utileva.GenerateCssString(form_attr);
            let eles = form.child();
            await form_intercation(t, currentpageurl, eles, {}, attack, login_credential)
        }   
    }
}

const extra_steps = async function(t, APPNAME, url){
    await t.navigateTo(url);
    if(APPNAME="phpbb"){
        await t
            .click(Selector("#nav-footer > li:nth-child(4) > a"))
            .click(Selector("#phpbb_confirm > div > form > fieldset > input:nth-child(1)"));
    }
}

const extractBaseUrl = function(login_url){
    let url_components = login_url.split('/');
    let baseURI = '';
    for(let i = 0; i < 3; i++){
        baseURI += url_components[i] + '/';
    }
    return baseURI;
}

module.exports = {
    login: login,
    extractBaseUrl: extractBaseUrl,
    extra_steps: extra_steps,
    second_login: second_login
};

/*fixture `Fuzzer`
    .page("http://10.99.0.181:8080/testconf/")

test(
    'test', async t=>{
       await login(t, 'hotcrp');
       await login(t, 'hotcrp');
       await t
            .navigateTo('http://10.99.0.181:8080/testconf/paper/new')
            .setFilesToUpload('input#submission', ['upload-files/small.pdf']);
    }
)*/

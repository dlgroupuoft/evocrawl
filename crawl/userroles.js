
import { Role, Selector } from 'testcafe';

const overleaf = {
    baseurl: process.env.overleaf_origin?process.env.overleaf_origin:'http://10.99.0.29:8001/',
    userA : Role("http://10.99.0.29:8001/login", async t => {
        await t
            .typeText(Selector('input').withAttribute('placeholder', 'email@example.com'), 'userA@vmuser.com')
            .typeText(Selector('input').withAttribute('placeholder', '********'), 'vmuser123')
            .click('button.btn-primary.btn')
    }, { preserveUrl: true }),
    userB : Role("http://10.99.0.29:8001/login", async t => {
        await t
            .typeText(Selector('input').withAttribute('placeholder', 'email@example.com'), 'userB@vmuser.com')
            .typeText(Selector('input').withAttribute('placeholder', '********'), 'vmuser123')
            .click('button.btn-primary.btn')
    }, { preserveUrl: true }),
    userC : Role("http://10.99.0.29:8001/login", async t => {
        await t
            .typeText(Selector('input').withAttribute('placeholder', 'email@example.com'), 'userC@vmuser.com')
            .typeText(Selector('input').withAttribute('placeholder', '********'), 'vmuser123')
            .click('button.btn-primary.btn')
    }, { preserveUrl: true })
}

const matomo = {
    baseurl: process.env.matomo_origin?process.env.matomo:'http://10.99.0.164:8080/',
    userA : Role('http://10.99.0.164:8080/', async t => {
        await t
            .typeText(Selector('input#login_form_login'), 'root')
            .typeText(Selector('input#login_form_password'), 'vmuser')
            .click(Selector('input#login_form_submit'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.164:8080/', async t => {
        await t
            .typeText(Selector('input#login_form_login'), 'userB@vmuser.com')
            .typeText(Selector('input#login_form_password'), 'vmuser')
            .click(Selector('input#login_form_submit'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.164:8080/', async t => {
        await t
            .typeText(Selector('input#login_form_login'), 'userC@vmuser.com')
            .typeText(Selector('input#login_form_password'), 'vmuser')
            .click(Selector('input#login_form_submit'));
    }, { preserveUrl: true })
}

const impresscms = {
    baseurl: process.env.impresscms_origin?process.env.impresscms:'http://10.99.0.159/',
    userA : Role('http://10.99.0.159/', async t => {
        await t
            .typeText(Selector('input.uname'), 'admin')
            .typeText(Selector('input').withAttribute('type', 'password'), 'vmuser')
            .click(Selector('input').withAttribute('type', 'submit'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.159/', async t => {
        await t
            .typeText(Selector('input.uname'), 'userB')
            .typeText(Selector('input').withAttribute('type', 'password'), 'vmuser')
            .click(Selector('input').withAttribute('type', 'submit'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.159/', async t => {
        await t
            .typeText(Selector('input.uname'), 'userC')
            .typeText(Selector('input').withAttribute('type', 'password'), 'vmuser')
            .click(Selector('input').withAttribute('type', 'submit'));
    }, { preserveUrl: true })
}

const drupal = {
    baseurl: process.env.impresscms_origin?process.env.impresscms:'http://10.99.0.89/',
    userA : Role('http://10.99.0.89/user/login', async t => {
        await t
            .typeText(Selector('input#edit-name'), 'admin')
            //.typeText(Selector('input#edit-pass'), 'vmuser')
            .typeText(Selector('input#edit-pass'), 'Vmuser8080@utoronto')
            .click(Selector('input#edit-submit'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.155/user/login', async t => {
        await t
            .typeText(Selector('input#edit-name'), 'admin')
            .typeText(Selector('input#edit-pass'), 'vmuser')
            .click(Selector('input#edit-submit').withAttribute('type', 'submit'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.155/user/login', async t => {
        await t
            .typeText(Selector('input#edit-name'), 'admin')
            .typeText(Selector('input#edit-pass'), 'vmuser')
            .click(Selector('input#edit-submit').withAttribute('type', 'submit'));
    }, { preserveUrl: true })
}


const hotcrp = {
    baseurl: process.env.hotcrp_origin?process.env.hotcrp_origin:'http://10.99.0.181:8080/testconf/',
    userA : Role('http://10.99.0.181:8080/testconf/', async t => {
        await t
            .typeText(Selector('input#signin_email'), 'xiangyu.guo@mail.utoronto.ca')
            .typeText(Selector('input#signin_password'), 'guoxiangyu123')
            .click(Selector('button#signin_signin'));
    }, { preserveUrl: true }),
    userB : Role('https://10.99.0.181/testconf/', async t => {
        await t
            .typeText(Selector('input#signin_email'), 'userB@vmuser.com')
            .typeText(Selector('input#signin_password'), 'vmuser')
            .click(Selector('button#signin_signin'));
    }, { preserveUrl: true }),
    userC : Role('https://10.99.0.181/2020f/', async t => {
        await t
            .typeText(Selector('input#signin_email'), 'userC@vmuser.com')
            .typeText(Selector('input#signin_password'), 'vmuser')
            .click(Selector('button#signin_signin'));
    }, { preserveUrl: true })
}

const hotcrpadmin = {
    baseurl: process.env.hotcrp_origin?process.env.hotcrp_origin:'https://10.99.0.104/2020f/',
    userA : Role('https://10.99.0.104/2020f/', async t => {
        await t
            .typeText(Selector('input#signin_email'), 'ak.kawlay@mail.utoronto.ca')
            .typeText(Selector('input#signin_password'), 'vmuser')
            .click(Selector('button#signin_signin'));
    }, { preserveUrl: true }),
    userB : Role('https://10.99.0.104/2020f/', async t => {
        await t
            .typeText(Selector('input#signin_email'), 'userB@vmuser.com')
            .typeText(Selector('input#signin_password'), 'vmuser')
            .click(Selector('button#signin_signin'));
    }, { preserveUrl: true }),
    userC : Role('https://10.99.0.104/2020f/', async t => {
        await t
            .typeText(Selector('input#signin_email'), 'userC@vmuser.com')
            .typeText(Selector('input#signin_password'), 'vmuser')
            .click(Selector('button#signin_signin'));
    }, { preserveUrl: true })
}

const gitlab = {
    baseurl: process.env.gitlab_origin?process.env.gitlab_origin:'http://10.99.0.147/',
    userA : Role('http://10.99.0.147/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'root')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.147/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userB')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.147/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userC')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true })
}

const gitlabtriad = {
    baseurl: process.env.gitlab_origin?process.env.gitlab_origin:'http://10.99.0.188:8585/',
    userA : Role('http://10.99.0.188:8585/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userA')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.188:8585/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userB')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.188:8585/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userC')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true })
}

const gitlab11_5_1 = {
    baseurl: process.env.gitlab_origin?process.env.gitlab_origin:'http://10.99.0.188:8484/',
    userA : Role('http://10.99.0.188:8484/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userA')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.188:8484/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userB')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.188:8484/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userC')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true })
}

const gitlabadmin11_5_1 = {
    baseurl: process.env.gitlab_origin?process.env.gitlab_origin:'http://10.99.0.188:8484/',
    userA : Role('http://10.99.0.188:8484/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'root')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.188:8484/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userB')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.188:8484/users/sign_in', async t => {
        await t
            .typeText(Selector('input#user_login'), 'userC')
            .typeText(Selector('input#user_password'), 'vmuser123')
            .click(Selector('input').withAttribute('value', 'Sign in'));
    }, { preserveUrl: true })
}

const kanboard = {
    baseurl: process.env.kanboard_origin?process.env.kanboard_origin:'http://10.99.0.205:8012/',
    userA : Role('http://10.99.0.205:8012/login', async t => {
        await t
            .typeText(Selector('input#form-username'), 'userA')
            .typeText(Selector('input#form-password'), 'vmuser')
            .click(Selector('button').withText('Sign in'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.205:8012/login', async t => {
        await t
            .typeText(Selector('input#form-username'), 'userB')
            .typeText(Selector('input#form-password'), 'vmuser')
            .click(Selector('button').withText('Sign in'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.205:8012/login', async t => {
        await t
            .typeText(Selector('input#form-username'), 'userC')
            .typeText(Selector('input#form-password'), 'vmuser')
            .click(Selector('button').withText('Sign in'));
    }, { preserveUrl: true })
}

const openstack = {
    baseurl: process.env.openstack_origin?process.env.openstack_origin:'http://10.99.0.158/',
    userA : Role('http://10.99.0.158/dashboard/auth/login/', async t => {
        await t
            .typeText(Selector('input#id_username'), 'userA')
            .typeText(Selector('input#id_password'), 'vmuser123')
            .click(Selector('button#loginBtn'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.158/dashboard/auth/login/', async t => {
        await t
            .typeText(Selector('input#id_username'), 'userB')
            .typeText(Selector('input#id_password'), 'vmuser123')
            .click(Selector('button#loginBtn'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.158/dashboard/auth/login/', async t => {
        await t
            .typeText(Selector('input#id_username'), 'userC')
            .typeText(Selector('input#id_password'), 'vmuser123')
            .click(Selector('button#loginBtn'));
    }, { preserveUrl: true })
}

const openstackadmin = {
    baseurl: process.env.openstack_origin?process.env.openstack_origin:'http://10.99.0.139/',
    userA : Role('http://10.99.0.139/dashboard/auth/login/', async t => {
        await t
            .typeText(Selector('input#id_username'), 'admin')
            .typeText(Selector('input#id_password'), 'secret')
            .click(Selector('button#loginBtn'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.139/dashboard/auth/login/', async t => {
        await t
            .typeText(Selector('input#id_username'), 'userB')
            .typeText(Selector('input#id_password'), 'vmuser123')
            .click(Selector('button#loginBtn'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.139/dashboard/auth/login/', async t => {
        await t
            .typeText(Selector('input#id_username'), 'userC')
            .typeText(Selector('input#id_password'), 'vmuser123')
            .click(Selector('button#loginBtn'));
    }, { preserveUrl: true })
}


const humhub = {
    baseurl: process.env.humhub_origin?process.env.humhub_origin:'http://10.99.0.68/',
    userA : Role('http://10.99.0.68/', async t => {
        await t
            .typeText(Selector('input#login_username'), 'admin')
            .typeText(Selector('input#login_password'), 'Vmuser8080@utoronto')
            .click(Selector('button#login-button'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.68/', async t => {
        await t
            .typeText(Selector('input#login_username'), 'userB')
            .typeText(Selector('input#login_password'), 'vmuser123')
            .click(Selector('button#login-button'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.68/', async t => {
        await t
            .typeText(Selector('input#login_username'), 'userC')
            .typeText(Selector('input#login_password'), 'vmuser123')
            .click(Selector('button#login-button'));
    }, { preserveUrl: true }),
}

const humhub1 = {  // type: company social network
    baseurl: 'http://10.99.0.188:8444/',
    userA : Role('http://10.99.0.188:8444/dashboard', async t => {
        await t
            .click(Selector('button.btn-enter.btn.btn-primary'))
            .typeText(Selector('input#login_username'), 'userA')
            .typeText(Selector('input#login_password'), 'vmuser')
            .click(Selector('#loginBtn'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.188:8444/dashboard', async t => {
        await t
            .click(Selector('button.btn-enter.btn.btn-primary'))
            .typeText(Selector('input#login_username'), 'userB')
            .typeText(Selector('input#login_password'), 'vmuser')
            .click(Selector('#loginBtn'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.188:8444/dashboard', async t => {
        await t
            .click(Selector('button.btn-enter.btn.btn-primary'))
            .typeText(Selector('input#login_username'), 'userC')
            .typeText(Selector('input#login_password'), 'vmuser')
            .click(Selector('#loginBtn'));
    }, { preserveUrl: true }),
}

const humhub1admin = {
    baseurl: 'http://10.99.0.188:8444/',
    userA : Role('http://10.99.0.188:8444/dashboard', async t => {
        await t
            .click(Selector('button.btn-enter.btn.btn-primary'))
            .typeText(Selector('input#login_username'), 'vmuser')
            .typeText(Selector('input#login_password'), 'vmuser')
            .click(Selector('#loginBtn'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.188:8444/dashboard', async t => {
        await t
            .click(Selector('button.btn-enter.btn.btn-primary'))
            .typeText(Selector('input#login_username'), 'userB')
            .typeText(Selector('input#login_password'), 'vmuser')
            .click(Selector('#loginBtn'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.188:8444/dashboard', async t => {
        await t
            .click(Selector('button.btn-enter.btn.btn-primary'))
            .typeText(Selector('input#login_username'), 'userC')
            .typeText(Selector('input#login_password'), 'vmuser')
            .click(Selector('#loginBtn'));
    }, { preserveUrl: true }),
}

const dokuwiki = {  // admin: user/vmuser
    baseurl: process.env.dokuwiki_origin?process.env.dokuwiki_origin:'http://10.99.0.29:8090/',
    userA : Role('http://10.99.0.29:8090/start?do=login', async t => {
        await t
            .typeText(Selector('input').withAttribute('name', 'u'), 'userA')
            .typeText(Selector('input').withAttribute('name', 'p'), 'vmuser123')
            .click(Selector('button').withText('Log In'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.29:8090/start?do=login', async t => {
        await t
            .typeText(Selector('input').withAttribute('name', 'u'), 'userB')
            .typeText(Selector('input').withAttribute('name', 'p'), 'vmuser123')
            .click(Selector('button').withText('Log In'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.29:8090/start?do=login', async t => {
        await t
            .typeText(Selector('input').withAttribute('name', 'u'), 'userC')
            .typeText(Selector('input').withAttribute('name', 'p'), 'vmuser123')
            .click(Selector('button').withText('Log In'));
    }, { preserveUrl: true }),
}

const dokuwikiadmin = {  // admin: user/vmuser
    baseurl: process.env.dokuwiki_origin?process.env.dokuwiki_origin:'http://10.99.0.29:8090/',
    userA : Role('http://10.99.0.29:8090/start?do=login', async t => {
        await t
            .typeText(Selector('input').withAttribute('name', 'u'), 'user')
            .typeText(Selector('input').withAttribute('name', 'p'), 'vmuser')
            .click(Selector('button').withText('Log In'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.29:8090/start?do=login', async t => {
        await t
            .typeText(Selector('input').withAttribute('name', 'u'), 'userB')
            .typeText(Selector('input').withAttribute('name', 'p'), 'vmuser123')
            .click(Selector('button').withText('Log In'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.29:8090/start?do=login', async t => {
        await t
            .typeText(Selector('input').withAttribute('name', 'u'), 'userC')
            .typeText(Selector('input').withAttribute('name', 'p'), 'vmuser123')
            .click(Selector('button').withText('Log In'));
    }, { preserveUrl: true }),
}

const buddypress = {
    baseurl: process.env.prestashop_origin?process.env.prestashop_origin:'http://10.99.0.222/',
    userA : Role('http://10.99.0.222/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'root')
            .typeText(Selector('input#user_pass.input.password-input'), 'vmuser')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.222/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'userB')
            .typeText(Selector('input#user_pass.input.password-input'), 'vmuser')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.222/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'userC')
            .typeText(Selector('input#user_pass.input.password-input'), 'vmuser')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
}

const wordpress = {
    baseurl: process.env.wordpress_origin?process.env.wordpress_origin:'http://10.99.0.199',
    userA : Role('http://10.99.0.199/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'root')
            .typeText(Selector('input#user_pass.input.password-input'), 'Vmuser8080@utoronto')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.199/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'userB')
            .typeText(Selector('input#user_pass.input.password-input'), 'vmuser')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.199/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'userC')
            .typeText(Selector('input#user_pass.input.password-input'), 'vmuser')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
}

const prestashop = {
    baseurl: process.env.wordpress_origin?process.env.wordpress_origin:'http://10.99.0.14/',
    userA : Role('http://10.99.0.14/admin477fvxy6f/', async t => {
        await t
            .typeText(Selector('input#email'), 'root@vmuser.com')
            .typeText(Selector('input#passwd'), 'vmuser123')
            .click(Selector('button#submit_login'));
    }, { preserveUrl: true }),
    userB : Role('http://10.99.0.222/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'userB')
            .typeText(Selector('input#user_pass.input.password-input'), 'vmuser')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
    userC : Role('http://10.99.0.222/wp-login.php', async t => {
        await t
            .typeText(Selector('input#user_login.input'), 'userC')
            .typeText(Selector('input#user_pass.input.password-input'), 'vmuser')
            .click(Selector('input#wp-submit'));
    }, { preserveUrl: true }),
}

const phpbb = {
    baseurl: process.env.phpbb_origin?process.env.phpbb_origin:'http://10.99.0.188/',
    userA : Role('http://10.99.0.188', async t => {
        await t
            .typeText(Selector('input#username'), 'userA')
            .typeText(Selector('input#password'), 'Vmuser8080@utoronto')
            .click(Selector('#page-body > form > fieldset > input.button2'));
    }, { preserveUrl: true }),
}
module.exports = { 
    overleaf: overleaf, 
    hotcrp: hotcrp,
    hotcrpadmin: hotcrpadmin,
    gitlab: gitlab,
    gitlabtriad:gitlabtriad,
    gitlab11_5_1: gitlab11_5_1,
    gitlabadmin11_5_1: gitlabadmin11_5_1,
    kanboard: kanboard,
    openstack: openstack,
    openstackadmin: openstackadmin,
    humhub: humhub,
    humhub1: humhub1,
    humhub1admin: humhub1admin,
    dokuwiki: dokuwiki,
    dokuwikiadmin: dokuwikiadmin,
    matomo: matomo,
    impresscms: impresscms,
    buddypress: buddypress,
    prestashop: prestashop,
    wordpress: wordpress,
    phpbb: phpbb,
    drupal: drupal
};

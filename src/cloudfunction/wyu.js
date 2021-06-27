const axios = require("axios");
const qs = require("qs");
const crypto = require('crypto-js');
const utils = require("./utils")
require("./request")

function btoa(r) {
  const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  for (var o, n, a = String(r), i = 0, c = e, d = ""; a.charAt(0 | i) || (c = "=", i % 1); d += c.charAt(63 & o >> 8 - i % 1 * 8)) {
      if (n = a.charCodeAt(i += .75), n > 255)throw new t("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      o = o << 8 | n
  }
  return d
}

let cookies = {
  data: [],
  getNewOne(username){
    return new Promise(async resolve => {
      let ret = await this._requireNewCookies();
      this.data[username] = ret[0];
      resolve(ret);
    });
  },

  getCookies(username){
    try{
      return this.data[username]
    }catch{
      return null;
    }
  },

  async _requireNewCookies(){
    let ret = null
    ret = await axios({
      method: 'get',
      url: "https://jxgl.wyu.edu.cn/"
    })

    if (ret.data.indexOf("五邑大学教学管理系统") === -1){
      return [null, null];
    }
    let _cookies = ret.headers['set-cookie']

    ret = await axios({
      url: "https://jxgl.wyu.edu.cn/yzm?d="+Date.now(),
      method: "get",
      responseType: 'arraybuffer',
      headers: {
        Cookie: _cookies
      }
    })

    _cookies = utils.mergeCookie(_cookies, ret.headers['set-cookie'])
    return [_cookies, ret.data];
  }
}

// doLogin("3119000592", "h*a1fDYVIA$fX,2X", ret.data)

/**
 * 获取验证码
 * @param {String} 账号
 * @returns 验证码
 */
async function getVerifyCode(username){
  const [cookie, image] = await cookies.getNewOne("3119000592")
  const base64String = btoa(String.fromCharCode(...new Uint8Array(image)))
  const code = (await axios({
    method: 'post',
    url: "https://www.ltiex.com/recognizeVerifyCode/recognizeCaptcha2",
    data: qs.stringify({base64: base64String}),
  })).data
  return code
}

/**
 * 登录，如果成功返回cookie
 * @param {String} username 账号，需要提供与获取验证码时一致的账号
 * @param {String} password 密码
 * @param {String} verifyCode 验证码
 *
 * @returns {String} cookie
 *
 * @description 如果登录不成功，返回的cookie将会是空值
 */
async function doLogin(username, password, verifyCode){
  var key = crypto.enc.Utf8.parse(verifyCode+verifyCode+verifyCode+verifyCode);
  var srcs = crypto.enc.Utf8.parse(password);
  var encrypted = crypto.AES.encrypt(srcs, key, { mode:crypto.mode.ECB,padding: crypto.pad.Pkcs7 });
  password = encrypted.ciphertext.toString();

  let postData = qs.stringify({
    account: username,
    pwd: password,
    verifycode: verifyCode
  });

  const cookie = cookies.getCookies(username)

  const ret = await axios.post("https://jxgl.wyu.edu.cn/new/login", postData,{
    timeout: 10000,
    headers: {
      'Cookie': cookie
    }
  })

  if(ret.data.message && ret.data.message === "登录成功"){
    return cookie
  }

  // 返回空cookie代表登录失败
  return ""
}

module.exports = {
  getVerifyCode,
  doLogin
}
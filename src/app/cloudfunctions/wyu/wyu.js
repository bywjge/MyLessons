const axios = require("axios");
const qs = require("qs");
const crypto = require('crypto-js');
const utils = require("./utils")
const db = require("./utils/database");
const { database } = require("wx-server-sdk");
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
  const [cookie, image] = await cookies.getNewOne(username)
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
 * @returns {Object} {}
 *
 * @description 如果登录不成功，返回的cookie将会是空值
 */
async function doLogin(username, password, verifyCode){
  var key = crypto.enc.Utf8.parse(verifyCode+verifyCode+verifyCode+verifyCode);
  var srcs = crypto.enc.Utf8.parse(password);
  var encrypted = crypto.AES.encrypt(srcs, key, { mode:crypto.mode.ECB,padding: crypto.pad.Pkcs7 });
  password = encrypted.ciphertext.toString();

  console.log("i am do post", password);

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

  if (!ret.data.message){
    return Promise.reject({code: 503, msg: "internal"})
  }

  const message = ret.data.message
  if (message.indexOf("帐号或密码") !== -1 || message.indexOf("该账号不存在") !== -1){
    return Promise.reject({ code: 400, msg: "密码错误" });
  }else if (message.indexOf("验证码不正确") !== -1){
    // 验证码错误就重试
    // return doLogin(...arguments)
    return Promise.reject({ code: 404, msg: "验证码错误" });
  }else if(message.indexOf("成功") !== -1){
    return Promise.resolve({ code: 200, msg: "登录成功", cookie });
  }
  return Promise.reject({code: 503, msg: "internal"});

}

/**
 * 获取某一周的课程
 * @param {周次} week
 *
 * @returns 课程数组
 * @description 自动从数据库拿cookie，失效就自动登录
 */
async function getWeek(week, openid, cookie){
  // 用于将后端反人类的key转换
  const keyMap = {
    kcbh: '课程编号',
    kcmc: '课程名称',
    teaxms: '教师姓名',
    jxbmc: '上课班级',
    zc: '上课周次',
    jcdm2: ['节次', str => {
      str = str.trim().split(',')
      if(str.length < 2){
        return null;
      }
      let arr = [0, 0];
      arr[0] = str[0];
      arr[1] = str[str.length - 1];
      return arr;
    }],
    xq: '星期',
    jxcdmc: '教学地点',
    pkrs: '排课人数',
    kxh: '课序号',
    jxhjmc: '讲课',
    sknrjj: ['上课内容', str => utils.decodeHTML(str)]
  };
  if (!cookie){
    throw new Error("lacking of cookie")
  }
  const ret = (await axios({
    url: "https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=202102&zc=" + week,
    headers: {
      'Cookie': cookie
    }
  })).data
  let [lessons, dates] = ret
  if (lessons.length === 0){
    return []
  }
  let arr = utils.keyMapConvert(lessons, keyMap)

  // const firstDay = convertWeekToDate(week)
  const firstDay = utils.strToDate(dates[0]['rq'])
  console.log("fd", firstDay)
  return arr.map(e => {
    // 星期从星期一开始，所以不要算
    const index = e['星期'] * 1 - 1
    e['日期'] = firstDay.nDaysLater(index).format("YYYY-mm-dd")
    // console.log("firstDay", firstDay, "now", e['日期']);

    // 做班级排序
    const lesson = e['上课班级'].split(',').sort((a, b) => {
      return a - b
    })
    e['上课班级'] = lesson

    return e
  })

}

async function getLesson(openid, cookie, week = null){
  // 一个学期22周
  let lessons = new Array(22)
  if (week){
    return await getWeek(week, openid, cookie)
  }
  let counter = 0;
  for (let i = 1; i <= 22; i++) {
    const w = await getWeek(i, openid, cookie)
    lessons[i - 1] = w;
    counter++;
    await utils.sleep(150)
  }
  return lessons
}

/**
 *
 * @param {*} cookie
 */
async function checkCookie(cookie){
  const ret = await axios.get("https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=202102&zc=1", {
    headers: {
      'Cookie': cookie
    }
  })

  if (typeof ret.data === "string"){
    console.log("cookie 过期")
    return false
  }
  return true
}

module.exports = {
  getVerifyCode,
  doLogin,
  getWeek,
  getLesson,
  checkCookie
}
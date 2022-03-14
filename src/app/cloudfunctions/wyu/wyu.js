const axios = require("axios");
const qs = require("qs");
const jsdom = require("jsdom")
const { JSDOM } = jsdom
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

/**
 * 获取个人学籍卡片
 * @param {string} cookie
 * @returns 学生信息结果
 */
async function getStudentInfo(cookie) {
  const ret = await axios.get("https://jxgl.wyu.edu.cn/xjkpxx!xjkpxx.action", {
    headers: {
      'Cookie': cookie
    }
  })

  if (typeof ret.data !== 'string' || ret.data.indexOf('学生基本信息') === -1) {
    return Promise.reject('获取信息失败')
  }

  const textMap = {
    学号: '#p > table > tbody > tr:nth-child(1) > td:nth-child(2) > label',
    姓名: '#p > table > tbody > tr:nth-child(1) > td:nth-child(4) > label',
    入学年份: '#p > table > tbody > tr:nth-child(1) > td:nth-child(6) > label',
    学院: '#p > table > tbody > tr:nth-child(2) > td:nth-child(2) > label',
    专业: '#p > table > tbody > tr:nth-child(2) > td:nth-child(4) > label',
    班级: '#p > table > tbody > tr:nth-child(3) > td:nth-child(2) > label',
    年级: '#p > table > tbody > tr:nth-child(3) > td:nth-child(4) > label',
  }

  const inputMap = {
    手机号码: '#dh',
    身份证: '#sfzh',
    性别: '#xbdm' // 1->male 2->female
  }

  const dom = new JSDOM(ret.data).window.document
  const avator = dom.querySelector('#image').src || null

  const info = {
    avator
  }

  getElementInDom(dom, textMap, (e, key) => info[key] = e.innerHTML.trim() || e.innerText.trim())
  getElementInDom(dom, inputMap, (e, key) => {
    if (key === '性别') {
      info[key] = Number(e.value) === 1? '男': '女'
      return ;
    }
    info[key] = e.value
  })

  return info
}

/**
 * @typedef {Object} TeacherInfo
 * @property {string} id 教师id
 * @property {string} 姓名 教师姓名
 * @property {string} 学院 所在院校
 */

/**
 * 获取教师的基本信息
 * @param {string} username 教师的账号，以J开头
 * @param {string} cookie cookie
 * @returns {Promise<TeacherInfo>} 教师信息
 */
async function getTeacherInfo(username, cookie) {
  let ret = await axios.post("https://jxgl.wyu.edu.cn/comboboxservice!getTea.action", qs.stringify({
    q: username
  }), {
    headers: {
      'Cookie': cookie
    }
  })
  ret = ret.data[0]

  if (!ret) {
    return Promise.reject('用户不是教师或教师不存在')
  }

  const info = {
    id: ret.dm,
    姓名: ret.mc,
    学院: ret.yxmc
  }

  ret = await axios.get("https://jxgl.wyu.edu.cn/teakpxx!teakpxxEdit.action?confirmInfo=", {
    headers: {
      'Cookie': cookie
    }
  })

  if (typeof ret.data !== 'string' || ret.data.indexOf('个人信息修改') === -1) {
    return Promise.reject('获取信息失败')
  }

  const dom = new JSDOM(ret.data).window.document
  const avator = dom.querySelector('#image').src || null

  info.avatar = avator

  const zcMap = {"5":"高级工程师","6":"实验师","7":"馆员","8":"高级实验师","9":"工程师","10":"研究员","11":"副研究馆员","12":"副研究员","13":"会计师","14":"经济师","15":"高级技工","16":"无","17":"社会工作师","18":"初级技工","19":"翻译","20":"副主任医师","21":"高级会计师","22":"教授级高工","23":"中级技工","24":"主管护师","25":"主任记者","26":"助理工程师","27":"编辑","28":"城乡规划工程师","29":"副编审","30":"高级统计师","31":"高级政工师","32":"高级职业指导师一级","33":"工艺美术师","34":"护师","35":"建筑师","36":"信息系统项目管理师（高级）","37":"研究馆员","38":"研究员级高工","39":"正高级会计师","40":"主管技师","41":"主任编辑","42":"助理馆员","43":"助理实验师","44":"助理研究员","45":"助理医师","46":"专业技术十一级岗","":"(无)","03":"教授","04":"副教授","01":"讲师","02":"助教"}
  const inputMap = {
    手机号码: '#dh',
    身份证: '#sfzh',
    性别: '#xbdm', // 1->male 2->female
    职称: '#zcdm'
  }

  getElementInDom(dom, inputMap, (e, key) => {
    if (key === '职称') {
      info[key] = zcMap[e.value]
      return ;
    }
    if (key === '性别') {
      info[key] = Number(e.value) === 1? '男': '女'
      return ;
    }
    info[key] = e.value
  })

  // 访问教师卡片获取信息
  return Promise.resolve(info)
}

/**
 * 获取dom中的多个元素
 * @param {document} dom dom的文档结点
 * @param {object} paths 需要遍历的路径
 * @param {(e: any, key, path) => void} fn 每个结点的遍历函数
 */
function getElementInDom(dom, paths, fn) {
  // 遍历path列表获取值
  for (const key in paths) {
    const path = paths[key]
    const e = dom.querySelector(path)
    if (!e) {
      continue
    }

    fn(e, key, path)
  }
}

module.exports = {
  getVerifyCode,
  doLogin,
  getWeek,
  getLesson,
  checkCookie,
  getStudentInfo,
  getTeacherInfo
}
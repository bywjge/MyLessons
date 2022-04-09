import Request from '../utils/request-promise'
import tools from '../utils/tools'
import * as database from '../static/js/database'
import requestWithCookie from '../utils/request'
import { decrypt } from '../static/js/AES'
import CryptoJS from 'crypto-js'
import moreApi from './more'

const request = new Request()

/**
 * @typedef {Object} CodeWithCookie
 * @property {string} cookie 验证码所使用的cookie
 * @property {string} code 识别出的验证码内容
 */

/**
 * @typedef {Object} FlatPromise
 * @property {Promise} p promise对象
 * @property {Function} resolve resolve事件
 * @property {Function} reject reject事件
 */

/**
 * @typedef {Object} TeacherInfo
 * @property {string} id 教师id
 * @property {string} 姓名 教师姓名
 * @property {string} 学院 所在院校
 */


/**
 * 登录到教务系统
 * @param {string} username 用户账号
 * @param {string} password 用户密码
 * @param {string} [cookie=null] 登录所使用的cookie
 * @param {boolean} [skipStorage=false] 是否跳过储存过程，为true时不储存到本地和数据库
 * @returns {Promise<string>} 成功时返回cookie，失败时返回错误信息
 */
async function doLogin(username, password, cookie = null, skipStorage = false) {
  // 获取cookie和验证码
  console.warn('获取cookie和验证码...')
  const { cookie: _cookie, code: vcode } = await getCookieAndCode(cookie)
  console.log(_cookie, vcode)

  const key = CryptoJS.enc.Utf8.parse(vcode + vcode + vcode + vcode);
  const srcs = CryptoJS.enc.Utf8.parse(password);
  const encrypted = CryptoJS.AES.encrypt(srcs, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
  const encryptedPassword = encrypted.ciphertext.toString()

  // 尝试登录
  console.warn('登录教务系统...')
  const ret = await request.post('https://jxgl.wyu.edu.cn/new/login', {
    account: username,
    pwd: encryptedPassword,
    verifycode: vcode
  }, {
    contentType: 'application/x-www-form-urlencoded',
    cookie: _cookie
  })

  const message = ret.data.message
  console.log('教务系统返回', message)

  /** 异常处理 */
  if (typeof message !== 'string') {
    throw new Error('内部错误，登录返回的数据异常')
  }

  if (message.indexOf("帐号或密码") !== -1) {
    return Promise.reject('密码错误')
  }

  if (message.indexOf("该账号不存在") !== -1) {
    return Promise.reject('账号不存在')
  }

  if (message.indexOf("验证码不正确") !== -1) {
    // 验证码错误就重试
    return doLogin(username, password, _cookie)
    return Promise.reject({ code: 404, msg: "验证码错误" })
  }

  /** 登录成功，需要储存cookie到本地及后端 */
  if(message.indexOf("成功") !== -1) {
    // 储存课表到数据库以及本地
    if (!skipStorage) {
      // 无需等待数据库储存完成
      database.updateCookie(_cookie)
      wx.setStorageSync('cookie', _cookie)
    }
    return Promise.resolve(_cookie)
  }
  return Promise.reject('未知内部错误')
}

/**
 * 检查cookie是否有效
 * @param {string} cookie 需要检查的cookie
 *
 * @returns {Promise<void>} 有效触发resolve，反则reject
 */
async function checkCookie(cookie) {
  const ret = await request.get('https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=202102&zc=1', {
    cookie
  })
  const data = ret.data
  if (typeof data === 'string') {
    return Promise.reject()
  }

  return Promise.resolve()
}

/**
 * 获取可用的cookie和Code
 * @param {string} [cookie=null] 用于获取验证码的cookie
 * @description
 *  向教务系统获取cookie -> 使用cookie请求验证码 -> 识别验证码
 *  如果提供了cookie参数，则跳过获取cookie的步骤，使用提供的cookie进行上述步骤
 *  ⚠️ 如果验证码识别错误，或者密码错误等其他原因，请循环使用cookie以减少请求时间
 * @return {Promise<CodeWithCookie>} 返回数据
 */
async function getCookieAndCode(cookie = null) {
  // 储存本次操作的cookie
  let _cookie = cookie

  let ret = await request.get(`https://jxgl.wyu.edu.cn/yzm?d=${Date.now()}`, {
    responseType: 'arraybuffer',
    cookie: _cookie
  })

  const image = ret.data
  _cookie = tools.mergeCookie(_cookie, ret.cookies)
  const base64String = btoa(String.fromCharCode(...new Uint8Array(image)))

  /** 识别验证码 */
  ret = await request.post(
    'https://www.ltiex.com/recognizeVerifyCode/re_1ec10d_cognize',
    { base64: base64String },
    {
      contentType: 'application/x-www-form-urlencoded'
    }
  )

  return Promise.resolve({
    code: decrypt(ret.data),
    cookie: _cookie
  })
}

/**
 * 获取教师的基本信息
 * @param {string} username 教师的账号，以J开头
 * @returns {Promise<Array<TeacherInfo>>} 教师信息
 */
async function getTeacherInfo(username) {
  const keyMap = {
    dm: 'id',
    mc: '姓名',
    yxmc: '学院'
  }
  const ret = (await requestWithCookie.post('https://jxgl.wyu.edu.cn/comboboxservice!getTea.action', {
    q: username
  })).data
  if (Array.isArray(ret) && ret.length > 0) {
    return Promise.resolve(tools.keyMapConvert(ret, keyMap))
  }
  return Promise.reject('用户不是教师或教师不存在')
}

/**
 * 查询课程，两个条件至少填写一个
 * @param {string} collegeId 学院代码
 * @param {string} lessonName 课程名称
 * @returns {Array<Object>} 课程列表
 */
async function getLessonInfo(collegeId, lessonName) {
  const collegeIdMap = {}
  for (const key in moreApi.collegeId) {
    const element = moreApi.collegeId[key]
    collegeIdMap[element] = key
  }

  const keyMap = {
    dm: 'id',
    kkbmdm: ['学院', ret => collegeIdMap[ret]],
    mc: '名称'
  }
  const ret = (await requestWithCookie.post(`https://jxgl.wyu.edu.cn/teagrkbcx!getKcxx.action?kkbmdm=${collegeId}&kkjysdm=`, {
    q: lessonName
  })).data
  if (Array.isArray(ret) && ret.length > 0) {
    return Promise.resolve(tools.keyMapConvert(ret, keyMap))
  }
  return Promise.reject('课程不存在')
}

function btoa(r) {
  const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  for (var o, n, a = String(r), i = 0, c = e, d = ""; a.charAt(0 | i) || (c = "=", i % 1); d += c.charAt(63 & o >> 8 - i % 1 * 8)) {
      if (n = a.charCodeAt(i += .75), n > 255)
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.")
      o = o << 8 | n
  }
  return d
}

export {
  doLogin,
  checkCookie,
  getTeacherInfo,
  getLessonInfo
}
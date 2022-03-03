const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

require("./utils/tools")
const wyu = require("./wyu")
const db = require("./utils/database")
const axios = require("axios");

let events = {
  login,
  getOpenid,
  getLesson,
  getCookie,
  getInfo
}
/**
 * 这个示例将经自动鉴权过的小程序用户 openid 返回给小程序端
 *
 * event 参数包含小程序端调用传入的 data
 */
exports.main = async (event, context) => {
  if(!event.action || !(event.action in events)){
    return ;
  }

  let ret = null
  try{
    ret = await events[event.action](event)
  } catch(e) {
    return {
      success: false,
      error: e.message || e
    }
  }

  return {
    success: true,
    ...ret
  };
}

async function login({username, password}){
  const wxContext = cloud.getWXContext()
  console.log("login, id is", wxContext.OPENID);
  const code = await wyu.getVerifyCode(username)
  let cookie = null
  try{
    cookie = await wyu.doLogin(username, password, code)
  } catch(e){
    if (e.msg === '验证码错误'){
      return login(...arguments)
    }
    return Promise.reject(e)
  }
  // 假定处理没有出错
  await db.updateRecord("cookies", wxContext.OPENID, {
    cookie: cookie.cookie,
    time: Date.now()
  })
  return { result: cookie }
}

/**
 * 获取学籍卡信息
 * @param {Boolean} forceNew 是否强制获取新信息
 * @description 假定cookie有效，请自行验证cookie
 */
async function getInfo({ forceNew = false }) {
  const { cookie } = await getCookie({ forceNew })
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 从数据库取出info记录
  const ret = await db.getRecord("info", openid)

  // 有记录且不强制获取新信息
  if (ret.length > 0 && !forceNew) {
    const { info } = ret[0]
    return { info }
  }

  // 向教务处获取
  const info = await wyu.getStudentInfo(cookie)

  // 如果获取成功，则放入数据库
  await db.updateRecord("info", wxContext.OPENID, {
    info,
    time: Date.now()
  })

  return { info }
}



async function getLesson({ week = null }){
  const cookie = await getCookie({})
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const lessons = await wyu.getLesson(openid, cookie, week)
  return { lessons }
}

async function getOpenid(e){
  const wxContext = cloud.getWXContext()
  return { openid: wxContext.OPENID }
}

/**
 *
 * @param {Boolean} forceNew 是否强制获取新cookie
 * @description 如果不指定需要强制获取新cookie，则从数据库中获取使用; 如果过期，则重新登录
 */
async function getCookie({ forceNew = false }){
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  let cookie = null
  let time = null

  // 从数据库取出cookie记录
  const ret = await db.getRecord("cookies", openid)

  // 有cookie且不强制获取新cookie
  if (ret.length > 0 && !forceNew) {
    let { cookie: _cookie, time: _time } = ret[0]

    console.log('数据库中读取到cookie', _cookie)
    const checkCookie = await wyu.checkCookie(_cookie)
    if (!checkCookie) {
      forceNew = true
    }
    cookie = _cookie
    time = _time
  }

  // 没有cookie / 强制获取新 / 过期
  if (ret.length === 0 || forceNew || Date.now() - time > 1.5 * 3600 * 1000){
    // reLogin
    console.log("getCookie: 重新登录")
    const users = await db.getRecord("accounts", openid)
    console.log("users", users, openid)
    const { username, password } = users[0]
    console.log("get info", username, password)
    cookie = (await login({ username, password})).result.cookie
  }

  console.log("return cookie", cookie)
  return { cookie }
}
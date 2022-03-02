export default {
  doLogin,
  checkCookie,
  getCookie
}
import cloud from '../utils/cloud'
import request from '../utils/request'
import logger from '../utils/log'
import tools from '../utils/tools'

const log = new logger()

log.setKeyword("apis/account.js")

/**
 * 登录
 * @param {string} username 用户名
 * @param {string} password 用户密码
 * @returns {string} 登录返回的cookie
 */
async function doLogin(username, password){
  if (!username || !password) {
    // exceptions.processingError()
    return Promise.reject();
  }
  let ret = (await cloud.callFunction({
    name: 'wyu',
    data: {
      action: 'login',
      username,
      password
    }
  })).result

  
  return ret.cookie
}

/**
 * 获取可用的cookie
 * @param {boolean} [forceNew = false] 是否强制获取新cookie，即忽略cookie有效性
 * @description
 *   如果cookie失效就重新登录
 * @returns {boolean} 获取结果
 */
async function getCookie(forceNew = false){
  let ret = await cloud.callFunction({
    name: 'wyu',
    data: {
      action: 'getCookie',
      forceNew
    }
  })
  // 需要主动将cookie放入储存
  wx.setStorageSync('cookie', ret.cookie)
  return ret
}


/**
 * 检查cookie是否有效
 * @returns {boolean} 检测结果，有效返回true
 */
async function checkCookie() {
  if (wx.getStorageSync('cookie') === '')
    return false

  const ret = await request({
    url: "https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=202102&zc=1"
  })
  const data = ret.data
  if (
    typeof data === 'string' && 
    (data.indexOf('cookie过期') !== -1 || data.indexOf('无法连接教务处') !== -1)
  ) {
    return false
  }
  return true
}

/**
 * 从教务处获取学生信息
 */
async function getStudentInfo() {

}
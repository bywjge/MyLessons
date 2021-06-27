module.exports = {
  doLogin,
  checkCookie,
  getCookie
}

const { utils, exceptions, logger } = getApp().globalData
const log = new logger()
log.setKeyword("apis/account.js")

async function doLogin(username, password){
  if (!username || !password){
    exceptions.processingError()
    return Promise.reject();
  }
  let ret = (await utils.callFunction({
    name: 'wyu',
    data: {
      action: 'login',
      username,
      password
    }
  })).result
  return ret
}

/**
 * 获取可用的cookie
 *
 * @description
 *   其实就是做登录，但应用在后台静默更新处，因此直接从storage获取账号信息
 *   如果密码错，将直接抛出异常
 *
 * @returns {boolean} 获取结果，成功或者失败
 */
async function getCookie(forceNew = false){
  let ret = await utils.callFunction({
    name: 'wyu',
    data: {
      action: 'getCookie',
      forceNew
    }
  })
  console.log("i got cookies", ret)
  // 需要主动将cookie放入储存
  wx.setStorageSync('cookie', ret.cookie)
  return ret
}


/**
 * 检查cookie是否有效
 *
 * @description
 *   使用getWeek函数判断返回内容
 *
 * @returns {boolean} 检测结果，有效返回true
 */
async function checkCookie(){
  const lessonApi = require('./lessons')
  if (wx.getStorageSync('cookie') === '')
    return false

  try {
    await lessonApi.getWeek(1)
  } catch (error) {
    if (error.message == 'cookie过期' || error.message === '无法连接教务处'){
      log.warn("check Cookie error: ", error)
      return false
    }
  }
  return true
}
module.exports = {
  getVerifyCodeImage,
  recognizeCode,
  doLogin,
  getCode,
  getCookie,
  checkCookie
}

const { utils, exceptions, logger } = getApp().globalData
const log = new logger()
log.setKeyword("apis/account.js")

// 从教务处获取验证码图片
async function getVerifyCodeImage(convertToBase64 = false){
  const timestamp = Date.parse(new Date()) / 1000;
  // 向五邑大学教务处获取验证码
  let ret = null
  try{
    ret = await utils.request({
      url: 'https://jxgl.wyu.edu.cn/',
      login: true,
      header: {
        'Cookie': ''
      },
    })
  }catch(e){
    utils.showModal({
      title: "发生错误",
      content: e.message
    })
    log(e.message)
  }

  if (ret.data.indexOf("请开启JavaScript并刷新该页") !== -1){
    throw new Error("无法连接教务处")
  }

  let cookie = ret.header['Set-Cookie']
  // cookie = cookie.split(";")[0]

  ret = await utils.request({
    url: 'https://jxgl.wyu.edu.cn/yzm?d=' + timestamp,
    header: {
      'Cookie': cookie
    },
    responseType: "arraybuffer"
  })

  let base64 = wx.arrayBufferToBase64(ret.data)

  // 储存访问令牌
  wx.setStorageSync('cookie', cookie)
  if (convertToBase64){
    return {
      data: base64,
      cookie
    }
  }

  return {
    data: ret.data,
    cookie
  }
}

// 通过服务器识别验证码
async function recognizeCode(base64){
  const ret = await utils.request({
    url: 'https://www.ltiex.com/recognizeVerifyCode/recognizeCaptcha2',
    method: "POST",
    data: { base64 },
    header: {
      'content-type': 'application/x-www-form-urlencoded' //删了和你死过
    }
  })

  return ret.data
}

function doLogin(username, password, verifyCode){
  const cookie = wx.getStorageSync('cookie')

  if (!username || !password || !verifyCode || !cookie){
    exceptions.processingError()
    return Promise.reject();
  }
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'login',
        username,
        password,
        verifyCode,
        cookie
      },
      fail: err => {
        console.error("wtf", err)
        exceptions.callCloudError() && log.error(err) && reject(err)
      },
      success: res => {
        let message = "";
        try {
          message = res.result.result;
        } catch (err) {
          exceptions.callCloudError();
          resolve({code: 400, msg: err})
        }
        if (message.indexOf("帐号或密码") !== -1 || message.indexOf("该账号不存在") !== -1){
          resolve({code: 400, msg: "密码错误"});
        }else if (message.indexOf("验证码不正确") !== -1){
          resolve({code: 404, msg: "验证码错误"});
        }else if(message.indexOf("成功") !== -1){
          resolve({code: 200, msg: "登录成功"});
        }
        resolve({code: 503, msg: "internal"});
      }
    });
  })

}

/**
 * 获取验证码并识别
 *
 * @description
 *   验证码数据以及识别结果放在data内
 */
async function getCode(){
  const base64 = await getVerifyCodeImage(true)
  const code = await recognizeCode(base64.data)
  return code
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
async function getCookie(counter = 0){
  if (counter > 3)
    return ;

  const username = wx.getStorageSync('username')
  const password = wx.getStorageSync('password')

  const code = await getCode()
  const loginRes = await doLogin(username, password, code)

  log.info(loginRes);
  if (loginRes.msg && loginRes.msg === "密码错误"){
    throw new Error("密码错误")
  }

  if (loginRes.msg && loginRes.msg === "验证码错误"){
    return getCookie(counter++)
  }

  return loginRes.code === 200
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
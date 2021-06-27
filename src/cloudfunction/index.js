const cloud = require('wx-server-sdk')
const wyu = require("./wyu")

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

let events = {
  login,
  getOpenid
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
      error: e.message
    }
  }

  return {
    success: true,
    ...ret
  };
}

async function login({username, password, verifyCode}){
  const code = await wyu.getVerifyCode(username)
  const cookie = await wyu.doLogin(username, password, code)
  return { result: cookie }
}

async function getOpenid(e){
  const wxContext = cloud.getWXContext()
  return { openid: wxContext.OPENID }
}
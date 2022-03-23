const cloud = require('wx-server-sdk')
const mpAppid = 'wx651d0b9229a714d3'
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

let events = {
  checkBindPushService,
  getBindQRCode
}

exports.main = async (event, context) => {
  if (!event.action || !(event.action in events)) {
    return;
  }

  let ret = null
  try {
    ret = await events[event.action](event)
  } catch (e) {
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

/**
 * 判断当前账号是否已经绑定了推送服务
 */
async function checkBindPushService() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const ret = await db.collection('push-accounts').where({
    _app_openid: _.eq(openid)
  }).count()

  return Promise.resolve({
    bind: ret.total > 0
  })
}

/**
 * 获取绑定二维码
 */
async function getBindQRCode() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const ret = await cloud.openapi({
    appid: mpAppid
  }).officialAccount.qrcode.create({
    "expire_seconds": 60 * 5,
    "action_name": "QR_STR_SCENE",
    "action_info": {
      "scene": {
        "scene_str": openid
      }
    }
  })

  return Promise.resolve(ret)
}
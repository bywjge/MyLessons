const cloud = require('wx-server-sdk')
const mpAppid = 'wx651d0b9229a714d3'
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

async function doSendMessage(openid) {
  const ret = await cloud.openapi.uniformMessage.send({
    "touser": "oYHtb5vK7ve4UMpe_bMfj1SbMrmY",
    "mp_template_msg": {
      "appid": mpAppid,
      "template_id":"IsYPd79G8GLi6PM_l3T7ehatuvOVHhn9j2u5rtzKWmI",
      "miniprogram":{
        "appid":"wxdf591d5dd7f7b1ac",
        "page":"/pages/welcome/welcome"
      },
      "data": {
        "first": {
          "value": "你有课程即将进行",
          "color": "#2F2F2F"
        },
        "keyword1": {
          "value": "课程",
          "color": "#ff617c"
        },
        "keyword2": {
          "value": "2022-03-23",
          "color": "#2F2F2F"
        },
        "keyword3": {
          "value": "北主楼单身楼",
          "color": "#2F2F2F"
        },
        "remark": {
          "value": "此条推送由你设置启用的My Lesson课程推送产生，如不需要收到推送，请取关公众号或在下方菜单关闭该功能",
          "color": "#2F2F2F"
        }
      }
    }
  })
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  doSendMessage()

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
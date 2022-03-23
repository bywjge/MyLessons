const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 包装文字为微信所需的格式
 * @param {Object} event 事件
 * @param {string} text 要返回的文字
 * @return {Object} 微信需要的文字信息格式
 */
function textWrapper(event, text) {
  return {
    ToUserName: event.FromUserName,
    FromUserName: event.ToUserName,
    CreateTime: Date.parse(new Date()) / 1000,
    MsgType: 'text',
    Content: text
  }
}

function testEcho() {
  const words = [
    "Some of us don't get to grow old with the one we love.\nI'll grow old with her, Mr Reese. Just from afar.",
    "每一步棋都代表了不一样的玩法，你在不同宇宙中，将走出更好的一步，第二步将有72084种可能的玩法；第三步，就有900万；第三步381000000000种。象棋的走法，比宇宙的原子还多，没有人可以预测全部，也就是说第一步非常重要，它离游戏最远，在你和另一位玩家中间，有着无限的可能性，但这同时也意味着，如果你犯了一个错误，也将有很多种方式来弥补",
    "Veni Vedi Vici. ——Caesar\n我至，我见，我征服。",
    "Invictus Maneo.\n我战无不胜。",
    "We're not walking in the dark.We are the dark.\n我们不是行走于黑暗，我们就是黑暗本身。"
  ]

  return words[Math.floor(Math.random() * words.length)]
}

function textResponseHandler(event, context) {
  const triggers = {
    'poi': testEcho
  }

  const { MsgType, Content } = event
  let ret = '未知的指令，请检查  -w-'
  
  if (triggers.hasOwnProperty(Content))
    ret = triggers[Content]()

  return textWrapper(event, ret)
}

/**
 * 根据openid获取用户信息
 * @param {string} openid 小程序端的openid
 */
async function getUserInfo(openid) {
  const ret = await db.collection('accounts')
    .aggregate()
    .match({
      _openid: _.eq(openid)
    })
    .lookup({
      from: 'info',
      localField: 'username',
      foreignField: 'username',
      as: 'info'
    })
    .project({
      username: true,
      info: '$info.info'
    })
    .end()

  return ret.list[0]
}

/**
 * 处理用户订阅
 * @param {Object} event
 * @description 
 *  用户在订阅时，将加入到数据库subscribe内
 *  需要判断是否经过扫描二维码关注，
 */
async function handleSubscribe(event) {
  const wxContext = cloud.getWXContext()
  let { EventKey } = event
  const { FROM_OPENID } = wxContext
  let responseText = '感谢关注My Lesson推送服务'

  console.log("添加订阅")

  // 从小程序过来的用户，需要放到push service内
  if (typeof EventKey === 'string') {
    EventKey = EventKey.replace('qrscene_', '')
    console.log('扫码关注，用户的openid为', EventKey)

    const info = await getUserInfo(EventKey)
    console.log('用户信息', info)

    db.collection('push-accounts').add({
      data: {
        _openid: FROM_OPENID,
        _app_openid: EventKey || null, // 是小程序的openid
        subscribeTime: new Date()
      }
    })

    if (info) {
      responseText = `感谢关注My Lesson推送服务\n\n您已绑定到小程序账号：\n姓名: ${info.info[0]['姓名']}\n学号: ${info.username}\n建议置顶公众号以快速接收信息推送`
    }
  }

  // 从数据库取出订阅记录
  const records = (await db.collection('subscribe').where({
    _openid: _.eq(FROM_OPENID)
  }).get()).data

  // 有记录则删除
  if (records.length > 0) {
    await db.collection('subscribe').doc(records[0]._id).remove()
  }

  // 加入记录
  db.collection('subscribe').add({
    data: {
      _openid: FROM_OPENID,
      _app_openid: EventKey || null, // 是小程序的openid
      subscribeTime: new Date()
    }
  })

  return Promise.resolve(textWrapper(event, responseText))
}

/**
 * 处理用户取消订阅
 * @param {Object} event
 * @description 从数据中中删除该用户
 */
async function handleUnsubscribe(event) {
  const wxContext = cloud.getWXContext()
  const { FROM_OPENID } = wxContext
  console.log("取消订阅")

  // 从数据库取出订阅记录
  let records = (await db.collection('subscribe').where({
    _openid: _.eq(FROM_OPENID)
  }).get()).data

  // 有记录则删除
  if (records.length > 0) {
    db.collection('subscribe').doc(records[0]._id).remove()
  }

  // 从数据库取出推送记录
  records = (await db.collection('push-accounts').where({
    _openid: _.eq(FROM_OPENID)
  }).get()).data

  if (records.length > 0) {
    db.collection('push-accounts').doc(records[0]._id).remove()
  }
  return ;
}

/**
 * 事件处理器
 * @param {'subscribe' | 'unsubscribe' | 'CLICK' | 'LOCATION'} name 事件名称
 * @param {Object} event 事件
 */
function eventResponseHandler(name, event) {
  if (name === 'subscribe') {
    return handleSubscribe(event)
  }

  if (name === 'unsubscribe') {
    return handleUnsubscribe(event)
  }
}

// 云函数入口函数
async function entrance(event, context) {
  const { MsgType, Event: eventname } = event
  console.log(event)

  if (MsgType === 'text')
    return textResponseHandler(event, context)

  /** 事件推送 */
  if (MsgType === 'event') {
    return eventResponseHandler(eventname, event)
  }

  return ;
}

exports.main = entrance
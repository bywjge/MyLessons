require('./tools')
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const groupUrl = "https://meetinaxd.ltiex.com/static/group-qrcode.html"

/**
 * 根据节数获取上/下课时间
 * @param {number} index 节数索引，从1开始，不得大于14
 * @param {boolean} [endTime = false] 是否获取本节课的结束时间，默认为否
 * @return {[string, Date]} 时间数组，包括一个字符串格式的24小时制时间，以及Date格式的时间
 * @description 节数指的是小节；返回的格式如08:15
 */
function convertIndexToTime(index, endTime = false){
  // 上课时间
  const timeMap = {
    1: "08:15",
    2: "09:05",
    3: "10:10",
    4: "11:00",
    5: "14:45",
    6: "15:35",
    7: "16:30",
    8: "17:20",
    9: "19:30",
    10: "20:25",
    11: "21:20",
    12: "22:15",
    13: "12:30",
    14: "13:20"
  }

  if (typeof index !== 'number' || index < 1 || index > 14)
    throw new Error("输入错误")

  const time = timeMap[index].split(":")
  const hour = Number(time[0])
  const min  = Number(time[1])

  let t = new Date()
  t.setHours(hour)
  t.setMinutes(min)

  // 如果不是获取结束时间
  if (!endTime)
    return [timeMap[index], t]

  t = new Date(t.getTime() + 45 * 60 * 1000)
  return [`${t.getHours().prefixZero(2)}:${t.getMinutes().prefixZero(2)}`, t]
}

/**
 * 获取一月内所有考试
*/
async function queryExamWithinMonth() {
  const wxContext = cloud.getWXContext()
  const { FROM_OPENID } = wxContext

  let fromDate = new Date()
  fromDate.setDate(1)
  let toDate = new Date(fromDate)
  toDate.setMonth(fromDate.getMonth() + 1)
  fromDate = fromDate.format('YYYY/mm/dd')
  toDate = toDate.format('YYYY/mm/dd')

  const ret = await db.collection('push-accounts')
    .aggregate()
    .match({
      _openid: FROM_OPENID
    })
    .lookup({
      from: 'exams',
      localField: '_app_openid',
      foreignField: '_openid',
      as: 'exams'
    })
    .project({
      _openid: true,
      _app_openid: true,
      exams: '$exams.exams',
    })
    .unwind('$exams')
    .unwind('$exams')
    .match({
      'exams.考试日期':  _.gte(fromDate).lt(toDate),
    })
    .project({
      _openid: true,
      _app_openid: true,
      exam: '$exams'
    })
    .end()

  if (ret.list.length === 0) {
    return Promise.resolve('【查询当月考试】\n\n✨ 亲，本月无考试安排哦～\n\n⚠️ 考试查询结果存在延迟，实时结果请在小程序内手动刷新。')
  }
  const text = ret.list.map(({ exam }) => {
    const t = [
      `【${exam['课程名称']}】\n`,
      `  剩余时间: <a href="${groupUrl}">${new Date().diffDay(exam['开始时间'])}天</a>\n`,
      `  考试时间: <a href="${groupUrl}">${exam['考试日期']} ${exam['考试时间']}</a>\n`,
      `  考试地点: <a href="${groupUrl}">${exam['考试场地']}</a>\n`,
      `  监考老师: ${exam['监考老师'].join(',')}\n`
    ]
    return t.join('')
  })

  return `【查询当月考试】\n当月共有${text.length}门考试\n\n` + text.join('\n\n') + '\n\n⚠️ 考试查询结果存在延迟，实时结果请在小程序内手动刷新。'
}

/**
 * 获取该用户明天的所有课程
*/
async function queryTomorrowLesson() {
  const wxContext = cloud.getWXContext()
  const { FROM_OPENID } = wxContext
  const nowDate = new Date().nDaysLater(1).format('YYYY-mm-dd')

  const ret = await db.collection('push-accounts')
    .aggregate()
    .match({
      _openid: FROM_OPENID
    })
    .lookup({
      from: 'lessons',
      localField: '_app_openid',
      foreignField: '_openid',
      as: 'lessons'
    })
    .project({
      _openid: true,
      _app_openid: true,
      lessons: '$lessons.lessons',
    })
    .unwind('$lessons')
    .unwind('$lessons')
    .match({
      'lessons.日期': _.eq(nowDate),
    })
    .project({
      _openid: true,
      _app_openid: true,
      lesson: '$lessons'
    })
    .end()

  if (ret.list.length === 0) {
    return Promise.resolve('【查询明日课程】\n\n✨ 亲，明天没有课程哦～')
  }
  const text = ret.list.map(({ lesson }) => {
    const startTime = convertIndexToTime(Number(lesson['节次'][0]), false)[0]
    const endTime = convertIndexToTime(Number(lesson['节次'][1]), true)[0]
    let introduce = lesson['上课内容']?lesson['上课内容']: ''
    if (introduce.length > 100)
      introduce = introduce.substr(0, 100) + '...'
    const t = [
      `📖 ${lesson['课程名称']}\n`,
      `  授课教师: ${lesson['教师姓名']}\n`,
      `  上课时间: <a href="${groupUrl}">${startTime} - ${endTime}</a>\n`,
      `  上课地点: <a href="${groupUrl}">${lesson['教学地点']}</a>\n`,
      `  简介: ${introduce? introduce: '无简介'}`
    ]
    return t.join('')
  })

  return `【查询明日课程】\n明日共有${text.length}节课\n\n` + text.join('\n\n')
}

/**
 * 获取该用户今日的下一节课程
*/
async function queryNextLesson() {
  const wxContext = cloud.getWXContext()
  const { FROM_OPENID } = wxContext
  const nowDate = new Date().format('YYYY-mm-dd')

  const ret = await db.collection('push-accounts')
    .aggregate()
    .match({
      _openid: FROM_OPENID
    })
    .lookup({
      from: 'lessons',
      localField: '_app_openid',
      foreignField: '_openid',
      as: 'lessons'
    })
    .project({
      _openid: true,
      _app_openid: true,
      lessons: '$lessons.lessons',
    })
    .unwind('$lessons')
    .unwind('$lessons')
    .match({
      'lessons.日期': _.eq(nowDate),
    })
    .project({
      _openid: true,
      _app_openid: true,
      lesson: '$lessons'
    })
    .end()
  const now = new Date()
  if (ret.list.length === 0) {
    return Promise.resolve('【查询下节课程】\n\n✨ 亲，今天没有课程哦～')
  }
  let result = ret.list.find(({ lesson }) => {
    // 只保留比现在后的课程
    return convertIndexToTime(Number(lesson['节次'][0]), false)[1] > now
  })

  if (!result) {
    return Promise.resolve('【查询下节课程】\n\n✨ 今天的课上完了哦～')
  }

  result = result.lesson

  const startTime = convertIndexToTime(Number(result['节次'][0]), false)[0]
  const endTime = convertIndexToTime(Number(result['节次'][1]), true)[0]
  let introduce = result['上课内容']?result['上课内容']: ''
  if (introduce.length > 100)
    introduce = introduce.substr(0, 100) + '...'
  const t = [
    `📖 ${result['课程名称']}\n`,
    `  授课教师: ${result['教师姓名']}\n`,
    `  上课时间: <a href="${groupUrl}">${startTime} - ${endTime}</a>\n`,
    `  上课地点: <a href="${groupUrl}">${result['教学地点']}</a>\n`,
    `  简介: ${introduce? introduce: '无简介'}`
  ]

  return `【查询下节课程】\n接下来的课程是\n\n` + t.join('')
}

/**
 * 根据节数获取上/下课时间
 * @param {number} index 节数索引，从1开始，不得大于14
 * @param {boolean} [endTime = false] 是否获取本节课的结束时间，默认为否
 * @return {[string, Date]} 时间数组，包括一个字符串格式的24小时制时间，以及Date格式的时间
 * @description 节数指的是小节；返回的格式如08:15
 */
function convertIndexToTime(index, endTime = false){
  // 上课时间
  const timeMap = {
    1: "08:15",
    2: "09:05",
    3: "10:10",
    4: "11:00",
    5: "14:45",
    6: "15:35",
    7: "16:30",
    8: "17:20",
    9: "19:30",
    10: "20:25",
    11: "21:20",
    12: "22:15",
    13: "12:30",
    14: "13:20"
  }

  if (typeof index !== 'number' || index < 1 || index > 14)
    throw new Error("输入错误")

  const time = timeMap[index].split(":")
  const hour = Number(time[0])
  const min  = Number(time[1])

  let t = new Date()
  t.setHours(hour)
  t.setMinutes(min)

  // 如果不是获取结束时间
  if (!endTime)
    return [timeMap[index], t]

  t = new Date(t.getTime() + 45 * 60 * 1000)
  return [`${t.getHours().prefixZero(2)}:${t.getMinutes().prefixZero(2)}`, t]
}

/**
 * 获取一月内所有考试
*/
async function queryExamWithinMonth() {
  const wxContext = cloud.getWXContext()
  const { FROM_OPENID } = wxContext

  let fromDate = new Date()
  fromDate.setDate(1)
  let toDate = new Date(fromDate)
  toDate.setMonth(fromDate.getMonth() + 1)
  fromDate = fromDate.format('YYYY/mm/dd')
  toDate = toDate.format('YYYY/mm/dd')

  const ret = await db.collection('push-accounts')
    .aggregate()
    .match({
      _openid: FROM_OPENID
    })
    .lookup({
      from: 'exams',
      localField: '_app_openid',
      foreignField: '_openid',
      as: 'exams'
    })
    .project({
      _openid: true,
      _app_openid: true,
      exams: '$exams.exams',
    })
    .unwind('$exams')
    .unwind('$exams')
    .match({
      'exams.考试日期':  _.gte(fromDate).lt(toDate),
    })
    .project({
      _openid: true,
      _app_openid: true,
      exam: '$exams'
    })
    .end()

  if (ret.list.length === 0) {
    return Promise.resolve('【查询当月考试】\n\n✨ 亲，本月无考试安排哦～\n\n⚠️ 考试查询结果存在延迟，实时结果请在小程序内手动刷新。')
  }
  const text = ret.list.map(({ exam }) => {
    const t = [
      `【${exam['课程名称']}】\n`,
      `剩余时间: ${new Date().diffDay(exam['开始时间'])}天\n`,
      `考试时间: ${exam['考试日期']} ${exam['考试时间']}\n`,
      `考试地点: ${exam['考试场地']}\n`,
      `监考老师: ${exam['监考老师'].join(',')}\n`
    ]
    return t.join('')
  })

  return `【查询当月考试】\n当月共有${text.length}门考试\n\n` + text.join('\n\n') + '\n\n⚠️ 考试查询结果存在延迟，实时结果请在小程序内手动刷新。'
}

/**
 * 获取该用户明天的所有课程
*/
async function queryTomorrowLesson() {
  const wxContext = cloud.getWXContext()
  const { FROM_OPENID } = wxContext
  const nowDate = new Date().nDaysLater(1).format('YYYY-mm-dd')

  const ret = await db.collection('push-accounts')
    .aggregate()
    .match({
      _openid: FROM_OPENID
    })
    .lookup({
      from: 'lessons',
      localField: '_app_openid',
      foreignField: '_openid',
      as: 'lessons'
    })
    .project({
      _openid: true,
      _app_openid: true,
      lessons: '$lessons.lessons',
    })
    .unwind('$lessons')
    .unwind('$lessons')
    .match({
      'lessons.日期': _.eq(nowDate),
    })
    .project({
      _openid: true,
      _app_openid: true,
      lesson: '$lessons'
    })
    .end()

  if (ret.list.length === 0) {
    return Promise.resolve('【查询明日课程】\n\n✨ 亲，明天没有课程哦～')
  }
  const text = ret.list.map(({ lesson }) => {
    const startTime = convertIndexToTime(Number(lesson['节次'][0]), false)[0]
    const endTime = convertIndexToTime(Number(lesson['节次'][1]), true)[0]
    let introduce = lesson['上课内容']?lesson['上课内容']: ''
    if (introduce.length > 100)
      introduce = introduce.substr(0, 100) + '...'
    const t = [
      `【${lesson['课程名称']}】\n`,
      `授课教师: ${lesson['教师姓名']}\n`,
      `上课时间: ${lesson['日期']} ${startTime} - ${endTime}\n`,
      `上课地点: ${lesson['教学地点']}\n`,
      `简介: ${introduce? introduce: '无简介'}`
    ]
    return t.join('')
  })

  return `【查询明日课程】\n明日共有${text.length}节课\n\n` + text.join('\n\n')
}

/**
 * 获取该用户今日的下一节课程
*/
async function queryNextLesson() {
  const wxContext = cloud.getWXContext()
  const { FROM_OPENID } = wxContext
  const nowDate = new Date().format('YYYY-mm-dd')

  const ret = await db.collection('push-accounts')
    .aggregate()
    .match({
      _openid: FROM_OPENID
    })
    .lookup({
      from: 'lessons',
      localField: '_app_openid',
      foreignField: '_openid',
      as: 'lessons'
    })
    .project({
      _openid: true,
      _app_openid: true,
      lessons: '$lessons.lessons',
    })
    .unwind('$lessons')
    .unwind('$lessons')
    .match({
      'lessons.日期': _.eq(nowDate),
    })
    .project({
      _openid: true,
      _app_openid: true,
      lesson: '$lessons'
    })
    .end()
  const now = new Date()
  if (ret.list.length === 0) {
    return Promise.resolve('【查询下节课程】\n\n✨ 亲，今天没有课程哦～')
  }
  let result = ret.list.find(({ lesson }) => {
    // 只保留比现在后的课程
    return convertIndexToTime(Number(lesson['节次'][0]), false)[1] > now
  })

  if (!result) {
    return Promise.resolve('【查询下节课程】\n\n✨ 今天的课上完了哦～')
  }

  result = result.lesson

  const startTime = convertIndexToTime(Number(result['节次'][0]), false)[0]
  const endTime = convertIndexToTime(Number(result['节次'][1]), true)[0]
  let introduce = result['上课内容']?result['上课内容']: ''
  if (introduce.length > 100)
    introduce = introduce.substr(0, 100) + '...'
  const t = [
    `【${result['课程名称']}】\n`,
    `授课教师: ${result['教师姓名']}\n`,
    `上课时间: ${result['日期']} ${startTime} - ${endTime}\n`,
    `上课地点: ${result['教学地点']}\n`,
    `简介: ${introduce? introduce: '无简介'}`
  ]

  return `【查询下节课程】\n接下来的课程是\n\n` + t.join('')
}

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

function getGroupQRCode() {
  const words = [
    "【添加官方交流群】\n\n",
    `点击链接添加👉 <a href="https://meetinaxd.ltiex.com/static/group-qrcode.html">获取群聊二维码</a>\n\n`,
    `\n 长按二维码即可，如果不能长按添加，可以保存二维码到本地扫描哦`,
  ]

  return words.join('')
}

function moreFunctionEcho() {
  const words = [
    "请点击选择您所需要的服务\n\n",
    "【功能列表】\n",
    `📅 <a href="weixin://bizmsgmenu?msgmenuid=1&msgmenucontent=查询明日课表">查询明日课表</a>\n\n`,
    `📖 <a href="weixin://bizmsgmenu?msgmenuid=1&msgmenucontent=查询下节课程">查询今天内的下一节课程</a>\n\n`,
    `📄 <a href="weixin://bizmsgmenu?msgmenuid=1&msgmenucontent=查询当月考试">查询本月内所有考试</a>\n\n`,
    `\n【文章列表】\n`,
    `❤️ <a href="https://mp.weixin.qq.com/s?__biz=Mzg2NDc1NTA0MA==&mid=2247483704&idx=1&sn=ae12d9a859f365d2af93d373442f1598&chksm=ce65cd37f9124421000f59d7a206d836a0d95eced917a03234f74e6fdef869f9cb88492c2c23#rd">如何设置快速打开小程序！</a>\n\n`,
    // `❤️ 5. <a href="">打开/关闭</a>\n\n`,
    `❤️ <a href="weixin://bizmsgmenu?msgmenuid=1&msgmenucontent=使用帮助">小程序使用帮助</a>\n\n`,
    `\n✨ 有更好的建议？点击添加<a href="https://meetinaxd.ltiex.com/static/group-qrcode.html">👉My Lesson 官方交流群👈</a>吧\n\n`,
  ]

  return words.join('')
}

async function textResponseHandler(event, context) {
  const triggers = {
    'poi': testEcho,
    '更多功能': moreFunctionEcho,
    '查询当月考试': queryExamWithinMonth,
    '查询明日课表': queryTomorrowLesson,
    '查询下节课程': queryNextLesson,
    '使用帮助': () => '文档正在奋笔疾书编写中～',
    '获取群聊二维码': getGroupQRCode
  }

  const { MsgType, Content } = event
  let ret = '未知的指令，请检查  -w-\n\n🌟 温馨提示：您的消息我们已收到，如果您需要留言，请添加我们的官方交流群哦。点击添加<a href="weixin://bizmsgmenu?msgmenuid=1&msgmenucontent=获取群聊二维码">👉My Lesson 官方交流群👈</a>'

  if (triggers.hasOwnProperty(Content))
    ret = await triggers[Content]()

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
    return await textResponseHandler(event, context)

  /** 事件推送 */
  if (MsgType === 'event') {
    return eventResponseHandler(eventname, event)
  }

  return ;
}

exports.main = entrance
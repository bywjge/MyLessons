require('./tools')
const cloud = require('wx-server-sdk')
/** 公众号appid */
const mpAppid = 'wx651d0b9229a714d3'

/** 微信小程序appid */
const wxAppid = 'wxdf591d5dd7f7b1ac'
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 转换时间为课程节数
 * @param {Date} time 当前时间
 * @return {string} 两位数的节次
 */
function convertTimeToIndex(time) {
  const timeMap = {
    "08:15": "01",
    "10:10": "03",
    "12:30": "13",
    "14:45": "05",
    "16:30": "07",
    "19:30": "09",
    "21:20": "11"
  }
  const l = Object.keys(timeMap)
  for (let i = 0; i < l.length; i++) {
    const e = l[i]
    const [ hour, minute ] = e.split(':')
    const t = new Date(time.getTime())
    t.setHours(Number(hour), Number(minute), 0, 0)

    if (t >= time) {
      i = i === 0? i: i - 1
      return timeMap[l[i]]
    }
  }

  return null
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
 * 获取某个时间的课程列表
 * @param {string} index 节次,需要两位数
 * @param {(list: Array<Object>) => Promise} 遍历函数
 */
async function getCurrentLessons(index, fn) {
  // const index = convertTimeToIndex(time)
  const nowDate = new Date().format('YYYY-mm-dd')
  let lastId = ''
  let counter = 0
  while(true) {
    const ret = await db.collection('push-accounts')
      .aggregate()
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
        '_id': _.gt(lastId), // 这里填入上次查询后最后一个结果的id
        'lessons.日期': _.eq(nowDate),
        // 确保这里是两位数字的字符串
        'lessons.节次': _.elemMatch(_.eq(index))
      })
      .project({
        _openid: true,
        _app_openid: true,
        lesson: '$lessons'
      })

      .limit(100)
      .end()

    const result = ret.list
    if (result.length === 0)
      break ;

    counter += result.length
    // 设置游标为最后一个
    lastId = result[result.length - 1]._id

    // console.log(result)
    if (typeof fn === 'function') {
      await fn(result)
    }
  }

  console.log('本次推送任务完成，共推送用户数量', counter)
  return Promise.resolve()
}

/**
 * 发送课程给一个用户
 * @param {string} openid 公众号openid
 * @param {Object} lesson 课程内容
 */
async function doSendLessonMessage(openid, lesson) {
  const startTime = convertIndexToTime(Number(lesson['节次'][0]), false)[0]
  const endTime = convertIndexToTime(Number(lesson['节次'][1]), true)[0]
  let introduce = lesson['上课内容']?lesson['上课内容']: ''
  if (introduce.length > 100)
    introduce = introduce.substr(0, 100) + '...'

  // console.log(' >>> openid & lesson', openid, lesson)
  const ret = await cloud.openapi.uniformMessage.send({
    "touser": openid,
    "mp_template_msg": {
      "appid": mpAppid,
      "template_id": "IsYPd79G8GLi6PM_l3T7ehatuvOVHhn9j2u5rtzKWmI",
      "miniprogram":{
        "appid": wxAppid,
        "page":"/pages/welcome/welcome"
      },
      "data": {
        "first": {
          "value": "你有课程即将进行",
          "color": "#2F2F2F"
        },
        "keyword1": {
          "value": lesson['课程名称'],
          "color": "#FF617C"
        },
        "keyword2": {
          "value": `${lesson['日期']} ${startTime} - ${endTime}`,
          "color": "#FF617C"
        },
        "keyword3": {
          "value": lesson['教学地点'],
          "color": "#FF617C"
        },
        "remark": {
          "value": `${introduce? introduce + '\n\n': ''} 此条推送由于你打开了课程推送而产生，如不需要收到推送，请取关公众号或在下方菜单关闭该功能`,
          "color": "#2F2F2F"
        }
      }
    }
  })
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const timeList = {
    "07:30": "01",
    "09:30": "03",
    "13:30": "05",
    "12:00": "13",
    "15:50": "07",
    "19:00": "09",
    "20:40": "11"
  }
  let t = new Date()
  const tick = t.format('HH:MM')

  // 如果未到时间执行
  const index = timeList[tick]
  if (typeof index === 'undefined') {
    console.log('未到时间广播，当前时间为', tick)
    return ;
  }

  console.log('整点推送课程')
  // 获取一小时后上课的课程
  // t = new Date(t.getTime() + 60 * 60 * 1000)
  // t.setDate(22)
  // t.setHours(16)

  getCurrentLessons(index, async (list) => {
    list.forEach(({ _openid, lesson }) => {
      doSendLessonMessage(_openid, lesson)
    })
    return Promise.resolve()
  })

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
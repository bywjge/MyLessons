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
const $ = _.aggregate

/**
 * 获取明日的课程表
 * @param {(openid: string, list: Array<Object>) => Promise} 遍历函数
 */
async function getTomorrowLessons(fn) {
  // ! 注意这里的_id实际上是合并后的_openid; 而_rawId则是记录的_id，使用其作为lastId
  /**
   * 获取回来的数据如下
   * {
    "_id": "oYHtb5qqw9krbJXDiser96zn9Le0",
    "lessons": [
      {
        "地点": "黄浩川教学楼",
        "日期": "2022-04-19",
        "节次": [
          "01",
          "02"
        ],
        "课程名称": "大学英语(4)"
      },
      {
        "日期": "2022-04-19",
        "地点": "北主楼",
        "节次": [
          "03",
          "04"
        ],
        "课程名称": "互换性与技术测量"
      },
      {
        "地点": "五友楼",
        "日期": "2022-04-19",
        "课程名称": "互换性与技术测量",
        "节次": [
          "11",
          "12"
        ]
      }
    ],
    "sum": 3
  }
   */
  const nowDate = new Date().nDaysLater(1).format('YYYY-mm-dd')
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
      })
      .project({
        '_openid': true,
        '_app_openid': true,
        'lessons.日期': true,
        'lessons.课程名称': true,
        'lessons.节次': true,
        'lessons.地点': true
      })
      .group({
        _id: '$_openid',
        _rawId: $.last('$_id'),
        lessons: $.push("$lessons"),
        sum: $.sum(1)
      })
      .sort({
        _rawId: 1
      })
      .limit(100)
      .end()

    const result = ret.list
    if (result.length === 0)
      break ;

    counter += result.length
    // 设置游标为最后一个
    lastId = result[result.length - 1]._rawId

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
 * @param {Array<Object>} lessons 课程内容，是一个列表
 */
async function doSendLessonMessage(openid, lessons) {
  // 需要合并节次
  let indexList = lessons.map(e => e['节次'])
  indexList = generateIndex(indexList).join(', ')
  const lessonName = lessons.map(e => e['课程名称']).join('、')

  const date = new Date().nDaysLater(1).format('YYYY/mm/dd')
  console.log(openid, date, indexList, lessonName)

  // console.log(' >>> openid & lesson', openid, lesson)
  const ret = await cloud.openapi.uniformMessage.send({
    "touser": openid,
    "mp_template_msg": {
      "appid": mpAppid,
      "template_id": "aDSMubS__sjtHq4jE5UKn7c96wQHh4P_P5mTqQaMg6A",
      "miniprogram":{
        "appid": wxAppid,
        "page":"/pages/welcome/welcome"
      },
      "data": {
        "first": {
          "value": "明天的课程安排如下",
          "color": "#2F2F2F"
        },
        "keyword1": {
          "value": date,
          "color": "#FF617C"
        },
        "keyword2": {
          "value": `${indexList} 小节`,
          "color": "#FF617C"
        },
        "remark": {
          "value": `${lessonName}\n\n${indexList.indexOf('01') !== -1? '🛑明天有早八，请注意时间\n\n': ''}以上为明天的课程安排。此条推送由于你打开了课程推送而产生，如不需要收到推送，请取关公众号或在下方菜单关闭该功能`,
          "color": "#2F2F2F"
        }
      }
    }
  })
}

/**
 * 将节次列表转换为节次序列
 * @param {Array<String[2]>} indexList 节次列表
 * @returns {Array<String>} 节次，两位数的字符串
 */
function generateIndex(indexList) {
  let ret = []
  indexList.forEach(e => {
    const from = Number(e[0])
    const to = Number(e[1])
    const index = new Array(to - from + 1).fill(from).map((e, i) => e + i)
    ret.push(...index)
  })
  ret = Array.from(new Set(ret)).sort((a, b) => Number(a) - Number(b))
  return ret.map(e => e < 10 ? '0' + e: e + '')
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log('推送明天的课程')

  const muteFrom = new Date('2022/04/30 00:00:00')
  const muteTo = new Date('2022/05/04 00:00:00')
  const nowTime = new Date()

  // 假期不推送
  if (muteFrom < nowTime && nowTime < muteTo) {
    console.log('劳动节不推送')
    return ;
  }

  getTomorrowLessons(async (list) => {
    // ! _id是_openid
    list.forEach(({ _id: _openid, lessons }) => {
      doSendLessonMessage(_openid, lessons)
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
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
 * 获取某个时间的课程列表
 * @param {Array<string>} dates 需要推送的日期数组，格式必须为YYYY/mm/dd
 * @param {(list: Array<Object>) => Promise} 遍历函数
 */
async function getCurrentExams(dates, fn) {
  let lastId = ''
  let counter = 0
  while(true) {
    const ret = await db.collection('push-accounts')
      .aggregate()
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
        '_id': _.gt(lastId), // 这里填入上次查询后最后一个结果的id
        'exams.考试日期': _.or(dates.map(e => _.eq(e))),
      })
      .project({
        _openid: true,
        _app_openid: true,
        exam: '$exams'
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
 * @param {Object} exam 课程内容
 */
async function doSendExamMessage(openid, exam) {
  // console.log(' >>> openid & exam', openid, exam)
  const ret = await cloud.openapi.uniformMessage.send({
    "touser": openid,
    "mp_template_msg": {
      "appid": mpAppid,
      "template_id": "7fO4FWTD9j2oKpYW-dIBz0ginVzjAfN7OgxTDQPruls",
      "miniprogram":{
        "appid": wxAppid,
        "page":"/pages/welcome/welcome"
      },
      "data": {
        "first": {
          "value": "你有考试即将进行",
          "color": "#2F2F2F"
        },
        "keyword1": {
          "value": exam['课程名称'],
          "color": "#FF617C"
        },
        "keyword2": {
          "value": `${exam['考试日期']} ${exam['考试时间']}`,
          "color": "#FF617C"
        },
        "keyword3": {
          "value": exam['考试场地'],
          "color": "#2F2F2F"
        },
        "keyword4": {
          "value": exam['监考老师'].join(','),
          "color": "#2F2F2F"
        },
        "remark": {
          "value": `考试通知会在考试前一个月内每周推送一次，考试一周内每两天推送一次，请留意考试时间`,
          "color": "#2F2F2F"
        }
      }
    }
  })
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
   
  /**
   * 1.获取30天后（刚好还有30天）的考试安排
   * 2.获取23天后（刚好还有23天）的考试安排
   * 3.获取16天后（刚好还有16天）的考试安排
   * 4.获取7天后（刚好还有7天）的考试安排
   * 5.获取5天后（刚好还有5天）的考试安排
   * 6.获取3天后（刚好还有3天）的考试安排
   * 7.获取1天后（刚好还有1天）的考试安排
   * 8.获取今天的考试安排
   */

  let t = new Date()
  const dates = [
    t.nDaysLater(30).format('YYYY/mm/dd'),
    t.nDaysLater(27).format('YYYY/mm/dd'),
    t.nDaysLater(16).format('YYYY/mm/dd'),
    t.nDaysLater(7).format('YYYY/mm/dd'),
    t.nDaysLater(5).format('YYYY/mm/dd'),
    t.nDaysLater(3).format('YYYY/mm/dd'),
    t.nDaysLater(1).format('YYYY/mm/dd'),
    t.format('YYYY/mm/dd')
  ]

  console.log('今日推送考试安排')
  getCurrentExams(dates, async (list) => {
    list.forEach(({ _openid, exam }) => {
      doSendExamMessage(_openid, exam)
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
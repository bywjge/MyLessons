export default {
  getLessonFromSchool,
  getScoreFromSchool,
  getExamFromSchool,
  getCreativeScoreFromSchool,
  convertDateToWeek,
  convertWeekToDate,
  convertIndexToTime,
  convertAndStorage,
  syncLessons,
  checkCloudLesson,
  colorizeLesson,
  getFirstDayOfTerm,
  getTerm,
  resetLesson,

  deleteLesson
};

import logger from '../utils/log'
import request from '../utils/request'
import tools from '../utils/tools'
import accountApi from './account'
import  * as database from '../static/js/database'
const db = wx.cloud.database()
const log = new logger()
const { eventBus } = getApp().globalData

log.setKeyword('apis/lessons.js')

/**
 * @TODOS
 *   加载课程数据
 *   保存课程数据到storage
 */

/**
 * 必要的初始化检查
 * @description
 *  1.检查学期初是否已经储存
 */
async function initCheck() {
  /** 检查学期初是否为空 */
  const firstDate = wx.getStorageSync('firstWeekDate')
  if (!firstDate || firstDate === "") {
    console.log('学期初需要初始化')
    // 计算现在的学期
    const { year, term } = getTerm()
    await getFirstDayOfTerm(year, term)
  }
}

/**
 * 获取某个学期第一周第一天的日期
 * @param {number | string} year 年份，四位数
 * @param {1 | 2} [term = 1] 学期，1代表第一学期，2代表第二学期
 * @description 从云端获取，如果云端没有，则从教务处拿，然后写入到云端
 * @returns {Promise<Date>} 第一天的时间
 */
async function getFirstDayOfTerm(year, term) {
  let date = null

  /** 从云端获取试试 */
  date = await database.getFirstDayOfTerm(year, term)
  if (date !== null) {
    wx.setStorageSync('firstWeekDate', date)
    return Promise.resolve(date)
  }

  /** 如果后端没有, 从教务系统获取 */
  const ret = await request({
    url: `https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=${year}0${term}&zc=1`
  })
  console.log(year, term, ret.data)
  try {
    date = ret.data[1][0]['rq']
  } catch(e) {
    log.error('获取学期初出错', e)
    console.log(ret.data)
    return Promise.reject('获取学期初时出错')
  }

  date = tools.strToDate(date)

  /** 上报云端 */
  database.setFirstDayOfTerm(year, term, date)
  /** 储存日期 */
  wx.setStorageSync('firstWeekDate', date)
  return Promise.resolve(date)
}

/**
 * 获取当前的学年和学期
 */
function getTerm() {
  const now = new Date()
  let year = now.getFullYear() - 1
  // 大于七月就是下学期
  let term = ((now.getMonth() + 1) >= 8) ? 1: 2
  // 如果是第一学期，就是今年的年份，否则就是去年的年份
  if (term === 1) {
    year--
  }
  return { year, term }
}

/**
 * 从教务系统获取某个学期的课程
 * @param {number | string} year 年份，四位数
 * @param {1 | 2} [term = 1] 学期，1代表第一学期，2代表第二学期
 */
async function getLessonFromSchool(year, term = 1) {
  const keyMap = {
    kcbh: '课程编号',
    kcmc: '课程名称',
    teaxms: '教师姓名',
    jxbmc: '上课班级',
    zc: '上课周次', 
    /** 只有每周课表是jcdm2 */
    jcdm: ['节次', str => {
      str = str.trim()
      if (str.length < 4)
        return null;
      
      let arr = [0, 0]
      arr[0] = str.slice(0, 2)
      arr[1] = str.slice(str.length - 2, str.length)
      return arr;
    }],
    jcdm2: ['节次', str => {
      str = str.trim().split(',')
      if(str.length < 2)
        return null;

      let arr = [0, 0]
      arr[0] = str[0]
      arr[1] = str[str.length - 1]
      return arr
    }],
    xq: '星期',
    jxcdmc: '教学地点',
    pkrs: '排课人数',
    kxh: '课序号',
    jxhjmc: '讲课',
    sknrjj: ['上课内容', str => tools.decodeHTML(str)]
  }

  const ret = await request({
    url: `https://jxgl.wyu.edu.cn/xsgrkbcx!getDataList.action?page=1&rows=1000&xnxqdm=${year}0${term}`
  })

  // 课程总数 课程内容
  const { total, rows } = ret.data
  const formattedRows = tools.keyMapConvert(rows, keyMap)
  formattedRows.forEach(e => {
    const week = Number(e['上课周次'])
    /** 课程所在周的第一天（星期一）是什么时候 */
    const firstDayInWeek = convertWeekToDate(week)
    /** 课程对应的星期几是第几天，从0开始算 */
    const dayInWeek = Number(e['星期']) - 1
    /** 为每一节课加上对应的日期 */
    e['日期'] = firstDayInWeek.nDaysLater(dayInWeek).format("YYYY-mm-dd")

    /** 班级升序排序 */
    const classes = e['上课班级'].split(',').sort((a, b) => a - b)
    e['上课班级'] = classes
  })

  return formattedRows
}

/**
 * 从教务系统获取所有学期的课程成绩
 * @description 将自动替换storage的内容
 */
async function getScoreFromSchool() {
  const ret = await request({
    url: `https://jxgl.wyu.edu.cn/xskccjxx!getDataList.action`,
    method: 'POST',
    data: {
      xnxqdm: '',
      jhlxdm: '',
      page: 1,
      rows: 1000,
      sort: 'xnxqdm',
      order: 'asc'
    }
  } ,)
  const keyMap = {
    "kcflmc": "课程分类",
    "kcdlmc": "课程类型",
    "cjjd": "成绩绩点",
    "kcdm": "课程编号",
    "bz": "备注",
    "kcmc": "课程名称",
    "zcj": "成绩",
    "ksxzmc": "考试性质",
    "xf": "学分",
    "zxs": "总学时",
    "xdfsmc": "考试类型",
    "cjfsmc": "成绩类型",
    "xnxqdm": "学期"
  }
  const { total, rows } = ret.data
  const scoreMap = {

  }
  const formattedRows = tools.keyMapConvert(rows, keyMap)
  console.log("获取到考试成绩数据条数", formattedRows.length)
  formattedRows.forEach(e => {
    const termId = e['学期']
    if (!Array.isArray(scoreMap[termId]))
      scoreMap[termId] = new Array()

    scoreMap[termId].push(e)
  })

  // 写入storage
  wx.setStorageSync('scores', scoreMap)
  return scoreMap
}

/**
 * 从教务系统获取所有学期的考试安排
 * @description 将自动替换storage的内容
 */
async function getExamFromSchool() {
  const ret = await request({
    url: `https://jxgl.wyu.edu.cn/xsksap!getDataList.action`,
    method: 'POST',
    data: {
      xnxqdm: '',
      jhlxdm: '',
      page: 1,
      rows: 1000,
      sort: 'xnxqdm',
      order: 'asc'
    }
  } ,)
  const keyMap = {
    "xnxqdm": "学期", 
    "xs": "学时",
    "jkteaxms": "监考老师",
    "ksrq": "考试日期",
    "zc": "周次",
    "xq": "星期",
    "kssj": "考试时间",
    "kslbmc": "考试类别",
    "ksaplxmc": "安排类型",
    "ksxs": "考试形式", // 0闭卷 1开卷
    "kcmc": "课程名称",
    "sjbh": "试卷编号",
    "kscdmc": "考试场地" 
  }
  const { total, rows } = ret.data
  const examMap = { }
  const formattedRows = tools.keyMapConvert(rows, keyMap)

  console.log("获取到考试安排数据量", formattedRows.length)
  formattedRows.forEach(e => {
    const termId = e['学期']
    e['监考老师'] = e['监考老师'].split(',')
    e['考试日期'] = e['考试日期'].replaceAll('-', '/')
    const t = e['考试时间'].split('--').map(e => e.substring(0, 5))
    e['开始时间'] = new Date(`${e['考试日期']} ${t[0]}`)
    e['结束时间'] = new Date(`${e['考试日期']} ${t[1]}`)
    e['考试形式'] = Number(e['考试形式']) === 0 ? '闭卷': '开卷'
    e['考试时间'] = t.join('-')
    if (!Array.isArray(examMap[termId]))
      examMap[termId] = new Array()

    examMap[termId].push(e)
  })

  // 写入storage
  wx.setStorageSync('exams', examMap)
  return examMap
}

/**
 * 从教务系统获取创新学分
 * @description 将自动替换storage的内容
 */
async function getCreativeScoreFromSchool() {
  const ret = await request({
    url: `https://jxgl.wyu.edu.cn/xscxxfxx!getDataList.action`,
    method: 'POST',
    data: {
      page: 1,
      rows: 1000,
      sort: 'xsbh',
      order: 'asc'
    }
  } ,)
  const keyMap = {
    "rdxf": ["学分", num => Number(num)],
    "sbxfdm": "代码",
    "xmlxmc": "项目类型",
    "xmfl": "项目名称",
    "xnxqmc": "获得学期",
    "ztmc": ["通过", str => str.trim() === '审核通过']
  }
  const { total, rows } = ret.data
  const formattedRows = tools.keyMapConvert(rows, keyMap)

  console.log("获取到创新学分数据量", formattedRows.length)

  // 写入storage
  wx.setStorageSync('creativeScores', formattedRows)
  return formattedRows
}

function convertDateToWeek(nowDate, convertToChinese = false){
  const chineseNumber = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "二十一", "二十二", "二十三", "二十四", "二十五"]
  let from = wx.getStorageSync('firstWeekDate')

  // 防止一些叼毛开学前就看课程
  if (nowDate.getTime() < from) {
    return convertToChinese? '一': 1
  }

  let week = Math.floor((nowDate.nDaysAgo(1).getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
  // 最大到22周
  week = Math.min(week, 22)

  if (convertToChinese){
    return chineseNumber[week - 1]
  }
  return week
}

function convertWeekToDate(week){
  const from = wx.getStorageSync('firstWeekDate')
  if (!from || from === "")
    throw new Error("学期初未指定")

  // fixed: Febr.28, 2022 微信破坏性更新导致从storage取出的Date没有自定义方法
  return Date.prototype.nDaysLater.apply(from, [(week - 1) * 7 + 1])
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
 * 同步课表
 * @param {boolean} [forceFromSchool = false] 是否强制更新，从教务系统获取
 * @TODO 没有分学期储存，云端或者本地都只能储存一个学期
 * @description
 *   不需要手动获取cookie
 *   从教务处同步课表，如果课表不存在，从数据库同步;
 *   若数据库无数据，则从教务处同步;
 *   若已经同步，则一天内不得再次同步
 *   同步时还会检查学期初是否已经获取
 *
 */
async function syncLessons(forceFromSchool = false){
  await initCheck()

  // 如果本地没有课程，则从云端检查
  let lessons = wx.getStorageSync("lessonsByDay")
  if (!forceFromSchool && (!lessons || lessons === "")){
    const cloud = await checkCloudLesson()
    if (cloud) {
      convertAndStorage(cloud.lessons)
      return ;
    }
  }

  /** 从教务系统获取 */
  const { year, term } = getTerm()
  lessons = await getLessonFromSchool(year, term)
  convertAndStorage(lessons)
  updateCloudLesson(lessons)
}

/**
 * 转换为每日课表，对课程上色并储存到本地
 * @param {array} lessons 全学期课程
 * @param {boolean} skipConvert 是否跳过前面的转换
 */
function convertAndStorage(lessons, skipConvert = false, skipColorize = false) {
  // firstWeekDate 是课表里第一周的星期日
  // 课表的排序是：(日 一 二 三 四 五 六)

  /** 生成每日课表 */
  let lessonsByDay = {}
  if (!skipConvert) {
    lessons.forEach(lesson => {
      const date = lesson['日期']

      if (!Array.isArray(lessonsByDay[date]))
        lessonsByDay[date] = []

      lessonsByDay[date].push(lesson)
    })
  } else {
    lessonsByDay = lessons
  }
  
  /** 合并大节的课 */
  for (const key in lessonsByDay) {
    // 取出一天的课程
    const lessons = lessonsByDay[key]
    // 对一天的课程按照顺序排序
    lessons.sort((a, b) => Number(a['节次'][0]) - Number(b['节次'][0]))

    // 先进行课程冲突标识
    lessons.forEach((now, index, raw) => {
      if (index === 0) {
        raw[index]['冲突'] = false
        return ;
      }
      const pre = raw[index - 1]
      // 因为节次已按顺序排列，只需要判断这节课的开始节次是否相同
      // 节次相同即可视为冲突
      if (pre['节次'][0] === now['节次'][0]) {
        pre['冲突'] = true
        now['冲突'] = true
      } else {
        now['冲突'] = false
      }
    })

    lessons = lessons.filter((e, index, raw) => {
      // 跳过第一节课
      if (index === 0)
        return true
      
      const pre = raw[index - 1]
      const now = e
      if (!pre || !now)
        return false;

      // 如果前后两节课名字一样，而且没有课程冲突，合并
      if (
        (now['课程名称'] === pre['课程名称']) &&
        (!now['冲突'] && !pre['冲突'])
      ) {
        pre['节次'][1] = now['节次'][1]
        return false
      }
      return true
    })

    // 如果是大课，标识它
    lessons.forEach(e => {
      if (Number(e['节次'][1]) - Number(e['节次'][0]) > 1) {
        e['long'] = true
      } else {
        e['long'] = false
      }
    })
    lessonsByDay[key] = lessons
  }

  // 上色
  if (!skipColorize)
    colorizeLesson(lessonsByDay)

  /** 
   * 生成课表映射
   * 1.统计每一节课出现的时间
   * 2.上课起始 / 终止时间
   * 3.老师（可能是一个数组）
   * 4.上课地点（可能是一个数组）
   */
  const lessonMap = {}
  for (const date in lessonsByDay) {
    const lessons = lessonsByDay[date]
    const dayDate = new Date(date)
    lessons.forEach(lesson => {
      const name = lesson['课程名称']
      if (!lessonMap[name]) {
        lessonMap[name] = Object.assign({}, {
          '课程节数': 0,
          '教师姓名': new Array(0),
          '教学地点': new Array(0),
          '排课人数': Number(lesson['排课人数']),
          '上课班级': lesson['上课班级'],
          '卡片颜色': lesson['卡片颜色'],
          '上课时间': new Array(0),
          '上课周次': [9999, -1]
        })
      }

      const e = lessonMap[name]
      const 节次 = Number(lesson['节次'][1])
      const _time = convertIndexToTime(节次, true)[1]
      const time = new Date(dayDate.getTime())
      time.setHours(_time.getHours())
      time.setMinutes(_time.getMinutes())

      e['课程节数']++
      e['上课时间'].push(time)
      e['上课时间'] = e['上课时间'].sort((a, b) => a.getTime() - b.getTime())

      if (e['教师姓名'].indexOf(lesson['教师姓名']) === -1) {
        e['教师姓名'].push(lesson['教师姓名'])
      }

      if (e['教学地点'].indexOf(lesson['教学地点']) === -1) {
        e['教学地点'].push(lesson['教学地点'])
      }
      if (e['上课周次'][0] === null) {
        e['上课周次'][0] = Number(lesson['上课周次'])
      }

      e['上课周次'][0] = Math.min(e['上课周次'][0], Number(lesson['上课周次']))
      e['上课周次'][1] = Math.max(e['上课周次'][1], Number(lesson['上课周次']))

    })
  }
  wx.setStorageSync('lessonsMap', lessonMap)
  
  // 先储存到storage，避免影响
  wx.setStorageSync('lessonsByDay', lessonsByDay)

  /** 生成每周课表 */
  // 初始化一个[22][7][7]的数组，而且里面全部是null
  const lessonsByWeek = new Array(22).fill(null).map(() => {
    return Array.from({ length: 7 }, () => {
      return new Array(7).fill(null)
    })
  })

  for (const date in lessonsByDay) {
    const lessons = lessonsByDay[date]
    lessons.forEach(lesson => {
      const 上课教室编号 = /\w+/.exec(lesson['教学地点'])
      lesson['编号'] = 上课教室编号? 上课教室编号[0]: ""
      lesson['地点'] = lesson['教学地点'].replace(/\w/g, "")

      /** 对于超长的教学楼给省略号 */
      if (lesson['地点'].length > 7) {
        lesson['地点'] = lesson['地点'].substr(0, 6) + "..."
      }

      /** 加入到每日课表 */
      const week = Number(lesson['上课周次'])
      const day = Number(lesson['星期'])
      const 课程开始节次 = Number(lesson['节次'][0]) - 1


      // 如果已经有课了（课程冲突） 没课的时候是null
      if (lesson['冲突'] === true) {
        let t = lessonsByWeek[week - 1][day - 1][课程开始节次 / 2]
        if (!t) {
          lessonsByWeek[week - 1][day - 1][课程开始节次 / 2] = Object.assign({}, lesson)
        } else {
          t['课程名称'] += `&${lesson['课程名称']}`
        }
        t = lessonsByWeek[week - 1][day - 1][课程开始节次 / 2]
        t['lessons'] = t['lessons'] || new Array()
        t['地点'] = '课程冲突'
        t['编号'] = '⚠️'
        t['lessons'].push(lesson)
      } else {
        lessonsByWeek[week - 1][day - 1][课程开始节次 / 2] = lesson
      }
    })
  }

  wx.setStorageSync('lessonsByWeek', lessonsByWeek)
  log.info("课表存储成功");
  wx.setStorageSync('lastSyncTime', new Date())
}

/**
 * 检查数据库是否有课程储存
 */
function checkCloudLesson(){
  const openid = wx.getStorageSync('openid')
  return new Promise((resolve, reject) => {
    db.collection('lessons').where({
      _openid: openid
    }).get({
      success: res => {
        if (res.data.length === 0)
          resolve(null)
        resolve(res.data[0])
      },
      fail: err => reject(err)
    })
  })
}

/**
 * 将课程表上传到云端
 * @param {array} lessons 全学期课程
 */
async function updateCloudLesson(lessons){
  const isBind = await checkCloudLesson()
  /** 如果后端没有课程，则添加课程 */
  if (!isBind) {
    log.info("新增课程")
    return new Promise((resolve, reject) => {
      db.collection('lessons').add({
        data: {
          lessons: lessons
        },
        success: resolve,
        fail: reject
      })
    });
  }

  /** 如果后端已经有课程，则更新课程 */
  log.info("更新课程")
  const { _id: id } = isBind
  return new Promise((resolve, reject) => {
    db.collection('lessons').doc(id).update({
      data: {
        lessons: lessons
      },
      success: resolve,
      fail: reject
    })
  })
}

/**
 * 对课程着色
 * @description 循环使用颜色表内的颜色进行着色
 */
function colorizeLesson(lessons){
  let colors = [
    "#B1C7DC",
    "#B4C2D0",
    "#9FB2B4",
    "#B3B3B3",
    "#C79DD9",
    "#F69EAD",
    "#E8ACCE",
    "#E5C38F",
    "#FFB26E",
    "#4DB67A",
    "#8ACDA7",
    "#70A99E",
    "#9CC1DA",
    "#8CB5D0"
  ]

  let colorMap = { }
  let i = 0
  colors = colors.shuffle()

  for (const key in lessons) {
    lessons[key].forEach(e => {
      i = (i === colors.length)? 0: i
      const id = e['课程编号'] || e['课程名称']
      if (!(id in colorMap)) {
        colorMap[id] = colors[i++]
      }
      e['卡片颜色'] = colorMap[id]
    })
  }

  return lessons
}

/**
 * 重新获取课程
 */
async function resetLesson() {
  wx.showLoading({ title: '登录系统中' })
  // 先拿cookie
  await accountApi.getCookie()

  wx.showLoading({ title: '同步数据中' })
  // 获取课表
  await syncLessons(true)

  wx.hideLoading().catch(() => {})
}

// 与业务关联

/**
 * 删除课程
 * @param {object} lesson lesson对象，包含教师 课程名称 日期 节次等
 * @param {boolean} [wholeLesson=false] 是否删除整个课程
 */
function deleteLesson(lesson, wholeLesson = false) {
  /**
   * 1.删除单节课，找到对应节次的课，删除
   * 2.删除整个课程，找到名字相同，排课人数相同的课程，删除
   * 3.调用convert&storage
   * 4.通知课表组件刷新数据
   */

  const lessonsByDay = wx.getStorageSync('lessonsByDay')
  
  if (!wholeLesson) {
    const date = lesson['日期']
    _deleteByDate(lesson, lessonsByDay, date)
  } else {
    for (const date in lessonsByDay) {
      _deleteByDate(lesson, lessonsByDay, date)
    }
  }

  convertAndStorage(lessonsByDay, true, true)
  eventBus.emit('refreshLesson')

  function _deleteByDate(_lesson, _lessonsByDay, _date) {
    const day = _lessonsByDay[_date]
    if (!Array.isArray(day)) {
      return _lessonsByDay
    }
    const ret = day.filter(e => {
        if (
          (e['课程名称'] === _lesson['课程名称']) &&
          (e['排课人数'] === _lesson['排课人数'])
        ) {
          return false
        } else {
          return true
        }
    })
    _lessonsByDay[_date] = ret
    return _lessonsByDay
  }
}
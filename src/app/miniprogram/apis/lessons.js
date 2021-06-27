module.exports = {
  getWeek,
  getLesson,
  initCookie,
  convertDateToWeek,
  convertWeekToDate,
  convertIndexToTime,
  syncLessons,
  generateDate,
  checkCloudLesson,
  colorizeLesson
};

/**
 * @TODOS
 *   加载课程数据
 *   保存课程数据到storage
 */

const db = wx.cloud.database()
const utils = require("../utils/tools")
const exceptions = require("../utils/exceptions");
const api = require('./account')

const { logger } = getApp().globalData
const log = new logger()
log.setKeyword('apis/lessons.js')

async function initCookie(){
  // // 限制重新登录频率
  // const lastSync = wx.getStorageSync('lastSyncTime')
  // const gap = (new Date().getTime() - lastSync) / 1000
  // if (gap < 60 * 10)
  //   return ;

  // 新逻辑为有cookie就不重新获取
  if (wx.getStorageSync('cookie') !== ''){
    return ;
  }

  let counter = 10
  while (true){
    if (counter-- === 0){
      utils.showModal({
        title: "同步时出错",
        content: "暂时无法同步您的数据，数据将在下一次打开时更新"
      })
      return ;
    }
    let ret = null
    try{
      ret = await api.getCookie()
    } catch (e){
      log.info(e.message)
      if (e.message === '无法连接教务处'){
        
      }
      switch (e.message){
        case '无法连接教务处':
          utils.showModal({
            title: "同步时出错",
            content: "[debug] 教务系统繁忙, 下次打开时开始同步数据"
          })
          throw new Error()
        case '密码错误':
          await utils.showModal({
            title: "同步时出错",
            content: "登录教务系统时密码错误，如果您更改了密码，请点击确定重新绑定"
          })
    
          wx.navigateTo({
            url: '../pages/login/login',
          })
          return ;
      }
    }
    if (ret)
      break ;

    // 如果登录不成功，那就三秒后重试
    await utils.sleep(3000)
  }
}

/**
 * 获取某一周的课程
 * @param {周次} week 
 * 
 * @returns 课程数组
 */
async function getWeek(week){ 
  const keyMap = {
    kcbh: '课程编号',
    kcmc: '课程名称',
    teaxms: '教师姓名',
    jxbmc: '上课班级',
    zc: '上课周次',
    jcdm2: ['节次', str => {
      str = str.trim().split(',')
      if(str.length < 2){
        return null;
      }
      let arr = [0, 0];
      arr[0] = str[0];
      arr[1] = str[str.length - 1];
      return arr;
    }],
    xq: '星期',
    jxcdmc: '教学地点',
    pkrs: '排课人数',
    kxh: '课序号',
    jxhjmc: '讲课',
    sknrjj: ['上课内容', str => utils.decodeHTML(str)]
  };
  const ret = await utils.request({
    url: "https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=202002&zc=" + week
  })
  let arr = utils.keyMapConvert(ret.data[0], keyMap)

  const firstDay = convertWeekToDate(week)
  return arr.map(e => {
    // 星期从星期一开始，所以不要算
    const index = e['星期'] * 1 - 1
    e['日期'] = firstDay.nDaysLater(index).format("YYYY-mm-dd")
    // console.log("firstDay", firstDay, "now", e['日期']);

    // 做班级排序
    const lesson = e['上课班级'].split(',').sort((a, b) => {
      return a - b
    })
    e['上课班级'] = lesson

    return e
  })

}

/**
 * 获取课程
 * @param {周次} week 
 * 
 * @description
 *   如果传入参数，则获取某一周的课程，
 *   否则将获取所有的课程
 * 
 * @returns 课程数组
 */
async function getLesson(week = null){
  // 一个学期22周
  let lessons = new Array(22)
  if (week){
    return await getWeek(week)
  }
  let counter = 0;
  for (let i = 1; i <= 22; i++) {
    getWeek(i)
    .then(ret => { lessons[i - 1] = ret; counter++; })
    .catch(err => {
      log.info("err,", err)
      throw new Error(err)
    })
    await utils.sleep(100)
  }

  while(counter !== 22){
    await utils.sleep(200)
  }
  return lessons
}

function convertDateToWeek(nowDate, convertToChinese = false){
  const chineseNumber = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "二十一", "二十二", "二十三", "二十四", "二十五"]
  let from = wx.getStorageSync('firstWeekDate')

  const week = Math.floor((nowDate.nDaysAgo(1).getTime() - from) / (1000 * 60 * 60 * 24 * 7)) + 1
  if (convertToChinese){
    return chineseNumber[week - 1]
  }
  return week
}

function convertWeekToDate(week){
  const from = wx.getStorageSync('firstWeekDate')
  if (!from || from === "")
    throw new Error("学期初未指定")

  return new Date(from).nDaysLater((week - 1) * 7 + 1)
}

/**
 * 根据节数获取上/下课时间
 * @param {*} index 节数索引，从1开始，不得大于14
 * @param {*} endTime 是否获取本节课的结束时间，默认为否
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

  const hour = ~~timeMap[index].split(":")[0]
  const min  = ~~timeMap[index].split(":")[1]

  let t = new Date()
  t.setHours(hour)
  t.setMinutes(min)

  if (!endTime)
    return [timeMap[index], t]
    
  t = new Date(t.getTime() + 45 * 60 * 1000)

  return [`${t.getHours().prefixZero(2)}:${t.getMinutes().prefixZero(2)}`, t]
}

function generateDate(){
  let lessons = wx.getStorageSync('lessons')
  let lessonsByDay = {}
  lessons.forEach(week => {
    week.forEach(e => {
      const date = e['日期']
      if (!(date in lessonsByDay))
        lessonsByDay[date] = []

      lessonsByDay[date].push(e)
    })
  })

  wx.setStorageSync('lessonsByDay', lessonsByDay)
}

/**
 * 同步课表
 * @param {是否强制更新} ignoreLimit 
 * 
 * @description
 *   从教务处同步课表，如果课表不存在，从数据库同步; 
 *   若数据库无数据，则从教务处同步;
 *   若已经同步，则一天内不得再次同步
 *   同步时还会检查学期初是否已经获取
 * 
 */
async function syncLessons(ignoreLimit = false){
  // 储存课表，并转换为每日的格式
  function convertAndSync(obj){
    // 这里还有一个将周课表转换为每日课表的操作
    // firstWeekDate 是课表里第一周的星期日
    // 课表的排序是：(日 一 二 三 四 五 六)

    let lessonsByDay = {}
    obj.forEach(week => {
      week.forEach(e => {
        const date = e['日期']
        if (!(date in lessonsByDay))
          lessonsByDay[date] = []

        lessonsByDay[date].push(e)
      })
    })

    wx.setStorageSync('lessonsByDay', lessonsByDay)
    wx.setStorageSync('lessons', obj)

    // 上色
    colorizeLesson()
    log.info("课表存储成功");
    wx.setStorageSync('lastSyncTime', new Date().getTime())
  }

  // 初始化学期初
  let from = wx.getStorageSync('firstWeekDate')
  log.info("检查学期初", from)

  if (!from || from === ""){
    log.info("新的学期初")
    const ret = await utils.request({
      url: "https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=202002&zc=1"
    })
    log.info("学期初返回", ret.data)
    let date = ""
    try{
      date = ret.data[1][0]['rq']
    } catch(e) {
      throw new Error("教务处出错")
    }
    from = utils.strToDate(date)
    from = from.getTime()
    log.info("storage", from, date, utils.strToDate(date))
    wx.setStorageSync('firstWeekDate', from)
  }

  // 如果本地没有课程，先看看云端有没有
  let lessons = wx.getStorageSync("lessons")
  if (!ignoreLimit && (!lessons || lessons === "")){
    const cloud = await checkCloudLesson()
    // log.info(cloud);
    if (cloud){
      // 直接用云端
      convertAndSync(cloud.lessons)
      return ;
    }
  }

  // 限制频率
  const lastSync = wx.getStorageSync('lastSyncTime')
  const gap = (new Date().getTime() - lastSync) / 1000
  const limit = 3600 * 24 // 1 day
  if (gap < limit && !ignoreLimit)
    return ;

  lessons = []
  try{
    lessons = await getLesson()
  } catch(e) {
    log.info("error occurred when sync lessons", e.message)
    return ;
  }

  convertAndSync(lessons)
  updateCloudLesson(lessons)
}

/**
 * 检查数据库，看微信账号是否有课程储存
 * @description
 *   如果已经绑定，则返回对象，包含账号密码
 *   如果没有绑定，则返回null
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

async function updateCloudLesson(obj){
  const isBind = await checkCloudLesson()

  // 如果没有记录，则新增
  if (!isBind){
    log.info("新增记录_课程")
    return new Promise((resolve, reject) => {
      db.collection('lessons').add({
        data: {
          lessons: obj
        },
        success: res => resolve(res),
        fail: err => reject(err)
      })
    });
  }
  // 如果已经有记录，则更新
  log.info("更新记录_课程")
  const { _id: id } = isBind
  return new Promise((resolve, reject) => {
    db.collection('lessons').doc(id).update({
      data: {
        lessons: obj
      },
      success(){
        resolve()
      },
      fail(){
        reject()
      }
    })
  })
}

/**
 * 对课程着色
 * 如果所有颜色都用完，那么就重新用
 */
function colorizeLesson(){
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
  let colorMap = {

  }
  let i = 0
  colors = colors.shuffle()
  let lessons = wx.getStorageSync('lessons')
  lessons = lessons.map(week => 
    week.map(e => {
      if (i >= colors.length){
        i = 0
      }
      const id = e['课程编号']
      if (!(id in colorMap)){
        colorMap[id] = colors[i++]
      }
      e['卡片颜色'] = colorMap[id]
      return e
    })
  )
  wx.setStorageSync('lessons', lessons)
}
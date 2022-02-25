// miniprogram/pages/lessons-overview/lessons-overview.js

// eventBus in @/static/eventBus.js

const api = require('../../apis/lessons')
const accountApi = require('../../apis/account')

const { utils, exceptions, logger } = getApp().globalData

const app = getApp();
const eventBus = app.globalData.eventBus;
const log = new logger()

/**
 * @TODOS
 *   静默更新数据（定时器）
 *   课程数据加载
 *   课程数据保存到storage
 */
Component({
  properties: {

  },
  options: {
    addGlobalClass: true
  },
  data: {
    nowSelected: 0,
    lessons: null,
    dates: [],
    dayToChinese: ["日", "一", "二", "三", "四", "五", "六"],
    timer: null,
    nowWeek: "",
    termStarted: true
  },

  // 页面开始加载
  async created(){
    log.setKeyword('Page:lessons-overview')
    const nowWeek = await api.convertDateToWeek(new Date(), true)
    this.setData({
      nowDate: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate()
      },
      nowWeek
    })

    // 首先获取当前日期，加载近五天的课程。
    /**
     * 如果还没开学(当前日期小于学期第一天) 显示未开学
     * 如果开学了 -> 确定基数日期(最左边的那一天)
     * 基数日期:课表第一天 / 今天的两天前 取最大值
     */
    // 学期第一天的日期
    const today = new Date()
    const firstDateForTerm = wx.getStorageSync('firstWeekDate')
    // 还没开学呢
    if (today.getTime() < firstDateForTerm) {
      this.setData({ termStarted: false })
    } else {
      this.setData({ newSelected: 2 })
    }
    
    // 基数日
    const ret = []
    const baseDate = new Date(Math.max(firstDateForTerm, today.nDaysAgo(2).getTime()))
    for (let i = 0; i < 5; i++) {
      const d = baseDate.nDaysLater(i)
      ret.push({
        month: d.getMonth(),
        date: d.getDate(),
        day: d.getDay(),
        week: 18,
        time: d.getTime()
      })
    }

    this.setData({
      dates: ret
    });
  },

  // 页面卸载
  detached(){
    // 取消定时刷新
    clearInterval(this.data.timer)
  },

  // 页面初次加载完毕
  async ready(){
    const x = this.data.dates.map((date, index) => {
      const formatDate = new Date(date.time).format('YYYY-mm-dd')
      let lessons = wx.getStorageSync('lessonsByDay')[formatDate]
      if (!lessons)
        lessons = []


      lessons = lessons.map(e => {
        e['keyid'] = Math.random()
        if (!(e['上课班级'] instanceof Array)){
          // 避免课程混乱
          e['上课班级'] = e['上课班级'].split(',')
        }
        e['节次'] = e['节次'].map(d => Math.floor(d)) 
        return e
      })

      lessons.sort((a, b) => {
        return a['节次'][0] - b['节次'][0]
      })
      
      return { ...date, lessons, index }
    })

    this.setData({
      dates: x,
      lessons: x[0].lessons
    })

    return ;
    // 获得凭据
    log.info(await accountApi.checkCookie())
    // 同步课表
    await api.syncLessons()
    log.info(api.convertWeekToDate(10));
    log.info("当前周：", nowWeek)
    log.info("本周课程:", wx.getStorageSync('lessons')[nowWeek - 1])
  },
  pageLifetimes:{
    // 页面显示
    show: function () {
      if (this.data.timer){
        clearInterval(this.data.timer)
      }
  
      // 每五秒刷新一次状态
      const handler = setInterval(function(){
        eventBus.emit("show");
      }, 5000)
  
      this.setData({
        timer: handler
      })
      eventBus.emit("show");
    },
  },

  methods: {
    // 日期选择器点击
    handleTap(e){
      const date = e.currentTarget.dataset.date
      if (this.data.nowSelected === date.index)
        return;
      
      this.setData({
        nowSelected: date.index,
        lessons: date.lessons.concat([])
      })

      eventBus.emit("allClose")
    },
  }
})
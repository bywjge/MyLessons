import lessonApi from '../../apis/lessons'
const { navBarHeight } = getApp().globalData

Component({
  options: {
    addGlobalClass: true
  },

  /**
   * 页面的初始数据
   */
  data: {
    days: [
      { date: 17, week: "周一" },
      { date: 17, week: "周二" },
      { date: 17, week: "周三" },
      { date: 17, week: "周四" },
      { date: 17, week: "周五" },
      { date: 17, week: "周六" },
      { date: 17, week: "周日" },
    ],

    indexer: [
    ],

    showDetail: false,

    pickerArray: [],

    nowIndex: null,

    selectWeek: 11,
    scrollTop: 0,
    navBarHeight,

    timer: null,

    lessons: [],

    nowDate: "",
    nowMonth: new Date().getMonth() + 1,

    currentPage: 0,
    detailLesson: {},
    activeDay: -1
  },
  async ready() {
    let indexer = [];
    [1, 3, 5, 7, 9, 11, 13].forEach(i => {
      let item = {
        from: [i.prefixZero(2), lessonApi.convertIndexToTime(i)[0]],
        to: [(i + 1).prefixZero(2), lessonApi.convertIndexToTime(i + 1, true)[0]]
      }
      indexer.push(item)
    })
    const week = lessonApi.convertDateToWeek(new Date())
    // 初始化周次选择器数组
    const pickerArray = Array.from({ length: 22 }, (e, i) => {
      if (i === week - 1)
        return `(当前周) ${i + 1} 周`
      return `${i + 1} 周`
    })
    this.getLesson()
    this.setData({
      indexer,
      pickerArray,
      selectWeek: week
    })

    this.refreshStatus()
    this.selectWeek(week - 1)
  },

  pageLifetimes: {
    show() {
      if (this.data.timer){
        clearInterval(this.data.timer)
      }
  
      // 每五秒刷新一次状态
      const handler = setInterval(this.refreshStatus.bind(this), 5000)
      this.setData({
        timer: handler
      })
    }
  },
  

  methods: {
    refreshIndexer(){
      const index = [1, 3, 5, 7, 9, 11, 13]
      const now = new Date()
      let nowIndex = index.find(e => {
        const t1 = lessonApi.convertIndexToTime(e)[1]
        const t2 = lessonApi.convertIndexToTime(e + 1, true)[1]
        return (t1 <= now && t2 >= now)
      })

      if (typeof nowIndex === 'undefined'){
        nowIndex = -1
      }

      this.setData({
        nowIndex
      })
    },

    // 刷新各种状态（indexer和卡片）
    refreshStatus(){
      this.refreshIndexer()
      const date = new Date().format("YYYY-mm-dd")
      this.setData({
        nowDate: date
      })
    },

    selectWeek(e){
      const index = (typeof e === 'number')? e: Math.floor(e.detail.value)
      const month = lessonApi.convertWeekToDate(index + 1).getMonth() + 1
      const firstDayInWeek = lessonApi.convertWeekToDate(index + 1)
  
      let active = -1
      /** 初始化上方的日期条，如果日期是当天，就加上标识 */
      const calendar = this.data.days.map((e, i) => {
        const d = firstDayInWeek.nDaysLater(i)
        e.date = d.getDate()
        if (d.equals(new Date())) {
          e.status = 'selected'
          active = i
        } else {
          e.status = 'normal'
        }
        return e
      })

      // this.getLesson(index + 1)
  
      // 获取完之后回到顶部
      this.setData({
        scrollTop: 0,
        nowMonth: month,
        selectWeek: index + 1,
        currentPage: index,
        days: calendar,
        activeDay: active
      })
    },

    getLesson(week = 1) {
      const lessons = wx.getStorageSync('lessonsByWeek')/* [week - 1] || [] */
      this.setData({
        lessons
      })
    },

    handlePageChange({ detail }) {
      if (detail.source !== "touch")
        return ;

      this.selectWeek(detail.current)
    },

    handleTapMask(e) {
      if (this.data.showDetail)
        this.setData({ showDetail: false })
    },

    handleLessonTap({ detail }) {
      const name = detail['课程名称']
      const lesson = wx.getStorageSync('lessonsMap')[name]
      lesson['课程名称'] = name
      lesson['上课周次'] = lesson['上课周次'].join('-')
      lesson['教学地点'] = lesson['教学地点'].join('、')

      const now = new Date()
      const 已经上过的课程节数 = lesson['上课时间']
        .map(e => new Date(e))
        .findIndex(e => e > now)
      lesson['课程进度'] = 100
      lesson['已上节数'] = 已经上过的课程节数
      // 还没上完课
      if (已经上过的课程节数 !== -1) {
        lesson['课程进度'] = Math.round(已经上过的课程节数 / lesson['课程节数'] * 100)
      }

      this.setData({ 
        showDetail: true,
        detailLesson: lesson
      })
      console.log(name, lesson, lesson['上课周次'])
    }
  }
})
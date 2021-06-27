const lessons = require('../../apis/lessons')
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

    pickerArray: [],

    nowIndex: null,

    selectWeek: 11,
    scrollTop: 0,
    navBarHeight,

    timer: null,

    lessons: [],

    nowDate: "",
    nowMonth: "6"
  },
  /**
   * 生命周期函数--监听页面加载完成
   */
  async ready() {
    let indexer = [];
    [1, 3, 5, 7, 9, 11, 13].forEach(i => {
      let item = {
        from: [i.prefixZero(2), lessons.convertIndexToTime(i)[0]],
        to: [(i + 1).prefixZero(2), lessons.convertIndexToTime(i + 1, true)[0]]
      }
      indexer.push(item)
    })
    const week = lessons.convertDateToWeek(new Date())
    console.log("now week", week);
    // 初始化周次选择器数组
    const pickerArray = Array.from({ length: 22 }, (e, i) => {
      if (i === week - 1)
        return `(当前周) ${i + 1} 周`
      return `${i + 1} 周`
    })
    this.setData({
      indexer,
      pickerArray,
      selectWeek: week
    })
    // lessons.colorizeLesson()
    this.refreshStatus()
    this.getLesson()
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
        const t1 = lessons.convertIndexToTime(e)[1]
        const t2 = lessons.convertIndexToTime(e + 1, true)[1]
        return (t1 <= now && t2 >= now)
      })

      if (typeof nowIndex === 'undefined'){
        nowIndex = null
      }
      this.setData({
        nowIndex
      })
    },

    // 刷新各种状态（indexer和卡片）
    refreshStatus(){
      this.refreshIndexer()

      console.log(this.data.lessons, this.data.nowIndex, this.data.nowDate);
      const date = new Date().format("YYYY-mm-dd")
      const month = new Date().format("m")
      this.setData({
        nowDate: date,
        nowMonth: month
      })
    },

    selectWeek(e){
      const index = Math.floor(e.detail.value)
      this.setData({
        selectWeek: index + 1
      })
      this.getLesson()
  
      // 获取完之后回到顶部
      this.setData({
        scrollTop: 0
      })
    },

    getLesson(){
      // const today = new Date().getDay()
      const firstDayInWeek = lessons.convertWeekToDate(this.data.selectWeek)
      // console.log(firstDayInWeek);
  
      // 初始化上方的日期条
      const days = this.data.days.map((e, i) => {
        const d = firstDayInWeek.nDaysLater(i)
        e.date = d.getDate()
        // console.log(d, new Date(),d.equals(new Date()));
        e.status = (d.equals(new Date()))?'selected':'normal'
        return e
      })

      const lesson = wx.getStorageSync('lessons')[this.data.selectWeek - 1]
      let lessonSort = Array.from({ length: 7 }, () => {
        return new Array(7).fill(null)
      })
      lesson.forEach(e => {
        const w = (e['星期'] * 1) - 1
        const i = (e['节次'][0] * 1) - 1

        // console.log(e);
        const num = /\w+/.exec(e['教学地点'])

        e['编号'] = num? num[0]: ""
        e['地点'] = e['教学地点'].replace(/\w/g,"")
        if (e['地点'].length > 7){
          e['地点'] = e['地点'].substr(0, 6) + "..."
        }
        lessonSort[w][i / 2] = e
      })
  
      // 修复课程不能跨节的bug
      lessonSort = lessonSort.map(dailyLesson => {
        let newDaily = []
        // 遍历每日的课程，如果这一节课的与上一节课的事件重叠，那就不处理
        // 否则把元素放到新数组
        // 再用新数组替换旧数组
        for (let dailyIndex = 0; dailyIndex < dailyLesson.length; dailyIndex++) {
          if (dailyIndex === 0 || !dailyLesson[dailyIndex - 1]){
            newDaily.push(dailyLesson[dailyIndex])
            continue ;
          }
          const nowIndex = dailyIndex * 2 + 1
          const [from, to] = dailyLesson[dailyIndex - 1]['节次']
          if (~~from <= nowIndex && ~~nowIndex <= to){
            continue ;
          }
          newDaily.push(dailyLesson[dailyIndex])
        }

        return newDaily;
      })

      this.setData({
        days,
        lessons: lessonSort,
      })
    },
  }
})
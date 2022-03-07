import lessons from '../../apis/lessons';
import lessonApi from '../../apis/lessons'
import tools from '../../utils/tools';
import { bindTheme, unbindTheme } from '../../utils/theme'
const { navBarHeight, eventBus } = getApp().globalData

// 长按课程时弹出的菜单项目
const editItems = [
  '编辑课程',
  '删除这节课程',
  '删除整门课程'
]

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
    currentDetail: {},
    detailLessons: [],
    detailIndex: 0,
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

    // 添加/删除课程后会调用，重新获取数据
    eventBus.on('refreshLesson', this.getLesson.bind(this))
  },
  attached() {
    // data中自动添加一个theme
    bindTheme(this)
  },
  detached() {
    unbindTheme()
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

    getLesson() {
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

    convertLessonInDetail(e) {
      const lesson = wx.getStorageSync('lessonsMap')[e['课程名称']]
      lesson['课程名称'] = e['课程名称']
      // lesson['课程名称'] = name
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

      return lesson
    },

    handleLessonTap({ detail }) {
      console.log(detail)
      // 判断是否是冲突
      let lesson = []
      if (detail['冲突'] === true) {
        lesson = detail['lessons'].map(e => this.convertLessonInDetail(e))
      } else {
        lesson = [this.convertLessonInDetail(detail)]
      }

      this.setData({ 
        showDetail: true,
        currentDetail: lesson[0],
        detailLessons: lesson
      })
    },

    // 处理课程添加
    handleLessonAdd({ detail }) {
      const { day, index } = detail
    },

    // 处理课程编辑
    async handleLessonEdit({ detail: lesson }) {
      if (lesson['冲突'] === true) {
        try {
          await wx.showActionSheet({
            alertText: '选择需要的课程',
            itemList: lesson.lessons.map(e => e['课程名称'])
          })
          .then(({ tapIndex: index }) => {
            lesson = lesson.lessons[index]
          })
        } catch { return ; }
      }

      wx.showActionSheet({
        alertText: '希望对课程进行什么操作呢',
        itemList: editItems
      })
      .then(({ tapIndex: index }) => {
        const item = editItems[index]
        if (item === '编辑课程') {
          tools.showModal({
            title: '提示',
            content: '功能正在开发中～'
          })
          return ;
        }

        tools.showModal({
          title: '确认操作',
          content: `即将删除《${lesson['课程名称']}》在${index === 1?'当前位置': '整个学期中'}的课程，操作不会被同步到云端，确认继续吗？`,
          showCancel: true,
          confirmText: "继续",
          cancelText: "取消"
        })
        .then(() => {
          lessons.deleteLesson(lesson, item === '删除整门课程')
          wx.showToast({
            title: '删除成功'
          })
        })
        .catch(() => {})
      })
      .catch(() => {})
    },

    // (课程冲突时)切换上一个卡片
    handlePrevLesson() {
      if (this.data.detailIndex === 0)
        return ;
        
      this.setData({
        currentDetail: this.data.detailLessons[this.data.detailIndex - 1],
        detailIndex: this.data.detailIndex - 1
      })
    },

    // (课程冲突时)切换下一个卡片
    handleNextLesson() {
      if (this.data.detailIndex === this.data.detailLessons.length - 1)
        return ;
        
      this.setData({
        currentDetail: this.data.detailLessons[this.data.detailIndex + 1],
        detailIndex: this.data.detailIndex + 1
      })
    }
  }
})
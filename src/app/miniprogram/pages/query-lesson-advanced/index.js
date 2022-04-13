import tools from '../../utils/tools'
import moreApi from '../../apis/more'
import { getLessonInfo } from '../../apis/wyu'
let durationTime = 0

const collegeList = {
  "全部": "",
  "土木建筑学院": "00011",
  "外国语学院": "00005",
  "应用物理与材料学院": "00007",
  "政法学院": "00003",
  "文学院": "00004",
  "智能制造学部": "105230934",
  "生物科技与大健康学院": "00012",
  "纺织材料与工程学院": "00013",
  "经济管理学院": "00002",
  "继续教育学院": "00035",
  "美育教育中心": "107412358",
  "艺术设计学院": "00014",
  "轨道交通学院": "00018",
  "通识教育学院": "105230931",
  "马克思主义学院": "00015",
}

Page({
  data: {
    showElement: 'main',
    visibleElement: '',
    collegeList: [{
      name: '张三',
      college: '智能制造学部'
    }],
    teacher: '',
    lessonQueryName: '',
    // 禁用的按钮
    disableButton: {
      done: false,
      undone: false
    },
    doneList: [],
    undoneList: [],
    empty: true,
    collegeIndex: 0,
    collegeList: Object.keys(collegeList),
    lessonList: [],
    endDate: new Date().nDaysLater(365).format('YYYY-mm-dd'),
    date: null
  },

  onload() {
    if (wx.getStorageSync('disableAnimation'))
      durationTime = 0
  },

  async onReady() {
    await tools.sleep(durationTime)
    this.setData({
      visibleElement: 'main'
    })
  },

  handleNameInput(e){
    this.setData({
      lessonQueryName: e.detail.value.trim()
    })
  },

  /** 下一步 */
  async handleNextStep() {
    // 一定要指定两个条件以上才能开始查询
    if (
      this.data.lessonQueryName === '' && 
      (this.data.date === null || this.data.collegeIndex === 0)
    ) {
      tools.showModal({
        title: '条件过少...',
        content: '必须指定两个及以上的条件才能开始查询哦～不然结果会太多'
      })
      return ;
    }

    const collegeId = collegeList[this.data.collegeList[this.data.collegeIndex]]

    // 1.如果指定了课程名称，则优先选择getLessonInfo查询课程，并提供课程选择页面选择，最后getAllLessonsFromSchool查询结果
    // 2.如果没有指定，则不需要选择课程，直接getAllLessonsFromSchool显示结果
    /** 查询教师列表 */
    let list = []
    if (this.data.lessonQueryName === '') {
      this.showLesson(collegeId, undefined, this.data.date || '')
      return ;
    }

    wx.showLoading({ title: '查询数据中' })
    try {
      list = await getLessonInfo(collegeId, this.data.lessonQueryName)
    } catch(e) {
      console.log(e)
      tools.showModal({
        title: '找不到课程',
        content: '找不到相关课程，请重新输入哦',
        showCancel: false
      })
      return ;
    } finally {
      wx.hideLoading().catch(() => {})
    }

    /** 如果只有一个课程符合，则直接使用该id */
    if (list.length === 1) {
      const item = list[0]
      this.showLesson(undefined, item['id'])
      return ;
    }

    this.setData({
      lessonList: list
    })
    this.switchToContainer('select')
  },

  async backPrevStep() {
    this.switchToContainer('main')
  },
  
  async switchToContainer(name) {
    this.setData({
      visibleElement: ''
    })
    await tools.sleep(durationTime)
    this.setData({
      showElement: name
    }, function() {
      this.setData({
        visibleElement: name
      })
    })
  },

  /** 在课程列表中选择课程*/
  async handleSelectTeacher({ currentTarget }) {
    const { dataset: { item } } = currentTarget
    this.showLesson(collegeList[item['学院']], item['id'], this.data.date || '')
  },

  async showLesson(collegeId = '', lessonId = '', date = '') {
    wx.showLoading({ title: '查询课程中' })
    const lessons = await moreApi.getAllLessonsFromSchool({
      date,
      collegeId,
      lessonId,
      isIgnoreBuildingCheck: true
    })
    wx.hideLoading().catch(() => {})
    console.log(lessons)
    if (lessons.length === 0) {
      tools.showModal({
        title: '无课程',
        content: '(所选择的日期)没有开课数据哦～'
      })
      return ;
    }

    const doneList = []
    const undoneList = []
    const now = new Date()
    lessons.forEach(lesson => {
      lesson['格式化时间'] = `${lesson['上课时间'].format('YYYY/mm/dd HH:MM')}-${lesson['下课时间'].format('HH:MM')}` 
      if (lesson['下课时间'] > now) {
        undoneList.push(lesson)
      } else {
        doneList.push(lesson)
      }
    })

    // 如果没数据则默认禁用
    if (doneList.length === 0) {
      this.setData({ 'disableButton.done': true })
    } else {
      this.setData({ 'disableButton.done': false })
    }

    if (undoneList.length === 0) {
      this.setData({ 'disableButton.undone': true })
    } else {
      this.setData({ 'disableButton.undone': false })
    }

    this.setData({
      doneList,
      undoneList,
      empty: lessons.length === 0
    })

    this.switchToContainer('result')
  },

  switchVisible({ currentTarget }) {
    const { dataset } = currentTarget
    const key = dataset.name
    
    this.setData({
      [`disableButton.${key}`]: !this.data.disableButton[key]
    })
  },

  bindCollegeChange(e) {
    this.setData({
      collegeIndex: e.detail.value
    })
  },


  bindDateChange(e) {
    console.log('picker发送选择改变，携带值为', e.detail.value)
    this.setData({
      date: e.detail.value
    })
  },

  clearDate() {
    if (this.data.date === null)
      return ;

    wx.showModal({
      title: '日期选择',
      content: '是否要清除上课日期条件？'
    }).then(({ confirm }) => {
      if (confirm)
        this.setData({ date: null })
    }).catch(() => {})
  }
})
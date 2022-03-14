import lessonApi from '../../apis/lessons'
import tools from '../../utils/tools'
import { bindTheme, unbindTheme } from '../../utils/theme'

Page({
  data: {
    doneList: [],
    undoneList: [],
    empty: true,
    // 禁用的按钮
    disableButton: {
      done: false,
      undone: false
    },
    pickerArray: [],
    selectedTerm: 0,
    isTeacher: false
  },

  async onLoad() {
    this.setData({
      isTeacher: wx.getStorageSync('usertype') === 'teacher'
    })
    // data中自动添加一个theme
    bindTheme(this)
    this.generateTermList()
    let exams = wx.getStorageSync('exams')
    if (!exams || exams === "") {
      wx.showLoading({
        title: '同步数据中',
      })
      await lessonApi.getExamFromSchool()
      wx.hideLoading()
    }

    this.selectTerm(this.data.selectedTerm)
  },
  onUnload() {
    unbindTheme()
  },

  // 生成课表选择器
  generateTermList() {
    // 老师没有入学年份，最早从2014年开始看
    const from = Number(wx.getStorageSync('profile')['入学年份']) || 2014
    const { year, term } = lessonApi.getTerm()
    const to = year
    const ret = []
    let counter = 0
    for (let i = from; i <= to; i++) {
      for (let j = 1; j <= 2; j++) {
        counter++;
        if (i === year && j === term) {
          ret.push({
            text: `本学期`,
            value: `${i}0${j}`
          })
          break ;
        } else {
          ret.push({
            text: `${i}${j === 1? '上': '下'}学期`,
            value: `${i}0${j}`
          })
        }
      }
    }
    
    this.setData({
      pickerArray: ret,
      selectedTerm: counter - 1
    })
  },

  switchVisible({ currentTarget }) {
    const { dataset } = currentTarget
    const key = dataset.name
    
    this.setData({
      [`disableButton.${key}`]: !this.data.disableButton[key]
    })
  },

  // 选择学期
  selectTerm(e) {
    const index = (typeof e === 'number')? e: Math.floor(e.detail.value)
    this.setData({
      selectedTerm: index
    })

    const termId = this.data.pickerArray[index].value
    let exams = wx.getStorageSync('exams')[termId]
    if (!exams || exams === '') {
      this.setData({
        doneList: [],
        undoneList: [],
        disableButton: {
          done: true,
          undone: true
        },
        empty: true
      })
      return ;
    }

    const doneList = []
    const undoneList = []
    const now = new Date()

    for (const key in exams) {
      const element = exams[key];
      if (!element || typeof element !== 'object')
        continue ;
      
      // 计算天数差
      const endTime = new Date(element['结束时间'])
      const startTime = new Date(element['开始时间'])
      const day = tools.getDaysGap(now, endTime)
      element['剩余天数'] = day + '天'

      // 如果考试已经结束
      if (endTime < now) {
        element['剩余天数'] = '完成'
        doneList.push(element)
      } else {
        // 如果考试已经开始
        if (startTime > now)
          element['剩余天数'] = '进行中'
        undoneList.push(element)
      }
    }

    // 如果没数据则默认禁用
    if (undoneList.length === 0) {
      this.setData({ 'disableButton.undone': true })
    } else {
      this.setData({ 'disableButton.undone': false })
    }

    if (doneList.length === 0) {
      this.setData({ 'disableButton.done': true })
    } else {
      this.setData({ 'disableButton.done': false })
    }

    this.setData({
      undoneList,
      doneList,
      empty: false
    })
  },

  async reload() {
    wx.showLoading({
      title: '同步数据中',
    })

    await lessonApi.getExamFromSchool()
    wx.hideLoading()
    this.selectTerm(this.data.selectedTerm)
  }
})
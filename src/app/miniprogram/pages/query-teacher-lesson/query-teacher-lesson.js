import tools from "../../utils/tools"
import moreApi from '../../apis/more'
import { getTeacherInfo } from '../../apis/wyu'
let durationTime = 0

Page({
  data: {
    showElement: 'main',
    visibleElement: '',
    teacherList: [{
      name: '张三',
      college: '智能制造学部'
    }],
    teacher: '',
    teacherQueryName: '',
    // 禁用的按钮
    disableButton: {
      done: false,
      undone: false
    },
    doneList: [],
    undoneList: [],
    empty: true,
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

  /** 老师姓名输入 */
  handleNameInput(e){
    this.setData({
      teacherQueryName: e.detail.value.trim()
    })
  },

  /** 下一步 */
  async handleNextStep() {
    if (this.data.teacherQueryName === '') {
      tools.showModal({
        title: '查询条件不完整',
        content: '要输入名字哦，如果想不起全名，可以输入其中的一部分～'
      })
      return ;
    }
    wx.showLoading({ title: '查询数据中' })
    /** 查询教师列表 */
    let list = null
    try {
      list = await getTeacherInfo(this.data.teacherQueryName)
    } catch {
      tools.showModal({
        title: '找不到老师',
        content: '找不到这个老师，请重新输入哦',
        showCancel: false
      })
      return ;
    } finally {
      wx.hideLoading().catch(() => {})
    }

    /** 如果只有一个老师，则直接转到结果页面 */
    if (list.length === 1 && list[0]['姓名'] === this.data.teacherQueryName) {
      const item = list[0]
      const collegeId = moreApi.collegeId[item['学院']]
      this.showLesson(item['姓名'], collegeId)
      // this.switchToContainer('result')
      return ;
    }

    this.setData({
      teacherList: list
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

  /** 在教师列表中选择教师 */
  async handleSelectTeacher({ currentTarget }) {
    const { dataset: { item } } = currentTarget
    const collegeId = moreApi.collegeId[item['学院']]

    this.showLesson(item['姓名'], collegeId)
  },

  async showLesson(name, collegeId) {
    wx.showLoading({ title: '查询课程中' })
    const lessons = await moreApi.getAllLessonsFromSchool({
      teacherName: name,
      // collegeId,
      isIgnoreBuildingCheck: true
    })
    wx.hideLoading().catch(() => {})

    if (lessons.length === 0) {
      tools.showModal({
        title: '无课程',
        content: '所查询的老师没有开课数据哦～'
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
      teacher: name,
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
  }
})
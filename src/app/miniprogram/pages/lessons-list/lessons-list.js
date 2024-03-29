import { bindTheme, unbindTheme } from '../../utils/theme'
import tools from '../../utils/tools'

Page({
  data: {
    doneList: [],
    undoneList: [],
    // 禁用的按钮
    disableButton: {
      done: false,
      undone: false
    }
  },
  onLoad() {
    // data中自动添加一个theme
    bindTheme(this)
    this.checkBind()
    const lesson = wx.getStorageSync('lessonsMap')
    if (!lesson) {
      tools.showModal({
        title: '错误',
        content: '数据损坏，请到"我的"页面中重新获取课表'
      }).then(() => {
        wx.navigateBack({ delta: 1 })
      }).catch(() => {})
      return ;
    }
    const doneList = []
    const undoneList = []
    const now = new Date()
    for (const key in lesson) {
      const element = lesson[key];
      if (!element || !element['上课时间']) continue ;
      let 已上节数 = element['上课时间']
        .map(e => new Date(e))
        .findIndex(e => e > now)

      已上节数 = (已上节数 < 0)?element['课程节数']: 已上节数
      element['课程名称'] = key
      element['已上节数'] = 已上节数
      element['进度'] = Math.round(已上节数 * 100 / element['课程节数'])


      if (element['课程节数'] === 已上节数)
        doneList.push(element)
      else
        undoneList.push(element)
    }

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
      undoneList
    })
  },
  onUnload() {
    unbindTheme()
  },
  async checkBind() {
    const binded = wx.getStorageSync('binded')
    if (!binded) {
      wx.redirectTo({
        url: '/pages/welcome/welcome',
      })
    }
  },
  switchVisible({ currentTarget }) {
    const { dataset } = currentTarget
    const key = dataset.name
    
    this.setData({
      [`disableButton.${key}`]: !this.data.disableButton[key]
    })
  },

  handleAddLesson() {
    wx.navigateTo({
      url: '/pages/lesson-edit/lesson-edit?mode=add',
    })
  }
})
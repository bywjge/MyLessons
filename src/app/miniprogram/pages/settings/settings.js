import tools from "../../utils/tools"

Page({
  data: {
    viewMode: 'daily'
  },

  onLoad(options = {}) {
    this.setData({
      viewMode: wx.getStorageSync('mainView') || 'daily'
    })
  },

  // 点击“添加上课安排”
  editSchedule({ currentTarget }) {
    let { dataset: { item } } = currentTarget
    console.log(item)
    item = item || {}
    this.setData({
      'lessonEditor.name': item['课程名称'] || '',
      'lessonEditor.location': item['教学地点'] || '',
      'lessonEditor.description': item['上课内容'] || ''
    })
    this.selectComponent('#lesson-editor').switchVisible(true)
  },

  handleLessonEditConfirm() {
    this.selectComponent('#lesson-editor').switchVisible(false)
  },

  // 切换主页视图
  handleMainViewSelect() {
    wx.showActionSheet({
      alertText: '设置默认主页视图为',
      itemList: ['日视图', '周视图'],
    })
    .then(({ tapIndex: index }) => {
      const view = index === 0? 'daily': 'weekly'
      if (view === this.data.viewMode)
        return ;
      this.setData({ viewMode: view })
      wx.setStorageSync('mainView', view)
      wx.showToast({
        title: '保存已生效'
      })
    })
    .catch(() => {})
  },

  // 切换动画效果
  handleAnimationSwitch() {
    wx.showActionSheet({
      alertText: '设置动画效果为',
      itemList: ['打开', '关闭'],
    })
    .then(({ tapIndex: index }) => {
      const newStatus = index === 0
      if (!newStatus === this.data.disableAnimation) 
        return ;
      wx.setStorageSync('disableAnimation', !newStatus)
      this.setData({
        disableAnimation: !newStatus
      })

      tools.showModal({
        title: '动画过渡效果',
        content: `动画过渡效果已${newStatus? '打开': '关闭'}，如无效果请重启应用`
      })
    })
    .catch(() => {})
  }
})
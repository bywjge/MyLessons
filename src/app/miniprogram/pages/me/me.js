import tools from '../../utils/tools'
import lessonApi from '../../apis/lessons'
Page({

  /**
   * 页面的初始数据
   */
  data: {
    info: {
      姓名: 'Unknown',
      学院: 'Unknown',
      学号: '',
      性别: '男'
    }
  },
  onLoad() {
    const info = wx.getStorageSync('profile')

    this.setData({
      info
    })
  },

  // 转到学籍卡片
  jumpToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile',
    })
  },

  // 查看所有课程
  jumpToLessonList() {
    wx.navigateTo({
      url: '/pages/lessons-list/lessons-list',
    })
  },

  // 未开发功能的提示
  showModal() {
    tools.showModal({
      title: "提示",
      content: "功能在开发中～"
    })
  },

  // 重新获取课程
  resetStorage() {
    tools.showModal({
      title: "确认操作",
      content: "重新获取课程，将清空储存在云端的数据。（鉴于小程序还在测试阶段）不建议使用该功能。确定继续吗？",
      confirmText: '是的',
      cancelText: '算了',
      showCancel: true
    })
    .then(async () => {
      await lessonApi.resetLesson()
      tools.showToast({ title: '重置成功' })
    })
    .catch(() => {})
  }
})
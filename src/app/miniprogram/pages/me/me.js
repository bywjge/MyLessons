import tools from '../../utils/tools'
import lessonApi from '../../apis/lessons'
import accountApi from '../../apis/account'
import { bindTheme, unbindTheme } from '../../utils/theme'

const app = getApp()
const eventBus = app.globalData.eventBus

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
    },
    enableDebug: false,
    avatarUrl: ''
  },
  onLoad() {
    // data中自动添加一个theme
    bindTheme(this)
    this.refreshAvator()
    const info = wx.getStorageSync('profile')
    let enableDebug = wx.getStorageSync('enableDebug')
    if (!enableDebug || enableDebug === '') {
      enableDebug = false
    }

    eventBus.on('updateAvator', this.refreshAvator)
    
    this.setData({
      info,
      enableDebug
    })
  },
  onUnload() {
    unbindTheme()
  },

  refreshAvator() {
    console.log("刷新");
    const { avatarUrl } = wx.getStorageSync('wxInfo')
    this.setData({
      avatarUrl
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

  // 查看考试成绩
  jumpToScore() {
    wx.navigateTo({
      url: '/pages/score/score',
    })
  },

  // 查看考试安排
  jumpToExam() {
    wx.navigateTo({
      url: '/pages/exams/exams',
    })
  },

  // 查看创新学分
  jumpToCreativeScore() {
    wx.navigateTo({
      url: '/pages/creative-score/creative-score',
    })
  },

  // 未开发功能的提示
  showModal() {
    tools.showModal({
      title: "提示",
      content: "功能在开发中～"
    })
  },

  // 切换开发者模式 开关
  switchDebugMode() {
    const newStatus = !this.data.enableDebug
    wx.setStorageSync('enableDebug', newStatus)
    this.setData({
      enableDebug: newStatus
    })

    tools.showModal({
      title: '开发者模式',
      content: `开发者模式已${newStatus? '打开': '关闭'}`
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
  },

  // 重新获取个人信息
  async debugGetInfo() {
    wx.showLoading({ title: '同步数据中' })
    await accountApi.getStudentInfo()
    wx.hideLoading().catch(() => {})
  },

  // 强制刷新本地数据
  debugClearStrage() {
    // 设置一个永远不可能出现的版本号来触发重新获取
    wx.setStorageSync('version', 'never-gonna-give-you-up')
    wx.redirectTo({
      url: '/pages/welcome/welcome'
    })
  },

  // 重新分配课程颜色
  async debugRecolorize() {
    wx.showLoading({ title: '重新着色中' })
    const lessonsByDay = wx.getStorageSync('lessonsByDay')
    lessonApi.convertAndStorage(lessonsByDay, true)
    wx.hideLoading().catch(() => {})
    tools.showToast({
      title: '重分配成功',
    })
  }
})
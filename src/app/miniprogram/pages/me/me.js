import tools from '../../utils/tools'
import lessonApi from '../../apis/lessons'
import accountApi from '../../apis/account'

const app = getApp()
const eventBus = app.globalData.eventBus
const dayGap = 3600 * 24 * 1000 //ms

/** 徽章列表，包含了徽章的名字和描述 */
const badges = {
  test: {
    name: '内测组勋章',
    description: '小程序公布前参加内测活动的用户才能获得的特别勋章'
  }
}

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
    badges: [],
    enableDebug: false,
    avatarUrl: '',
    isTeacher: false
  },

  async refreshInfo() {
    const lastSyncTime = wx.getStorageSync('infoSyncTime')
    if (!lastSyncTime || (Date.now() - lastSyncTime.getTime()) > dayGap)
      await accountApi.asyncAccountInfo()

    const badges = wx.getStorageSync('badges')
    this.setData({
      badges
    })
  },

  async onLoad() {
    this.setData({
      isTeacher: wx.getStorageSync('usertype') === 'teacher'
    })
    // data中自动添加一个theme
    // bindTheme(this)
    this.refreshAvatar()
    const info = wx.getStorageSync('profile')
    if (!info) {
      wx.showLoading({ title: '获取数据中' })
      await accountApi.getPersonInfo()
      wx.hideLoading()
      this.onLoad()
      return ;
    }

    let enableDebug = wx.getStorageSync('enableDebug')
    if (!enableDebug || enableDebug === '') {
      enableDebug = false
    }

    eventBus.on('updateAvatar', this.refreshAvatar.bind(this))

    this.setData({
      info,
      enableDebug
    })

    this.refreshInfo()
  },

  onUnload() {
    // unbindTheme()
  },

  refreshAvatar() {
    console.log("刷新");
    const { avatarUrl } = wx.getStorageSync('wxInfo')
    this.setData({
      avatarUrl
    })
  },

  /** 点击徽章查看信息 */
  handleBadgeTap({ currentTarget }) {
    const { dataset } = currentTarget
    const badgeInfo = badges[dataset.badge]
    if (!badgeInfo)
      return ;

    tools.showModal({
      title: badgeInfo.name,
      content: badgeInfo.description
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

  // 课程推送服务
  jumpToPushService() {
    wx.navigateTo({
      url: '/pages/push-service/push-service',
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
    await accountApi.getPersonInfo()
    wx.hideLoading().catch(() => {})
    this.onLoad()
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
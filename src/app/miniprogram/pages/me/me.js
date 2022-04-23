import tools from '../../utils/tools'
import appApi from '../../apis/app'
import lessonApi from '../../apis/lessons'
import accountApi from '../../apis/account'
import request from '../../utils/request'

const app = getApp()
const eventBus = app.globalData.eventBus
const dayGap = 3600 * 24 * 1000 //ms

/** 徽章列表，包含了徽章的名字和描述 */
const badges = {
  test: {
    name: '内测组徽章',
    description: '小程序公布前参加内测活动的用户才能获得的特别徽章'
  },
  debug: {
    name: '除错大师徽章',
    description: '找出小程序内的设计缺陷(Bug)一定数量后可获得'
  },
  recommender: {
    name: '出谋划策徽章',
    description: '提出功能建议并被采纳后可获得'
  },
  pioneer: {
    name: '尝鲜者徽章',
    description: '在公测期使用小程序即可获得'
  }
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    username: '',
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
      username: wx.getStorageSync('username'),
      isTeacher: wx.getStorageSync('usertype') === 'teacher'
    })
    // data中自动添加一个theme
    // bindTheme(this)
    this.refreshAvatar()
    const info = wx.getStorageSync('profile')
    if (!info) {
      wx.showLoading({ title: '获取数据中' })
      await accountApi.getPersonInfo()
      wx.hideLoading().catch(() => {})
      this.onLoad()
      return ;
    }

    let enableDebug = wx.getStorageSync('enableDebug')
    if (!enableDebug || enableDebug === '') {
      enableDebug = false
    }

    eventBus.on('updateAvatar', this.refreshAvatar.bind(this, true))

    this.setData({
      info,
      enableDebug
    })

    await this.refreshInfo()
    this.refreshAvatar()
  },

  onUnload() {
    // unbindTheme()
  },

  async refreshAvatar(force = false) {
    const wxInfo = wx.getStorageSync('wxInfo')
    const avatarUrl = wx.getStorageSync('avatarUrl') || wxInfo.avatarUrl || ''
    const fs = wx.getFileSystemManager()
    const that = this
    try {
      const avatarData = fs.readFileSync(`${wx.env.USER_DATA_PATH}/avatar.jpg`, 'base64')
      that.setData({
        avatarUrl: 'data:image/jpeg;base64,' + avatarData
      })

      if (!force && (Date.now() - wx.getStorageSync('avatarSyncTime').getTime()) < 3600 * 24 * 1000)
        return 
    } catch { }

    let data = null
    if (avatarUrl.indexOf('cloud://') === -1) {
      data = (await request.get(avatarUrl, {
        responseType: 'arraybuffer'
      })).data
      this.setData({
        avatarUrl: 'data:image/jpeg;base64,' + wx.arrayBufferToBase64(data)
      })
    } else {
      // 如果是云储存头像
      let res = null
      const p = new Promise(resolve => res = resolve)
      wx.cloud.downloadFile({
        fileID: avatarUrl,
        success(ret) {
          const path = ret.tempFilePath
          data = fs.readFileSync(path)
          res()
        }
      })
      await p
    }

    this.setData({ avatarUrl: 'data:image/jpeg;base64,' + wx.arrayBufferToBase64(data) })
    wx.setStorageSync('avatarSyncTime', new Date())
    fs.writeFileSync(`${wx.env.USER_DATA_PATH}/avatar.jpg`, data)
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

  shareApp() {
    wx.navigateTo({
      url: '/pages/share-app/share-app',
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

  // 设置
  jumpToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings',
    })
  },

  // 课程推送服务
  jumpToPushService() {
    wx.navigateTo({
      url: '/pages/push-service/push-service',
    })
  },

  jumpToContact() {
    wx.navigateTo({
      url: '/pages/contact/contact',
    })
  },

  jumpToAbout() {
    wx.navigateTo({
      url: '/pages/about/about',
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
      content: "重新获取课程，将清空储存在云端的数据，如果中途失败，需要重新操作。确定继续吗？",
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
    await accountApi.getPersonInfo(undefined, true)
    wx.hideLoading().catch(() => {})
    this.onLoad()
  },

  // 强制刷新本地数据
  debugClearStrage() {
    // 设置一个永远不可能出现的版本号来触发重新获取
    // wx.setStorageSync('version', 'never-gonna-give-you-up')
    wx.clearStorageSync()
    wx.redirectTo({
      url: '/pages/welcome/welcome'
    })
  },

  // 切换动画效果 开关
  debugSwitchAnimation() {
    const newStatus = !this.data.disableAnimation
    wx.setStorageSync('disableAnimation', newStatus)
    this.setData({
      disableAnimation: newStatus
    })

    tools.showModal({
      title: '动画过渡效果',
      content: `动画过渡效果已${!newStatus? '打开': '关闭'}，如无效果请重启应用`
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
  },

  async debugGetOpenid() {
    wx.showLoading({ title: '请求数据中' })
    const openid = await appApi.getOpenId()
    wx.setClipboardData({
      data: openid,
    })
    wx.hideLoading().catch(() => {})
    wx.showToast({ title: '已复制信息' })
  }
})
// miniprogram/pages/utils/utils.js
import { bindTheme, unbindTheme } from '../../utils/theme'
import moreApi from '../../apis/more'
Page({
  data: {
    announceList: [],
    unreadAnnounceCount: 0,
    lastEdit: [],
    lastAnnounce: null,
    isAdmin: false
  },
  
  onLoad: async function (options) {
    // data中自动添加一个theme
    bindTheme(this)
    const isAdmin = wx.getStorageSync('isAdmin') || false
    let lastSyncTime = wx.getStorageSync('announceSyncTime')

    if (!lastSyncTime)
      await this.refreshAnnounce()

    const announceList = wx.getStorageSync('announces')
    const unreadAnnounceCount = wx.getStorageSync('unreadAnnounceCount')
    const lastAnnounce = announceList.length > 0? announceList[0]: null
    const lastEdit = lastAnnounce? new Date(lastAnnounce.time).format('YYYY-mm-dd'): '2019-01-14'

    this.setData({
      isAdmin,
      announceList,
      unreadAnnounceCount,
      lastAnnounce,
      lastEdit
    })

    // 每两小时更新一次
    lastSyncTime = wx.getStorageSync('announceSyncTime')
    if (Date.now() - lastSyncTime.getTime() > 2 * 3600 * 1000)
      this.refreshAnnounce()
  },

  async refreshAnnounce() {
    await moreApi.syncAnnounce(true)

    const announceList = wx.getStorageSync('announces')
    const unreadAnnounceCount = wx.getStorageSync('unreadAnnounceCount')
    const lastAnnounce = announceList.length > 0? announceList[0]: null
    const lastEdit = lastAnnounce? new Date(lastAnnounce.time).format('YYYY-mm-dd'): '2019-01-14'

    this.setData({
      announceList,
      unreadAnnounceCount,
      lastAnnounce,
      lastEdit
    })
  },

  jumpToAnnounce() {
    wx.navigateTo({ url: '/pages/announce/announce' })
  },

  jumpToDiscuss() {
    wx.navigateTo({ url: '/pages/discuss/discuss' })
  },

  jumpToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  // 查询空教室
  async jumpToQueryOccupy() {
    wx.navigateTo({ url: '/pages/query-occupy/query-occupy' })
  },

  // 打开教师课程查询
  jumpToQueryTeacherLesson() {
    wx.navigateTo({ url: '/pages/query-teacher-lesson/query-teacher-lesson' })
  },

  // 打开今天吃什么
  jumpToWhatToEat() {
    wx.navigateTo({ url: '/pages/what-to-eat/what-to-eat' })
  },

  // 打开答案之书
  jumpToAnswerBook() {
    wx.navigateTo({ url: '/pages/answer-book/answer-book' })
  }
})
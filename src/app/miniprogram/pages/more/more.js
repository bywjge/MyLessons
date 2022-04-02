// miniprogram/pages/utils/utils.js
import { bindTheme, unbindTheme } from '../../utils/theme'
import moreApi from '../../apis/more'
Page({
  data: {
    announceList: [],
    unreadAnnounceCount: 0,
    lastEdit: [],
    lastAnnounce: null
  },
  
  onLoad: async function (options) {
    // data中自动添加一个theme
    bindTheme(this)
    await moreApi.syncAnnounce()

    const announceList = wx.getStorageSync('announces')
    const unreadAnnounceCount = wx.getStorageSync('unreadAnnounceCount')
    const lastAnnounce = announceList.length > 0? announceList[announceList.length - 1]: null
    const lastEdit = lastAnnounce? new Date(lastAnnounce.time).format('YYYY-mm-dd'): '2019-01-14'

    this.setData({
      announceList,
      unreadAnnounceCount,
      lastAnnounce,
      lastEdit
    })
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

  jumpToQueryTeacherLesson() {
    wx.navigateTo({ url: '/pages/query-teacher-lesson/query-teacher-lesson' })
  },

  jumpToWhatToEat() {
    wx.navigateTo({ url: '/pages/what-to-eat/what-to-eat' })
  }
})
// pages/discuss-feedback/discuss-feedback.js
Page({
  data: {
    avatarUrl: ''
  },
  onLoad() {
    const { avatarUrl } = wx.getStorageSync('wxInfo')
    this.setData({
      avatarUrl
    })
  }
})
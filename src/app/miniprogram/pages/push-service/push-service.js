import cloud from '../../utils/cloud'

Page({
  data: {
    isBinded: false,
    qrcodeUrl: '',
    ready: false
  },

  async onLoad() {
    wx.showLoading({ title: '加载数据中' })
    let { bind } = await cloud.callFunction({
      name: 'account',
      data: {
        action: 'checkBindPushService'
      }
    })

    this.setData({
      isBinded: bind,
      ready: true
    })

    if (!bind) {
      this.fetchQRCode()
    } else {
      wx.hideLoading().catch(() => {})
    }
  },

  async fetchQRCode() {
    wx.showLoading({ title: '刷新二维码' })
    const ret = await cloud.callFunction({
      name: 'account',
      data: {
        action: 'getBindQRCode'
      }
    })

    this.setData({
      qrcodeUrl: `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${ret.ticket}`
    })

    wx.hideLoading().catch(() => {})
  }
})
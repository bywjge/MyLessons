import tools from "../../utils/tools"

Page({
  data: {
    avatarUrl: "",
    publicName: "世界第一的初音公主殿下",
    // 个人卡片是否展开
    expandHead: false,
    hideHead: false,
    lastY: 0
  },

  onLoad() {
    const { avatarUrl } = wx.getStorageSync('wxInfo')
    this.setData({
      avatarUrl
    })
  },

  handleExpand() {
    this.setData({
      expandHead: !this.data.expandHead
    })
  },

  /** 滑动时处理顶部个人中心隐藏 */
  handleTouchMove: tools.throttle(function({ touches }){
    const { pageY } = touches[0]
    const delta = pageY - this.data.lastY
    if (this.data.expandHead) {
      this.setData({
        lastY: pageY
      })
      return ;
    }

    this.setData({
      hideHead: Math.abs(delta) > 10? (delta < 0): this.data.hideHead,
      lastY: pageY
    })
  }, 20),

  // 添加动态
  handleAddButton() {
    wx.showActionSheet({
      // alertText: '您需要...',
      itemList: [
        '发表新的动态'
      ]
    })
    .then(({ tapIndex: index }) => {
      wx.navigateTo({
        url: '/pages/discuss-new-post/discuss-new-post',
      })
    })
    .catch(() => {})
  }
})
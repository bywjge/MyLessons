import moreApi from '../../apis/more'
import cloud from '../../utils/cloud'

Page({
  data: {
    announceList: [],
    isAdmin: false
  },

  onLoad() {
    const isAdmin = wx.getStorageSync('isAdmin') || false
    this.refreshAnnounce()
    this.setData({
      isAdmin
    })
  },

  handleAddButton() {
    wx.navigateTo({ url: '/pages/announce-new-post/announce-new-post' })
  },

  async refreshAnnounce() {
    await moreApi.syncAnnounce(true)
    let announceList = wx.getStorageSync('announces') || []
    announceList.forEach(e => {
      e.time = new Date(e.time).format('YYYY/mm/dd HH:MM')
    })

    const normalList = announceList.filter(e => !e.toTop)
    const toTopList = announceList.filter(e => e.toTop)

    this.setData({
      // 保证置顶的公告先于普通项目
      announceList: toTopList.concat(normalList)
    })

    // 设置所有项目为已查看
    // announceList = announceList.map(e => JSON.parse(JSON.stringify(e))).forEach(e => e.read = true)
    // wx.setStorageSync('announces', announceList)
    wx.setStorageSync('unreadAnnounceCount', 0)
  },

  // 处理公告长按事件
  handleLongPress({ currentTarget }) {
    if (!this.data.isAdmin)
      return ;
    
    wx.vibrateShort({
      type: 'heavy',
    }).catch(() => {})
    const { dataset: { post } } = currentTarget

    wx.showActionSheet({
      alertText: '需要对公告进行什么操作呢',
      itemList: ['编辑该条公告', '删除该条公告'],
    })
    .then(({ tapIndex: index }) => {
      if (index === 0)
        this.editAnnounce(post)
      if (index === 1)
        this.deleteAnnounce(post)
    })
    .catch(() => {})
  },

  editAnnounce(post) {
    wx.navigateTo({ url: '/pages/announce-new-post/announce-new-post?id=' + post._id })
  },

  async deleteAnnounce(post) {
    wx.showLoading({ title: '请求数据中' })
    try {
      await cloud.callFunction({
        name: 'announce',
        data: {
          action: 'deleteAnnounce',
          id: post._id
        }
      })
    } catch(e) {
      wx.showModal({
        title: '删除失败',
        content: '删除公告时遇到问题：' + e.error || e
      })
      return ;
    } finally {
      wx.hideLoading().catch(() => {})
    }

    wx.showToast({ title: '删除成功' })
    this.refreshAnnounce()
  }
})
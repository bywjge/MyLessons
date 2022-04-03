import tools from "../../utils/tools"
import cloud from '../../utils/cloud'

Page({
  data: {
    info: {
      id: null,
      title: '',
      content: '',
      poster: '',
      time: null,
      toTop: false
    }
  },

  onLoad(options) {
    const id = options.id || null
    if (id === null) return ;

    const announceList = wx.getStorageSync('announces') || []
    const e = announceList.find(e => e._id === id)
    if (!e) return;

    this.setData({
      info: {
        ...e,
        id
      }
    })
  },

  handleTitleInput({ detail }){
    this.setData({
      'info.title': detail.value
    })
  },
  
  handleContentInput({ detail }) {
    this.setData({
      'info.content': detail.value
    })
  },

  handlePosterInput({ detail }){
    this.setData({
      'info.poster': detail.value
    })
  },

  async post() {
    if (
      !this.data.info.title ||
      !this.data.info.content ||
      !this.data.info.poster
    ) {
      tools.showModal({
        title: '信息不完整',
        content: '请填写完成信息，无误后再上传'
      })
      return ;
    }

    try {
      await tools.showModal({
        title: '确认操作',
        content: '你将公布一条公告，该操作将推送给所有用户，确认继续吗？',
        showCancel: true
      })
    } catch {
      return ;
    }

    try {
      console.log((this.data.info.id === null)? 'addAnnounce': 'editAnnounce')
      await cloud.callFunction({
        name: 'announce',
        data: {
          action: (this.data.info.id === null)? 'addAnnounce': 'editAnnounce',
          ...this.data.info
        }
      })
    } catch(e) {
      tools.showModal({
        title: '发布失败',
        content: '发布公告时遇到问题：' + e.error || e
      })
      return ;
    }

    wx.showToast({ title: '发表成功' })
    await tools.sleep(1000)

    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];  //上一个页面
    prevPage.refreshAnnounce.apply(prevPage)

    wx.navigateBack({
      delta: 1
    })
  },

  // 切换置顶性
  switchToTop(e) {
    this.setData({
      'info.toTop': e.detail.value
    })
  }
})
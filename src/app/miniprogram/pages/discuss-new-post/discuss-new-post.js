import tools from "../../utils/tools"
import discussApi from '../../apis/discuss'

const privacyItems = [
  '仅我自己可见',
  '学生圈可见',
  '全部可见'
]

Page({
  data: {
    info: {
      content: '',
      tags: [],
      images: [],
      privacy: 'all'
    }
  },
  /** 编辑动态tag */
  handleEditTag() {

  },

  /** 更改已添加的图片 */
  handleAddPhoto() {
    tools.showModal({
      title: '提示',
      content: '功能在开发中～'
    })
  },

  /** 更改动态权限 */
  handleEditPrivacy() {
    wx.showActionSheet({
      alertText: '设置权限为...',
      itemList: privacyItems
    })
    .then(({ tapIndex: index }) => {
      let level = 'all'
      switch(index) {
        case 0:
          level = 'me'
          break ;
          case 1:
          level = 'student'
          break ;
        case 2:
          level = 'all'
          break ;
      }
      this.setData({
        privacy: level
      })
    })
    .catch(() => {})
  },

  handleInput({ detail }) {
    this.setData({
      'info.text': detail.value
    })
  },

  async post() {
    try {
      await discussApi.addArticle(this.data.info)
    } catch {
      tools.showModal({
        title: '发布失败',
        content: '发布动态时遇到一些小问题，请重新试一次～'
      })
      return ;
    }

    wx.showToast({ title: '发表成功' })
    await tools.sleep(1000)
    wx.navigateBack({
      delta: 1
    })
  }
})
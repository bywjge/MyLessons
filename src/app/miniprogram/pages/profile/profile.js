import tools from '../../utils/tools'
import { setUserAvator } from '../../static/js/database'
import { bindTheme, unbindTheme } from '../../utils/theme'

const app = getApp()
const eventBus = app.globalData.eventBus

Page({
  data: {
    info: {
      姓名: 'Unknown',
      学院: 'Unknown',
      学号: '',
      性别: '男'
    },
    avatarUrl: ''
  },

  onLoad() {
    // data中自动添加一个theme
    bindTheme(this)

    const info = wx.getStorageSync('profile')
    this.refreshAvator()
    this.setData({
      info
    })
  },
  onUnload() {
    unbindTheme()
  },

  refreshAvator() {
    const { avatarUrl } = wx.getStorageSync('wxInfo')
    this.setData({
      avatarUrl
    })
  },

  /**
   * 更改用户头像
   */
  handleChangeAvator() {
    const openid = wx.getStorageSync('openid')
    wx.chooseImage({
      count: 1,
      success: async ret => {
        wx.showLoading({
          title: '上传数据中',
        })
        const fileType = ret.tempFilePaths[0].split('.')[1]
        const fileName = `${openid}-${tools.randomString(16)}.${fileType}`
        try{
          await this.deleteAvator()
        } catch (e) {
          wx.hideLoading()
          tools.showModal({
            title: '上传失败',
            content: '暂时无法处理请求'
          })
          return ;
        }

        wx.cloud.uploadFile({
          cloudPath: fileName,
          filePath: ret.tempFilePaths[0],
          success: async res => {
            // wx.hideLoading()
            await setUserAvator(res.fileID)
            tools.showToast({ title: '上传成功' })
            this.refreshAvator()

            eventBus.emit('updateAvator')
          },
        })
        console.log(ret)
      },
      fail: () => {}
    })
  },

  // 删除已经存在的头像
  deleteAvator() {
    return new Promise((resolve, reject) => {
      // 要先删除掉已存在的头像
      wx.cloud.deleteFile({
        fileList: [this.data.avatarUrl],
        success: resolve,
        fail: reject
      })
    })
  },

  handlePreviewAvator() {
    wx.previewImage({
      urls: [this.data.avatarUrl],
      showmenu: true
    })
  }
})
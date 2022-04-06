import tools from '../../utils/tools'
import { setUserAvatar } from '../../static/js/database'
import { bindTheme, unbindTheme } from '../../utils/theme'
import request from '../../utils/request'

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
    avatarUrl: '',
    isTeacher: false
  },

  onLoad() {
    this.setData({
      isTeacher: wx.getStorageSync('usertype') === 'teacher'
    })
    // data中自动添加一个theme
    bindTheme(this)

    const info = wx.getStorageSync('profile')
    this.refreshAvatar()
    this.setData({
      info
    })
  },
  onUnload() {
    unbindTheme()
  },

  async refreshAvatar() {
    const wxInfo = wx.getStorageSync('wxInfo')
    const avatarUrl = wx.getStorageSync('avatarUrl') || wxInfo.avatarUrl
    const fs = wx.getFileSystemManager()
    const that = this
    try {
      const avatarData = fs.readFileSync(`${wx.env.USER_DATA_PATH}/avatar.jpg`, 'base64')
      that.setData({
        avatarUrl: 'data:image/jpeg;base64,' + avatarData
      })
    } catch { }

    const ret = await request.get(avatarUrl, {
      responseType: 'arraybuffer'
    })
    
    this.setData({
      avatarUrl: 'data:image/jpeg;base64,' + wx.arrayBufferToBase64(ret.data)
    })
    fs.writeFileSync(`${wx.env.USER_DATA_PATH}/avatar.jpg`, ret.data)
  },

  /**
   * 更改用户头像
   */
  handleChangeAvatar() {
    const openid = wx.getStorageSync('openid')
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 压缩后上传，节省空间
      success: async ret => {
        wx.showLoading({
          title: '上传数据中',
        })
        const fileType = ret.tempFilePaths[0].split('.')[1]
        const fileName = `${openid}-${tools.randomString(16)}.${fileType}`
        try{
          await this.deleteAvatar()
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
            await setUserAvatar(res.fileID)
            tools.showToast({ title: '上传成功' })
            this.refreshAvatar()

            eventBus.emit('updateAvatar')
          },
        })
        // console.log(ret)
      },
      fail: () => {}
    })
  },

  // 删除已经存在的头像
  deleteAvatar() {
    return new Promise((resolve, reject) => {
      // 要先删除掉已存在的头像
      wx.cloud.deleteFile({
        fileList: [wx.getStorageSync('avatarUrl')],
        success: resolve,
        fail: reject
      })
    })
  },

  handlePreviewAvatar() {
    wx.previewImage({
      urls: [this.data.avatarUrl],
      showmenu: true
    })
  }
})
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

  async refreshAvatar(force = false) {
    const wxInfo = wx.getStorageSync('wxInfo')
    const avatarUrl = wx.getStorageSync('avatarUrl') || wxInfo.avatarUrl
    const fs = wx.getFileSystemManager()
    const that = this
    try {
      const avatarData = fs.readFileSync(`${wx.env.USER_DATA_PATH}/avatar.jpg`, 'base64')
      that.setData({
        avatarUrl: 'data:image/jpeg;base64,' + avatarData
      })

      if (!force && (Date.now() - wx.getStorageSync('avatarSyncTime').getTime()) < 3600 * 24 * 1000)
        return 
    } catch { }

    let data = null
    if (avatarUrl.indexOf('cloud://') === -1) {
      data = (await request.get(avatarUrl, {
        responseType: 'arraybuffer'
      })).data
      this.setData({
        avatarUrl: 'data:image/jpeg;base64,' + wx.arrayBufferToBase64(data)
      })
    } else {
      // 如果是云储存头像
      let res = null
      const p = new Promise(resolve => res = resolve)
      wx.cloud.downloadFile({
        fileID: avatarUrl,
        success(ret) {
          console.log("hi")
          const path = ret.tempFilePath
          data = fs.readFileSync(path)
          res()
        }
      })
      await p
    }

    this.setData({ avatarUrl: 'data:image/jpeg;base64,' + wx.arrayBufferToBase64(data) })
    wx.setStorageSync('avatarSyncTime', new Date())
    fs.writeFileSync(`${wx.env.USER_DATA_PATH}/avatar.jpg`, data)
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
          wx.hideLoading().catch(() => {})
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
            // wx.hideLoading().catch(() => {})
            await setUserAvatar(res.fileID)
            tools.showToast({ title: '上传成功' })
            this.refreshAvatar(true)

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
      const url = wx.getStorageSync('avatarUrl')
      if (!url || url.indexOf('cloud://') === -1) {
        resolve()
        return ;
      }
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
// miniprogram/pages/login/login.js
import logger from '../../utils/log'
const log = new logger()

import tools from '../../utils/tools'
import accountApi from '../../apis/account'
import lessonApi from '../../apis/lessons'
import * as wyu from '../../apis/wyu'

Page({
  data: {
    username: "",
    password: "",
    busy: false
  },

  onLoad() {
    log.setKeyword('Page:login')

    const username = wx.getStorageSync('username')
    const password = wx.getStorageSync('password')

    this.setData({
      username,
      password
    })
  },

  handleUserInput(e){
    this.setData({
      username: e.detail.value.trim()
    })
  },

  handlePassInput(e){
    this.setData({
      password: e.detail.value.trim()
    })
  },

  /**
   * 点击绑定按钮后
   */
  async handleClick(){
    const that = this
    if (this.data.busy)
      return ;

    if (this.data.username.isEmpty() || this.data.password.isEmpty()){
      tools.showModal({
        title: "登录信息不完整",
        content: "您需要正确填入账号和密码"
      })
      return ;
    }

    this.setData({  busy: true })
    wx.showLoading({ title: "请求数据中" })

    try {
      await wyu.doLogin(that.data.username, that.data.password, false)
    } catch (e) {
      wx.hideLoading().catch(() => {})
      const msg = e.message || e || ''

      log.error('登录出错', e)
      switch(msg) {
        case "密码错误":
          tools.showModal({
            title: "好像不对...",
            content: "账号或密码不正确，再检查一遍哦"
          })
          break ;

        case "账号不存在":
          tools.showModal({
            title: "好像不对...",
            content: "账号不存在哦！"
          })
          break ;

        default:
          tools.showModal({
            title: "未预期的错误",
            content: msg
          })
          break ;
      }

      return ;
    } finally {
      this.setData({  busy: false })
    }
    
    // 登录成功，储存账号密码
    wx.setStorageSync('username', this.data.username)
    wx.setStorageSync('password', this.data.password)

    // 绑定账号到数据库
    wx.showLoading({ title: '绑定账号中' })
    try {
      await accountApi.bindAccount(that.data.username, that.data.password)
    } catch(e) {
      log.error('绑定账号出错', e)
      tools.showModal({
        title: "绑定账号时出错",
        content: "请尝试重新绑定，如果你拒绝了授权，请重新打开小程序允许授权"
      })

      /**
       * 绑定失败时，storage中还储存着username和password，下次打开小程序时可以直接读取
       */
      return ;
    }

    // 绑定账号成功
    log.info('绑定账号成功')
    that.bindFinished()
  },

  /**
   * 在绑定完成后做的事情
   */
  async bindFinished(){
    // 同步课表
    wx.showLoading({ title: "同步课表中" })
    await lessonApi.syncLessons()
    wx.showToast({ title: '同步成功' })

    await tools.sleep(1000)
    wx.redirectTo({
      url: '/pages/lesson-view/lesson-view',
    })
  }
})

import logger from '../../utils/log'
import tools from '../../utils/tools'
import lessonApi from '../../apis/lessons'
import accountApi from '../../apis/account'
import * as database from '../../static/js/database'
// import { changeTheme } from '../../utils/theme'


const log = new logger()
log.setKeyword('Page:index')

/**
 * @TODOS
 *   授权未测试
 */
Page({
  data: {
    showButton: false
  },

  onLoad: async function () {
    require('../../utils/debug')
    // changeTheme('dark')

    // 默认禁用所有安卓设备的动画效果
    if (wx.getStorageSync('disableAnimation') === "") {
      wx.setStorageSync('disableAnimation', wx.getSystemInfoSync().platform === 'android')
    }

    // 测试强制清空数据
    const version = "abcd107"
    if (wx.getStorageSync('version') !== version && wx.getStorageSync('binded') !== ""){
      await wx.showModal({
        title: '升级提示',
        content: '应用已升级到最新版本，本次升级需要更新数据。本操作需要十几秒时间，点击确定继续。',
        showCancel: false
      })
      wx.showLoading({ title: '重载课程数据' })
      log.info("数据已经清空")
      // wx.clearStorageSync()
      // wx.setStorageSync('enableDebug', false)
      await lessonApi.resetLesson()
    }
    wx.setStorageSync('version', version)
    // 不知道为什么会这样，但需要这一步
    // await lessonApi.initCheck()
    this.nextStep()
  },

  /**
   * 进行一系列判断决定需要跳转到什么页面
   */
  async nextStep() {
    // 页面加载，判断storage是否已经授权
    const binded = wx.getStorageSync('binded')
    const lessons = wx.getStorageSync('lessonsByDay')
    log.info("binded = ", binded);
    // 微信未授权，留在本页面

    // 已经授权未绑定，跳到绑定页面
    if (!binded || !lessons) {
      wx.showLoading({ title: '检查云端' })

      // 同步个人信息
      try {
        await accountApi.asyncAccountInfo()
      } catch {
        // 无个人数据，停留在本地
        wx.hideLoading().catch(() => {})
        this.setData({ showButton: true })
        return ;
      }

      /** 已经同步了个人信息 */
      // wx.showLoading({ title: '访问教务处' })
      // await accountApi.getCookie()

      // 获取个人信息
      wx.showLoading({ title: '获取身份' })
      try {
        await accountApi.getPersonInfo(undefined, true)
      } catch(e) {
        wx.hideLoading().catch(() => {})
        tools.showModal({
          title: '获取身份失败',
          content: '服务器忙碌，请稍后重新进入小程序'
        })
        return ;
      }
      
      // 获取课表
      wx.showLoading({ title: '同步课表中' })
      await lessonApi.syncLessons()

      wx.hideLoading().catch(() => {})
      wx.redirectTo({
        url: '../lesson-view/lesson-view',
      })
      return ;
    }

    database.updateEnterTime().then(() => {
      log.info('upload info done')
    })

    if (wx.getStorageSync('passwordFailure')) {
      await wx.showModal({
        title: '密码失效',
        content: '密码已失效，也许近期修改过密码。点击确定以重新输入密码',
        showCancel: false
      })

      wx.redirectTo({ url: '/pages/login/login' })
    }

    wx.redirectTo({
      url: '/pages/lesson-view/lesson-view',
    })
    return ;
  },

  /**
   * 用户点击授权按钮事件
   */
  onGetUserInfo: function(e){
    // 张小龙司马，旧接口废弃，使用新接口来获取个人信息
    wx.getUserProfile({
      lang: 'zh_CN',
      desc: "用于个人信息展示及标识"
    })
    .then(ret => {
      const info = ret.userInfo
      getApp().globalData.userInfo = info
      tools.showModal({
        title: "需要绑定账号",
        content: "您的微信账号需要绑定五邑大学教务处账号，点击确定继续",
      }).then(() => {
        wx.redirectTo({ url: '/pages/login/login' })
      })
    })
    .catch(() => {
      wx.showToast({
        title: '已拒绝授权',
        icon: 'none'
      })
    })
  }
})
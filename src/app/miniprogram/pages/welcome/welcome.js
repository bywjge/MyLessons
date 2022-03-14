import logger from '../../utils/log'
import api from '../../apis/app'
import tools from '../../utils/tools'
import lessonApi from '../../apis/lessons'
import accountApi from '../../apis/account'
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
    // wx.redirectTo({
    //   url: '/pages/social-bind/social-bind',
    // })

    // return ;

    require('../../utils/debug')
    // changeTheme('dark')

    // 测试强制清空数据
    const version = "abcd102"
    if (wx.getStorageSync('version') !== version){
      wx.showLoading({ itle: '清空重载数据' })
      log.info("数据已经清空")
      wx.clearStorageSync()
      wx.setStorageSync('version', version)
      wx.setStorageSync('enableDebug', false)
    }

    this.nextStep()
  },

  /**
   * 进行一系列判断决定需要跳转到什么页面
   */
  async nextStep() {
    // 页面加载，判断storage是否已经授权
    const authed = await api.isAppAuthed()
    const binded = wx.getStorageSync('binded')
    const lessons = wx.getStorageSync('lessonsByDay')
    log.info("authed, binded = ", authed, binded);

    // 微信未授权，留在本页面
    if (!authed){
      this.setData({ showButton: true })
      return ;
    }

    // 已经授权未绑定，跳到绑定页面
    if (!binded || !lessons) {
      wx.showLoading({ title: '检查云端' })

      // 同步个人信息
      try {
        await accountApi.asyncAccountInfo()
      } catch {
        wx.hideLoading()
        // 如果未绑定
        tools.showModal({
          title: "需要绑定账号",
          content: "您的微信账号需要绑定五邑大学教务处账号，点击确定继续",
        }).then(() => {
          wx.redirectTo({ url: '/pages/login/login' })
        })

        return ;
      }

      /** 已经同步了个人信息 */
      // wx.showLoading({ title: '访问教务处' })
      // await accountApi.getCookie()

      // 获取个人信息
      wx.showLoading({ title: '获取身份' })
      await accountApi.getPersonInfo()
      
      // 获取课表
      wx.showLoading({ title: '同步课表中' })
      await lessonApi.syncLessons()

      // 有绑定，重新设置值，并跳转到课程表页面
      // 如果没有个人信息
      // if (!isBind.userInfo || isBind.userInfo === '') {
      //   log.warn('没有找到个人信息，重新绑定中')
      //   await api.bindAccount(isBind.username, isBind.password)
      //   const { userInfo } = await wx.getUserInfo()
      //   wx.setStorageSync('wxInfo', userInfo)
      // } else {
      //   wx.setStorageSync('wxInfo', isBind.userInfo)
      // }
      
      wx.hideLoading()
      wx.redirectTo({
        url: '../lesson-view/lesson-view',
      })
      return ;
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
    if (e.detail.userInfo) {
      // 授权通过
      wx.setStorageSync('authed', true)
      this.nextStep();
    } else {
      wx.showToast({
        title: '已拒绝授权',
        icon: 'none'
      })
    }
  }
})
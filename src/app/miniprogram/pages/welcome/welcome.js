// miniprogram/index/index.js
import logger from '../../utils/log'
import api from '../../apis/app'
import tools from '../../utils/tools'
import lessonApi from '../../apis/lessons'
import accountApi from '../../apis/account'

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

  /**
   * 进行一系列判断决定需要跳转到什么页面
   */
  onLoad: async function () {
    require('../../utils/debug')

    // lessonApi.colorizeLesson()

    // 测试强制清空数据
    const version = "abcd2"
    if (wx.getStorageSync('version') !== version){
      wx.showLoading({
        title: '清空重载数据',
      })
      log.info("数据已经清空")
      wx.clearStorageSync()
      wx.setStorageSync('version', version)
    }

    // 页面加载，判断storage是否已经授权
    const authed = await api.isAppAuthed()
    const binded = wx.getStorageSync('binded')
    const lessons = wx.getStorageSync('lessonsByDay')
    log.info("authed, binded = ", authed, binded);

    // 微信未授权，留在本页面
    if (!authed){
      this.setData({
        showButton: true
      })
      return ;
    }

    // 已经授权未绑定，跳到绑定页面
    if (!binded || lessons === ""){
      wx.showLoading({
        title: '云端同步中',
      })

      log.warn("如果很慢那是因为教务处的锅，clear重开就好")
      // 也许是因为清理了缓存，联网到数据库检查一遍
      const isBind = await api.checkBind()

      // 有绑定，重新设置值
      if (isBind) {
        // 先拿cookie
        await accountApi.getCookie()
        // 有绑定，重新设置值，并跳转到课程表页面
        wx.setStorageSync('binded', true)
        wx.setStorageSync('username', isBind.username)
        wx.setStorageSync('password', isBind.password)
        // if (!await accountApi.checkCookie())
        //   await accountApi.getCookie()
        
        // 获取课表
        await lessonApi.syncLessons()
        wx.redirectTo({
          url: '../lesson-view/lesson-view',
        })
        return ;
      }

      wx.hideLoading()

      // 未绑定账号，弹框提示
      tools.showModal({
        title: "需要绑定账号",
        content: "您的微信账号需要绑定五邑大学教务处账号，点击确定继续",
      }).then(() => {
        wx.redirectTo({
          url: '../login/login',
        })
      })

      return ;
    }

    // 跳到非tabbar 页面需要switchTab
    wx.redirectTo({
      url: '../lesson-view/lesson-view',
    })
    return ;
  },

  /**
   * 用户点击授权按钮事件
   * @param {事件传递} e 
   */
  onGetUserInfo: function(e){
    if (e.detail.userInfo) { // 授权通过
      wx.setStorageSync('authed', true)
      this.nextStep();
    } else {
      wx.showToast({
        title: '您已拒绝授权',
        icon: 'none'
      })
    }
  }
})
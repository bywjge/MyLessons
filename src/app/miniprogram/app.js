import { log } from './utils/log'
import './utils/global.js'
import appApi from './apis/app'
const updateManager = wx.getUpdateManager()

console.log("hello {0}, I am {1}".format("World", "MeetinaXD"));

!function(){
  var PageTmp = Page;
  Page = function (pageConfig) {
    const originOnLoad = pageConfig.onLoad

    /** 重写onload方法，实现页面拦截 */
    pageConfig.onLoad = function(options) {
      // console.log(options)
      if (options && options._open_from === 'share') {
        // 拦截获得openid，并回到welcome
        const _from_openid = options._from_openid
        console.log("from", _from_openid)
        wx.redirectTo({
          url: '/pages/welcome/welcome',
        })
        return ;
      }
      if (typeof originOnLoad === 'function')
        originOnLoad.call(this, options)
    }

    Object.assign(pageConfig.data || {}, {
      disableAnimation: wx.getStorageSync('disableAnimation')
    })

    pageConfig = Object.assign({}, {
      /** 设置全局默认分享：分享到朋友 */
      onShareAppMessage() {
        const openidPromise = new Promise(resolve => {
          appApi.getOpenId().then(openid => resolve({
            title: '推荐您使用My Lesson小程序，五邑大学专属课程表',
            imageUrl: 'https://meetinaxd.ltiex.com/static/ShareApp.jpg',
            path: `/pages/welcome/welcome?_from_openid=${openid}&_open_from=share`,
          }))
        })

        return {
          title: '推荐您使用My Lesson小程序，五邑大学专属课程表',
          imageUrl: 'https://meetinaxd.ltiex.com/static/ShareApp.jpg',
          path: `/pages/welcome/welcome?_open_from=share`,
          promise: openidPromise
        }
      },

      /** 设置全局默认分享：分享到朋友圈 */
      onShareTimeline() {
        const openidPromise = new Promise(resolve => {
          appApi.getOpenId().then(openid => resolve({
            title: '推荐您使用My Lesson小程序，五邑大学专属课程表',
            imageUrl: 'https://meetinaxd.ltiex.com/static/ShareApp.jpg',
            query: `_from_openid=${openid}&_open_from=share`,
          }))
        })
        
        return {
          title: '推荐您使用My Lesson小程序，五邑大学专属课程表',
          imageUrl: 'https://meetinaxd.ltiex.com/static/ShareApp.jpg',
          query: '_open_from=share',
          promise: openidPromise
        }
      }
    }, pageConfig || {})
 
    PageTmp(pageConfig);
  };
}();

App({
  onLaunch: function () {

    const { height, top } = wx.getMenuButtonBoundingClientRect()
    const { statusBarHeight, windowWidth, windowHeight } = wx.getSystemInfoSync()
    const navBarHeight = statusBarHeight + height + (top-statusBarHeight) * 2
    wx.cloud.init({
      env: 'me-lesson-7g1wzhxzf81b7d04',
      traceUser: true,
    })

    const { eventBus } = require('./static/eventBus')

    this.globalData = {
      eventBus,
      navBarHeight,
      statusBarHeight,
      statusBarButtonHeight: height,
      windowWidth,
      windowHeight,

      // 首页显示的课程模式（日或周），即day/week
      indexMode: "day",
      theme: 'dark',

      version: "0.4.2.4"
    }

    updateManager.onUpdateReady(function () {
      wx.showModal({
        title: '更新提示',
        content: '新版应用已经准备好，点击确定来更新'
      }).then(() => {
        // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
        updateManager.applyUpdate()
      }).catch(() => {})
    })
  },
  onError(error) {
    log.error(error)
  },
  // towxml:require('/towxml/index')
})

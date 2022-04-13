import { log } from './utils/log'
import './utils/global.js'
const updateManager = wx.getUpdateManager()

console.log("hello {0}, I am {1}".format("World", "MeetinaXD"));

!function(){
  var PageTmp = Page;
  Page = function (pageConfig) {
    // 设置全局默认分享
    Object.assign(pageConfig.data || {}, {
      disableAnimation: wx.getStorageSync('disableAnimation')
    })
 
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

      version: "0.4.2.0"
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

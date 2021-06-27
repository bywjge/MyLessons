require("./utils/global.js");

console.log("hello {0}, I am {1}".format("World", "MeetinaXD"));
// require('./utils/decode.js')
App({
  onLaunch: function () {
    const { height, top } = wx.getMenuButtonBoundingClientRect()
    const { statusBarHeight, windowWidth } = wx.getSystemInfoSync()
    const navBarHeight = statusBarHeight + height + (top-statusBarHeight) * 2
    wx.cloud.init({
      env: 'me-lesson-7g1wzhxzf81b7d04',
      traceUser: true,
    })

    const { eventBus } = require('./static/eventBus')
    require('./utils/debug')

    this.globalData = {
      utils: 
        require('./utils/tools'),
      exceptions: 
        require('./utils/exceptions'),
      logger:
        require('./utils/log').log,
      eventBus,
      navBarHeight,
      statusBarHeight,
      windowWidth,

      // 首页显示的课程模式（日或周），即day/week
      indexMode: "day",

      version: "0.3.8"
    }
  },

  towxml:require('/towxml/index')
})

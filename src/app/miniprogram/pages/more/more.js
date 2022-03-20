// miniprogram/pages/utils/utils.js
import { bindTheme, unbindTheme } from '../../utils/theme'
import moreApi from '../../apis/more'
Page({
  data: {

  },
  
  onLoad: function (options) {
    // data中自动添加一个theme
    bindTheme(this)
  },

  jumpToDiscuss() {
    // wx.navigateTo({ url: '/pages/discuss/discuss' })
  },

  jumpToFeedback() {
    // wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  // 查询空教室
  async jumpToQueryOccupy() {
    wx.navigateTo({ url: '/pages/query-occupy/query-occupy' })
  },

  jumpToQueryTeacherLesson() {
    wx.navigateTo({ url: '/pages/query-teacher-lesson/query-teacher-lesson' })
  }
})
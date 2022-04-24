const app = getApp();
const { navBarHeight } = getApp().globalData
const eventBus = app.globalData.eventBus;
import { bindTheme, unbindTheme } from '../../utils/theme'
import { doSync } from '../../static/js/schedule-sync'
import lessonApi from '../../apis/lessons'
import tools from '../../utils/tools';

Page({
  data: {
    indexMode: "daily",
    navBarHeight
  },

  handleClick(){
    let newMode = "daily"
    if (this.data.indexMode === 'daily'){
      newMode = "weekly"
    }
    this.setData({
      indexMode: newMode
    })
    eventBus.emit("switchView", newMode)
  },
  onLoad() {
    this.setData({
      indexMode: wx.getStorageSync('mainView') || 'daily'
    })
    // data中自动添加一个theme
    bindTheme(this)
    const { year, term } = lessonApi.getTerm()
    const termId = `${year}0${term}`
    if (termId !== wx.getStorageSync('lastSyncTerm')) {
      tools.showModal({
        title: '学期发生变化',
        content: '学期已经发生了变化，您需要现在更新课表吗？如选择不更新，本提示将不再弹出，需要手动在“我的”内更新课程。',
        showCancel: true
      }).then(() => {
        lessonApi.resetLesson()
      }).catch(() => {
        wx.setStorageSync('lastSyncTerm', termId)
      })
    }
  },
  onUnload() {
    unbindTheme()
  },

  onReady: function () {
    doSync()
    eventBus.on("switchView", name => {
      this.setData({
        indexMode: name
      })
    })
  }
})
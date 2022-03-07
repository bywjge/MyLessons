const app = getApp();
const { navBarHeight } = getApp().globalData
const eventBus = app.globalData.eventBus;
import { bindTheme, unbindTheme } from '../../utils/theme'

Page({
  data: {
    indexMode: "day",
    navBarHeight
  },

  handleClick(){
    let newMode = "day"
    if (this.data.indexMode === 'day'){
      newMode = "week"
    }
    this.setData({
      indexMode: newMode
    })
    eventBus.emit("switchView", newMode)
  },
  onLoad() {
    // data中自动添加一个theme
    bindTheme(this)
  },
  onUnload() {
    unbindTheme()
  },
  onReady: function () {
    eventBus.on("switchView", name => {
      this.setData({
        indexMode: name
      })
    })
  }
})
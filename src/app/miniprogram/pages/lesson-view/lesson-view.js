const app = getApp();
const { navBarHeight } = getApp().globalData
const eventBus = app.globalData.eventBus;

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
  onReady: function () {
    eventBus.on("switchView", name => {
      this.setData({
        indexMode: name
      })
    })
  }
})
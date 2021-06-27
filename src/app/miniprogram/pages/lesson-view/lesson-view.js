// miniprogram/pages/lesson-view/lesson-view.js
const app = getApp();
const eventBus = app.globalData.eventBus;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    indexMode: "day"
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

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    eventBus.on("switchView", name => {
      this.setData({
        indexMode: name
      })
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})
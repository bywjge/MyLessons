// miniprogram/pages/about-test/about-test.js
const app = getApp();
const { navBarHeight } = app.globalData
const utils = app.globalData.utils

Page({

  /**
   * 页面的初始数据
   */
  data: {
    version: app.globalData.version,
    article: {},
    navBarHeight
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    const md = (await utils.request({
      url: 'https://meetinaxd.ltiex.com/static/about.md'
    })).data
    let result = app.towxml(md,'markdown',{
			events:{					// 为元素绑定的事件方法
				tap:(e)=>{
					console.log('tap',e);
				}
			}
		});

		// 更新解析数据
		this.setData({
			article:result
		});
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

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
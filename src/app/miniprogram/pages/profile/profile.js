import tools from '../../utils/tools'
Page({
  data: {
    info: {
      姓名: 'Unknown',
      学院: 'Unknown',
      学号: '',
      性别: '男'
    }
  },

  onLoad() {
    const info = wx.getStorageSync('profile')
    
    this.setData({
      info
    })
  },

  /**
   * 更改用户头像
   */
  handleChangeAvator() {
    tools.showModal({
      title: "提示",
      content: "功能在开发中～"
    })
  }
})
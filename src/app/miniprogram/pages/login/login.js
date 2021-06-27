// miniprogram/pages/login/login.js

const { utils, exceptions, logger } = getApp().globalData
const api = require('../../apis/account')
const appApi = require('../../apis/app')
const log = new logger()

Page({
  data: {
    username: "",
    password: "",
    verifyCode: null,
    busy: false
  },

  // 页面加载完毕
  async onReady(){
    log.setKeyword('Page:login')
    // wx.hideLoading()
  },

  handleUserInput(e){
    this.setData({
      username: e.detail.value.trim()
    })
  },

  handlePassInput(e){
    this.setData({
      password: e.detail.value.trim()
    })
  },

  /**
   * 点击绑定按钮后
   */
  async handleClick(){
    const that = this

    if (this.data.busy)
      return ;

    if (this.data.username.isEmpty() || this.data.password.isEmpty()){
      utils.showModal({
        title: "登录信息不完整",
        content: "您需要正确填入账号和密码"
      });
      return ;
    }

    this.setData({
      busy: true
    })

    wx.showLoading({
      title: "请求数据中"
    });

    let ret = null
    try{
      ret = await api.doLogin(that.data.username, that.data.password)
    } catch ({error: {msg}}){
      console.log("error", msg);
      switch(msg){
        case "密码错误":
          utils.showModal({
            title: "好像不对...",
            content: "账号或密码不正确，再检查一遍哦"
          });
          break ;
        case "internal":
          exceptions.processingError();
          return false;
      }
      return ;
    } finally {
      wx.hideLoading()
      this.setData({
        busy: false
      })
    }
    const { cookie } = ret
    
    // 储存访问令牌
    wx.setStorageSync('cookie', cookie)
    
    wx.showLoading({
      title: '绑定账号中',
    });

    await appApi.bindAccount(that.data.username, that.data.password)
    utils.showToast({
      title: '绑定成功'
    }).then(async () => {
      await utils.sleep(1000)
      that.bindFinished()
    })
  },

  /**
   * 在绑定完成后做的事情
   */
  async bindFinished(){
    const lessonApi = require('../../apis/lessons')
    wx.setStorageSync('username', this.data.username)
    wx.setStorageSync('password', this.data.password)

    // 同步课表
    wx.showLoading({
      title: "同步数据中..."
    });

    // 先指定学期初
    await lessonApi.syncLessons()
    wx.hideLoading()
    const nowWeek = await lessonApi.convertDateToWeek(new Date())

    utils.showModal({
      title: "导入数据中..."
    })
    log.info("当前周：", nowWeek)
    log.info("本周课程:", wx.getStorageSync('lessons')[nowWeek - 1])
    await utils.showToast({
      title: '同步成功'
    })
    wx.redirectTo({
      url: '../lesson-view/lesson-view',
    })
  }
})
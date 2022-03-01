// miniprogram/pages/login/login.js
import logger from '../../utils/log'
import tools from '../../utils/tools'
import accountApi from '../../apis/account'
import lessonApi from '../../apis/lessons'
import appApi from '../../apis/app'

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
      tools.showModal({
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
      ret = await accountApi.doLogin(that.data.username, that.data.password)
    } catch (e){
      const msg = e?.error?.msg || ''
      switch(msg) {
        case "密码错误":
          tools.showModal({
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
    // const { cookie } = ret
    
    // 储存访问令牌
    wx.setStorageSync('cookie', ret)
    
    wx.showLoading({
      title: '绑定账号中',
    });

    await appApi.bindAccount(that.data.username, that.data.password)
    tools.showToast({
      title: '绑定成功'
    }).then(async () => {
      await tools.sleep(1000)
      that.bindFinished()
    })
  },

  /**
   * 在绑定完成后做的事情
   */
  async bindFinished(){
    wx.setStorageSync('username', this.data.username)
    wx.setStorageSync('password', this.data.password)

    // 同步课表
    wx.showLoading({
      title: "同步数据中..."
    });

    await lessonApi.syncLessons()
    wx.hideLoading()

    await tools.showToast({
      title: '同步成功'
    })
    wx.redirectTo({
      url: '../lesson-view/lesson-view',
    })
  }
})
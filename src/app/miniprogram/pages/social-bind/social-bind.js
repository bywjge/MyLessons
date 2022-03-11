// miniprogram/pages/login/login.js
import logger from '../../utils/log'
const log = new logger()
log.setKeyword('Page:social-bind')

import tools from '../../utils/tools'

Page({
  data: {
    publicName: "",
    isNextStep: false,
    privacy: {
      // 查看头像
      showAvatar: true,
      // 查看学籍
      showProfile: true,
      // 查看性别
      showGender: true,
      // 查看个人空间
      showOwnSpace: true,
      // 允许私信
      allowMessage: true
    }
  },

  handleNameInput(e){
    this.setData({
      publicName: e.detail.value.trim()
    })
  },

  async handleNextStep() {
    if (this.data.publicName.isEmpty()) {
      tools.showModal({
        title: "信息未完成",
        content: "您需要填入正确的名称哦"
      })
      return ;
    }

    // TODO 做姓名校验
    try{
      await tools.showModal({
        title: "确认公开名称",
        content: `名称可用，确定要使用"${this.data.publicName}"作为您的公开名称吗?`,
        showCancel: true
      })
    } catch {
      return ;
    }
    
    this.setData({
      isNextStep: true
    })
  },

  finishBind() {
    console.log(this.data.privacy)
  },

  handleSwitch({ target: { dataset: { name } }, detail: { value } }) {
    this.setData({
      [`privacy.${name}`]: value
    })
  }
})
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
      showAvator: true,
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

  handleNextStep() {
    if (this.data.publicName.isEmpty()) {
      tools.showModal({
        title: "信息未完成",
        content: "您需要填入正确的名称哦"
      })
      return ;
    }

    // TODO 做姓名校验
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
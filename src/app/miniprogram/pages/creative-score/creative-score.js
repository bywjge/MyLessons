import lessonApi from '../../apis/lessons'
import { bindTheme, unbindTheme } from '../../utils/theme'

Page({
  data: {
    passList: [],
    unpassList: [],
    empty: true,
    // 禁用的按钮
    disableButton: {
      pass: false,
      unpass: false
    },
    pickerArray: [],
    selectedTerm: 0,
    // 已认定绩点
    passScore: '0.00',
    // 未认定绩点
    unpassScore: '0.00'
  },

  async onLoad() {
    // data中自动添加一个theme
    bindTheme(this)
    this.checkBind()

    let scores = wx.getStorageSync('creativeScores')
    if (!scores || scores === "") {
      wx.showLoading({
        title: '同步数据中',
      })
      await lessonApi.getCreativeScoreFromSchool()
      wx.hideLoading().catch(() => {})
    }
    this.getData()
  },

  switchVisible({ currentTarget }) {
    const { dataset } = currentTarget
    const key = dataset.name
    
    this.setData({
      [`disableButton.${key}`]: !this.data.disableButton[key]
    })
  },
  onUnload() {
    unbindTheme()
  },

  async checkBind() {
    const binded = wx.getStorageSync('binded')
    if (!binded) {
      wx.redirectTo({
        url: '/pages/welcome/welcome',
      })
    }
  },
  // 选择学期
  getData() {
    let scores = wx.getStorageSync('creativeScores')

    if (!scores || scores === '') {
      this.setData({
        passList: [],
        unpassList: [],
        disableButton: {
          pass: true,
          unpass: true
        },
        empty: true
      })
      return ;
    }

    const passList = []
    const unpassList = []
    let passScore = 0
    let unpassScore = 0
    for (const key in scores) {
      const element = scores[key];
      if (!element || typeof element !== 'object')
        continue ;

      if (!element['通过']) {
        unpassList.push(element)
        unpassScore += element['学分']
      } else {
        passList.push(element)
        passScore += element['学分']
      }
    }

    // 如果没数据则默认禁用
    if (passList.length === 0) {
      this.setData({ 'disableButton.pass': true })
    } else {
      this.setData({ 'disableButton.pass': false })
    }

    if (unpassList.length === 0) {
      this.setData({ 'disableButton.unpass': true })
    } else {
      this.setData({ 'disableButton.unpass': false })
    }

    this.setData({
      unpassList,
      passList,
      unpassScore: unpassScore.toFixed(2),
      passScore: passScore.toFixed(2),
      empty: false
    })
  },

  async reload() {
    wx.showLoading({
      title: '同步数据中',
    })

    await lessonApi.getCreativeScoreFromSchool()
    wx.hideLoading().catch(() => {})
    this.getData()
  }
})
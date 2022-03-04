import lessonApi from '../../apis/lessons'
import tools from '../../utils/tools'
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
    selectedTerm: 0
  },

  async onLoad() {
    this.generateTermList()
    let scores = wx.getStorageSync('scores')
    if (!scores || scores === "") {
      wx.showLoading({
        title: '同步数据中',
      })
      await lessonApi.getScoreFromSchool()
      wx.hideLoading()
    }

    this.selectTerm(this.data.selectedTerm)
  },

  // 生成课表选择器
  generateTermList() {
    const from = Number(wx.getStorageSync('profile')['入学年份'])
    const { year, term } = lessonApi.getTerm()
    const to = year
    const ret = []
    let counter = 0
    for (let i = from; i <= to; i++) {
      for (let j = 1; j <= 2; j++) {
        counter++;
        if (i === year && j === term) {
          ret.push({
            text: `本学期`,
            value: `${i}0${j}`
          })
          break ;
        } else {
          ret.push({
            text: `${i}${j === 1? '上': '下'}学期`,
            value: `${i}0${j}`
          })
        }
      }
    }
    
    this.setData({
      pickerArray: ret,
      selectedTerm: counter - 1
    })
  },

  switchVisible({ currentTarget }) {
    const { dataset } = currentTarget
    const key = dataset.name
    
    this.setData({
      [`disableButton.${key}`]: !this.data.disableButton[key]
    })
  },

  // 选择学期
  selectTerm(e) {
    const index = (typeof e === 'number')? e: Math.floor(e.detail.value)
    this.setData({
      selectedTerm: index
    })

    const termId = this.data.pickerArray[index].value
    let scores = wx.getStorageSync('scores')[termId]
    if (!scores || scores === '') {
      this.setData({
        passList: [],
        unpassList: [],
        empty: true
      })
      return ;
    }

    const passList = []
    const unpassList = []
      for (const key in scores) {
      const element = scores[key];
      if (!element || typeof element !== 'object')
        continue ;

      if (element['成绩'] === '不及格' || Number(element['成绩']) < 60) {
        unpassList.push(element)
      } else {
        passList.push(element)
      }
    }

    this.setData({
      unpassList,
      passList,
      empty: false
    })
  },

  async reload() {
    wx.showLoading({
      title: '同步数据中',
    })

    await lessonApi.getScoreFromSchool()
    wx.hideLoading()
    this.selectTerm(this.data.selectedTerm)
  }
})
import lessonApi from '../../apis/lessons'
import tools from '../../utils/tools'
import api from '../../apis/app'

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
    // 学期绩点
    termScore: '0.00',
    // 学年绩点
    yearScore: '0.00'
  },

  async onLoad() {
    this.checkBind()
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

  async checkBind() {
    const authed = await api.isAppAuthed()
    const binded = wx.getStorageSync('binded')
    if (!authed || !binded) {
      wx.redirectTo({
        url: '/pages/welcome/welcome',
      })
    }
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
            value: `${i}0${j}`,
            year: i,
            term: j
          })
          break ;
        } else {
          ret.push({
            text: `${i}${j === 1? '上': '下'}学期`,
            value: `${i}0${j}`,
            year: i,
            term: j
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

    const termId = this.data.pickerArray[index]

    this.calcScore(termId.year, termId.term)
    let scores = wx.getStorageSync('scores')[termId.value]
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
      empty: false
    })
  },

  /**
   * 计算绩点
   * @param {Number} year 当前选择学年
   * @param {Number} term 当前选择学期
   */
  calcScore(year, term) {
  // 传入课程成绩数组，计算该学期绩点
    function _calc(scores) {
      if (scores.length === 0)
        return `0.00`
      let 总绩点 = 0
      let 总学分 = 0
      for (let i = 0; i < scores.length; i++) {
        const element = scores[i];
        if (!element || element['课程类型'].indexOf('通识课') !== -1)
          continue ;
        const 学分 = Number(element['学分'])
        const 绩点 = Number(element['成绩绩点'])
        总学分 += 学分
        总绩点 += 学分 * 绩点
      }
      return (总绩点 / 总学分).toFixed(2)
    }

    const all = wx.getStorageSync('scores')
    const termScores = all[`${year}0${term}`] || []
    const yearScores = termScores.concat(all[`${year}0${term === 1? 2: 1}`])

    const termScore = _calc(termScores)
    const yearScore = _calc(yearScores)

    this.setData({
      termScore,
      yearScore
    })
  },

  async reload() {
    wx.showLoading({
      title: '同步数据中',
    })

    await lessonApi.getScoreFromSchool()
    wx.hideLoading()
    this.selectTerm(this.data.selectedTerm)
  },

  showScoreWarning() {
    tools.showModal({
      title: '免责声明',
      content: '小程序的计算结果仅供个人参考，如需用于学校评优评先等事项，请咨询教务处自行计算'
    })
  }
})
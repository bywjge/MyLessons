import moreApi from '../../apis/more'
import lessonApi from '../../apis/lessons'
import tools from '../../utils/tools'
import cloneDeep from 'lodash.clonedeep'
let dayLessons = []
const 南主楼教室 = moreApi.allRooms['南主楼'].value.split(',')

Page({
  data: {
    x: -620,
    y: -450,
    buildings: {
      "北主楼": [],
      "马兰芳": [],
      "黄浩川": [],
      "南主楼": []
    },
    numbers: {
      南主楼: [],
      南主楼空教室: 南主楼教室
    },
    show: 'occupy',
    pickerArray: [],
    selectedDateIndex: null,
    /** 当前节次(1 - 13) */
    lessonIndex: 1,
    lessonIndexRaw: 1,
    timeList: [
      {
        text: '上午第一节',
        time: '08:14 - 09:50'
      },
      {
        text: '上午第二节',
        time: '10:10 - 11:45'
      },
      {
        text: '下午第一节',
        time: '14:45 - 16:20'
      },
      {
        text: '下午第二节',
        time: '16:30 - 18:05'
      },
      {
        text: '晚上第一节',
        time: '19:30 - 21:10'
      },
      {
        text: '晚上第二节',
        time: '21:20 - 23:00'
      },
      {
        text: '中午课程',
        time: '12:30 - 14:05'
      },
    ],

    onGoingCount: 0
  },

  onLoad() {
    const index = this.getNowIndex()
    this.setData({
      lessonIndexRaw: index,
      lessonIndex: Math.floor((index + 1) / 2)
    })
    this.generateDateList()
    this.selectDate(0)
    // this.refreshData()
  },

  /** 生成接下两周的选择器 */
  generateDateList() {
    const ret = []
    const now = new Date()
    for (let i = 0; i < 14; i++) {
      const date = now.nDaysLater(i)
      ret.push({
        text: (i === 0)? '今天': date.format('YYYY/mm/dd'),
        value: date.format('YYYY-mm-dd')
      })
    }

    this.setData({
      pickerArray: ret
    })
  },

  /** 选择日期 */
  async selectDate(e, force) {
    const index = (typeof e === 'number')? e: Math.floor(e.detail.value)
    if (!force && this.data.selectedDateIndex !== null && index === this.data.selectedDateIndex)
      return ;
    const date = this.data.pickerArray[index].value

    wx.showLoading({ title: '加载数据中' })
    const { time, lessons } = await moreApi.getAllLessons(date, force)
    dayLessons = cloneDeep(lessons)

    this.setData({
      selectedDateIndex: index
    }, () => this.refreshData())

    wx.hideLoading().catch(() => {})
  },

  /** 刷新数据 */
  reload() {
    this.selectDate(this.data.selectedDateIndex, true)
  },

  getNowIndex() {
    const now = new Date()
    let 当前节次 = 1
    for (let i = 1; i <= 14; i+=2) {
      const t = lessonApi.convertIndexToTime(i)[1]
      if (now > t) {
        当前节次 = i
      } else {
        break
      }
    }

    return 当前节次
  },

  async refreshData() {
    let 北主楼 = new Array(11).fill(null).map(() => new Array(5).fill(null))
    let 马兰芳 = new Array(5).fill(null).map(() => new Array(4).fill(null))
    let 黄浩川 = new Array(5).fill(null).map(() => new Array(4).fill(null))
    let 南主楼 = new Array(5).fill(null).map(() => new Array(30).fill(null))
    let 南主楼空教室 = new Array(5).fill(null).map(() => new Array(30).fill(null))
    
    // lessonApi.convertIndexToTime()
    // let 当前节次 = this.getNowIndex()
    let 当前节次 = this.data.lessonIndexRaw
    const lessons = dayLessons
    let onGoingCount = 0
    let q = 0
    lessons.forEach(e => {
      if (Number(e['节次'][0]) !== 当前节次)
        return ;
      // console.log(e['教学地点'], e['编号'], ++q)
      
      let floor = Number(e['编号'].substr(0,1)) - 1
      let index = Number(e['编号'].substr(1,2)) - 1
      if (e['编号'].length === 4) {
        floor = Number(e['编号'].substr(0,2)) - 1
        index = Number(e['编号'].substr(2,2)) - 1
      }

      switch(e['教学地点']) {
        case '北主楼':
          onGoingCount++
          北主楼[floor][index] = e
          break;
        case '黄浩川教学楼':
          onGoingCount++
          黄浩川[floor][index] = e
          break;
        case '马兰芳教学楼':
          onGoingCount++
          马兰芳[floor][index] = e
          break;
        case '南主楼':
          南主楼[floor].push(e['编号'])
          break;
      }
    })

    南主楼教室.forEach(id => {
      let floor = Number(id.substr(0,1)) - 1
      let index = Number(id.substr(1,2)) - 1
      if (南主楼[floor].indexOf(id) === -1) 
        南主楼空教室[floor].push(id)
    })

    this.setData({
      buildings: {
        北主楼,
        黄浩川,
        马兰芳,
      },

      numbers: {
        南主楼,
        南主楼空教室
      },
      onGoingCount
    })
  },

  /** 切换到列表视图 */
  switchToListView() {

  },

  /**
   * 切换课程
   * @param {1 | 2 | 3 | 4 | 5 | 6 | 7} i 课程节次，1-7
   */
  setIndex(i) {
    if (i <= 0 || i > 7) 
      throw new Error("输入的课程节次有误")
    
    this.setData({
      lessonIndexRaw: i * 2 - 1,
      lessonIndex: i
    }, () => this.refreshData())
  },

  handlePrevLessons() {
    if (this.data.lessonIndex === 1) {
      return ;
    }

    this.setIndex(this.data.lessonIndex - 1)
  },

  handleNextLessons() {
    if (this.data.lessonIndex === 7) {
      return ;
    }

    this.setIndex(this.data.lessonIndex + 1)
  },

  changeShowMode() {
    const newStatus = this.data.show === 'occupy'? 'free': 'occupy'
    this.setData({
      show: newStatus
    })
  }
})
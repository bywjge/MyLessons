import moreApi from '../../apis/more'
import lessonApi from '../../apis/lessons'

Page({
  data: {
    x: -620,
    y: -450,
    buildings: {
      "北主楼": [],
      "马兰芳": [],
      "黄浩川": []
    },
    show: 'occupy',
    lastIndex: 0
  },

  onLoad() {
    this.refreshData()
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
 
  async refreshData(date, force = false) {
    wx.showLoading({ title: '加载数据中' })
    let 北主楼 = new Array(11).fill(null).map(() => new Array(5).fill(null))
    let 马兰芳 = new Array(5).fill(null).map(() => new Array(4).fill(null))
    let 黄浩川 = new Array(5).fill(null).map(() => new Array(4).fill(null))
    const { time, lessons } = await moreApi.getAllLessons(date, force)
    // lessonApi.convertIndexToTime()
    let 当前节次 = this.getNowIndex()
    
    lessons.forEach(e => {
      if (e['节次'][0] !== 当前节次)
        return ;
      
      let floor = Number(e['编号'].substr(0,1)) - 1
      let index = Number(e['编号'].substr(1,2)) - 1
      if (e['编号'].length === 4) {
        floor = Number(e['编号'].substr(0,2)) - 1
        index = Number(e['编号'].substr(2,2)) - 1
      }

      switch(e['教学地点']) {
        case '北主楼':
          北主楼[floor][index] = e
          break;
        case '黄浩川教学楼':
          黄浩川[floor][index] = e
          break;
        case '马兰芳教学楼':
          马兰芳[floor][index] = e
          break;
      }
    })

    this.setData({
      buildings: {
        北主楼,
        黄浩川,
        马兰芳,
      },
      lastIndex: 当前节次
    })

    wx.hideLoading().catch(() => {})
  }
})
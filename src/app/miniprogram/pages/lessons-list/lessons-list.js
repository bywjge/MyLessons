Page({
  data: {
    doneList: [],
    undoneList: [],
    // 禁用的按钮
    disableButton: {
      done: false,
      undone: false
    }
  },
  onLoad() {
    const lesson = wx.getStorageSync('lessonsMap')
    const doneList = []
    const undoneList = []
    const now = new Date()
      for (const key in lesson) {
      const element = lesson[key];
      const 已上节数 = element['上课时间']
        .map(e => new Date(e))
        .findIndex(e => e > now)

      element['课程名称'] = key
      element['已上节数'] = 已上节数
      element['进度'] = Math.round(已上节数 * 100 / element['课程节数'])


      if (element['课程节数'] === 已上节数)
        doneList.push(element)
      else
        undoneList.push(element)
    }

    // 如果没数据则默认禁用
    if (doneList.length === 0) {
      this.setData({ 'disableButton.done': true })
    } else {
      this.setData({ 'disableButton.done': false })
    }

    if (undoneList.length === 0) {
      this.setData({ 'disableButton.undone': true })
    } else {
      this.setData({ 'disableButton.undone': false })
    }

    this.setData({
      doneList,
      undoneList
    })
  },
  switchVisible({ currentTarget }) {
    const { dataset } = currentTarget
    const key = dataset.name
    
    this.setData({
      [`disableButton.${key}`]: !this.data.disableButton[key]
    })
  }
})
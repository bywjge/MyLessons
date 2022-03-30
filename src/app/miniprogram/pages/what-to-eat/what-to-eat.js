const { default: tools } = require("../../utils/tools")

// pages/what-to-eat/what-to-eat.js
const app = getApp()
const { windowWidth, windowHeight, navBarHeight } = app.globalData
const foodList = "麦当劳,肯德基,炒面,云吞,泡面".split(',')

Page({
  data: {
    items: [],
    invisible: {},
    isRunning: false,
    timer: null,
    foodName: "麦当劳",
    times: 0
  },
  onReady() {
    let counter = 0
    const handler = setInterval(async () => {
      if (this.data.items.length > 20 || (!this.data.isRunning && this.data.items.length)) {
        await this.changeItemVisible(this.data.items[0].id, true)
        this.data.items.shift()
        this.setData({
          items: this.data.items
        })
      } 
      const randomName = foodList[this.random(0, foodList.length)]

      if (this.data.isRunning) {
        counter++
        this.data.items.push({
          id: "food-background-" + counter,
          left: this.random(0, windowWidth ) + 'px',
          top: this.random(navBarHeight, windowHeight - navBarHeight) + 'px',
          name: randomName
        })
        this.setData({ items: this.data.items, foodName: randomName })
        // this.changeItemVisible("food-background-" + counter, true)
      }
    }, 200)

    this.setData({
      timer: handler
    })
  },

  onUnload() {
    clearInterval(this.data.timer)
  },

  random(from, to) {
    return Math.floor(Math.random() * (to - from) + from)
  },

  async changeItemVisible(id, visible) {
    this.setData({
      [`invisible.${id}`]: visible
    })
    await tools.sleep(1200)
    return Promise.resolve()
  },

  handleStart() {
    if (!this.data.isRunning)
      this.setData({ times: this.data.times + 1 })
    
    if (this.data.times > 3) {
      this.setData({ isRunning: false })
      return ;
    }

    this.setData({ isRunning: !this.data.isRunning })
  }
})
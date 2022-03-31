const { default: tools } = require("../../utils/tools")

// pages/what-to-eat/what-to-eat.js
const app = getApp()
const { windowWidth, windowHeight, navBarHeight } = app.globalData
const foodList = ["泡面","麦当劳","肯德基","猪肚鸡","关东煮","韩式拌饭","鸭血粉丝","酸菜牛肉面","烤肉饭鱼香肉丝套餐 ","大可鱼酸菜肥牛","手撕鸡","自助餐","东北大饼","饺子","云吞","煲仔饭","香锅","刀削面","五谷渔粉","肠粉","石锅饭","酸菜鱼","鸡扒饭","煲仔菜","螺狮粉","炒饭","重庆小面","姆斯汉堡","韩式炸鸡","牛杂","麻辣烫","玉米粥","小米粥","八宝粥","云吞面","潮汕小炒","老上海馄饨","正新鸡排"]

Page({
  data: {
    items: [],
    invisible: {},
    isRunning: false,
    timer: null,
    foodName: null,
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
        // await tools.sleep(1000)
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
      this.setData({ invisible: {}, times: this.data.times + 1, isRunning: true, foodName: foodList[this.random(0, foodList.length)] })
    else
      this.setData({ isRunning: false })

    if (this.data.times > 5) {
      this.setData({ isRunning: false })
      return ;
    }
  }
})
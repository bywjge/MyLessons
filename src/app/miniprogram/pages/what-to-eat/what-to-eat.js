const { default: tools } = require("../../utils/tools")

// pages/what-to-eat/what-to-eat.js
const app = getApp()
const { windowWidth, windowHeight, navBarHeight } = app.globalData
const list = {
  '一饭一楼(北区)': ["张记关东煮", "家乐堡", "重庆面馆", "五谷渔粉", "正新鸡排", "浓汤煲仔菜", "咖喱炒饭", "石墨肠粉王", "鸡腿饭", "南北风味", "隆江猪脚饭", "粤海味", "贰冒", "F+牛肉饭", "莫老鸭", "土耳其烤肉饭", "广式烧腊坊", "湛江鸭仔饭", "柳州螺蛳粉", "桂林米粉", "美味乐餐厅", "六哥锅贴"],
  '一饭二楼(北区)': ["鸭血粉丝", "面生源酸菜牛肉面 ", "烤肉饭鱼香肉丝套餐 ", "大可鱼酸菜肥牛", "手撕鸡"],
  '一饭四楼(北区)': ["自助餐", "猪肚鸡", "韩式拌饭"],
  '二饭(玫瑰园楼下)': ["198烧腊", "韩式扒饭", "湛江鸡饭", "精美小炒", "QQ煲仔饭", "优米", "东北特色", "老上海馄饨", "牛杂粉面", "真味小炒", "酸辣粉", "喵小二", "谷物渔粉", "德瑞克", "台湾卤肉", "潮汕小炒", "潮粤小炒", "猪手达人", "唐小鸭", "缘味先", "现点快炒", "靓汤煲菜", "龙记粉面", "广式肠粉", "东北大饼饺子", "香拌云吞", "煲仔饭", "香锅", "刀削面", "五谷渔粉", "缘味先石锅饭 ", "缘味先酸菜鱼"],
  '三饭(西区)': ["鸡扒饭", "煲仔菜", "香锅", "麻辣烫", "螺狮粉", "炒饭", "刀削面", "重庆小面", "姆斯汉堡", "韩式炸鸡", "牛杂", "云吞"],
  '四饭(北区)': ["广式烧腊", "西式扒饭", "大盘饭", "港饮港食", "粤式小炒", "潮汕小炒", "风味小炒", "特色粉面", "麻辣香锅", "牛杂", "广式肠粉", "串烧小食", "校堡贝", "麻辣烫", "小米粥", "八宝粥 ", "云吞面"],
  '益华广场(校外)': ["麦当劳", "肯德基"],
  '汇悦城(校外)': ["锅小闲", "蛙小侠", "嘿小面", "海底捞"],
  '美景路(校外)': ["姐妹火锅"],
  '江华路(校外)': ["小湄东南亚菜"]
}
let foodList = []

for (const key in list) {
  const arr = list[key]
  foodList = foodList.concat(arr.map(e => ({
    location: key,
    name: e
  })))
}
Page({
  data: {
    items: [],
    invisible: {},
    isRunning: false,
    timer: null,
    foodName: null,
    times: 0,
    preStop: false,
    maxTime: 6
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

      if (this.data.isRunning && ! this.data.preStop) {
        // counter++
        // this.data.items.push({
        //   id: "food-background-" + counter,
        //   left: this.random(0, windowWidth ) + 'px',
        //   top: this.random(navBarHeight, windowHeight - navBarHeight) + 'px',
        //   name: randomName.name
        // })
        this.setData({ items: this.data.items, foodName: randomName })
        await tools.sleep(1000)
        // this.changeItemVisible("food-background-" + counter, true)
      }
    }, 100)

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

  async handleStart() {
    if (!this.data.isRunning)
      this.setData({ invisible: {}, times: this.data.times + 1, isRunning: true, foodName: foodList[this.random(0, foodList.length)] })
    else {
      this.setData({ preStop: true })
      for (let i = 1; i <= 10; i++) {
        const randomName = foodList[this.random(0, foodList.length)]
        this.setData({
          foodName: randomName
        })
        await tools.sleep(i * 50)
      }
      this.setData({
        preStop: false,
        isRunning: false
      })
    }

    if (this.data.times > this.data.maxTime) {
      this.setData({ isRunning: false })
      return ;
    }
  }
})
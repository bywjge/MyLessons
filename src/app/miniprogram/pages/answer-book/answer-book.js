const { default: tools } = require("../../utils/tools")

// pages/what-to-eat/what-to-eat.js
const app = getApp()
const { windowWidth, windowHeight, navBarHeight } = app.globalData
const diceMap = [
  [1, 4, 6, 3],
  [5, 4, 2, 3],
  [6, 4, 1, 3],
  [2, 4, 5, 3]
]

Page({
  data: {
    // 选择的模式：choose/dice
    mode: 'choose',
    items: [],
    visible: {
      main: true,
      choose: false,
      dice: false
    },
    chooseDelay: 1.2,
    nowRound: '',
    hasResult: false,
    render: {
      main: true,
      choose: false,
      dice: false
    },
    rotate: {
      x: 0,
      y: 0
    },
    isRunning: false,
    results: [],
    counter: 0,
    timer: null,
    hasClick: false,
    rightCount: 0,
    wrongCount: 0
  },
  async onReady() {
    await tools.nextTick()
  },

  random(from, to) {
    return Math.floor(Math.random() * (to - from) + from)
  },

  async changeVisible(key) {
    const animationTime = 800 //ms
    if (!this.data.visible.hasOwnProperty(key) || this.data.visible[key])
      return ;

    // 隐藏当前所有元素
    this.setData({ visible: { main: false, choose: false, dice: false } })
    await tools.sleep(animationTime)
    await tools.nextTick()
    // 允许渲染当前元素
    this.setData({ 
      render: {
        ...{ main: false, choose: false, dice: false },
        [key]: true
      }
    })

    await tools.nextTick()
    this.setData({ [`visible.${key}`]: true, mode: key })
    await tools.sleep(animationTime)
    return Promise.resolve()
  },

  async startChoose() {
    await this.changeVisible('choose')
    this.setData({ isRunning: true })
    await tools.nextTick()
    const result = Math.random() >= 0.5? 'right': 'wrong'
    await tools.sleep(1500)
    await tools.nextTick()

    if (result === 'right')
      this.setData({ rightCount: this.data.rightCount + 1 })
    else
      this.setData({ wrongCount: this.data.wrongCount + 1 })

    this.setData({
      results: this.data.results.concat(result),
      nowRound: result,
      hasResult: true,
      isRunning: false,
      counter: this.data.counter + 1
    })
  },

  async startDice() {
    if (this.data.timer) {
      clearTimeout(this.data.timer)
      this.setData({
        timer: null
      })
    }
    await this.changeVisible('dice')
    this.setData({ isRunning: true })
    // 定义最小最大旋转圈数
    const min = 5, max = 24
    let newx = 0, newy = this.random(min, max) * 90

    // 不允许任何一面和原来的一样
    while((this.data.rotate.x - newx) % 360 === 0) newx = this.random(min, max) * 90;
    // while((this.data.rotate.y - newy) % 360 === 0) newy = this.random(min, max) * 90;

    // 计算旋转后的点数
    const diceNumber = diceMap[(newy % 360) / 90][(newx % 360) / 90]
    console.log((newx % 360) / 90, (newy % 360) / 90, diceNumber)
    this.setData({
      rotate: {
        x: newx,
        y: newy
      }
    })
    const timer = setTimeout(() => {
      this.setData({
        results: this.data.results.concat('dice-' + diceNumber),
        isRunning: false,
        // counter: this.data.counter + 1
    })
    }, 4000)
    this.setData({
      timer
    })
  },

  async restart() {
    if (this.data.counter > 20) {
      this.setData({
        counter: 999
      })
      tools.showModal({
        title: '不给按',
        content: '别纠结了！！'
      })
      return ;
    }
    if (!this.data.hasClick && this.data.counter === 3) {
      tools.showModal({
        title: '啊哦',
        content: '别耍赖啦，三次就好～'
      }).then(() => {
        this.setData({
          hasClick: true
        })
      })
      return ;
    }

    if (this.data.hasClick && this.data.counter === 3) {
      await tools.showModal({
        title: '哎呀',
        content: '真拿你没办法！'
      })
    }

    if (this.data.mode === 'choose')
      this.startChoose()

    if (this.data.mode === 'dice')
      this.startDice()
  }
})
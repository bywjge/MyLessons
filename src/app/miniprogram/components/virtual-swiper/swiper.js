import tools from '../../utils/tools'

Component({
  options: {
    multipleSlots: true
  },

  properties: {
    // 滑动组件所使用的数据源
    list: {
      type: Array,
      default: () => []
    },
    
    // 滑动组件时使用的左右缓冲item数量
    bufferCount: {
      type: Number,
      default: 3
    },

    // 滑动动画时长
    animationDuration: {
      type: Number,
      default: 500
    }
  },

  data: {
    // 数据源在虚拟列表中的下标，用于传递给原生swiper的current属性
    currentIndex: 0,
    // 等待滑动动画结束后的任务key
    nowTask: null,
    // 上次虚拟列表的下标
    lastIndex: 0,
    // 对应数据中的真实的下标
    realIndex: 0,
    // 虚拟列表
    virtualList: [],
    // 当前swiper的动画时长值
    duration: 0
  },

  onLoad() {
    this.setData({
      duration: this.properties.animationDuration
    })
    this.switchTo(0)
  },
  methods: {
    /**
     * swiper的滑动动画播放完毕后调用
     */
    onAnimationFinish({ detail }) {
      if (detail.source !== "touch")
        return ;

      // 计算滑动后的数据下标
      const index = this.data.realIndex + detail.current - this.data.lastIndex
      this.switchTo(index)
    },
    
    /**
     * 跳转到列表的某个下标
     * @param {number} index 要跳转到的项目
     * @description 在swiper的animation完成以后调用，或在列表初始化后使用
     */
    switchTo(index) {
      const list = this.properties.list
      const gap = this.data.bufferCount
      if (index < 0 || index >= list.length)
        return ;
      
      const key = tools.randomString(8)
      this.setData({
        nowTask: key,
        realIndex: index
      })

      const from = Math.max(0, index - gap)
      const to = Math.min(index + gap, list.length - 1)

      const newList = []
      // 填充虚拟列表
      for (let i = from; i <= to; i++) {
        newList.push(list[i])
      }
      // 计算虚拟列表中当前显示项目的下标
      const current = index - from

      // 取消动画
      this.setData({
        duration: 0
      }, function() {
        // 如果后面有新动画触发，当前操作则取消
        if (this.data.nowTask !== null && this.data.nowTask !== key)
          return ;

        // 同时更改currentIndex以及virtualList，否则会有闪烁
        this.setData({
          currentIndex: current,
          lastIndex: current,
          duration: 300,
          virtualList: list
        })
      })
    }
  }
})

import tools from '../../utils/tools'
let busy = false
let layerAnimationTime = 200
let windowAnimationTime = 300
let expandAnimationTime = 50

Component({
  options: {
    multipleSlots: true, // 在组件定义时的选项中启用多slot支持
    addGlobalClass: true
  },

  properties: {
    title: {
      type: String,
      value: "标题"
    },

    enableExpand: {
      type: Boolean,
      value: true
    }
  },
  
  lifetimes: {
    attached() {
      if (wx.getStorageSync('disableAnimation')){
        this.setData({ disableAnimation: true })
        layerAnimationTime = windowAnimationTime = expandAnimationTime = 0
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    expanded: false,
    lastY: 0,
    visible: {
      layer: false,
      window: false
    },
    render: false,
    busy: false,
    disableAnimation: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /** 滑动时处理顶部个人中心隐藏 */
    handleTouchMove: tools.throttle(function({ touches }){
      const sensitive = 20
      const { pageY } = touches[0]
      const delta = pageY - this.data.lastY
      if (!this.properties.enableExpand || this.data.expanded) {
        return ;
        this.setData({
          lastY: pageY
        })
        return ;
      }

      this.setData({
        expanded: Math.abs(delta) > sensitive? (delta < 0): this.data.expanded,
        lastY: pageY
      })
    }, 20),

    handleLayerTap(e) {
      this.switchVisible(false)
    },

    // 设置pop window的可见性
    async switchVisible(value) {
      if (this.data.render === value || busy)
        return ;

      busy = true
      if (value === true) {
        // 显示时，先设置render为true，visible全部为false
        this.setData({ render: true })
        await tools.nextTick()

        // 设置layer为true，等待动画渲染完毕
        this.setData({ 'visible.layer': true })
        await tools.sleep(layerAnimationTime)

        // 设置window为true，等待动画渲染完毕
        this.setData({ 'visible.window': true })
        await tools.sleep(windowAnimationTime)

      } else {
        if (this.data.expanded) {
          this.setData({ expanded: false })
          await tools.sleep(expandAnimationTime)
        }
        // 设置window为false，等待动画渲染完毕
        this.setData({ 'visible.window': false })
        await tools.sleep(windowAnimationTime)

        // 设置layer为false，等待动画渲染完毕
        this.setData({ 'visible.layer': false })
        await tools.sleep(layerAnimationTime)

        // 设置render为false
        this.setData({ render: false })
        await tools.nextTick()
      }
      busy = false
      return Promise.resolve()
    },

    empty() {}
  }
})

// components/navigation-bar/navigation-bar.js
import tools from '../../utils/tools'
import pages from '../../static/pages'
const { navBarHeight, windowWidth, statusBarHeight, statusBarButtonHeight } = getApp().globalData


Component({
  /**
   * 组件的属性列表
   */
  options: {
    multipleSlots: true
  },
  properties: {
    // background: {
    //   type: String,
    //   value: "#FFB8C5"
    // },
    // color: {
    //   type: String,
    //   value: "white"
    // },
    title: {
      type: String,
      value: "My Lesson"
    },
    // 是否可以点击中间的menu菜单
    enableMenu: {
      type: Boolean,
      value: true
    },
    // 如果不显示menu，则显示back button
    enableBackButton: {
      type: Boolean,
      value: true
    }
  },
  
  lifetimes: {
    attached(){
      const p = getCurrentPages()
      const nowPage = "/" + p[p.length - 1].route
      this.setData({
        pages,
        nowPage
      })

      // console.log(nowPage);
    }
  },
  
  /**
   * 组件的初始数据
   */
  data: {
    navBarHeight,
    windowWidth,
    statusBarHeight,
    statusBarButtonHeight,

    showMenu: false,
    showMenuLayer: false,

    hiddenOther: false,
    hiddenLayer: false,

    busy: false
  },

  methods: {
    // 显示/隐藏 菜单
    // 控制动画和display none
    // 注意动画时长为0.3s
    async handleMenuClick(e, status = null){
      // 如果正在忙或者不允许展示menu
      if (this.data.busy || !this.properties.enableMenu){
        return ;
      }
      const animationTime = 300 //ms
      let newShowMenu = !this.data.showMenu
      if (status !== null) {
        newShowMenu = status
      }
      const that = this
      // this.setData({ busy: true })
      if (newShowMenu) {
        this.setData({ showMenuLayer: true, hiddenOther: true, hiddenLayer: true, showMenu: true })
        
      } else {
        this.setData({ showMenu: false, hiddenLayer: false, hiddenOther: false, showMenuLayer: false })
      }
      await tools.nextTick()
      this.setData({ busy: false })
    },

    async handleItemClick({ currentTarget, type }){
      if (type !== 'tap')
        return 
      const { name, url, selected } = currentTarget.dataset
      if (selected){
        return ;
      }
      this.handleMenuClick(null, false)
      this.setData({ busy: true })
      // await tools.sleep(200)
      // await tools.nextTick()
      wx.redirectTo({
        url: url,
      })
    },

    async handleBarClick(e){
      const { id } = e.target
      if (id === 'title' || !this.data.showMenu){
        return ;
      }
      this.handleMenuClick()
    },

    goBack() {
      this.triggerEvent()
      const pages = getCurrentPages()
      // 没有上一页可以返回
      if (pages.length === 1) {
        wx.redirectTo({ url: '/pages/me/me'})
      } else {
        wx.navigateBack({ delta: 1 })   
      }
    }
  }
})

// components/developHint/develop.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
  
  },

  lifetimes: {
    attached(){
      if (__wxConfig.envVersion !== 'develop'){
        this.setData({
          show: true
        })
      }
    }
  },
  /**
   * 组件的初始数据
   */
  data: {
    show: false
  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})

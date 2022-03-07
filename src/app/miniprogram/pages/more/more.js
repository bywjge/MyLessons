// miniprogram/pages/utils/utils.js
import { bindTheme, unbindTheme } from '../../utils/theme'
Page({
  data: {

  },
  
  onLoad: function (options) {
    // data中自动添加一个theme
    bindTheme(this)
  }
})
/**
 * 主题自动切换
 */
const eventBus = getApp().globalData.eventBus;
let eventbusId = null
/**
 * 绑定页面this，并自动更改theme的值（当主题切换时）
 * @param {object} _this 页面this对象
 */
export function bindTheme(_this) {
  const theme = getApp().globalData.theme
  _this.setData.call(_this, {
    theme
  })

  wx.setBackgroundColor({
    backgroundColor: (theme === 'light')? 'white': '#1d1d1d'
  })

  eventbusId = eventBus.on('changeTheme', (theme = 'light') => {
    getApp().globalData.theme = theme
    _this.setData.call(_this, {
      theme
    })
  })
}

export function unbindTheme() {
  eventBus.off('changeTheme', eventbusId)
}

export function changeTheme(theme = 'light') {
  eventBus.emit('changeTheme', theme)
  const backgroundColor = (theme === 'light')? '#FFB8C5': '#121212'
  console.log(backgroundColor)
  wx.setBackgroundColor({
    backgroundColor
  })
}
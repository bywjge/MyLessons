// 来源：https://developers.weixin.qq.com/miniprogram/dev/framework/realtimelog/

var log = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null

const _log = function (){
  
}
_log.prototype.info = function(){
  if (!log) return
  log.info.apply(log, arguments)
  console.log.apply(console.log, arguments)
}
_log.prototype.warn = function(){
  if (!log) return
  log.warn.apply(log, arguments)
  console.warn.apply(console.warn, arguments)
}

_log.prototype.error = function(){
  if (!log) return
  console.error(...arguments)
  log.error.apply(log, arguments)
}

_log.prototype.setKeyword = function(msg){
  if (!log || !log.setFilterMsg) return
  if (typeof msg !== 'string') return
  log.setFilterMsg(msg)
}

_log.prototype.addKeyword = function(msg) { // 从基础库2.8.1开始支持
  if (!log || !log.addFilterMsg) return
  if (typeof msg !== 'string') return
  log.addFilterMsg(msg)
}

module.exports =  { log: _log };
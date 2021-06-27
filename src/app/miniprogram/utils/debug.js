+function(){
  const { log: logger } = require('./log')
  const log = new logger()
  
  const { SDKVersion, model, system, version, enableDebug, devicePixelRatio } = wx.getSystemInfoSync()
  const str = `
    SDK Version = ${SDKVersion},
    model = ${model},
    system = ${system},
    version = ${version},
    enableDebug = ${enableDebug},
    devicePixelRatio = ${devicePixelRatio}
  `
  log.info(str)
}()
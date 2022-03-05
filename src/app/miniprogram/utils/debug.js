/**
 * 这里一切与debug都有关系
 */
import logger from './log'
const app = getApp();
const log = new logger()

function printDebugInfo() {
  const enableDebug = wx.getStorageSync('enableDebug')
  const { SDKVersion, model, system, version, devicePixelRatio } = wx.getSystemInfoSync()
  const str = `
    version: ${app.globalData.version},
    SDK Version = ${SDKVersion},
    model = ${model},
    system = ${system},
    version = ${version},
    enableDebug = ${!!enableDebug},
    devicePixelRatio = ${devicePixelRatio}
  `
  log.info(str)
}

printDebugInfo()

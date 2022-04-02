export default {
  getOpenId,
  isAppAuthed
}

import logger from '../utils/log'
import cloud from '../utils/cloud'

const log = new logger()
log.setKeyword('apis/app.js')


/**
 * 调用云函数来获取用户的openid
 * @description
 *   注意需要用户授权后才能调用，会自动写入到storage
 */
async function getOpenId() {
  let openid = wx.getStorageSync('openid')
  if (openid !== '')
    return openid
  const ret = await cloud.callFunction({
    name: 'login',
    data: {
      action: 'getOpenid',
    }
  })
  openid = ret.openid
  wx.setStorageSync('openid', openid)

  return openid
}

function isAppAuthed(){
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: res => {
        resolve(!!res.authSetting['scope.userInfo'])
      },
      fail: () => {
        reject()
      }
    })
  })
}
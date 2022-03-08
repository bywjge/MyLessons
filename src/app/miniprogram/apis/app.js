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
 *   注意需要用户授权后才能调用
 */
async function getOpenId(){
  const ret = await cloud.callFunction({
    name: 'login',
    data: {
      action: 'getOpenid',
    }
  })

  return ret.openid
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
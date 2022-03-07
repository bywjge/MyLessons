export default {
  checkBind,
  bindAccount,
  getOpenId,
  isAppAuthed
}

const db = wx.cloud.database()
import logger from '../utils/log'
import cloud from '../utils/cloud'
import * as database from '../static/js/database'

const log = new logger()
log.setKeyword('apis/app.js')

/**
 * 检查数据库，看微信账号是否已经绑定教务系统
 * @description
 *   如果已经绑定，则返回对象，包含账号密码
 *   如果没有绑定，则返回null
 */
async function checkBind(){
    let openid = wx.getStorageSync('openid')
    if (!openid || openid === '')
    openid = await getOpenId()
    wx.setStorageSync('openid', openid)

    const ret = await database.getRecord('accounts', openid)
    if (ret.length === 0) {
      return null
    }
    return ret[0]
}

/**
 * 绑定微信账号和教务系统账号
 * @description 
 *   会自动处理已经存在的绑定
 * @param {string} username 教务系统账号
 * @param {string} password 教务系统密码
 */
async function bindAccount(username, password){
  const isBind = await checkBind()
  const openid = wx.getStorageSync('openid')
  const { userInfo } = await wx.getUserInfo()
  // 如果没有记录，则新增
  if (!isBind){
    log.info("新增记录")
    return database.newRecord('accounts', {
      username,
      password,
      userInfo
    })
  }

  // 如果已经有记录，则更新
  log.info("更新记录")
  const { _id: id } = isBind
  return db.collection('accounts').doc(id).update({
    data: {
      username,
      password,
      userInfo
    }
  })
}

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
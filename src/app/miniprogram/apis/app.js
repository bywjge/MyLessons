export default {
  checkBind,
  bindAccount,
  getOpenId,
  isAppAuthed
}

const db = wx.cloud.database()
import logger from '../utils/log'
import cloud from '../utils/cloud'
const log = new logger()
log.setKeyword('apis/app.js')

/**
 * 检查数据库，看微信账号是否已经绑定教务系统
 * @description
 *   如果已经绑定，则返回对象，包含账号密码
 *   如果没有绑定，则返回null
 */
function checkBind(){
  const openid = wx.getStorageSync('openid')
  return new Promise((resolve, reject) => {
    db.collection('accounts').where({
      _openid: openid
    }).get({
      success: res => {
        // 如果存在记录，那么就返回账号密码
        if (res.data.length === 0)
          resolve(null)

        resolve(res.data[0])
      },
      fail: err => reject(err)
    })
  })
}

/**
 * 绑定微信账号和教务系统账号
 * @description 
 *   会自动处理已经存在的绑定
 * @param {教务系统账号} username 
 * @param {教务系统密码} password 
 */
async function bindAccount(username, password){
  const isBind = await checkBind()

  // 如果没有记录，则新增
  if (!isBind){
    log.info("新增记录")
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database()
      db.collection('accounts').add({
        data: {
          username,
          password
        },
        success: res => resolve(res),
        fail: err => reject(err)
      })
    });
  }
  // 如果已经有记录，则更新
  log.info("更新记录")
  const { _id: id } = isBind
  return new Promise((resolve, reject) => {
    db.collection('accounts').doc(id).update({
      data: {
        username,
        password
      },
      success(){
        resolve()
      },
      fail(){
        reject()
      }
    })
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
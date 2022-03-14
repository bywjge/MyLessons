export default {
  getCookie,
  bindAccount,
  getPersonInfo,
  asyncAccountInfo
}

import cloud from '../utils/cloud'
import logger from '../utils/log'
import db, * as database from '../static/js/database'
import * as wyu from '../apis/wyu'
const log = new logger()

log.setKeyword("apis/account.js")

/**
 * 获取可用的cookie
 * @param {boolean} [forceNew = false] 是否强制获取新cookie，即忽略cookie有效性
 *
 * @description
 *  如果不强制获取新cookie：
 *    如果本地没有cookie，则从数据库获取并存放到本地 -> 判断本地的cookie是否有效
 *
 *  如果cookie无效/强制获取新cookie：
 *    用本地储存的账号做登录，然后储存cookie到本地和数据库
 * @returns {boolean} 获取结果
 */
async function getCookie(forceNew = false) {
  /** Step 1: 拿到cookie */
  let cookie = wx.getStorageSync('cookie')
  if (!forceNew && !cookie) {
    cookie = null
    /** 从数据库中获取 */
    await database.getCookie()
      .then(ret => {
        cookie = ret.cookie
      }).catch(() => {
        forceNew = true
      })
  }
  /** Step 2: 验证cookie */
  if (cookie !== null && !forceNew) {
    await wyu.checkCookie(cookie)
      .then(() => {
        wx.setStorageSync('cookie', cookie)
      })
      .catch(() => {
        forceNew = true
      })
  }

  /** Step 3: 获取新的cookie */
  if (forceNew) {
    const username = wx.getStorageSync('username')
    const password = wx.getStorageSync('password')
    if (!username || !password) {
      return Promise.reject('storage中没有username或password')
    }

    return wyu.doLogin(username, password, false)
  }

  // 不需要手动放入storage，api会做这一件事情
  return Promise.resolve(cookie)
}

/**
 * 绑定用户账号（储存到数据库）
 * @param {string} username 用户账号
 * @param {string} password 用户密码
 * @param {'student' | 'teacher'} type 用户类型
 *
 * @returns {Promise<any>} 数据库执行结果
 */
async function bindAccount(username, password, type) {
  let userInfo = null
  await wx.getUserInfo()
    .then(ret => {
      userInfo = ret.userInfo
    })
    .then(() => {})

  return database.updateAccount(username, password, userInfo, type)
}

/**
 * 从数据库中同步账号信息到本地
 *
 * @description
 *  如果数据库中没有记录（未绑定）则返回reject
 *
 * @returns {Promise<UserInfo>}
 */
async function asyncAccountInfo() {
  const record = await database.getAccount()

  wx.setStorageSync('username', record.username)
  wx.setStorageSync('password', record.password)
  wx.setStorageSync('wxInfo', record.userInfo)

  // 设置绑定值为true
  wx.setStorageSync('binded', true)

  return Promise.resolve()
}

/**
 * 从教务处获取个人信息
 * @param {boolean} [username] 用户名，如果不提供则从storage获取
 * @param {boolean} [forceNew = false] 是否强制获取新的信息
 *
 */
async function getPersonInfo(username, forceNew = false) {
  await getCookie()
  const _username = username || wx.getStorageSync('username')
  
  let ret = await cloud.callFunction({
    name: 'wyu',
    data: {
      action: 'getInfo',
      username: _username,
      forceNew
    }
  })

  // if (type === 'student' && Number(info['性别']) === 1) {
  //   info['性别'] = '男'
  // } else {
  //   info['性别'] = '女'
  // }

  // 需要主动将个人信息放入储存
  wx.setStorageSync('usertype', ret.type)
  wx.setStorageSync('profile', ret.info)
  return ret
}
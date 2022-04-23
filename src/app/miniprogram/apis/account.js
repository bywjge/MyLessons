export default {
  getCookie,
  bindAccount,
  getPersonInfo,
  asyncAccountInfo,
  updateBadges
}

import cloud from '../utils/cloud'
import logger from '../utils/log'
import db, * as database from '../static/js/database'
import * as wyu from '../apis/wyu'
import request from '../utils/request'
import tools from '../utils/tools'
import { parse } from 'node-html-parser'
// import _x2js from 'x2js'
// const x2js = new _x2js()
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

    const _cookie = await wyu.doLogin(username, password, false).catch(err => {
      if (err === '密码错误') {
        passwordFailure()
      }
    })
    return Promise.resolve(_cookie)
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
async function bindAccount(username, password, userInfo) {
  return database.updateAccount(username, password, userInfo)
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
  wx.setStorageSync('isAdmin', record.admin || false)
  wx.setStorageSync('badges', record.badge || new Array(0))
  wx.setStorageSync('wxInfo', record.userInfo)
  wx.setStorageSync('avatarUrl', record.avatarUrl)

  // 设置绑定值为true
  wx.setStorageSync('binded', true)
  wx.setStorageSync('infoSyncTime', new Date())

  return Promise.resolve()
}

/**
 * 从教务处获取个人信息
 * @param {boolean} [username] 用户名，如果不提供则从storage获取
 * @param {boolean} [forceNew = false] 是否强制获取新的信息
 *
 */
async function getPersonInfo(username, forceNew = false) {
  const _username = username || wx.getStorageSync('username')

  if (!forceNew) {
    // 先向后端请求获取个人信息
    let ret = await cloud.callFunction({
      name: 'wyu',
      data: {
        action: 'getInfoNew',
        username: _username,
        forceNew
      }
    })

    // 有记录，储存到storage并返回
    if (ret.success === true) {
      // 需要主动将个人信息放入储存
      wx.setStorageSync('usertype', ret.type)
      wx.setStorageSync('profile', ret.info)
      return ret
    }
  }

  // 没有记录/强制更新，请求个人信息
  await getCookie()
  let info = {}
  let usertype = 'teacher'
  let document = ''
  try {
    await wyu.getTeacherInfo(_username).then(ret => info = ret[0])
    document = (await request.get('https://jxgl.wyu.edu.cn/teakpxx!teakpxxEdit.action?confirmInfo=')).data
  } catch {
    // 用户不是教师
    usertype = 'student'
    document = (await request.get('https://jxgl.wyu.edu.cn/xjkpxx!xjkpxx.action')).data
  }

  if (typeof document !== 'string' || (document.indexOf('个人信息修改') === -1 && document.indexOf('学生基本信息') === -1)) {
    return Promise.reject('获取信息失败')
  }

  if (usertype === 'teacher')
    Object.assign(info, _parseTeacherInfo(document))
  else
    Object.assign(info, _parseStudentInfo(document))

  // console.log(info)
  // debugger

  // 让后端解析html结果，并返回
  let ret = null
  try {
    ret = await cloud.callFunction({
      name: 'wyu',
      data: {
        action: 'uploadInfo',
        username: _username,
        info,
        usertype
      }
    })
  } catch(e) {
    log.error(e)
    wx.hideLoading().catch(() => {})
    tools.showModal({
      title: '发生错误',
      content: '获取个人信息时发生错误，请稍后再试试'
    })
    return ;
  }

  console.log(ret)
  wx.setStorageSync('usertype', usertype)
  wx.setStorageSync('profile', info)
  return ret
}

async function passwordFailure() {
  // wx.setStorageSync('password', '')
  wx.hideLoading().catch(() => {})
  wx.setStorageSync('passwordFailure', true)
  await wx.showModal({
    title: '密码失效',
    content: '密码已失效，也许近期修改过密码。点击确定以重新登录',
    showCancel: false
  })
  wx.redirectTo({
    url: '/pages/login/login',
  })
}

/** 更新勋章 */
async function updateBadges() {
  const record = await database.getAccount()
  wx.setStorageSync('badges', record.badge || new Array(0))
  return Promise.resolve()
}

function _parseTeacherInfo(document) {
  const info = {}
  const dom = parse(document)
  const avator = dom.querySelector('#image')._attrs.src || null

  info.avatar = avator

  const zcMap = {"5":"高级工程师","6":"实验师","7":"馆员","8":"高级实验师","9":"工程师","10":"研究员","11":"副研究馆员","12":"副研究员","13":"会计师","14":"经济师","15":"高级技工","16":"无","17":"社会工作师","18":"初级技工","19":"翻译","20":"副主任医师","21":"高级会计师","22":"教授级高工","23":"中级技工","24":"主管护师","25":"主任记者","26":"助理工程师","27":"编辑","28":"城乡规划工程师","29":"副编审","30":"高级统计师","31":"高级政工师","32":"高级职业指导师一级","33":"工艺美术师","34":"护师","35":"建筑师","36":"信息系统项目管理师（高级）","37":"研究馆员","38":"研究员级高工","39":"正高级会计师","40":"主管技师","41":"主任编辑","42":"助理馆员","43":"助理实验师","44":"助理研究员","45":"助理医师","46":"专业技术十一级岗","":"(无)","03":"教授","04":"副教授","01":"讲师","02":"助教"}
  const textMap = {
    性别: '#xbdm > option[selected]', // 1->male 2->female
    职称: '#zcdm > option[selected]'
  }
  const inputMap = {
    手机号码: '#dh',
    身份证: '#sfzh',
  }

  getElementInDom(dom, textMap, (e, key) => {
    if (key === '性别') {
      info[key] = Number(e._attrs.value) === 1? '男': '女'
      return ;
    }
    if (key === '职称') {
      info[key] = zcMap[e._attrs.value]
      return ;
    }
    info[key] = e.innerHTML.trim() || e.innerText.trim()
  })

  getElementInDom(dom, inputMap, (e, key) => {
    info[key] = e._attrs.value
  })

  // 访问教师卡片获取信息
  return info
}

function _parseStudentInfo(document) {
  const textMap = {
    学号: '#p > table > tr:nth-child(1) > td:nth-child(2) > label',
    姓名: '#p > table > tr:nth-child(1) > td:nth-child(4) > label',
    入学年份: '#p > table > tr:nth-child(1) > td:nth-child(6) > label',
    学院: '#p > table > tr:nth-child(2) > td:nth-child(2) > label',
    专业: '#p > table > tr:nth-child(2) > td:nth-child(4) > label',
    班级: '#p > table > tr:nth-child(3) > td:nth-child(2) > label',
    年级: '#p > table > tr:nth-child(3) > td:nth-child(4) > label',
    性别: '#xbdm > option[selected]' // 1->male 2->female
  }

  const inputMap = {
    手机号码: '#dh',
    身份证: '#sfzh'
  }

  const dom = parse(document)
  const avator = dom.querySelector('#image')._attrs.src || null

  const info = {
    avator
  }

  getElementInDom(dom, textMap, (e, key) => {
    if (key === '性别') {
      info[key] = Number(e._attrs.value) === 1? '男': '女'
      return ;
    }
    info[key] = e.innerHTML.trim() || e.innerText.trim()
  })
  getElementInDom(dom, inputMap, (e, key) => {
    info[key] = e._attrs.value
  })

  return info
}

/**
 * 获取dom中的多个元素
 * @param {document} dom dom的文档结点
 * @param {object} paths 需要遍历的路径
 * @param {(e: any, key, path) => void} fn 每个结点的遍历函数
 */
function getElementInDom(dom, paths, fn) {
  // 遍历path列表获取值
  for (const key in paths) {
    const path = paths[key]
    const e = dom.querySelector(path)
    if (!e) {
      continue
    }

    fn(e, key, path)
  }
}
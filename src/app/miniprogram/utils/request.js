/**
 * 完成与请求有关的操作
 * 暴露一个方法，其中包含拦截器，处理登录失效以及教务处反爬虫拦截的事务
 */

import logger from '../utils/log'
import accountApi from '../apis/account'
import Request from './request-promise'

const request = new Request()
request.useResponseInterceptor(_responseInterceptor, (req, err) => Promise.reject(err))
request.useRequestInterceptor(_requestInterceptor)
const log = new logger()

/**
 * request-promise 的请求拦截器
 * @param {Object} config 请求的配置
 * 
 * @returns {Promise<Object>}
 */
async function _requestInterceptor(config) {
  // 设置请求计数器
  config.counter = config.counter || 0
  // 添加cookie到请求中
  const cookie = wx.getStorageSync('cookie')
  config.header['Cookie'] = cookie
  return Promise.resolve(config)
}

/**
 * request-promise 的响应拦截器
 *
 * @param {any} request 请求
 * @param {any} ret 返回数据
 * @description
 *   1.当返回不是200 OK时拦截
 *   2.非登录时，当请求cookie失效时重试
 *   3.登录时，当返回数据出现“请开启JavaScript并刷新该页”时解密并重试
 * 
 * @returns {Promise<any>}
 */
async function _responseInterceptor(req, res) {
  const responseData = res.data
  if (typeof req.counter !== 'undefined' && req.counter > 3) {
    console.log('重试次数过多', req, res)
    return Promise.reject('重试次数过多')
  }

  /** 一般的请求不会返回string，这里做异常请求返回值的判断 */
  if (responseData && typeof responseData === 'string') {
    /** cookie过期 */
    if (!req.login && responseData.indexOf("请输入账号") !== -1) {
      wx.setStorageSync('cookie', "")
      log.warn('cookie过期', `用户名：${wx.getStorageSync('username')}`)
      // 做重新登录,然后重新执行请求
      req.counter = req.counter? 1: req.counter + 1

      await accountApi.getCookie()
      return request._wrappedRequest(req)
    }

    /** 请求触发加密 */
    if (responseData.indexOf("请开启JavaScript并刷新该页") !== -1) {
      // !req.login && showToast({ title: "教务系统繁忙", icon: "none" })
      // const reg = /_0x14e579='([\S]*)';var _0x351708='([\S]*)';/g
      // const match = reg.exec(responseData)
      // log.warn("教务处加密", match[1], match[2])

      // req.counter = req.counter? 1: req.counter + 1
      // await cloud.callFunction({
      //   name: 'login',
      //   data: {
      //     action: 'decode',
      //     a: match[1],
      //     b: match[2]
      //   }
      // }).then(res => {
      //   const newUrl = res.url
      //   console.log(res)
      //   if (req.url[req.url.length - 1] === '/')
      //   req.url += newUrl.substr(1)
      //   log.warn("即将使用新地址重试", req.url, req.counter)
      //   request._wrappedRequest(req).then(resolve).catch(reject)
      // })
      // // reject(new Error("无法连接教务处"))
      wx.showModal({
        title: '错误',
        content: '无法接入教务处，这不是小程序的问题,请稍后再试。如果你频繁遇到该问题，请联系开发者。'
      })
      wx.hideLoading().catch(() => {})
      return Promise.reject('无法连接教务处');
    }
  }

  return Promise.resolve(res)
}

export default request
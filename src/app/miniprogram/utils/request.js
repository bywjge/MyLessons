/**
 * 完成与请求有关的操作
 * 暴露一个方法，其中包含拦截器，处理登录失效以及教务处反爬虫拦截的事务
 */

export default request
import logger from '../utils/log'
import cloud from '../utils/cloud'
import accountApi from '../apis/account'

const log = new logger()

/**
 * 微信请求的包装方法
 * @param {object} config
 * @param {object} header
 */
function request(config, header = {}){
  const cookie = wx.getStorageSync('cookie') || ''
  return new Promise((resolve, reject) => {
    const _config = {
      counter: 0,
      header: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Cookie': cookie,
        // 'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
        ...header
      },
      ...config,
      success(res) {
        _responseInterceptors(config, res, resolve, reject)
      },
      error(err) {
        reject(err)
      }
    }
    wx.request(_config)
  });
}

/**
 * wx.request 的响应拦截器
 *
 * @param {any} request 请求
 * @param {any} ret 返回数据
 * @param {Function} resolve
 * @param {Function} reject
 * @description
 *   1.当返回不是200 OK时拦截
 *   2.非登录时，当请求cookie失效时重试
 *   3.登录时，当返回数据出现“请开启JavaScript并刷新该页”时解密并重试
 */
function _responseInterceptors(req, ret, resolve, reject) {
  const responseData = ret.data
  const responseHeader = ret.header

  /** 微信环境无法获得302 */
  if (ret.statusCode !== 200) {
    log.error('返回的状态码不是200, header为', responseHeader)
    reject("服务器繁忙")
    return ;
  }

  /** 重试次数限制（登录会重试），最大允许三次 */
  if (typeof req.counter !== 'undefined' && req.counter > 3) {
    log.error("重试超过次数限制", req.url)
    reject("超过次数限制")
    return ;
  }
  /** 一般的请求不会返回string，这里做异常请求返回值的判断 */
  if (responseData && typeof responseData === 'string') {
    /** cookie过期 */
    if (!req.login && responseData.indexOf("请输入账号") !== -1) {
      wx.setStorageSync('cookie', "")
      log.warn('cookie过期', `用户名：${wx.getStorageSync('username')}`)
      // 做重新登录,然后重新执行请求
      req.counter++
      accountApi.getCookie().then(() => {
        request(req).then(resolve).catch(reject)
      }).catch(r => reject(r))

      // showToast({ title: "凭据已过期", icon: "none" })
      // reject(new Error("cookie过期"))
      return ;
    }

    /** 请求触发加密 */
    if (responseData.indexOf("请开启JavaScript并刷新该页") !== -1) {
      !req.login && showToast({ title: "教务系统繁忙", icon: "none" })
      const reg = /_0x14e579='([\S]*)';var _0x351708='([\S]*)';/g
      const match = reg.exec(responseData)
      log.warn("教务处加密", match[1], match[2])

      req.counter++
      cloud.callFunction({
        name: 'login',
        data: {
          action: 'decode',
          a: match[1],
          b: match[2]
        }
      }).then(ret => {
        const newUrl = ret.url
        console.log(ret)
        if (req.url[req.url.length - 1] === '/')
        req.url += newUrl.substr(1)
        log.warn("即将使用新地址重试", req.url, req.counter)
        request(req).then(resolve).catch(reject)
      })
      // reject(new Error("无法连接教务处"))
      return ;
    }
  }

  resolve(ret)
}
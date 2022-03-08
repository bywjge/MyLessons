/**
 * Promise风格的Request 对象
 */
class Request {
  /**
   * @typedef {Function} SuccessInterceptor
   * @param {Object} config 请求所使用的配置
   * @param {Object} response 请求回应数据
   * @description 
   *  请求成功后使用的拦截器，需要返回Promise
   * @return {Promise}
   */

  /**
   * @typedef {Function} ErrorInterceptor
   * @param {Object} config 请求所使用的配置
   * @param {any} error 错误内容
   * @description 
   *  请求错误后使用的拦截器，需要返回Promise
   * @return {Promise}
   */

  /**
   * @typedef {Function} RequestInterceptor
   * @param {RequestConfig} config 请求所使用的配置
   * @description 
   *  请求拦截器，请不要返回promise对象
   * 
   * @return {Promise<RequestConfig>}
   */

  /**
   * @typedef {Object} RequestConfig
   * @property {boolean} [withBaseUrl] 是否加上baseUrl
   * @property {string} [baseUrl] baseUrl的值
   */

  /**
   * @typedef {Object} RequestPayload
   * @property {string} [contentType] header中的Content-Type
   * @property {string} [cookie] 请求时的cookie
   * @param {*} config 
   */

  /**
   * @constructor
   * @param {RequestConfig} config 
   */
  constructor(config = {}) {
    this.withBaseUrl = config.withBaseUrl
    this.baseUrl = config.baseUrl
  }

  /**
   * 发送get请求
   * @param {string} url 请求的url地址
   * @param {RequestPayload} payload 请求时的payload
   * @return {Promise<any>} 返回数据
   */
  get(url, payload = {}) {
    return this.request('GET', url, undefined, Object.assign({}, payload))
  }

  /**
   * 发送post请求
   * @param {string} url 请求的url地址
   * @param {any} data 需要发送的数据
   * @param {RequestPayload} payload 请求时的payload
   * @return {Promise<any>} 返回数据
   */
  post(url, data, payload = {}) {
    return this.request('POST', url, data, Object.assign({}, payload))
  }

  request(method, url, data, { contentType, cookie, ...other }) {
    const _url = this.withBaseUrl? this.baseUrl + url: url
    const config = {
      url: _url,
      method,
      data,
      ...other,
      header: {
        'content-type': contentType || 'application/x-www-form-urlencoded',
        'Cookie': cookie || ''
      }
    }

    return this._wrappedRequest(config)
  }

  _wrappedRequest(config) {
    const that = this
    let _config = config
    return new Promise(async (resolve, reject) => {
      if (typeof that._requestInterceptor === 'function') {
        await that._requestInterceptor(_config)
          .then(ret => _config) 
      }
      wx.request({
        ..._config,
        success: (response) => {
          if (typeof that._responseInterceptorSuccess !== 'function') {
            resolve(response)
            return ;
          }

          // 使用了回应拦截器
          const p = that._responseInterceptorSuccess(config, response)
          p.then(resolve)
          p.catch(reject)
        },

        fail: (error) => {
          if (typeof that._responseInterceptorError !== 'function') {
            reject(error)
            return ;
          }                

          // 使用了回应拦截器
          const p = that._responseInterceptorError(config, error)
          p.then(resolve)
          p.catch(reject)
        }
      })
    })
  }

  /**
   * 使用回应拦截器
   * @param {SuccessInterceptor} success 请求成功拦截器
   * @param {ErrorInterceptor} error 请求错误拦截器
   */
  useResponseInterceptor(success, error) {
    this._responseInterceptorSuccess = success
    this._responseInterceptorError = error
  }

  /**
   * 使用请求拦截器
   * @param {RequestInterceptor} fn 
   */
  useRequestInterceptor(fn) {
    this._requestInterceptor = fn
  }
}

export default Request
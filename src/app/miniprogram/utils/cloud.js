export default {
  callFunction
}

/**
 * wx.cloud.callFunction 的包装方法
 * 
 * @param {object} config 请求
 */
function callFunction(config) {
  return new Promise((resolve, reject) => {
    const _config = {
      ...config,
      success: res => {
        _callFunctionInterceptors(config, res, resolve, reject)
      },
      failed: err => {
        reject(err)
      }
    }
    wx.cloud.callFunction(_config)
  });
}

/**
 * wx.cloud.callFunction 的响应拦截器
 * 
 * @param {object} request 请求
 * @param {any} ret 返回数据
 * @param {Function} resolve 
 * @param {Function} reject 
 */
function _callFunctionInterceptors(request, ret, resolve, reject){
  const data = ret.result
  if (!data.success)(
    reject(data)
  )
  resolve(data)
}
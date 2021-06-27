module.exports = {
  keyMapConvert,
  sleep,
  showModal,
  request,
  showToast,
  strToDate,
  decodeHTML,
  callFunction
}

const { log: logger } = require('./log')
const log = new logger()
log.setKeyword("utils/tools")

function keyMapConvert(_obj, keyMap, keepsUndefined = false){
  if(!_obj || !(_obj instanceof Object)){
    return null;
  }
  const singleConvert = obj => {
    let retObj = {};
    Object.keys(obj).forEach(key => {
      if(key in keyMap){
        const value = obj[key];
        const handler = keyMap[key]
        if (Array.isArray(handler)){
          const k = handler[0];
          const f = handler[1];
          f && (retObj[k] = f(value));
        }else{
          retObj[keyMap[key]] = value;
        }
      }else if(keepsUndefined){
        retObj[key] = value;
      }
    });
    return retObj;
  }
  
  if(Array.isArray(_obj)){
    let retArr = [];
    _obj.forEach(item => {
      retArr.push(singleConvert(item));
    });
    return retArr;
  }else{
    return singleConvert(_obj);
  }
}

function request(obj){
  const cookie = wx.getStorageSync('cookie')
  return new Promise((resolve, reject) => {
    obj = {
      counter: 0,
      header: {
        'content-type': 'application/x-www-form-urlencggoded;charset=UTF-8',
        'Cookie': cookie,
        // 'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",

      },
      ...obj,
      success(res) {
        _responseInterceptors(obj, res, resolve, reject)
      },
      error(err){
        reject(err)
      }
    }
    wx.request(obj)
  });
}

function callFunction(obj){
  return new Promise((resolve, reject) => {
    obj = {
      ...obj,
      success: res => {
        _callFunctionInterceptors(obj, res, resolve, reject)
      },
      failed: err => {
        reject(err)
      }
    }
    wx.cloud.callFunction(obj)
  });
}

function sleep(ms){
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  })
}

function showModal(obj){
  const f = wx.showModal;
  wx.hideLoading()
  return new Promise((resolve, reject) => {
    const defaultConfig = {
      showCancel: false,
      confirmText: "好的",
      cancelText: "不太好",
      success: res => {
        if(res.confirm){
          resolve(true);
        }else{
          reject(false);
        }
      }
    };
    f({...defaultConfig, ...obj});
  });
  
}

function showToast(obj){
  wx.hideLoading()
  return new Promise((resolve, reject) => {
    const defaultConfig = {
      title: "",
      duration: 2000,
      success: ret => resolve(ret),
      ...obj
    }
    wx.showToast(defaultConfig)
  })
}

function strToDate(str){
  // 这个g修饰符，谁动砍谁
  return new Date(str.replace(/-/g,"/"));
}

/**
 * wx.request 的响应拦截器
 * 
 * @description
 *   当返回数据出现“请开启JavaScript并刷新该页”时报错
 * @param {请求} request 
 * @param {返回数据} ret 
 * @param {*} resolve 
 * @param {*} reject 
 */
function _responseInterceptors(req, ret, resolve, reject){
  console.log(ret.statusCode)
  if (ret.statusCode !== 200){
    console.log(ret.header)
    reject(new Error("网络繁忙"))
  }
  const reg = /(请输入账号|请开启JavaScript并刷新该页)+/g
  if (ret.data && typeof ret.data === 'string'){
    if (typeof req.counter !== 'undefined' && req.counter > 3){
      log.error("重试超过次数限制", req.url)
      reject("超过次数限制")
      return ;
    }

    if (!req.login && ret.data.indexOf("请输入账号") !== -1){
      wx.setStorageSync('cookie', "")
      showToast({ title: "凭据已过期", icon: "none" })
      reject(new Error("cookie过期"))
      return ;
    }
    if (ret.data.indexOf("请开启JavaScript并刷新该页") !== -1){
      !req.login && showToast({ title: "教务系统繁忙", icon: "none" })
      const reg = /_0x14e579='([\S]*)';var _0x351708='([\S]*)';/g
      const match = reg.exec(ret.data)
      log.warn("教务处加密")
      console.log(match[1], match[2])
      
      req.counter++
      callFunction({
        name: 'login',
        data: {
          action: 'decode',
          a: match[1],
          b: match[2]
        }
      }).then(ret => {
        const newUrl = ret.result.url
        console.log(ret)
        if (req.url[req.url.length - 1] === '/')
        req.url += newUrl.substr(1)
        log.warn("即将使用新地址重试", req.url, req.counter)
        request(req).then(ret => resolve(ret)).catch(err => reject(err))
      })

      // reject(new Error("无法连接教务处"))
      return ;
    }
  }
  resolve(ret)
}

/**
 * wx.cloud.callFunction 的响应拦截器
 * 
 * @param {请求} request 
 * @param {返回数据} ret 
 * @param {*} resolve 
 * @param {*} reject 
 */
function _callFunctionInterceptors(request, ret, resolve, reject){
  const data = ret.result
  if (!data.success)(
    reject(data)
  )
  resolve(data)
}

function decodeHTML(value){
  value = value.replace(/&amp;/g,"&");
  value = value.replace(/&lt;/g,"<");
  value = value.replace(/&gt;/g,">");
  value = value.replace(/&nbsp;/g," ");
  value = value.replace(/&quot/g,"'");
  return value
}
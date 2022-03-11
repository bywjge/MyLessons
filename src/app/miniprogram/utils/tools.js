export default {
  keyMapConvert,
  sleep,
  showModal,
  showToast,
  strToDate,
  decodeHTML,
  randomString,
  getDaysGap,
  mergeCookie,
  debounce,
  throttle
}

import logger from './log'
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

function decodeHTML(value){
  value = value.replace(/&amp;/g,"&");
  value = value.replace(/&lt;/g,"<");
  value = value.replace(/&gt;/g,">");
  value = value.replace(/&nbsp;/g," ");
  value = value.replace(/&quot/g,"'");
  return value
}

/**
 * 生成随机字符串
 * @param {Number} length 字符串长度
 * @returns {String} 随机字符串
 */
function randomString (length = 32) {
  let t = "abcdefhijkmniprstwxyz2345678"
  let seedLength = t.length
  let str = ""
  for (let i = 0; i < length; i++)
    str += t.charAt(Math.floor(Math.random() * seedLength));
  return str
}

/**
 * 求两个日期的天数差
 * @param {Date} a 时间
 * @param {Date} b 时间
 * @return {Number} 天数
 */
function getDaysGap(a, b) {
  const t = (b.getTime() - a.getTime()) / (86400 * 1000)
  return Math.round(t)
}

/**
 * cookie合并工具
 * @description
 *  按参数传入cookie字符串/字符串数组，合并cookie值。如果值已经存在，则覆盖
 * @returns {string} 合并后的cookie字符串
 */
function mergeCookie(){
  let ret = {};
  [...arguments].filter(e => {
    return (e instanceof Array) || (typeof e === 'string')
  }).map(e => {
    if (e instanceof Array){
      return e.join("; ")
    }
    return e
  }).join("; ").split(";").forEach(e => {
    const kvp = e.split("=")
    if (kvp.length !== 2) return ;
    const key = kvp[0]
    const value = kvp[1]
    ret[key] = value
  })
  return Object.keys(ret).map(key => `${key}=${ret[key]}`).join("; ")
}

function debounce(fn, wait) {
  let timer;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, arguments)   // 把参数传进去
    }, wait);
  }
}

function throttle(fn, wait) {
  let timer;
  return function() {
    if (timer)
      return ;
    timer = setTimeout(() => {
      fn.apply(this, arguments);
      timer = null;
    }, wait)
  }
}
  
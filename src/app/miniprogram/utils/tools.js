export default {
  keyMapConvert,
  sleep,
  showModal,
  showToast,
  strToDate,
  decodeHTML,
  randomString,
  getDaysGap
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
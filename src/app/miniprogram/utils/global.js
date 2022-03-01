import logger from '../utils/log'

const registerFunctions = [
  stringFormat,
  stringIsEmpty,
  dateUtils,
  proxyingWxObject,
  prefixZero,
  arrayShuffle
];

+function (){
  registerFunctions.forEach(i => (i && i()));
}();

function arrayShuffle(){
  Array.prototype.shuffle = function() {
    var array = this;
    var m = array.length,
        t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
  }
}

function stringIsEmpty(){
  //字符串是否为空
	String.prototype.isEmpty = function(){
		return (typeof this === "undefined" || this === null || this === "");
	};
}

function stringFormat(){
  //字符串格式化，用法"{0},{1}".format("string1", "string2");
	String.prototype.format = function () {
    const e = arguments;
    return !!this && this.replace(/\{(\d+)\}/g, function (t, r) {
      return e[r] ? e[r] : t;
    });
  };
}

function prefixZero() {
  Number.prototype.prefixZero = function(digitLength){
    return (Array(digitLength).join(0) + this).slice(-digitLength);
  }
}

function dateUtils(){
  Date.prototype.nDaysAgo = function(day){
    if (!day || typeof day !== "number"){
      return;
    }
    const ms = 86400000 * day;
    // this.setTime(this.getTime() - ms);
    return new Date(this.getTime() - ms);
  }

  Date.prototype.nDaysLater = function(day){
    if (typeof day !== "number"){
      return;
    }
    const ms = 86400000 * day;
    // this.setTime(this.getTime() + ms);
    return new Date(this.getTime() + ms);
  }
  Date.prototype.format = function (fmt) {
    let ret;
    const opt = {
      "Y+": this.getFullYear().toString(),
      "m+": (this.getMonth() + 1).toString(),
      "d+": this.getDate().toString(),
      "H+": this.getHours().toString(),
      "M+": this.getMinutes().toString(),
      "S+": this.getSeconds().toString()
    };
    for (let k in opt) {
      ret = new RegExp("(" + k + ")").exec(fmt);
      if (ret) {
        fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
      };
    };
    return fmt;
  }
  // 判断是否同一天，getTime 的单位是ms
  Date.prototype.equals = function (e){
    const a = this.format("YYYY-mm-dd")
    const b = e.format("YYYY-mm-dd")
    return a === b
  }
}

function proxyingWxObject(){
  const log = new logger()
  log.setKeyword("wxObject")

  // 来源：https://developers.weixin.qq.com/community/develop/article/doc/000088c00587c812811a9830951813
  wx = new Proxy(wx, {
    get(target, name) {
      if (!(name in target))
        return ;

      let isSyncFunction = name.endsWith('Sync');
      let isNotFunction = typeof target[name] !== 'function';
  
      if (isSyncFunction || isNotFunction) 
        return target[name];

      return function (obj) {
        if (typeof obj === 'object') {
          let originalFail = function () {};

          if ('fail' in obj) {
            originalFail = obj.fail;
          }

          obj.fail = function () {
            // todo 上报数据到后端 [4]
            wx.showToast({
              title: '发生错误，请查看控制台',
              duration: 2000
            })
            log.error(name, arguments[0].errMsg)
            originalFail();
          };
        }
        return target[name](obj);
      };
    }
  });
}
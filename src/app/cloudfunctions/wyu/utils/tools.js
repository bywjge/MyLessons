const registerFunctions = [
  dateUtils
];

+function (){
  registerFunctions.forEach(i => (i && i()));
}();

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
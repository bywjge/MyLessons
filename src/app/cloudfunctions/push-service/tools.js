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

Number.prototype.prefixZero = function(digitLength){
  return (Array(digitLength).join(0) + this).slice(-digitLength);
}

Date.prototype.diffDay = function(date) {
  const dayGap = 3600 * 24 * 1000 //ms
  return Math.floor((date.getTime() - this.getTime()) / dayGap)
}
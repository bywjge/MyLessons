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

Number.prototype.prefixZero = function(digitLength){
  return (Array(digitLength).join(0) + this).slice(-digitLength);
}
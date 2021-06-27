function sleep(ms){
  return new Promise(resolve => setTimeout(resolve,ms))
}

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

function decodeHTML(value){
  value = value.replace(/&amp;/g,"&");
  value = value.replace(/&lt;/g,"<");
  value = value.replace(/&gt;/g,">");
  value = value.replace(/&nbsp;/g," ");
  value = value.replace(/&quot/g,"'");
  return value
}

function strToDate(str){
  // 这个g修饰符，谁动砍谁
  return new Date(str.replace(/-/g,"/"));
}

module.exports = {
  sleep,
  mergeCookie,
  keyMapConvert,
  strToDate,
  decodeHTML
}
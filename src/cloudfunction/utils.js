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

module.exports = {
  sleep,
  mergeCookie
}
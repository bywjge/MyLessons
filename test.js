const axios = require("axios");
const qs = require("qs");
const crypto = require('crypto-js');
process.env.NODE_TLS_REJECT_UNAUTHORIZED ="0";

let cookies = {
  data: [],
  getNewOne(username){
    return new Promise(async resolve => {
      let _cookies = await this._requireNewCookies();
      this.data[username] = _cookies;
      resolve(_cookies);
    });
  },
  getCookies(username){
    try{
      return this.data[username]
    }catch{
      return null;
    }
  },
  async _requireNewCookies(){
    let ret = await axios.get("https://jxgl.wyu.edu.cn/yzm?d="+Date.now())
    let _cookies = ret.headers['set-cookie'];
    return _cookies;
  }
}

// async function test() {
//   await axios.get("https://jxgl.wyu.edu.cn");
//   console.log("fuck");
// };

// test();
cookies.getNewOne("meetinaxd")
.then(() => {
  doLogin("meetinaxd", "1234", "1234")
})


function doLogin(username, password, verifyCode){
  var key = crypto.enc.Utf8.parse(verifyCode+verifyCode+verifyCode+verifyCode);
  var srcs = crypto.enc.Utf8.parse(password);
  var encrypted = crypto.AES.encrypt(srcs, key, { mode:crypto.mode.ECB,padding: crypto.pad.Pkcs7 });
  password = encrypted.ciphertext.toString();

  let postData = qs.stringify({
    account: username,
    pwd: password,
    verifycode: verifyCode
  });

  axios.post("https://jxgl.wyu.edu.cn/new/login", postData,{
    headers: {
      'Cookie': cookies.getCookies(username)
    }
  }
  )
  .then(ret => {
    console.log(ret.data);
  })
}
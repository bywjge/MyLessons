const axios = require("axios");
const FormData = require("form-data");
const qs = require("qs");
const crypto = require('crypto-js');
const { time } = require("console");
function btoa(r) {
  const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  for (var o, n, a = String(r), i = 0, c = e, d = ""; a.charAt(0 | i) || (c = "=", i % 1); d += c.charAt(63 & o >> 8 - i % 1 * 8)) {
      if (n = a.charCodeAt(i += .75), n > 255)throw new t("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      o = o << 8 | n
  }
  return d
}


process.env.NODE_TLS_REJECT_UNAUTHORIZED ="0";

let cookies = {
  data: [],
  getNewOne(username){
    return new Promise(async resolve => {
      let ret = await this._requireNewCookies();
      this.data[username] = ret[0];
      resolve(ret);
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
    let ret = await axios({
      url: "https://jxgl.wyu.edu.cn/yzm?d="+Date.now(),
      method: "get",
      responseType: 'arraybuffer'
    })
    let _cookies = ret.headers['set-cookie'];
    return [_cookies, ret.data];
  }
}

// async function test() {
//   await axios.get("https://jxgl.wyu.edu.cn");
//   console.log("fuck");
// };

// test();

cookies.getNewOne("3119000592")
.then((ret) => {
  let image = ret[1];
  const base64String = btoa(String.fromCharCode(...new Uint8Array(image)))
  console.log(base64String)
  // let formData = new FormData();
  // formData.append("image", image);
  console.log(qs.stringify({base64: base64String}))
  axios({
    method: 'post',
    url: "https://ddns1.ltiex.com:8833/recognizeCaptcha2",
    // data: formData,
    data: qs.stringify({base64: base64String}),
    // headers: formData.getHeaders()
    // {
    //   "Content-Type": 'multipart/form-data'
    // }
  })
  .then(ret => {
    console.log("Captcha return", ret.data);
    // console.log(cookies.getCookies("meetinaxd"))
    doLogin("3119000592", "h*a1fDYVIA$fX,2X", ret.data)

  })
  .catch(err => {
    console.log(err.response)
  })
  // doLogin("meetinaxd", "1234", "1234")
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
  })
  .then(ret => {
    console.log(ret.data);
    if(ret.data.message && ret.data.message === "登录成功"){
      // getAllLessons();
      getAllWeekLessons();
    }
  })
  .catch(err => {
    console.log(err)
  })
}

function getAllLessons(){
  const regExp = /var kbxx = (\[[\w\d\S\ ]*\]);/g;
  const keyMap = {
    kcmc: '课程名称',
    kcbh: '课程编号',
    jxbmc: '上课班级',
    jcdm2: '上课节次',
    zcs: '上课周次',
    xq: '星期',
    jxcdmcs: '马兰芳教学楼403,黄浩川教学楼504',
    teaxms: '王光霞,王光霞[主讲]'
  };
  axios.get("https://jxgl.wyu.edu.cn/xsgrkbcx!xsAllKbList.action?xnxqdm=202001", {
    headers: {
      'Cookie': cookies.getCookies("3119000592")
    }
  })
  .then(ret =>{
    // console.log(ret.data)
    let lessonJson = regExp.exec(ret.data)
    lessonJson = JSON.parse(lessonJson[1])
    console.log(lessonJson)
  })

}

function getAllWeekLessons(){
  const keyMap = {
    kcbh: '课程编号',
    kcmc: '课程名称',
    teaxms: '教师姓名',
    jxbmc: '上课班级',
    zc: '上课周次',
    jcdm2: ['节次', str => {
      str = str.trim().split(',')
      if(str.length < 2){
        return null;
      }
      let arr = [0, 0];
      arr[0] = str[0];
      arr[1] = str[str.length - 1];
      return arr;
    }],
    xq: '星期',
    jxcdmc: '教学地点',
    pkrs: '排课人数',
    kxh: '课序号',
    jxhjmc: '讲课',
    sknrjj: '上课内容'
  };
  const getLesson = i => axios.get("https://jxgl.wyu.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=202001&zc="+i, {
    headers: {
      'Cookie': cookies.getCookies("3119000592")
    }
  })
  .then(ret => {
    let lesson = keyMapConvert(ret.data[0], keyMap);
    console.log(lesson);

  })
  .catch(err =>{
    console.log(err);
  })

  for (let i = 15; i <= 15; i++) {
    setTimeout(() => getLesson(i), i*10 );

  }
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
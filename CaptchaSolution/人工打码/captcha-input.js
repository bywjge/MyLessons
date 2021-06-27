var http = require('http');
var url = require('url');
const chalk = require('chalk')
const axios = require("axios")
const fs = require("fs")

const colorMessage = {
  error: msg => chalk.black.bold.bgRed(msg),
  success: msg => chalk.black.bold.bgGreen(msg),
  message: msg => chalk.black.bold.bgYellow(msg)
};

const unfinishedImgPath = "./imgs/unfinished"
const finishedImgPath = "./imgs"
let imageBinrary = null;

var paths = {
  '/': {
    handler(query, body) {
      return new Promise(async (resolve, reject) => {
        let ret = fs.readFileSync("./captcha-input.html", "utf-8")

        if (!ret){
          reject({msg: "load index file failed"})
        }
        resolve({msg: ret, type: ContentType.html})
      })
    }
  },
  'getImg': {
    handler(query, body) {
      return new Promise(async (resolve, reject) => {
        // console.log("getParams:", query);
        image = await axios.get("https://jxgl.wyu.edu.cn/yzm?d=1607680194625",{
          responseType: 'arraybuffer'
        })
        imageBinrary = image.data
        // console.log(image)
        resolve({msg:imageBinrary, type:ContentType.jpeg});
      })
    },

    methods: {
      
    }
  },
  'postText': {
    handler(query, body) {
      return new Promise(async (resolve, reject) => {
        !body && console.log(body)
        if (!body.text) {
          reject({msg: "params missing"});
        }
        let text = body.text.trim();
        const oldFileName = unfinishedImgPath + "/" + body.md5.trim() + ".jpeg";
        const filename = finishedImgPath + "/" + text + "_" + body.md5.trim() + ".jpeg";
        if (!(body.text.length === 4)) {
          reject({msg: "length illegal"});
        }
        fs.rename(oldFileName, filename, function(err){
          if(err) {
            reject({
              msg: {
                message: "unknown save error"
              }
            });
          } else {
            resolve({
              msg: {
                message: "successfully saved"
              }
            });
          }
        })
      })
    },

    methods: {
      
    }
  }
};

const ContentType = {
  "css": "text/css",
  "gif": "image/gif",
  "html": "text/html",
  "ico": "image/x-icon",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "js": "text/javascript",
  "json": "application/json",
  "pdf": "application/pdf",
  "png": "image/png",
  "svg": "image/svg+xml",
  "swf": "application/x-shockwave-flash",
  "tiff": "image/tiff",
  "txt": "text/plain",
  "wav": "audio/x-wav",
  "wma": "audio/x-ms-wma",
  "wmv": "video/x-ms-wmv",
  "xml": "text/xml"
};

const requestHandler = (path, query, body) => new Promise((resolve, reject) => {
  // console.log("wtf???", path, query);
  if (path.trim() !== '/')
    path = path.replace("/", "");
  if (!(path in paths)) {
    reject({msg: "unknown method or path: " + path});
    return;
  }
  paths[path].handler(query, body)
    .then(msg => resolve(msg))
    .catch(msg => reject(msg));
});

const config = {
  host: '127.0.0.1',
  port: 8888
}
console.log(colorMessage.message("Starting Node.js Emulation server..."));

http.createServer(function (request, response) {
  // 发送 HTTP 头部 
  // HTTP 状态值: 200 : OK
  // 内容类型: text/plain
  let body = "";
  if(request.method === "POST"){
    request.on('data', chunk => {
      body += chunk;  //一定要使用+=，如果body=chunk，因为请求favicon.ico，body会等于{}
    });
    request.on('end', () => {
      body = JSON.parse(body);
      doHandle()
    });
  }else{
    body = null;
    doHandle()
  }
  
  function doHandle(){
    var params = url.parse(request.url, true);
    requestHandler(params.pathname, params.query, body)
      .then(({msg, type=null}) => {
        if(!type){
          response.writeHead(200, {
            'Content-Type': 'text/plain'
          });
          response.write(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }else{
          response.writeHead(200, {
            'Content-Type': type
          });
          response.write(msg, "binrary");
        }
        console.log(colorMessage.success('RESOLVE'), params.pathname);
        response.end();
      })
      .catch(({msg}) => {
        console.log(colorMessage.error('REJECT'), params.pathname);
        response.write(typeof msg === 'string' ? msg : JSON.stringify(msg));
        response.end();
      })
  }

}).listen(config.port);

console.log(colorMessage.success('Server running at http://' + config.host + ':' + config.port));

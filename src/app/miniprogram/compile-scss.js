const chokidar = require('chokidar');
const sass = require('node-sass');
const path = require('path');
const fs = require('fs');
const colors = require("colors");

Date.prototype.format = function (fmt) {
  let ret;
  const opt = {
    "Y+": this.getFullYear().toString(), // 年
    "m+": (this.getMonth() + 1).toString(), // 月
    "d+": this.getDate().toString(), // 日
    "H+": this.getHours().toString(), // 时
    "M+": this.getMinutes().toString(), // 分
    "S+": this.getSeconds().toString() // 秒
  };
  for (let k in opt) {
    ret = new RegExp("(" + k + ")").exec(fmt);
    if (ret) {
      fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
    };
  };
  return fmt;
}

//监听的文件
const watchFile = path.join(__dirname, "/**/*.scss")

chokidar.watch(watchFile).on('all', (event, file) => {
  const { dir, name } = path.parse(file);

  //忽略以_开头的文件
  if(name.startsWith('_')){
    return;
  }
  // console.log(event, file);

  //编译生成的wxss文件目录
  // let target = path.join(path.resolve(dir,'..'),'wxss');
  let target = dir
  sass.render({
    file: file,
    outputStyle: "compact"
  }, function(err, result) { 
    if(!err){
      const newFile = `${target}/${name}.wxss`
      fs.writeFile(newFile, result.css, function(err){
          if(!err){
            //file written on disk
            console.log(colors.gray(new Date().format("HH:MM:SS")))
            console.log(`${colors.bgGreen("compile")} ${newFile}`)
          }
      });
    } else {
      console.log(`${colors.bgRed("compile")} ${err}`)
    }
  });
});
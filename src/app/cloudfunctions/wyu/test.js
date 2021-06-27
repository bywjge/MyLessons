const axios = require("axios");
require("./request")

+async function(){
  let a = 0;
  while(true){
    const d = await axios({
      method: 'get',
      url: "https://jxgl.wyu.edu.cn/"
    })

    if (d.data.indexOf("五邑大学教学管理系统") !== -1){
      console.log('success >>> ', ++a, d.headers['set-cookie'], d.config.headers);
    }

    if (d.data.indexOf("请开启JavaScript并刷新该页") !== -1){
      console.log('data >>> ', d.data);
      return;
    }
  }
}();


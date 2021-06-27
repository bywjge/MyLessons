const axios = require("axios");
const { sleep } = require("./utils")
const { decode } = require("./decode")

// 不检查证书错误
process.env.NODE_TLS_REJECT_UNAUTHORIZED ="0";
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// 防止出现 socket hand up错误
delete process.env['http_proxy'];
delete process.env['HTTP_PROXY'];
delete process.env['https_proxy'];
delete process.env['HTTPS_PROXY'];

// retry configure
const errorProcessing = async function(err){
  let config = err.config
  config = {
    ...config,
    retry: config.retry || 3,
    timeout: config.timeout || 3000,
    __retry_counter: config.__retry_counter || 0
  }
  if (config.__retry_counter >= config.retry){
    return Promise.reject(new Error("Retry exceeded"))
  }
  config.__retry_counter++;

  if (!err.response){
    await sleep(config.timeout)
    return axios(config)
  }
  const code = err.response.status
  if (code === 302 || code === 307){
    console.log('302 >>> ', 302);

    if (err.response.headers['set-cookie']){
      config.headers['Cookie'] = err.response.headers['set-cookie'][0].split(";")[0]
    }
    config.url = "https://jxgl.wyu.edu.cn" + err.response.headers['location']
  } else {
  }

  return axios(config)
}

// normal configure
const normalProcessing = async function(res){
  const reg = /_0x14e579='([\S]*)';var _0x351708='([\S]*)';/g
  let config = res.config
  config = {
    ...config,
    retry: config.retry || 3,
    timeout: config.timeout || 3000,
    __retry_counter: config.__retry_counter || 0
  }

  if (!res.data){
    throw new Error("no data to fetch")
  }
  let data = res.data

  if (typeof data === 'string' && data.indexOf("请开启JavaScript并刷新该页") !== -1){
    if (config.__retry_counter >= config.retry){
      return Promise.reject(new Error("Retry exceeded"))
    }
    const match = reg.exec(data)
    let newUrl = decode(match[1], match[2])
    config.__retry_counter++;
    config.headers['Cookie'] = res.headers['set-cookie'][0].split(";")[0]
    // console.log('cookie >>> ', config.headers['Cookie']);
    newUrl = "/WZWSRELw==?wzwschallenge=" + newUrl.split("wzwschallenge=")[1]
    config.url = "https://jxgl.wyu.edu.cn" + newUrl

    // console.log('using new url to retry >>> ', config.url);
    return axios(config)
  }

  return res
}

axios.interceptors.response.use(normalProcessing, errorProcessing)

axios.interceptors.request.use(function (config) {
  const present = {
    // 仅在node环境中有效，不处理302跳转，进入错误处理流程
    // 注意，设置axios.default无效
    maxRedirects: 0
  }
  config = { ...config, ...present }
  return config;
}, function (error) {
  return Promise.reject(error);
});
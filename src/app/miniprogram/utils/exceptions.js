import tools from './tools'

export default {
  networkError,
  databaseError,
  callCloudError,
  processingError
}

function networkError(msg = "网络请求错误"){
  tools.showModal({
    title: "发生错误",
    content: msg
  })
}

function databaseError(msg = "读写数据时时发生错误"){
  tools.showModal({
    title: "发生错误",
    content: msg
  })
}

function processingError(msg = "数据处理过程中出错"){
  tools.showModal({
    title: "遇到百年一遇的bug",
    content: msg
  })
}

function callCloudError(msg = "远程调用过程中出错"){
  tools.showModal({
    title: "发生错误",
    content: msg
  })
}
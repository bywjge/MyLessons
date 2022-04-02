const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

let events = {
  getAnnounces,
  addAnnounce,
  deleteAnnounce
}

exports.main = async (event, context) => {
  if (!event.action || !(event.action in events)) {
    return;
  }

  let ret = null
  try {
    ret = await events[event.action](event)
  } catch (e) {
    return {
      success: false,
      error: e.message || e
    }
  }

  return {
    success: true,
    ...ret
  };
}

/**
 * 获取公告板数据
 * @param {boolean} getAll 是否获取所有公告
 * 
 * @returns {Array<object>} 公告板数据
 */
async function getAnnounces({ getAll = false }) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (getAll) {
    records = await db.collection('announces').get()
  } else {
    records = await db.collection('announces')
      .where({
        readList: _.nin([openid])
      })
      .get()
  }

  // 设置所有公告为该用户已读
  db.collection('announces')
    .where({
      readList: _.nin([openid])
    })
    .update({
      data: {
        readList: _.push(openid)
      }
    })
  
  return Promise.resolve({
    data: records.data
  })
}

/**
 * 添加公告内容
 */
async function addAnnounce({ poster, title, content }) {
  if (!await isAdmin())
    return Promise.reject('用户不是管理员或用户不存在')
  
  return db.collection('announces').add({
    data: {
      _openid,
      poster,
      title,
      content,
      readList: [],
      time: new Date()
    }
  })
}

/**
 * 删除某条公告
 */
async function deleteAnnounce({ id }) {
  if (!await isAdmin())
    return Promise.reject('用户不是管理员或用户不存在')

  return db.collection('announces').doc(id).remove()
}

/**
 * 判断请求的用户是否为管理员
 */
async function isAdmin() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const ret = await db.collection('account').where({
    _openid: openid,
    isAdmin: true
  }).count()

  return ret.total > 0
}
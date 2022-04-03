const cloud = require('wx-server-sdk')
const databaseName = 'announces'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

let events = {
  getAnnounces,
  addAnnounce,
  deleteAnnounce,
  editAnnounce
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
    records = await db.collection(databaseName)
      .aggregate()
      .project({
        read: $.in([openid, '$readList']),
        title: true,
        content: true,
        poster: true,
        time: true,
        toTop: true
      })
      .project({
        readList: false
      })
      .sort({
        /** 按创建时间降序排序 */
        time: -1
      })
      .end()
  } else {
    records = await db.collection(databaseName)
      .aggregate()
      .match({
        readList: _.nin([openid])
      })
      .project({
        readList: false,
        title: true,
        content: true,
        poster: true,
        time: true,
        toTop: true
      })
      .addFields({
        read: false
      })
      .sort({
        /** 按创建时间降序排序 */
        time: -1
      })
      .end()
  }

  // 设置所有公告为该用户已读
  db.collection(databaseName)
    .where({
      readList: _.nin([openid])
    })
    .update({
      data: {
        readList: _.push(openid)
      }
    })
  
  return Promise.resolve({
    data: records.list
  })
}

/**
 * 添加公告内容
 */
async function addAnnounce({ poster, title, content, toTop }) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!await isAdmin())
    return Promise.reject('用户不是管理员或用户不存在')
  
  return db.collection(databaseName).add({
    data: {
      _openid: openid,
      poster,
      title,
      content,
      readList: [],
      time: new Date(),
      toTop
    }
  })
}

/**
 * 编辑某条公告
 * @description 编辑公告不更新发布时间
 */
async function editAnnounce({ id, poster, title, content, toTop }) {
  if (!await isAdmin())
    return Promise.reject('用户不是管理员或用户不存在')

  return db.collection(databaseName).doc(id).update({
    data: {
      poster,
      title,
      content,
      toTop
    }
  })
}

/**
 * 删除某条公告
 */
async function deleteAnnounce({ id }) {
  if (!await isAdmin())
    return Promise.reject('用户不是管理员或用户不存在')

  return db.collection(databaseName).doc(id).remove()
}

/**
 * 判断请求的用户是否为管理员
 */
async function isAdmin() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const ret = await db.collection('accounts').where({
    _openid: openid,
    admin: true
  }).count()

  return ret.total > 0
}
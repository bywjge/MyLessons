const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

module.exports = {
  updateRecord,
  getRecord,
  newRecord,
}

async function updateRecord(name, openid, data){
  console.log("i am in");
  const records = await getRecord(name, openid)
  console.log("return record", records);
  // 如果没有记录，则新增
  if (records.length === 0){
    console.log("新增记录_课程")
    return await newRecord(name, openid, data)
  }
  const _id = records[0]._id
  console.log("更新记录_课程")
  return await _updateRecord(name, _id, openid, data)
}

/**
 * 查询数据库中的记录
 * @param {String} name 数据库名称
 * @param {String} id 用户的openid
 * @returns {Array} 返回数据集合
 */
async function getRecord(name, openid){
  const ret = await db.collection(name).where({
    _openid: openid
  }).get()
  return ret.data
}

/**
 * 新增一个记录，建议先查询是否存在记录
 * @param {String} name 数据库名称
 * @param {String} id 用户的openid
 * @param {String} data 要提交的数据
 */
function newRecord(name, openid, data){
  return db.collection(name).add({
    data: {
      _openid: openid,
      ...data
    },
  })
}

/**
 * 更新一个已存在的记录，注意先查询是否存在记录
 * @param {String} name 数据库名称
 * @param {String} id 用户的openid
 * @param {String} data 要提交的数据
 */
function _updateRecord(name, id, openid, data){
  return db.collection(name).doc(id).update({
    data: {
      _openid: openid,
      ...data
    }
  })
}

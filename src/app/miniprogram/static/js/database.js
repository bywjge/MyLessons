/**
 * 数据库访问服务
 */

const db = wx.cloud.database()
export default db
export {
  getFirstDayOfTerm,
  setFirstDayOfTerm,
  setUserAvator,
  updateRecord,
  getRecord,
  newRecord
}

/**
 * 获取某个学期第一天的日期
 * @param {number | string} year 年份，四位数
 * @param {1 | 2} [term = 1] 学期，1代表第一学期，2代表第二学期
 * @returns {Date | null} 第一天的时间
 */
async function getFirstDayOfTerm(year, term = 1) {
  const key = `${year}0${term}`
  const ret = await db.collection('public')
    .where({ name: 'FirstDay' })
    .field({ value: true })
    .get()
  const days = ret.data[0].value
  
  return days[key] || null
}

/**
 * 设置某个学期第一天的日期
 * @param {number | string} year 年份，四位数
 * @param {1 | 2} [term = 1] 学期，1代表第一学期，2代表第二学期
 * @param {Date} date 日期
 * @description 没有对数据库校验，请确保value是一个object
 */
async function setFirstDayOfTerm(year, term, date) {
  const ret = await db.collection('public')
    .where({ name: 'FirstDay' })
    .field({ value: true })
    .get()
  let { _id, value: days } = ret.data[0]

  if (days && typeof days !== 'object') {
    return Promise.reject('设置学期初失败，value不是一个对象')
  }

  const key = `${year}0${term}`
  days[key] = date
  return db.collection('public').doc(_id)
    .update({
      data: {
        value: days
      }
    })
}

/**
 * 设置用户头像
 * @param {string} fileId 文件id
 */
async function setUserAvator(fileId) {
  const openid = wx.getStorageSync('openid')
  console.log(openid)
  // 假定一定有record
  const userInfo = wx.getStorageSync('wxInfo')
  const username = wx.getStorageSync('username')
  const password = wx.getStorageSync('password')
  userInfo['avatarUrl'] = fileId
  await updateRecord('accounts', openid, {
    username,
    password,
    userInfo
  })
  wx.setStorageSync('wxInfo', userInfo)
  return Promise.resolve()
}

async function updateRecord(name, openid, data){
  const records = await getRecord(name, openid)
  console.log("return record", records);
  // 如果没有记录，则新增
  if (records.length === 0){
    return await newRecord(name, data)
  }
  const _id = records[0]._id
  return await _updateRecord(name, _id, data)
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
function newRecord(name, data){
  return db.collection(name).add({
    data
  })
}

/**
 * 更新一个已存在的记录，注意先查询是否存在记录
 * @param {String} name 数据库名称
 * @param {String} id 用户的openid
 * @param {String} data 要提交的数据
 */
function _updateRecord(name, id, data){
  return db.collection(name).doc(id).update({
    data
  })
}
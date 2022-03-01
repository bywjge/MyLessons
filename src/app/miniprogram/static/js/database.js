/**
 * 数据库访问服务
 */

const db = wx.cloud.database()
export default db
export {
  getFirstDayOfTerm,
  setFirstDayOfTerm
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
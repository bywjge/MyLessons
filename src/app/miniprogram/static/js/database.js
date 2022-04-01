/**
 * @typedef {Object} UserInfo
 * @property {string} username 用户账号
 * @property {string} password 用户密码
 * @property {Object} userInfo 用户信息
 * @property {Date} [time] 绑定时间
 */

/**
 * 数据库访问服务
 */

const db = wx.cloud.database()
const _ = db.command
export default db

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
async function setUserAvatar(fileId) {
  let records = (await db.collection('accounts').get()).data
  // const userInfo = wx.getStorageSync('wxInfo')
  // userInfo['avatarUrl'] = fileId
  if (records.length > 0) {
    wx.setStorageSync('avatarUrl', fileId)
    const id = records[0]._id
    return db.collection('accounts').doc(id).update({ data: { avatarUrl: fileId } })
  }
  return Promise.reject('数据库中无记录')
}

/**
 * 从数据库获取cookie
 */
async function getCookie() {
  let records = (await db.collection('cookies').get()).data
  if (records.length > 0) {
    return Promise.resolve(records[0])
  }

  return Promise.reject()
}

/**
 * 更新cookie到数据库
 * @param {string} cookie 要更新到数据库的cookie
 */
async function updateCookie(cookie) {
  let records = (await db.collection('cookies').get()).data
  const data = {
    cookie,
    time: new Date()
  }

  if (records.length > 0) {
    console.log('update')
    const id = records[0]._id
    return db.collection('cookies').doc(id).update({ data })
  }
  return db.collection('cookies').add({ data })
}

/**
 * 从数据库中读出已经绑定的账号
 *
 * @return {Promise<UserInfo>} 绑定信息
 */
async function getAccount() {
  let records = (await db.collection('accounts').get()).data
  if (records.length > 0) {
    return Promise.resolve(records[0])
  }

  return Promise.reject()
}

/**
 * 更新用户账号/密码
 * @param {string} username 用户账号
 * @param {string} password 用户密码
 * @param {Object} userInfo 用户信息
 */
async function updateAccount(username, password, userInfo) {
  let records = (await db.collection('accounts').get()).data
  const data = {
    username,
    password,
    userInfo,
    admin: false,
    badge: [],
    time: new Date()
  }

  if (records.length > 0) {
    const id = records[0]._id
    data.time = records[0].time || data.time
    return db.collection('accounts').doc(id).update({ data })
  }

  return db.collection('accounts').add({ data })
}

/**
 * 从数据库中获得课程储存
 */
async function getLesson(year, term){
  const termid = `${year}0${term}`
  // let records = (await db.collection('lessons').where({ termid }).get()).data

  let records = (await db.collection('lessons').get()).data
  if (records.length > 0) {
    return Promise.resolve(records[0])
  }

  return Promise.reject()
}

/**
 * 将课程表上传到云端
 * @param {array} lessons 全学期课程（从
 */
async function updateLesson(lessons, year, term){
  const termid = `${year}0${term}`
  let records = (await db.collection('lessons').get()).data
  // 需要将data分成20条一份上传
  let pack = lessons.splice(0, 20)
  const data = {
    lessons: pack,
    termid,
    time: new Date()
  }

  let id = null
  if (records.length > 0) {
    id = records[0]._id
    // data.time = records[0].time || data.time
    await db.collection('lessons').doc(id).update({ data })
  } else {
    await db.collection('lessons').add({ data }).then(ret => id = ret._id)
  }

  while (lessons.length > 0) {
    pack = lessons.splice(0, 20)
    await db.collection('lessons').doc(id).update({ 
      data: {
        lessons: _.push(pack)
      } 
    })
  }
  return Promise.resolve()
}

/**
 * 从数据库中获得全校课表
 * @param {Date} date 日期
 */
async function getSchoolLesson(date){
  let records = (await db.collection('all-lessons').where({
    date: _.eq(date)
  }).get()).data
  if (records.length > 0) {
    return Promise.resolve(records[0])
  }

  return Promise.reject()
}

/**
 * 将全校课表上传到云端
 * @param {array} lessons 全校课程
 * @param {array} date 课表的日期，格式为yyyy-mm-dd
 */
async function updateSchoolLesson(lessons, date){
  let records = (await db.collection('all-lessons').where({
    date: _.eq(date)
  }).get()).data

  const data = {
    date,
    lessons,
    time: new Date()
  }

  if (records.length > 0) {
    const id = records[0]._id
    // data.time = records[0].time || data.time
    return db.collection('all-lessons').doc(id).update({ data })
  }

  return db.collection('all-lessons').add({ data })
}

/**
 * 上报进入时间
 */
async function updateEnterTime() {
  let records = (await db.collection('accounts').get()).data
  if (records.length <= 0) {
    return Promise.resolve()
  }
  const id = records[0]._id
  return db.collection('accounts').doc(id).update({
    data: {
      lastEnterTime: new Date()
    }
  })
}

/**
 * 更新考试安排到数据库
 * @param {Array} exams 考试安排，数组
 */
async function updateExam(exams) {
  let records = (await db.collection('exams').get()).data

  const data = {
    exams,
    time: new Date()
  }

  if (records.length > 0) {
    const id = records[0]._id
    return db.collection('exams').doc(id).update({ data })
  }

  return db.collection('exams').add({ data })
}


/**
 * 更新成绩到数据库
 * @param {Array} scores 成绩记录，数组
 */
async function updateScores(scores) {
  let records = (await db.collection('scores').get()).data

  const data = {
    scores,
    time: new Date()
  }

  if (records.length > 0) {
    const id = records[0]._id
    return db.collection('scores').doc(id).update({ data })
  }

  return db.collection('scores').add({ data })
}

export {
  getFirstDayOfTerm,
  setFirstDayOfTerm,
  setUserAvatar,
  getCookie,
  updateCookie,
  getAccount,
  updateAccount,
  getLesson,
  updateLesson,
  getSchoolLesson,
  updateSchoolLesson,
  updateEnterTime,
  updateExam,
  updateScores
}
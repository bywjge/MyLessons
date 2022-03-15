import db from '../static/js/database'
import logger from '../utils/log'
const log = new logger()

const _ = db.command
const databaseName = 'discusses'

log.setKeyword('apis/discuss.js')

export default {
  addArticle,
  getArticle,
  deleteArticle
}

/**
 * @typedef {Object} Article
 * @property {string} _id 文章的id
 * @property {string} _openid 作者的id
 * @property {string} content 文章内容
 * @property {Array<string>} images 文章附带的图片数组
 * @property {Array<string>} tags 文章标签数组
 * @property {Array<string>} agreeList 点赞用户id数组
 * @property {number} agreeCount 点赞用户数量
 * @property {Array<string>} disagreeList 反对用户id数组
 * @property {number} disagreeCount 反对用户数量
 * @property {'agree'|'disagree'|'none'} stand 立场
 * @property {Array<Comment>} comments 评论数组
 * @property {Date} createTime 发表的时间
 * @property {Date} lastEditTime 上次修改的时间
 * @property {boolean} isDeleted 是否已经被删除
 * @property {'all' | 'student' | 'me'} privacy 权限等级
 * @property {boolean} isHidden 是否已经被隐藏（个人可见）
 */

/**
 * @typedef {Object} ArticleInTable
 * @property {string} _id 文章的id
 * @property {string} _openid 作者的id
 * @property {string} content 文章内容
 * @property {Array<string>} images 文章附带的图片数组
 * @property {Array<string>} tags 文章标签数组
 * @property {Array<string>} agreeList 点赞用户id数组
 * @property {number} agreeCount 点赞用户数量
 * @property {Array<string>} disagreeList 反对用户id数组
 * @property {number} disagreeCount 反对用户数量
 * @property {Date} createTime 发表的时间
 * @property {Date} lastEditTime 上次修改的时间
 * @property {boolean} isDeleted 是否已经被删除
 * @property {'all' | 'student' | 'me'} privacy 权限等级
 * @property {boolean} isHidden 是否已经被隐藏（个人可见）
 */


/**
 * 发表一条动态
 * @param {*} payload 
 */
async function addArticle(payload) {
  // TODO 判断用户是否可以发言

  const emptyArticle = {
    content: '',
    images: [],
    tags: [],
    agreeList: [],
    agreeCount: 0,
    disagreeList: [],
    disagreeCount: 0,
    createTime: new Date(),
    lastEditTime: new Date(),
    isDeleted: false,
    isHidden: payload.privacy === 'me'
  }

  const article = Object.assign({}, emptyArticle, payload)
  return db.collection(databaseName).add({
    data: article
  })
}

/**
 * 获取文章列表
 * @param {number} page 页数,从0开始
 * @param {number} [limit = 20] 每页数量
 * @param {boolean} [showDeleted = false] 是否显示删除文章
 * @param {boolean} [showHidden = false] 是否显示隐藏文章
 */
async function getArticle(page, limit = 20, showDeleted = false, showHidden = false) {
  const ret = await db.collection(databaseName)
    .where({
      isDeleted: _.eq(showDeleted),
      isHidden: _.eq(showHidden)
    })
    .orderBy('createTime', 'desc') /** 按创建时间降序排序 */
    .skip(page * limit) /** 按分页跳过前面的数据 */
    .limit(limit) /** 限制每页数据量 */
    .get()

  return Promise.resolve(ret.data)
}

/**
 * 删除文章
 * @param {string} id 文章的id
 */
async function deleteArticle(id) {
  db.collection('dicusses')
    .doc(id)
    .update({
      isDeleted: true
    })
}

/**
 * 设置对文章的立场（点赞/点踩）
 * @param {string} articleId 文章的id
 * @param {'like' | 'unlike'} stand 立场名称
 */
async function setStandForArticle(articleId, stand = 'like') {
  // 查询文章是否存在
  // db.collection(databaseName).
  // db.collection(databaseName).update({
  //   _id: 
  // })
}

/**
 * 取消设置对文章的立场（点赞/点踩）
 * @param {string} articleId 文章的id
 * @param {'like' | 'unlike'} stand 立场名称
 */
async function unsetStandForArticle(articleId, stand = 'like') {

}
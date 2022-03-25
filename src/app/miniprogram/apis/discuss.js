import db from '../static/js/database'
import logger from '../utils/log'
import cloud from '../utils/cloud'
const log = new logger()

const _ = db.command
const databaseName = 'discusses'

log.setKeyword('apis/discuss.js')

export default {
  addArticle,
  getArticle,
  getArticleById,
  deleteArticle,
  likeArticle,
  dislikeArticle,
  postComment,
  deleteComment
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
 * 发表一篇文章
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
    commentList: [],
    commentCount: 0,
    commentFloor: 0,
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
 * @param {number} cursor 页数,从0开始
 * @param {number} [limit = 20] 每页数量
 * @param {boolean} [showDeleted = false] 是否显示删除文章
 * @param {boolean} [showHidden = false] 是否显示隐藏文章
 */
async function getArticle(cursor = '', limit = 20, showDeleted = false, showHidden = false) {
  return cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'getArticle',
      cursor,
      limit,
      showDeleted,
      showHidden
    }
  })
}

/**
 * 根据id获取某一篇文章
 * @param {string} id 文章的id
 */
async function getArticleById(id) {
  return cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'getArticleById',
      articleId: id
    }
  })
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
 * 点赞某文章
 * @param {string} id 文章id
 */
async function likeArticle(id) {
  return cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'likeArticle',
      articleId: id
    }
  })
}

/**
 * 点踩某文章
 * @param {string} id 文章id
 */
async function dislikeArticle(id) {
  return cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'dislikeArticle',
      articleId: id
    }
  })
}

/**
 * 对文章发表评论
 * @param {string} articleId 文章id
 * @param {string} content 评论内容
 * @param {string} replyTo 回复给谁，对方的openid
 */
async function postComment(articleId, content, replyTo) {
  return cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'postComment',
      articleId,
      content,
      replyTo
    }
  })
}

/**
 * 对文章发表评论
 * @param {string} articleId 文章id
 * @param {string} floor 楼层数
 */
async function deleteComment(articleId, floor) {
  return cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'deleteComment',
      articleId,
      floor
    }
  })
}
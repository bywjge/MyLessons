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
  deletePost,
  likeArticle,
  dislikeArticle,
  postComment,
  deleteComment,
  reportArticle,
  reportComment,
  getPersonInfo
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
    schoolId: wx.getStorageSync('username'),
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
 * 处理文章内容
 * @param {Array<Article>} articleList 文章列表
 * @description 处理文章时间，
 */
function mapArticle(articleList) {
  if (!Array.isArray(articleList)) 
    return articleList;

  const now = new Date()

  // 时间间隔常数
  const timeGapMap = {
    minute: 60 * 1000,
    hour: 3600 * 1000,
    day: 24 * 3600 * 1000,
    week: 7 * 24 * 3600 * 1000
  }

  articleList.forEach(e => {
    let timeStr = ''
    const time = new Date(e.lastEditTime)
    const gap = now.getTime() - time.getTime()
    // 小于一分钟，显示“刚刚”
    if (gap < timeGapMap.minute) {
      timeStr = '刚刚'

    // 小于一小时，显示“xx分钟前”
    } else if (gap < timeGapMap.hour) {
      timeStr = `${Math.floor(gap / timeGapMap.minute)}分钟前`

    // 小于一天，显示“xx小时前”
    } else if (gap < timeGapMap.day) {
      timeStr = `${Math.floor(gap / timeGapMap.hour)}小时前`

    // 小于一周，显示“xx天前”
    } else if (gap < timeGapMap.week) {
      timeStr = `${Math.floor(gap / timeGapMap.day)}天前`

    // 一周以上则显示具体日期YYYY-mm-dd HH:MM
    } else {
      timeStr = time.format('YYYY-mm-dd HH:MM')
    }
  
    Object.assign(e, {
      time: timeStr
    })
  })

  return articleList
}

/**
 * 获取文章列表
 * @param {number} cursor 页数,从0开始
 * @param {number} [limit = 20] 每页数量
 * @param {boolean} [showDeleted = false] 是否显示删除文章
 * @param {boolean} [showHidden = false] 是否显示隐藏文章
 */
async function getArticle(cursor = '', limit = 20, showDeleted = false, showHidden = false) {
  const ret = await cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'getArticle',
      cursor,
      limit,
      showDeleted,
      showHidden
    }
  })

  return mapArticle(ret.result)
}

/**
 * 根据id获取某一篇文章
 * @param {string} id 文章的id
 */
async function getArticleById(id) {
  const ret = await cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'getArticleById',
      articleId: id
    }
  })

  return mapArticle(ret.result)
}

/**
 * 删除文章
 * @param {string} id 文章的id
 */
async function deletePost(id) {
  return db.collection('discusses')
    .doc(id)
    .update({
      data: {
        isDeleted: true
      }
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
    name: 'discusses',
    data: {
      action: 'deleteComment',
      articleId,
      floor
    }
  })
}

/**
 * 举报文章/评论
 * @param {'article' | 'comment'} [type='article'] 动态类型
 * @param {string} postId 动态的id
 * @param {string} [reason] 原因
 */
async function report(type = 'article', postId, reason = '') {
  if (!postId) 
    return Promise.reject('postid为空')
    
  const ret = await db.collection('report-discusses').where({
    type,
    postId
  }).count()

  if (ret.total > 0) {
    return Promise.reject('您已经举报过该动态，请等待后台处理')
  }

  // 上报到report-discusses中等待人工审核
  await db.collection('report-discusses').add({
    data: {
      type,
      postId,
      reason,
      time: new Date()
    }
  })
}

/**
 * 举报文章
 * @param {string} commentId 评论的id
 */
async function reportArticle(articleId, reason) {
  return report('article', articleId, reason)
}

/**
 * 举报评论
 * @param {string} commentId 评论的id
 */
async function reportComment(commentId, reason) {
  return report('comment', commentId, reason)
}

/**
 * 获取个人信息，如动态数量、私信数量、收藏数量
 */
async function getPersonInfo() {
  const ret = await cloud.callFunction({
    name: 'discuss',
    data: {
      action: 'getPersonInfo'
    }
  })

  return Promise.resolve(ret.result)
}
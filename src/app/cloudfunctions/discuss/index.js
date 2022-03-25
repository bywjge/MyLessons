const cloud = require('wx-server-sdk')
const databaseName = 'discusses'
let openid = null

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

let events = {
  likeArticle,
  dislikeArticle,
  getArticle,
  getArticleById,
  postComment,
  deleteComment
}

exports.main = async (event, context) => {
  if (!event.action || !(event.action in events)) {
    return;
  }
  const wxContext = await cloud.getWXContext()
  openid = wxContext.OPENID

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
 * 点赞动态
 */
async function likeArticle({ articleId }) {
  if (!articleId) 
    return Promise.reject('articleID 不能为空')
    
  const ret = await db.collection(databaseName).where({
    _id: articleId,
    agreeList: _.nin([openid])
  }).update({
    data: {
      agreeList: _.push(openid),
      agreeCount: _.inc(1)
    }
  })

  /** 如果已经点赞/点踩，则取消该操作 */
  if (ret.stats.updated !== 1) {
    await db.collection(databaseName).where({
      _id: articleId,
    }).update({
      data: {
        agreeList: _.pull(openid),
        agreeCount: _.inc(-1)
      }
    })
    return Promise.resolve()
  }

  // 更新点踩数量
  await db.collection(databaseName)
    .where({
      _id: articleId,
      disagreeList: _.in([openid])
    })
    .update({
      data: {
        disagreeList: _.pull(openid),
        disagreeCount: _.inc(-1)
      }
    })

  return Promise.resolve()
}

/**
 * 点踩动态
 */
async function dislikeArticle({ articleId }) {
  if (!articleId) 
    return Promise.reject('articleID 不能为空')

  const ret = await db.collection(databaseName).where({
    _id: articleId,
    disagreeList: _.nin([openid])
  }).update({
    data: {
      disagreeList: _.push(openid),
      disagreeCount: _.inc(1)
    }
  })

  /** 如果已经点赞/点踩，则取消该操作 */
  if (ret.stats.updated !== 1) {
    await db.collection(databaseName).where({
      _id: articleId,
    }).update({
      data: {
        disagreeList: _.pull(openid),
        disagreeCount: _.inc(-1)
      }
    })
    return Promise.resolve()
  }

  // 更新点赞数量
  await db.collection(databaseName)
    .where({
      _id: articleId,
      agreeList: _.in([openid])
    })
    .update({
      data: {
        agreeList: _.pull(openid),
        agreeCount: _.inc(-1)
      }
    })

  return Promise.resolve()
}

/**
 * 获取文章
 * @param {Object} payload
 * @param {string} payload.cursor 游标，如果提供了上一次结果的最后一条的id，则从其向后获取数据
 * @param {number} [payload.limit = 30] 限制获取数量
 * @param {boolean} payload.showDeleted 是否展示已删除文章
 * @param {boolean} payload.showHidden 是否展示私人文章
 */
async function getArticle({ cursor, limit = 30, showDeleted, showHidden }) {
  const ret = await db.collection(databaseName)
    .aggregate()
    .match({
      isDeleted: _.eq(showDeleted),
      isHidden: _.eq(showHidden),
      _id: _.gt(cursor)
    })
    .addFields({
      isLiked: $.cond({
        if: $.in([openid, '$agreeList']),
        then: true,
        else: false
      }),
      isDisliked: $.cond({
        if: $.in([openid, '$disagreeList']),
        then: true,
        else: false
      })
    })
    .project({
      disagreeList: false,
      agreeList: false
    })
    .sort({
      /** 按创建时间降序排序 */
      createTime: -1
    })
    // .skip(page * limit) /** 按分页跳过前面的数据 */
    .limit(limit) /** 限制每页数据量 */
    .end()

  return Promise.resolve({
    result: ret.list
  })
}

/**
 * 根据id获取某一篇文章
 * @param {Object} payload
 * @param {string} payload.articleId 
 */
async function getArticleById({ articleId }) {
  const ret = await db.collection('discusses')
    .aggregate()
    .match({
      _id: articleId,
      _openid: openid
    })
    .addFields({
      isLiked: $.cond({
        if: $.in([openid, '$agreeList']),
        then: true,
        else: false
      }),
      isDisliked: $.cond({
        if: $.in([openid, '$disagreeList']),
        then: true,
        else: false
      })
    })
    .project({
      disagreeList: false,
      agreeList: false
    })
    .end()

  return Promise.resolve({
    result: ret.list[0]
  })
}

/**
 * 发表评论
 * @param {Object} payload
 * @param {string} payload.articleId 要添加到的文章的id
 * @param {string} payload.content 评论的内容
 * @param {string} [payload.replyTo] 回复给谁，对方的openid
 */
async function postComment({ articleId, content, replyTo }) {
  const ret = await db.collection(databaseName).doc(articleId).update({
    data: {
      commentFloor: _.inc(1),
      commentCount: _.inc(1),
      commentList: _.push({
        content,
        floor: '$commentFloor',
        replyTo,
        // articleId,
        _openid: openid,
        postTime: new Date()
      })
    }
  })

  if (ret.stats.updated !== 1) {
    return Promise.reject('添加评论失败')
  }

  return Promise.resolve()
}

/**
 * 删除评论
 * @param {Object} payload
 * @param {string} payload.articleId 要删除评论的文章的id
 * @param {string} payload.floor 评论的楼层
 */
async function deleteComment({ articleId, floor }) {
  const ret = await db.collection(databaseName).doc(articleId).update({
    data: {
      commentList: _.pull({
        floor: _.eq(floor)
      })
    }
  })

  if (ret.stats.updated !== 1) {
    return Promise.reject('删除评论失败')
  }
  // 操作成功后评论数量-1
  db.collection(databaseName).doc(articleId).update({
    data: {
      commentCount: _.inc(-1)
    }
  })
  return Promise.resolve()
}
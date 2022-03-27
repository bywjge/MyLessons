import tools from "../../utils/tools"
import discussApi from '../../apis/discuss'
import cloud from '../../utils/cloud'
import db from "../../static/js/database"
import discuss from "../../apis/discuss"
const { navBarHeight, windowWidth, statusBarHeight, statusBarButtonHeight } = getApp().globalData

Page({
  data: {
    avatarUrl: "",
    publicName: "世界第一的初音公主殿下",
    // 个人卡片是否展开
    expandHead: false,
    hideHead: false,
    lastY: 0,
    navBarHeight,
    articles: [],
    isAdmin: false,
    info: {
      post: 0,
      message: 0,
      collection: 0,
      mark: 0
    }
  },

  async onLoad() {
    const { avatarUrl } = wx.getStorageSync('wxInfo')
    this.setData({
      avatarUrl,
      isAdmin: wx.getStorageSync('admin')
    })
    this.refreshArticle()
  },

  handleExpand() {
    this.setData({
      expandHead: !this.data.expandHead
    })
  },

  /** 滑动时处理顶部个人中心隐藏 */
  handleTouchMove: tools.throttle(function({ touches }){
    const { pageY } = touches[0]
    const delta = pageY - this.data.lastY
    if (this.data.expandHead) {
      this.setData({
        lastY: pageY
      })
      return ;
    }

    this.setData({
      hideHead: Math.abs(delta) > 10? (delta < 0): this.data.hideHead,
      lastY: pageY
    })
  }, 20),

  // 添加动态
  handleAddButton() {
    wx.showActionSheet({
      // alertText: '您需要...',
      itemList: [
        '发表新的动态'
      ]
    })
    .then(({ tapIndex: index }) => {
      wx.navigateTo({
        url: '/pages/discuss-new-post/discuss-new-post',
      })
    })
    .catch(() => {})
  },

  /** 点击动态dropdown弹出菜单 */
  handleArticleMenu({ target }) {
    const { dataset: { articleid, owned } } = target
    
    const adminMenu = [
      '举报',
      '收藏',
      '封禁该动态'
    ]
    const regularMenu = [
      '举报',
      '收藏'
    ]
    if (owned) {
      adminMenu.push('删除该动态')
      regularMenu.push('删除该动态')
    }


    wx.showActionSheet({
      itemList: this.data.isAdmin? adminMenu: regularMenu,
    })
    .then(({ tapIndex: index }) => {
      let item = null
      if (this.data.isAdmin) {
        item = adminMenu[index]
      } else {
        item = regularMenu[index]
      }

      switch(item) {
        case '举报':
          this.reportArticle(articleid)
          break;
        case '收藏':
          this.collectArticle(articleid)
          break;
        case '封禁该动态':
          this.blockArticle(articleid)
          break;
        case '删除该动态':
          this.deleteArticle(articleid)
          break;

      }
    })
    .catch(() => {})

  },
  
  async refreshArticle() {
    wx.showLoading({ title: '加载数据中' })
    const data = await discussApi.getArticle()
    console.log(data)
    this.setData({
      articles: data
    })

    const info = await discussApi.getPersonInfo()
    this.setData({ info })

    wx.hideLoading()
  },

  onPullDownRefresh() {
    console.log("hide")
  },

  // 点赞文章
  async likeArticle({ target }) {
    const { dataset } = target
    // 马上更改数值，给用户更好的体验
    const { index, element } = this.getLocalArticleById(dataset.articleid)
    console.log(index, element)
    // 如果已经点赞，则需要取消点赞，并数量减一
    if (element.isLiked) {
      element.isLiked = false
      element.agreeCount--
    } else {
      // 如果没有点赞，则需要设置点赞
      element.isLiked = true
      element.agreeCount++
    }

    // 需要取消点踩
    if (element.isDisliked) {
      element.isDisliked = false
      element.disagreeCount--
    }
    
    this.setData({
      [`articles[${index}]`]: element
    })

    await discussApi.likeArticle(dataset.articleid)
    this.refreshSingleArtical(dataset.articleid)
  },

  // 点踩文章
  async dislikeArticle({ target }) {
    const { dataset } = target
    // 马上更改数值，给用户更好的体验
    const { index, element } = this.getLocalArticleById(dataset.articleid)
    console.log(index, element, dataset.articleid)
    // 如果已经点踩，则需要取消点踩，并数量减一
    debugger
    if (element.isDisliked) {
      element.isDisliked = false
      element.disagreeCount--
    } else {
      // 如果没有点踩，则需要设置点踩
      element.isDisliked = true
      element.disagreeCount++
    }

    // 需要取消点赞
    if (element.isLiked) {
      element.isLiked = false
      element.agreeCount--
    }
    
    this.setData({
      [`articles[${index}]`]: element
    })

    await discussApi.dislikeArticle(dataset.articleid)

    this.refreshSingleArtical(dataset.articleid)
  },


  async testPost({ target }) {
    const { dataset } = target
    await discussApi.postComment(dataset.articleid, 'test')

    await this.refreshSingleArtical(dataset.articleid)
  },

  /**
   * 举报文章
   * @param {string} articleId 文章的id
   */
  async reportArticle(articleId) {
    wx.showLoading({
      title: '请稍后'
    })
    await discussApi.reportArticle(articleId)
      .then(() => {
        wx.showModal({
          title: '已提交举报',
          content: '后台审核将尽快处理您的请求，请等待处理结果'
        })
      })
      .catch(e => {
        tools.showModal({
          title: '举报失败',
          content: e
        })
      })

    wx.hideLoading()
  },

  /**
   * 收藏文章
   * @param {string} articleId 文章的id
   */
  async collectArticle(articleId) {
    tools.showModal({
      title: '提示',
      content: '功能正在开发中'
    })
  },

  /**
   * 封禁文章（管理员）
   * @param {string} articleId 文章的id
   */
  async blockArticle(articleId) {

  },

  /**
   * 删除自己发表过的某篇文章
   * @param {string} articleId 文章id
   */
  async deleteArticle(articleId) {
    console.log("????");
    wx.showLoading({ title: '请稍后'})
    await discussApi.deletePost(articleId)
      .then(() => {
        tools.showToast({
          title: '已删除动态',
        })
      })
      .catch(e => {
        tools.showModal({
          title: '删除失败',
          content: '请稍后再试一试'
        })
      })
    wx.hideLoading()
    await tools.sleep(1000)
    this.refreshArticle()
  },

  async refreshSingleArtical(articalId) {
    const ret = await discussApi.getArticleById(articalId)
    const index = this.getLocalArticleById(articalId).index
    this.setData({
      [`articles[${index}]`]: ret
    })
    console.log(ret)
  },

  /**
   * 通过id获取本地文章的索引和元素
   * @param {string} id 文章的id
   * 
   * @return {{index: number, element: Object}} 返回元素
   */
  getLocalArticleById(id) {
    console.log(this.data.articles.length, this.data.articles, id)
    const index = this.data.articles.findIndex(e => e._id === id)
    return {
      index,
      element: (index === -1)? null: this.data.articles[index]
    }
  }
})
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
    articles: []
  },

  onLoad() {
    const { avatarUrl } = wx.getStorageSync('wxInfo')
    this.setData({
      avatarUrl
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

  async refreshArticle() {
    wx.showLoading({ title: '加载数据中' })
    const data = await discussApi.getArticle()
    console.log(data)

    this.setData({
      articles: data.result
    })
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

  async refreshSingleArtical(articalId) {
    const ret = await discussApi.getArticleById(articalId)
    const index = this.getLocalArticleById(articalId).index
    this.setData({
      [`articles[${index}]`]: ret.result
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
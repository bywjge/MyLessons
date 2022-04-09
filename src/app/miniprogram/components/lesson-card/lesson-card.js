// components/lesson-card.js
import lessonApi from '../../apis/lessons'

Component({
  /**
   * 组件的属性列表 props
   */
  properties: {
    // status
    info: {
      type: Object,
      value: {
        '日期': "2000-01-01",
        '课程名称': "未知",
        '教学地点': "未知",
        '教师姓名': "未知",
        // 上课班级
        '上课班级': [],
        // 上课内容
        '上课内容': "未知",
        '节次': {
          from: 1,
          to: 2,
        }
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    status: "normal",
    isExtended: false,
    ignoreExtend: false,
    from: {
      index: "",
      str: ""
    },
    to: {
      index: "",
      str: ""
    }
  },

  // dom被插入加载时调用
  attached(){
    const app = getApp();
    const eventBus = app.globalData.eventBus;

    // 窗口从后台切换到前台显示时刷新
    const that = this
    eventBus.on("show", function(){
      that.refreshStatus()
    })

    // 折叠所有（日期选择器被点击，刷新信息）
    // 但上课的话就不要折叠起来了
    eventBus.on("allClose", function(){
      that.refreshStatus()
      if (that.data.status !== "normal"){
        return ;
      }
      that.setData({
        isExtended: false
      })
      // that.refreshIndex()
    })

    this.refreshIndex()
    this.refreshStatus()
  },

  methods: {

    // 刷新节次
    refreshIndex(){
      const info = this.properties.info
      // 时间字符串
      this.setData({
        from: {
          index: info['节次'][0].prefixZero(2),
          str: lessonApi.convertIndexToTime(info['节次'][0])[0]
        },
        to: {
          index: info['节次'][1].prefixZero(2),
          str: lessonApi.convertIndexToTime(info['节次'][1], true)[0]
        }
      })
    },

    /**
     * 刷新卡片状态（是否在上课）
     */
    refreshStatus(){
      const info = this.properties.info
      // 是否正在上课
      const now = new Date()
      const date = new Date().format("YYYY-mm-dd")

      // 不是同一天，直接*返回*normal
      if (date !== info['日期']){
        this.setData({
          status: "normal"
        })

        return ;
      }
      const t1 = lessonApi.convertIndexToTime(info['节次'][0])[1]
      const t2 = lessonApi.convertIndexToTime(info['节次'][1], true)[1]
      const gap = t1.getTime() - now.getTime()

      // 准备上课的间隔，默认20分钟
      const comingGap = 20 * 60 * 1000
      let newStatus = this.data.status
      // 如果正在上课
      if (t1 <= now && t2 >= now && date === info['日期']){
        newStatus = "underway"
      } else if (0 < gap && gap < comingGap){
        newStatus = "coming"
      } else {
        newStatus = "normal"
      }
      if (this.data.status === newStatus)
        return ;

      this.setData({
        status: newStatus
      })
      // console.log(this.data.ignoreExtend);
      if (this.data.ignoreExtend)
        return ;

      // 不上课就展开，包括准备上课
      if (newStatus !== "normal"){
        this.setData({
          isExtended: true
        })
      } else {
        this.setData({
          isExtended: false
        })
      }
    },

    // 处理点击展开事件
    handleClick(){
      this.setData({
        ignoreExtend: true,
        isExtended: !this.data.isExtended
      })
    }
  }
})

import tools from '../../utils/tools'
const app = getApp()
const eventBus = app.globalData.eventBus

Component({
  properties: {
    item: {
      type: Array,
      value: new Array(5).fill(123).map(() => new Array(7).fill(null))
    },

    activeIndex: {
      type: Number,
      default: null
    }
  },
  data: {
    showAddButton: {
      day: null,
      index: null
    },
    id: ""
  },
  ready() {
    this.setData({
      id: tools.randomString(8)
    })
    // 如果其他页课表点击了，则本页的加号消失
    eventBus.on('lessonTap', id => {
      if (id === this.data.id)
        return ;

      this.setData({
        showAddButton: { day: null, index: null }
      })
    }) 
  },
  moved() {
    eventBus.off('lessonTap')
  },
  methods: {
    async handleLessonTap({ currentTarget, type }) {
      if (type !== 'tap')
        return ;

      const { dataset } = currentTarget
      const { day, index, item, empty } = dataset

      eventBus.emit('lessonTap', this.data.id)
      // 如果格子不空，弹出课程窗口
      if (!empty) {
        this.triggerEvent('tapLesson', item)
        this.setData({
          showAddButton: { day: null, index: null }
        })
        return ;
      }

      // 点击已经显示加号的课表
      if (
        (this.data.showAddButton.day === day) &&
        (this.data.showAddButton.index === index)
      ) {
        this.setData({
          showAddButton: { day: null, index: null }
        })
        return ;
      }

      this.setData({
        showAddButton: { day, index }
      })
    },

    // 处理课程格子长按
    async handleLessonLongPress({ currentTarget, type }) {
      const { dataset } = currentTarget
      const { day, index, item, empty } = dataset

      if (type !== 'longpress')
        return ;


      // 如果这是一个出现了加号的格子，则添加课程
      if (
        (this.data.showAddButton.day === day) &&
        (this.data.showAddButton.index === index)
      ) {
        wx.vibrateShort()
        console.log("添加课程", day, index)
        this.triggerEvent('addLesson', { day, index })
        return ;
      }

      // 如果对着课程长按，编辑课程
      if (!empty) {
        wx.vibrateShort()
        console.log("编辑课程", item)
        this.triggerEvent('editLesson', item)
        return ;
      }
    }
  }
})

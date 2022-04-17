import tools from "../../utils/tools"
let nowLesson = null

Page({
  data: {
    lesson: {
      name: '',
      teacher: '',
      color: 'blue-1',
    },
    lessonsMap: [],
    colorList: [
      'red', 'orange', 'yellow', 'green', 'blue-1', 'blue-2', 'purple', 'violet', 'tan', 'burlywood', 'pink', 'black'
    ],
    selectColor: '',
    // 课程是否已经从列表内添加，如果是则不允许编辑基本信息
    lessonLock: false,
    mode: 'edit'
  },

  onLoad(options) {
    const mode = options.mode || null
    const key = options.key || null
    const date = options.date || null

    if (!mode || !key || !date) {
      tools.showModal({
        title: '参数错误',
        content: '缺少mode/key/date参数，即将返回上一页'
      }).then(() => wx.navigateBack({ delta: 1 })).catch(() => {})
      return ;
    }

    const lessons = wx.getStorageSync('lessonsByDay')[date] || []
    const lesson = lessons.find(e => e._key === key)
    console.log()
    if (!lesson) {
      tools.showModal({
        title: '参数错误',
        content: '传递的参数非法，课程不存在'
      }).then(() => wx.navigateBack({ delta: 1 })).catch(() => {})
      return ;
    }

    nowLesson = lesson


    this.setData({
      lesson: {
        name: lesson['课程名称'],
        teacher: lesson['教师姓名'],
        color: lesson['卡片颜色']
      },
      mode,
      lessonLock: true
    })
  },

  onReady() {
  },

  handleTitleInput({ detail }){
    this.setData({
      'info.title': detail.value
    })
  },

  selectColor() {
    this.setData({
      selectColor: this.data.lesson.color
    })
    this.selectComponent('#color-selector').switchVisible(true)
  },

  // 点击“添加到已有课程中” 或者 “自定义课程信息”
  selectLesson() {
    // 课程已经锁定，则清空信息并解锁
    if (this.data.lessonLock) {
      this.setData({
        'lesson.color': '#1EC10D',
        'lesson.name': '',
        'lesson.teacher': '',
        lessonLock: false
      })
      return ;
    }
    this.selectComponent('#lesson-selector').switchVisible(true)
  },

  handleLessonItemSelect({ currentTarget }) {
    const { dataset: { lesson } } = currentTarget
    this.setData({
      'lesson.color': lesson['卡片颜色'],
      'lesson.name': lesson['课程名称'],
      'lesson.teacher': lesson['教师姓名'],
      lessonLock: true
    })
    this.selectComponent('#lesson-selector').switchVisible(false)
  },

  handleColorItemSelect({ currentTarget }) {
    const { dataset: { color } } = currentTarget
    this.setData({
      selectColor: color
    })
  },

  confirmColor() {
    this.setData({
      'lesson.color': this.data.selectColor
    })
    this.selectComponent('#color-selector').switchVisible(false)
  }
})
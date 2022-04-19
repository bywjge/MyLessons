import tools from "../../utils/tools"
// let nowLesson = null
const colorList = [
  { name: 'Red', value: 'red' },
  { name: 'Orange', value: 'orange' },
  { name: 'Yellow', value: 'yellow' },
  { name: 'Green', value: 'green' },
  { name: 'Light Blue', value: 'blue-1' },
  { name: 'Blue', value: 'blue-2' },
  { name: 'Purple', value: 'purple' },
  { name: 'Violet', value: 'violet' },
  { name: 'Tan', value: 'tan' },
  { name: 'Burlywood', value: 'burlywood' },
  { name: 'Pink', value: 'pink' },
  { name: 'Black', value: 'black' }
]

const timeNameMap = {
  '1-2': '上午第一大节',
  '3-4': '上午第二大节',
  '1-4': '整个上午',
  '5-6': '下午第一大节',
  '7-8': '下午第二大节',
  '5-8': '整个下午',
  '1-8': '上午+下午',
  '9-10': '晚上第一大节',
  '11-12': '晚上第二大节',
  '9-12': '整个晚上',
  '13-14': '中午',
}

Page({
  data: {
    lesson: {
      name: '',
      teacher: '',
      color: 'pink',
    },
    lessonsList: [],
    scheduleList: [],
    colorList: colorList.map(e => e.value),
    colorMap: colorList.reduce((pre, e) => ((pre[e.value] = e.name), pre), {}),
    selectColor: '',
    // 课程是否已经从列表内添加，如果是则不允许编辑基本信息
    lessonLock: false,
    mode: 'edit'
  },

  onLoad(options = {}) {
    const mode = options.mode || null
    const key = options.key || null
    const date = options.date || null

    const lessonsMap = wx.getStorageSync('lessonsMap') || {}

    this.setData({
      mode,
      lessonsList: Object.keys(lessonsMap).map(key => Object.assign({}, lessonsMap[key], { 课程名称: key }))
    })

    if (mode === 'add') {
      return ;
    }

    if (mode === 'edit' && (!key || !date)) {
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
        'lesson.color': 'pink',
        'lesson.name': '',
        'lesson.teacher': '',
        lessonLock: false,
        scheduleList: []
      })
      return ;
    }
    this.selectComponent('#lesson-selector').switchVisible(true)
  },

  handleLessonItemSelect({ currentTarget }) {
    const { dataset: { lesson } } = currentTarget
    lesson['上课安排'].forEach(e => Object.assign(e, {
      节次名称: this.convertIndexToName(e['节次'][0], e['节次'][1])
    }))
    this.setData({
      'lesson.color': lesson['卡片颜色'],
      'lesson.name': lesson['课程名称'],
      'lesson.teacher': lesson['教师姓名'],
      scheduleList: lesson['上课安排'],
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
  },

  convertIndexToName(from, to) {
    const key = `${Number(from)-Number(to)}`
    if (!timeNameMap[key])
      return `第${from}-${to}节`
    return timeNameMap[key]
  }
})
import tools from '../../utils/tools'
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

  },
  methods: {
    async handleLessonTap(e) {
      const item = e.currentTarget.dataset.item
      if (!item)
        return ;
      
      // await tools.sleep(200)
      this.triggerEvent('tapLesson', item)
    }
  }
})

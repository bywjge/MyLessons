Component({
  properties: {
    item: {
      type: Array,
      value: new Array(5).fill(123).map(() => new Array(7).fill(null))
    }
  },
  data: {

  },
  methods: {
    handleLessonTap(e) {
      const item = e.currentTarget.dataset.item
      if (!item)
        return ;
        
      this.triggerEvent('tapLesson', item)
    }
  }
})

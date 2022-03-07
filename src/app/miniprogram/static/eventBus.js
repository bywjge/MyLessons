import tools from '../utils/tools'
//创建EventBus对象
let EventBus = function () {
};
var busMap = {};
//添加方法
EventBus.prototype = {
  emit: async function (key, ...data) {
    if (!key || !(key in busMap))
      return;
    for (const i in busMap[key]) {
      const fn = busMap[key][i];
      if (typeof fn !== 'function') {
        this.off(key, i)
      } else {
        fn.apply(null, data)
      }
    }
  },

  on: function (key, action) {
    if (!(key && action)) 
      return;

    if (!(key in busMap)){
      busMap[key] = {}
    }
    const id = tools.randomString(8)
    busMap[key][id] = action

    return id
  },

  off: function(key, id = null){
    if (!(key in busMap))
      return;

    if (!id) {
      delete busMap[key]
    } else if (id in busMap[key]) {
      delete busMap[key][id]
    }
  }
}
var eventBus = new EventBus()

export {
  eventBus,
  EventBus
}
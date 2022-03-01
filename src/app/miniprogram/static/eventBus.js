//创建EventBus对象
let EventBus = function () {
};
var busMap = {};
//添加方法
EventBus.prototype = {
  emit: async function (key, ...data) {
    if (!key || !(key in busMap))
      return;

    busMap[key].forEach(fn => {
      fn(...data)
    })
  },

  on: function (key, action) {
    if (!(key && action)) 
      return;

    if (!(key in busMap)){
      busMap[key] = []
    }
    busMap[key].push(action)
  },

  off: function(key){
    if (!(key in busMap))
      return;

    busMap[key] = []
  }
}
var eventBus = new EventBus()

export {
  eventBus,
  EventBus
}
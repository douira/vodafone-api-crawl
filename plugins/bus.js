import Vue from "vue"

//empty data for bus instance
const eventBus = {
  //on install of plugin, create a new vue instance as the bus
  install: Vue => (Vue.prototype.$bus = new Vue())
}

//tell the main instance to use this bus
Vue.use(eventBus)

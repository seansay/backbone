// 一个替代 `Backbone.sync` 的简单模块, 使用HTML5的 *localStorage* 来做持久化.
// 模型都有其自己唯一的GUID, 以JSON对象的形式保存. 就这么简单.

// 生成四位随机的十六进制数
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// 生成一个伪GUID, 连接多个随机十六进制数.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

// Store代表了一个保存在 *localStorage* 的JSON对象. 以有意义的名称来命名, 
// 就像给数据库里的一个表命名一样.
var Store = function(name) {
  this.name = name;
  var store = localStorage.getItem(this.name);
  this.data = (store && JSON.parse(store)) || {};
};

_.extend(Store.prototype, {

  // 保存 **Store** 的当前状态到 *localStorage* 里.
  save: function() {
    localStorage.setItem(this.name, JSON.stringify(this.data));
  },

  // 增加一个模型, 如果它自己还没有id的话.
  // 给它生成一个唯一的(希望是唯一的)GUID,
  create: function(model) {
    if (!model.id) model.id = model.attributes.id = guid();
    this.data[model.id] = model;
    this.save();
    return model;
  },

  // 更新一个模型, 以 `this.data` 来更新.
  update: function(model) {
    this.data[model.id] = model;
    this.save();
    return model;
  },

  // 根据id从 `this.data` 里获取一个模型.
  find: function(model) {
    return this.data[model.id];
  },

  // 返回所有模型的数组.
  findAll: function() {
    return _.values(this.data);
  },

  // 从 `this.data` 里删除一个模型, 并返回这个模型.
  destroy: function(model) {
    delete this.data[model.id];
    this.save();
    return model;
  }

});

// 重写 `Backbone.sync` , 委托到模型或集合的
// *localStorage* 属性, 它应该是 `Store` 的一个实例.
Backbone.sync = function(method, model, options) {

  var resp;
  var store = model.localStorage || model.collection.localStorage;

  switch (method) {
    case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
    case "create":  resp = store.create(model);                            break;
    case "update":  resp = store.update(model);                            break;
    case "delete":  resp = store.destroy(model);                           break;
  }

  if (resp) {
    options.success(resp);
  } else {
    options.error("Record not found");
  }
};
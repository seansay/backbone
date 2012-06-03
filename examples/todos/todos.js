// 一个Backbone的应用实例,
// 由[Jérôme Gravel-Niquet](http://jgn.me/)提供. 此示例使用了一个简单的
// [LocalStorage adapter](backbone-localstorage.html)(HTML5本地存储的adapter)
// 来给Backbone的模型在浏览器中进行持久化.

// 一旦DOM准备好了就加载应用, 使用 `jQuery.ready`:
$(function(){

  // Todo 模型
  // ----------

  // 最基本的 **Todo** 模型包含 `title`, `order`, 和 `done` 属性.
  var Todo = Backbone.Model.extend({

    // Todo 的默认属性.
    defaults: function() {
      return {
        title: "empty todo...",
        order: Todos.nextOrder(),
        done: false
      };
    },

    // 确保所有创建的todo都有 `title` 属性.
    initialize: function() {
      if (!this.get("title")) {
        this.set({"title": this.defaults.title});
      }
    },

    // 切换todo的完成状态 `done`.
    toggle: function() {
      this.save({done: !this.get("done")});
    },

    // 从 *localStorage* 里删掉这个todo, 并删除视图.
    clear: function() {
      this.destroy();
    }

  });

  // Todo集合
  // ---------------

  // Todo集合的后台使用浏览器的 *localStorage* 来取代服务器存储.
  var TodoList = Backbone.Collection.extend({

    // 集合的模型引用.
    model: Todo,

    // 在 `"todos"` 命名空间下保存所有的todo项.
    localStorage: new Store("todos-backbone"),

    // 获取所有已完成的todo项.
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    // 获取所有仍未完成的todo项.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // 保持所有todo项的排列顺序, 尽管在本地存储里存着的是无序的GUID.
    // 这个方法将生成下一个新todo的序号.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todo都是由其原始的插入顺序进行排序的.
    comparator: function(todo) {
      return todo.get('order');
    }

  });

  // 创建全局的 **Todos** 集合.
  var Todos = new TodoList;

  // Todo 视图
  // --------------

  // 一个todo项的DOM元素...
  var TodoView = Backbone.View.extend({

    //... 是一个 `<li/>` 标签.
    tagName:  "li",

    // 缓存一个todo的模板函数.
    template: _.template($('#item-template').html()),

    // 一个todo视图具体的DOM事件.
    events: {
      "click .toggle"   : "toggleDone",
      "dblclick .view"  : "edit",
      "click a.destroy" : "clear",
      "keypress .edit"  : "updateOnEnter",
      "blur .edit"      : "close"
    },

    // Todo 视图监听模型的改变事件, 并重新渲染. 
    // **Todo** 和 **TodoView** 在这个应用里是一一对应的.
    // 这里为了方便, 直接设置一个模型的引用.
    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    // 重新渲染 Todo 项的标题.
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.toggleClass('done', this.model.get('done'));
      this.input = this.$('.edit');
      return this;
    },

    // 改变模型的 `"done"(完成)` 状态.
    toggleDone: function() {
      this.model.toggle();
    },

    // 把视图切换到 `"editing"(编辑)` 模式, 显示输入字段.
    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    // 关闭 `"editing"(编辑)` 模式, 保存 todo 的更改.
    close: function() {
      var value = this.input.val();
      if (!value) this.clear();
      this.model.save({title: value});
      this.$el.removeClass("editing");
    },

    // 如果按了 `回车`, 也算编辑完了保存更改.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // 删除这个 todo, 并销毁模型.
    clear: function() {
      this.model.clear();
    }

  });

  // 主程序
  // ---------------

  // 主程序总体的 **AppView** 是UI的顶层.
  var AppView = Backbone.View.extend({

    // 这里不再是生成一个新的DOM元素, 
    // 而是绑定到HTML中已经存在的元素.
    el: $("#todoapp"),

    // 这里的模板, 是应用底部的一行统计信息.
    statsTemplate: _.template($('#stats-template').html()),

    // 委托事件来创建新 todo, 还有清除已完成的 todo.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "click #clear-completed": "clearCompleted",
      "click #toggle-all": "toggleAllComplete"
    },

    // 通过初始化方法, 来绑定相关事件到 `Todos` 集合,
    // 如一个 todo 项被创建或者改变. 
    // 最后读取之前存在 *localStorage* 里的 todo 项.
    initialize: function() {

      this.input = this.$("#new-todo");
      this.allCheckbox = this.$("#toggle-all")[0];

      Todos.bind('add', this.addOne, this);
      Todos.bind('reset', this.addAll, this);
      Todos.bind('all', this.render, this);

      this.footer = this.$('footer');
      this.main = $('#main');

      Todos.fetch();
    },

    // 重新渲染应用只是刷新统计信息而已 --
    // 其他部分并没有任何变化.
    render: function() {
      var done = Todos.done().length;
      var remaining = Todos.remaining().length;

      if (Todos.length) {
        this.main.show();
        this.footer.show();
        this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
      } else {
        this.main.hide();
        this.footer.hide();
      }

      this.allCheckbox.checked = !remaining;
    },

    // 增加一个 todo 项到列表中, 并给它创建一个视图,
    // 然后把其DOM元素追加到 `<ul>` 里.
    addOne: function(todo) {
      var view = new TodoView({model: todo});
      this.$("#todo-list").append(view.render().el);
    },

    // 一次性往 **Todos** 里添加所有 todo 项.
    addAll: function() {
      Todos.each(this.addOne);
    },

    // 如果在输入字段里按了回车, 创建一个新的 **Todo** 模型,
    // 并把他持久化到 *localStorage* 里.
    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      if (!this.input.val()) return;

      Todos.create({title: this.input.val()});
      this.input.val('');
    },

    // 清除所有完成的 todo 项, 并销毁所有的模型.
    clearCompleted: function() {
      _.each(Todos.done(), function(todo){ todo.clear(); });
      return false;
    },

    toggleAllComplete: function () {
      var done = this.allCheckbox.checked;
      Todos.each(function (todo) { todo.save({'done': done}); });
    }

  });

  // 最后, 我们创建一个 **App** 就完事了.
  var App = new AppView;

});

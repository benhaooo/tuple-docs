# JavaScript `this` 指向深度解析

## 一、`this` 关键字概述

`this` 是 JavaScript 中一个非常重要的关键字，也是一个常见的面试考点。对 `this` 的不理解会导致开发中遇到各种问题。

> **核心概念**：`this` 总是返回一个对象（非严格模式下）。它的指向取决于函数的调用方式，而不是定义方式。

一个广为流传但不完全准确的说法是：“谁调用它，`this` 就指向谁”。本笔记将系统性地总结 `this` 的指向规则。

## 二、`this` 指向的五种核心场景

1.  **作为普通函数调用**

      * **非严格模式**：`this` 指向全局对象（浏览器中是 `window`，Node.js 中是 `global`）。
      * **严格模式 (`'use strict'`)**：`this` 的值为 `undefined`。

2.  **作为构造函数调用 (`new`)**

      * `this` 指向新创建的实例对象。

3.  **使用 `call`, `apply`, `bind` 调用**

      * `this` 被显式地绑定到传入的第一个参数对象上。

4.  **作为对象的方法调用（上下文对象）**

      * `this` 指向调用该方法的对象。

5.  **在箭头函数 (`=>`) 中**

      * `this` 的指向由其定义时所在的外层（词法）作用域决定，它本身没有 `this`。

-----

## 三、场景详解与实例分析

### 场景 1：普通函数调用 (全局上下文)

当一个函数不作为对象的方法、构造函数或通过 `call/apply/bind` 调用时，它就是普通函数调用。

#### 示例 1：非严格模式

```javascript
// 在 Node.js 环境下运行
function fn1() {
  console.log(this);
}

fn1(); // 普通函数调用
// 输出: <ref *1> Object [global] { ... } (指向全局对象 global)
```

#### 示例 2：严格模式

```javascript
function fn2() {
  'use strict'; // 在函数内部开启严格模式
  console.log(this);
}

fn2();
// 输出: undefined
```

#### 示例 3：常见变形题（丢失上下文）

将对象的方法赋值给一个变量后，再通过该变量调用，会使 `this` 指向全局对象。

```javascript
const foo = {
  bar: 10,
  funk: function() {
    console.log(this.bar);
  }
};

// 1. 作为对象方法调用 (this 指向 foo)
console.log("--- foo.funk() ---");
foo.funk(); // 输出: 10

// 2. 赋值后作为普通函数调用 (this 指向全局)
console.log("--- fn2() ---");
const fn2 = foo.funk; // fn2 现在只是一个普通函数
fn2(); // 输出: undefined (在 Node.js 中, 全局对象上没有 bar 属性)
```

> **重点**：判断 `this` 指向的关键是看函数被调用时的**直接调用者**。`fn2()` 的直接调用者是全局环境，而不是 `foo`。

-----

### 场景 2：作为对象的方法调用 (上下文对象)

当函数作为对象的一个属性被调用时，`this` 指向该对象。

#### 示例 1：基础用法

```javascript
const stu = {
  name: '张三',
  fn: function() {
    return this;
  }
};

console.log(stu.fn() === stu); // stu 是 fn 的调用者
// 输出: true
```

#### 示例 2：嵌套对象

`this` 指向的是**最近的**调用者。

```javascript
const stu = {
  name: '张三',
  son: {
    name: '张小三',
    fn: function() {
      return this.name;
    }
  }
};

// fn 的直接调用者是 stu.son 对象
console.log(stu.son.fn());
// 输出: '张小三'
```

#### 示例 3：高阶面试题

```javascript
const o1 = {
  text: 'o1',
  fn: function() {
    return this.text;
  }
};

const o2 = {
  text: 'o2',
  fn: function() {
    // 这里的 this.text 是 o2.text
    // 但是，核心是看 o1.fn() 的调用方式
    return o1.fn();
  }
};

const o3 = {
  text: 'o3',
  fn: function() {
    const fn2 = o1.fn; // 将 o1.fn 赋值给一个新变量
    return fn2(); // 普通函数调用
  }
};

console.log(o1.fn()); // 调用者是 o1，this 指向 o1 -> 'o1'
console.log(o2.fn()); // o2.fn 内部调用了 o1.fn()，调用者仍是 o1，this 指向 o1 -> 'o1'
console.log(o3.fn()); // o3.fn 内部是普通函数调用，this 指向全局 -> undefined
```

-----

### 场景 3：DOM 事件处理函数中的 `this`

在事件处理函数中，`this` 通常指向**绑定事件的元素**。

> **注意区分**：`this` 和 `event.target`
>
>   * `this`: 绑定事件监听器的元素。
>   * `event.target`: 实际触发事件的元素（可能是子元素）。

```html
<ul id="color-list">
  <li>Red</li>
  <li>Green</li>
  <li>Blue</li>
</ul>

<script>
  const list = document.getElementById('color-list');

  list.addEventListener('click', function(event) {
    // this 指向的是绑定事件的 <ul> 元素
    console.log('this:', this.tagName); // 'UL'

    // event.target 指向的是实际点击的元素，可能是 <li> 或 <ul>
    console.log('target:', event.target.tagName); // 'LI' or 'UL'
  });
</script>
```

#### 回调函数中的 `this` 丢失问题

如果在事件处理器内部再定义一个普通函数并调用，`this` 会丢失。

```javascript
div.addEventListener('click', function() {
  // 在这里, this 指向 div

  function callback() {
    // 在这里, this 指向 window (非严格模式)
    // 因为 callback() 是作为普通函数调用的
    console.log(this);
  }
  callback();
});

// 解决方案 1: 保存 this
div.addEventListener('click', function() {
  const self = this; // 保存 this
  function callback() {
    console.log(self); // 使用保存的 this
  }
  callback();
});

// 解决方案 2: 使用 bind (后文会讲)
// 解决方案 3: 使用箭头函数 (后文会讲)
```

-----

## 四、改变 `this` 指向的方法

`call`、`apply` 和 `bind` 是 `Function.prototype` 上的方法，可以显式地设置函数执行时的 `this` 上下文。

### 1\. `call(thisArg, arg1, arg2, ...)`

  * **作用**：调用一个函数，并将其 `this` 值绑定到 `thisArg` 对象。
  * **特点**：立即执行函数，参数是逐个传递的。

<!-- end list -->

```javascript
function add(a, b) {
  console.log(`Result: ${a + b}`);
  console.log(`this.name: ${this.name}`);
}

const obj = { name: 'MyObject' };
const globalName = { name: 'Global' }; // 模拟全局

// 普通调用
add(10, 5); // this 指向全局

// 使用 call
add.call(obj, 10, 5);
// 输出:
// Result: 15
// this.name: MyObject
```

### 2\. `apply(thisArg, [argsArray])`

  * **作用**：与 `call` 类似。
  * **特点**：立即执行函数，参数是以**数组**或类数组形式传递的。

<!-- end list -->

```javascript
const numbers = [5, 6, 2, 3, 7];

// 使用 apply 调用 Math.max
const max = Math.max.apply(null, numbers); // 第一个参数为 null, this 指向全局
console.log(max); // 输出: 7

// 经典应用：将类数组对象转换为真数组
function getArgsArray() {
  // arguments 是一个类数组对象
  const args = Array.prototype.slice.apply(arguments);
  console.log(Array.isArray(args)); // true
  return args;
}
getArgsArray(1, 2, 3);
```

### 3\. `bind(thisArg, arg1, arg2, ...)`

  * **作用**：创建一个**新的函数**。当这个新函数被调用时，它的 `this` 值被永久绑定到 `thisArg`。
  * **特点**：**不立即执行**，而是返回一个绑定了 `this` 的新函数。

<!-- end list -->

```javascript
const module = {
  x: 42,
  getX: function() {
    return this.x;
  }
};

const unboundGetX = module.getX;
console.log(unboundGetX()); // 作为普通函数调用, this 指向全局 -> undefined

const boundGetX = unboundGetX.bind(module); // 创建一个新函数，this 永久绑定到 module
console.log(boundGetX()); // 输出: 42
```

> **总结**：
>
>   * 需要立即执行并逐个传参，用 `call`。
>   * 需要立即执行但参数是数组，用 `apply`。
>   * 不需要立即执行，想创建一个 `this` 固定的新函数（如用于回调），用 `bind`。

-----

## 五、箭头函数 (`=>`) 中的 `this`

箭头函数没有自己的 `this`，它的 `this` 是在定义它时从其父级（词法）作用域继承而来的。

  * `this` 在箭头函数定义时就已确定，之后无法通过 `call`, `apply`, `bind` 改变。
  * 正因如此，箭头函数不能用作构造函数。

#### 示例：解决回调中的 `this` 丢失问题

```javascript
const person = {
  name: '张三',
  hobbies: ['篮球', '足球', '乒乓球'],

  printHobbies: function() {
    // 这里的 this 指向 person 对象
    this.hobbies.forEach(hobby => {
      // 箭头函数中的 this 继承自外层的 printHobbies 函数
      // 所以这里的 this 仍然是 person 对象
      console.log(`${this.name} 喜欢 ${hobby}`);
    });
  }
};

person.printHobbies();
// 输出:
// 张三 喜欢 篮球
// 张三 喜欢 足球
// 张三 喜欢 乒乓球
```

#### 箭头函数不适用的场景

由于 `this` 的词法绑定特性，在需要动态 `this` 的场景下不应使用箭头函数。

```javascript
const button = document.createElement('button');
button.textContent = 'Click me';

// 错误示范：使用箭头函数作为事件监听器
// this 会指向全局 window，而不是 button 元素
button.addEventListener('click', () => {
  console.log(this === window); // true
  this.textContent = 'Clicked!'; // 错误！试图修改 window.textContent
});

// 正确示范：使用普通函数
button.addEventListener('click', function() {
  console.log(this === button); // true
  this.textContent = 'Clicked!'; // 正确！修改 button 的文本
});
```
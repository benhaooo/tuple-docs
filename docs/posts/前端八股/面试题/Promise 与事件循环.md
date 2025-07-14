# JavaScript 异步执行顺序深度解析：Promise 与事件循环

### ► 题目代码

```javascript
setTimeout(() => {
  console.log(1);
}, 0);

const p = new Promise((resolve) => {
  console.log(2);
  resolve(3);
  Promise.resolve(4).then(console.log);
  console.log(5);
}).then(console.log);

console.log(6);
```

### ► 正确输出结果

```bash
2
5
6
4
3
1
```

-----

### ► 代码执行分步解析

整个 JS 代码的执行遵循事件循环（Event Loop）机制。执行顺序为：**同步代码 → 微任务队列 (Microtask Queue) → 宏任务队列 (Macrotask Queue)**。

1.  **`setTimeout(() => { console.log(1); }, 0);`**

      * `setTimeout` 是一个宏任务 (Macro-task)。
      * 其回调函数 `() => { console.log(1) }` 被放入 **宏任务队列** 中，等待执行。
      * **宏任务队列**: `[log(1)]`

2.  **`const p = new Promise(...)`**

      * `Promise` 的构造函数 `new Promise((resolve) => { ... })` 里的代码是 **同步执行** 的。
      * **`console.log(2);`**: 立即执行并输出 `2`。
      * **`resolve(3);`**:
          * 这是一个关键点。`resolve` 函数本身是同步调用的，它的作用是 **将 Promise `p` 的状态从 `pending` 改变为 `fulfilled`**，并保存结果值为 `3`。
          * **注意**：此时它并 **不会** 将 `p` 后面链接的 `.then` 回调放入微任务队列，因为 `.then` 方法此时还未被执行和注册。
      * **`Promise.resolve(4).then(console.log);`**:
          * `Promise.resolve(4)` 创建一个 **已经完成** 的 Promise。
          * 紧接着调用它的 `.then()` 方法，因此其回调 `console.log(4)` **立即被放入微任务队列**。
          * **微任务队列**: `[log(4)]`
      * **`console.log(5);`**: 立即执行并输出 `5`。

3.  **`.then(console.log)`**

      * 这是 Promise `p` 的 `.then` 方法。此时 Promise `p` 的构造函数已经同步执行完毕。
      * 当 JS 引擎执行到这里时，它检查到 Promise `p` 的状态 **已经被 `resolve(3)` 修改为 `fulfilled`**。
      * 根据规则，当对一个已经完成的 Promise 调用 `.then` 时，其回调函数 `console.log(3)` 会被 **立即放入微任务队列**。
      * **微任务队列**: `[log(4), log(3)]`

4.  **`console.log(6);`**

      * 作为同步代码，立即执行并输出 `6`。

5.  **同步代码执行完毕**

      * 至此，所有主线程的同步代码都已执行完毕。当前控制台输出为 `2 5 6`。
      * JS 引擎开始检查 **微任务队列**。

6.  **执行微任务队列**

      * 遵循先进先出 (FIFO) 原则。
      * 取出 `log(4)` 执行，输出 `4`。
      * 取出 `log(3)` 执行，输出 `3`。
      * 微任务队列清空。

7.  **执行宏任务队列**

      * 在微任务队列清空后，JS 引擎开始检查并执行 **宏任务队列** 中的任务。
      * 取出 `setTimeout` 的回调 `log(1)` 执行，输出 `1`。
      * 宏任务队列清空。

8.  **执行结束**

      * 最终输出顺序为：`2 5 6 4 3 1`。

-----

### ► 核心知识点总结

#### 1\. Promise 构造函数是同步的

`new Promise()` 中传入的执行器函数 (executor) 会被立即同步执行，它不是异步的。这是导致很多人一开始就出错的原因。

#### 2\. `resolve()` 的作用

`resolve()` 的核心作用是改变 Promise 的状态，而不是调度任务。它本身不会将 `.then` 的回调放入微任务队列。

#### 3\. `onFulfilled` 回调何时进入微任务队列？

`.then(onFulfilled)` 中的 `onFulfilled` 回调函数进入微任务队列只有以下 **两种情况**：

1.  **调用 `.then()` 时，Promise 已经完成 (fulfilled)**

      * 此时，`onFulfilled` 回调会立刻被添加到微任务队列。
      * 本题中的 `p.then(console.log)` 和 `Promise.resolve(4).then(console.log)` 都属于这种情况。

2.  **调用 `resolve()` 时，已经有通过 `.then()` 注册的回调**

      * 当一个处于 `pending` 状态的 Promise 调用了 `resolve()`，它会检查自身是否已经注册了 `onFulfilled` 回调。如果有，则将这些回调函数依次添加到微任务队列。
      * **示例代码**:
        ```javascript
        const p = new Promise(resolve => {
          // 1秒后，p的状态才会改变
          setTimeout(() => resolve('done'), 1000);
        });

        // .then 先于 resolve 被调用，所以回调被“注册”到 p 上
        p.then(console.log); // 这个回调在1秒后才会进入微任务队列

        console.log('Sync code finished');
        // 输出: Sync code finished
        // (1秒后) 输出: done
        ```

#### 4\. 表达式与赋值

`const p = new Promise(...).then(...)` 是一个 **表达式**。引擎必须先完整地执行 `new Promise(...)`，然后在其返回的 Promise 对象上调用 `.then(...)`，最后将 `.then` 方法返回的新 Promise 赋值给变量 `p`。不能错误地认为 `new Promise` 执行完就直接去执行下一行代码了。
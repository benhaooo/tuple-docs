# 手写 Promise 核心笔记 (第三章：细节处理)

## 一、`then` 回调的异步执行

> **规范要求**: `then` 中注册的 `onFulfilled` 和 `onRejected` 回调必须是 **异步执行** 的，通常应作为 **微任务 (Microtask)**。

### 1\. 问题：同步执行的回调

在上一章的实现中，当 `then` 方法被调用时，如果 Promise 已经是 `Fulfilled` 或 `Rejected` 状态，回调会立即同步执行，这不符合规范。

**示例验证:**

```javascript
// 之前的实现会先打印 'success'，再打印 'end'
myPromise.resolve('success').then(res => console.log(res));
console.log('end');

// 原生 Promise 会先打印 'end'，再打印 'success'
Promise.resolve('success').then(res => console.log(res));
console.log('end');
```

### 2\. 解决方案：封装微任务调度器

为了确保异步执行并兼容不同环境，可以封装一个 `runMicrotask` 函数来调度微任务。

  - **调度优先级**:
    1.  **`queueMicrotask`**: 现代浏览器和 Node.js 提供的标准 API，首选。
    2.  **`process.nextTick`**: 仅在 Node.js 环境中可用，优先级高于 `Promise`。
    3.  **`MutationObserver`**: 在浏览器环境中，可以利用它来模拟微任务。
    4.  **`setTimeout`**: 作为最终降级方案，它创建的是宏任务 (Macrotask)，但能保证异步执行。

### 3\. 实现 `runMicrotask`

```javascript
function runMicrotask(callback) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
  } else if (typeof process?.nextTick === 'function') {
    process.nextTick(callback);
  } else if (typeof MutationObserver === 'function') {
    const obs = new MutationObserver(callback);
    const textNode = document.createTextNode('1');
    obs.observe(textNode, { characterData: true });
    textNode.data = '2';
  } else {
    setTimeout(callback, 0);
  }
}
```

将 `runMicrotask` 应用于回调执行逻辑中，确保所有回调都被放入微任务队列。

```javascript
// 在 #runOneHandler 中使用
#runOneHandler(handler) {
  runMicrotask(() => {
    // ... 原有的回调执行、错误捕获、穿透处理等逻辑
  });
}
```

## 二、处理 `then` 返回 Promise 的情况

> **规范要求 (Promise Resolution Procedure)**: 如果 `then` 的回调 (`onFulfilled` 或 `onRejected`) 返回一个 Promise (或任何 "Thenable" 对象)，那么 `then` 方法自身返回的 Promise 将会 **采纳 (adopt)** 前者返回的 Promise 的状态和结果。

### 1\. 问题：返回 Promise 时未被 "解包"

当 `onFulfilled` 返回一个新的 Promise 时，`then` 的链式调用得到的是这个 Promise 本身，而不是它最终决议的值。

**示例:**

```javascript
// 之前的实现，p2 的 then 会拿到一个 MyPromise 实例
const p1 = MyPromise.resolve();
const p2 = p1.then(() => {
  return new MyPromise(resolve => resolve(2));
});
p2.then(value => {
  console.log(value); // 期望得到 2, 实际得到 MyPromise { #state: 'fulfilled', #value: 2 }
});

// 原生 Promise 的行为
// ... p2.then(value => console.log(value)) 会直接打印 2
```

### 2\. 解决方案：识别并处理 "Thenable"

为了实现正确的行为并兼容其他 Promise 库，不能使用 `instanceof MyPromise` 来判断。应该遵循 Promise/A+ 规范，检查返回值是否为一个 **"Thenable"**。

  - **Thenable**: 一个拥有 `.then` 方法的对象或函数。

### 3\. 实现 `isPromiseLike` 和更新处理逻辑

**a. 创建 `isPromiseLike` 辅助函数**

```javascript
function isPromiseLike(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
}
```

**b. 更新 `#runOneHandler` 方法**
在执行完回调并获得返回值 `result` 后：

1.  用 `isPromiseLike` 判断 `result`。
2.  如果 `result` 是 "Thenable"，则调用 `result.then()`，并把当前 `then` 返回的新 Promise 的 `resolve` 和 `reject` 传进去，将控制权交接给 `result`。
3.  如果不是，则直接用 `result` 来 `resolve` 新的 Promise。

<!-- end list -->

```javascript
  #runOneHandler({ onFulfilled, onRejected, resolve, reject }) {
    runMicrotask(() => {
      // ... 判断 callback 是否为函数并执行 ...
      try {
        const result = callback(this.#value);

        // --- 核心改动 ---
        if (isPromiseLike(result)) {
          // 如果返回值是 Promise-like, 则等待其决议
          result.then(resolve, reject);
        } else {
          // 否则直接 resolve
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
```

通过以上处理，手写的 `MyPromise` 能够正确地处理链式调用中返回新 Promise 的情况，并能与原生 `Promise`、`async/await` 以及其他遵循 Promise/A+ 规范的库良好地协同工作。
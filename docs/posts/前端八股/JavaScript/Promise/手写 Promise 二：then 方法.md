# 手写 Promise 核心笔记 (第二章：then 方法)

## 一、`then` 方法的核心特性

  - **作用**: 注册 Promise 在 `Fulfilled` (成功) 或 `Rejected` (失败) 状态时执行的回调函数。

  - **签名**: `then(onFulfilled, onRejected)`

      - `onFulfilled`: 成功回调，接收 Promise 的成功值。
      - `onRejected`: 失败回调，接收 Promise 的失败原因。
      - 这两个参数都是可选的。

  - **返回值**:

    > **核心重点**: `then` 方法必须返回一个 **全新的 Promise 实例**，而不是 `this`。

      - **原因**: Promise 的状态一旦确定就不可逆。如果返回 `this`，链条后面的 `.then()` 将永远无法改变状态，无法实现灵活的链式调用 (例如，在 `fulfilled` 后面的链条中抛出错误进入 `rejected` 状态)。
      - **目的**: 返回新 Promise 是实现 **链式调用** 的基础。

## 二、`then` 方法的实现逻辑

### 1\. 基础结构与链式调用返回

首先，定义 `then` 方法，接收 `onFulfilled` 和 `onRejected`，并立即返回一个新的 `MyPromise`。

```javascript
class MyPromise {
  // ... (第一章的代码)

  then(onFulfilled, onRejected) {
    // 必须返回一个全新的 Promise
    return new MyPromise((resolve, reject) => {
      // 核心处理逻辑将在这里实现
    });
  }
}
```

### 2\. 处理异步与回调存储

> **问题**: 如果 Promise 内部存在异步操作 (如 `setTimeout`)，调用 `.then()` 时，Promise 状态仍为 `Pending`。此时，回调函数不能立即执行，必须被存储起来，等待状态变更后再执行。

  - **单一回调的问题**: 如果只用一个变量存储回调，连续调用多个 `.then()` 时，后一个会覆盖前一个。
  - **解决方案**: 使用一个 **数组 (`#handlers`)** 来存储所有待执行的回调。每次调用 `.then()` 都将回调信息 `push` 进数组。

<!-- end list -->

```javascript
class MyPromise {
  // ...
  #handlers = []; // 存储待处理的回调

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      // 将回调、新Promise的resolve/reject打包存储
      this.#handlers.push({
        onFulfilled,
        onRejected,
        resolve, // 新 Promise 的 resolve
        reject,  // 新 Promise 的 reject
      });
    });
  }
  // ...
}
```

### 3\. 执行回调队列

当 Promise 状态从 `Pending` 变为 `Fulfilled` 或 `Rejected` 时 (即在 `#setState` 或 `#resolve`/`#reject` 中)，执行所有已存储的回调。

  - **创建执行函数**: 抽离一个 `#runHandlers` 私有方法，负责遍历并执行回调队列。
  - **清空队列**: 回调函数应该只被执行一次。执行完毕后，清空 `#handlers` 数组。
  - **调用时机**: 在状态变更后调用 `#runHandlers`。

<!-- end list -->

```javascript
class MyPromise {
  // ...
  #handlers = [];

  #setState(newState, value) {
    if (this.#state !== PENDING) return;
    this.#state = newState;
    this.#value = value;
    this.#runHandlers(); // 状态变更后，执行所有存储的回调
  }

  #runHandlers() {
    if (this.#state === PENDING) return;

    this.#handlers.forEach(handler => {
      // 执行单个回调的逻辑 (详见下一步)
      this.#runOneHandler(handler);
    });

    // 执行完毕后清空
    this.#handlers = [];
  }

  // ...
}
```

### 4\. 实现链式传递与错误捕获

这是 `then` 方法最核心的逻辑，决定了下一个 Promise 的状态和值。

1.  **确定执行哪个回调**: 根据当前 Promise 的状态 (`Fulfilled` 或 `Rejected`)，选择 `onFulfilled` 或 `onRejected`。
2.  **执行回调**:
      - 使用 `try...catch` 包裹回调的执行。
      - **成功**: 如果回调执行成功，将其 **返回值** 通过新 Promise 的 `resolve` 方法传递下去。
      - **失败**: 如果回调执行时 **抛出错误**，通过新 Promise 的 `reject` 方法将错误传递下去。

<!-- end list -->

```javascript
  #runOneHandler({ onFulfilled, onRejected, resolve, reject }) {
    // 根据当前状态选择要执行的回调
    const callback = this.#state === FULFILLED ? onFulfilled : onRejected;

    try {
      // 执行回调，并获取返回值
      const result = callback(this.#value);
      // 将返回值传递给下一个Promise
      resolve(result);
    } catch (error) {
      // 如果回调执行出错，则将下一个Promise置为rejected状态
      reject(error);
    }
  }
```

### 5\. 处理 `then` 的参数穿透

> **规范要求**: 如果 `then` 的参数 (`onFulfilled` / `onRejected`) 不是函数，则必须“忽略”它，并让值/原因“穿透”到下一个 Promise。

  - **实现**: 在执行回调前，判断其是否为函数。
      - **是函数**: 按步骤 4 的逻辑执行。
      - **不是函数 (穿透)**:
          - 如果当前 Promise 是 `Fulfilled`，直接用当前 Promise 的值 `resolve` 下一个 Promise。
          - 如果当前 Promise 是 `Rejected`，直接用当前 Promise 的原因 `reject` 下一个 Promise。

<!-- end list -->

```javascript
  #runOneHandler({ onFulfilled, onRejected, resolve, reject }) {
    // 确定要执行的回调
    const callback = this.#state === FULFILLED ? onFulfilled : onRejected;

    // 判断 callback 是否为函数
    if (typeof callback !== 'function') {
      // 实现穿透
      this.#state === FULFILLED ? resolve(this.#value) : reject(this.#value);
      return;
    }

    try {
      const result = callback(this.#value);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }
```

### 6\. 整合处理已决议状态

以上逻辑解决了 `Pending` 状态，但如果 `.then()` 调用时状态已决议，回调应立即 **异步执行** (规范要求，通常用微任务)。这里为简化，先用 `setTimeout` 模拟异步。

  - **最终整合**: 在 `then` 方法中，判断当前状态。
      - 如果是 `Pending`，则 `push` 到队列。
      - 如果已是 `Fulfilled` 或 `Rejected`，则直接异步执行回调逻辑。

<!-- end list -->

```javascript
  // 最终的 then 方法 (简化版)
  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handler = { onFulfilled, onRejected, resolve, reject };

      if (this.#state === PENDING) {
        this.#handlers.push(handler);
      } else {
        // 使用 setTimeout 模拟异步执行
        setTimeout(() => this.#runOneHandler(handler), 0);
      }
    });
  }
```
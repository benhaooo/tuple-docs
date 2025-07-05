# 手写 Promise 核心笔记 (第四章：catch 和 finally)

> **前言**: `catch` 和 `finally` 方法不属于 Promise/A+ 规范，是 ES6 Promise 新增的实例方法。

## 一、`catch` 方法

### 1\. 核心理念

根据 MDN 文档，`.catch()` 方法是 `.then(null, onRejected)` 的一种语法糖。它专门用于注册 Promise 在 `Rejected` (失败) 状态时调用的函数。

> `.catch(onRejected)`
>
> 等价于
>
> `.then(null, onRejected)`

### 2\. 实现

实现非常简洁，只需在 `MyPromise` 类中添加 `catch` 方法，并在内部调用 `this.then` 即可。

```javascript
class MyPromise {
  // ... (前三章的代码)

  /**
   * 注册一个在 promise 被拒绝时调用的函数。
   * 是 .then(null, onRejected) 的语法糖。
   * @param {function} onRejected - 当 promise 被拒绝时执行的回调。
   * @returns {MyPromise}
   */
  catch(onRejected) {
    return this.then(null, onRejected);
  }
}
```

### 3\. 行为特点

  - 它会返回一个 **新的 Promise** 实例，支持链式调用。
  - 如果 `onRejected` 回调函数被成功执行（内部没有再次抛出错误），那么由 `.catch()` 返回的新 Promise 的状态会变为 **`Fulfilled`**。

<!-- end list -->

```javascript
MyPromise.reject('error reason')
  .catch(reason => {
    console.log(reason); // 'error reason'
    return 'recovered from error'; // 返回一个普通值
  })
  .then(value => {
    console.log(value); // 'recovered from error'
  });
```

## 二、`finally` 方法

### 1\. 核心理念

`.finally()` 方法注册一个回调函数，这个函数 **无论 Promise 最终是 `Fulfilled` 还是 `Rejected`，都会被执行**。它主要用于执行一些无论成功或失败都需要进行的清理操作。

### 2\. 行为特点

`finally` 方法有几个关键的、与 `then` 不同的特性：

1.  **回调无参数**: `finally` 的回调函数 `onFinally` 不接收任何参数，它无法得知 Promise 的最终状态或值。
2.  **状态与值穿透 (Transparency)**: `finally` 是“透明的”。它返回的新 Promise 会 **继承原始 Promise 的状态和值/原因**，除非 `onFinally` 回调自身抛出错误。
3.  **错误优先**: 如果 `onFinally` 回调执行时抛出错误，那么 `finally` 返回的新 Promise 会被拒绝，且拒绝的原因是这个新的错误。

### 3\. 实现

`finally` 的实现可以借助 `.then()`，通过精心构造 `onFulfilled` 和 `onRejected` 回调来实现状态和值的穿透。

```javascript
class MyPromise {
  // ...

  /**
   * 注册一个在 promise 敲定（settled）后调用的函数。
   * @param {function} onFinally - 无论成功或失败都会执行的回调。
   * @returns {MyPromise}
   */
  finally(onFinally) {
    return this.then(
      // 成功回调
      (value) => {
        // 执行 onFinally，然后将原始的 value 传递下去
        onFinally();
        return value;
      },
      // 失败回调
      (reason) => {
        // 执行 onFinally，然后将原始的 reason 作为错误继续抛出
        onFinally();
        throw reason;
      }
    );
  }
}
```

**代码解析:**

  - **成功路径**: 当 Promise 成功时，第一个回调被触发。它先执行 `onFinally()`，然后 `return value`，确保了下一个 `.then()` 能接收到原始的成功值。
  - **失败路径**: 当 Promise 失败时，第二个回调被触发。它先执行 `onFinally()`，然后 `throw reason`，这会使返回的新 Promise 变为 `Rejected` 状态，并将原始的失败原因传递给下一个 `.catch()`。
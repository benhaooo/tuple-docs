这是整合了前面所有章节内容后，最终的手写 `Promise` 成果。它包含了构造函数、`then`、`catch`、`finally` 方法，并处理了异步执行、链式调用和 Promise 解析等核心细节。

```javascript
/**
 * -------------------
 * 手写 Promise 最终成果
 * -------------------
 * 符合 Promise/A+ 规范，并实现了 ES6 的 catch 和 finally 方法。
 */

// 状态常量
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

/**
 * 判断一个值是否为 Promise-like (Thenable)。
 * @param {*} value - 待检查的值。
 * @returns {boolean}
 */
function isPromiseLike(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
}

/**
 * 使用微任务调度器来异步执行回调。
 * 优先使用 queueMicrotask，兼容性降级至 setTimeout。
 * @param {function} callback - 需要异步执行的函数。
 */
function runMicrotask(callback) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
  } else {
    setTimeout(callback, 0);
  }
}

class MyPromise {
  // 私有属性，存储内部状态
  #state = PENDING;
  #value = undefined;
  #handlers = []; // 存储 .then 的回调，格式为 { onFulfilled, onRejected, resolve, reject }

  /**
   * MyPromise 构造函数
   * @param {function(function, function)} executor - 执行器函数，接收 resolve 和 reject 两个参数。
   */
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError(`Promise resolver ${executor} is not a function`);
    }

    try {
      // 立即同步执行 executor
      executor(this.#resolve, this.#reject);
    } catch (error) {
      // 捕获同步错误，直接拒绝 Promise
      this.#reject(error);
    }
  }

  /**
   * 成功状态的回调函数。
   * @param {*} value - 成功的结果。
   */
  #resolve = (value) => {
    this.#setState(FULFILLED, value);
  };

  /**
   * 失败状态的回调函数。
   * @param {*} reason - 失败的原因。
   */
  #reject = (reason) => {
    this.#setState(REJECTED, reason);
  };

  /**
   * 统一的状态变更函数，确保状态只能从 PENDING 变更一次。
   * @param {string} newState - 新的状态 (FULFILLED 或 REJECTED)。
   * @param {*} value - 成功值或失败原因。
   */
  #setState(newState, value) {
    if (this.#state !== PENDING) return; // 状态一旦变更，就不可逆

    // 如果 resolve 的结果是 Promise 本身，则抛出错误
    if (value === this) {
        return this.#reject(new TypeError('Chaining cycle detected for promise #<MyPromise>'));
    }

    this.#state = newState;
    this.#value = value;

    // 状态变更后，异步执行所有存储的回调
    this.#runHandlers();
  }

  /**
   * 执行所有待处理的回调。
   */
  #runHandlers() {
    if (this.#state === PENDING) return;

    this.#handlers.forEach(handler => {
      runMicrotask(() => this.#runOneHandler(handler));
    });

    // 回调只执行一次，执行后清空
    this.#handlers = [];
  }

  /**
   * 执行单个回调处理程序，并处理链式调用的核心逻辑。
   * @param {object} handler - 包含回调和新 Promise 的 resolve/reject 的对象。
   */
  #runOneHandler({ onFulfilled, onRejected, resolve, reject }) {
    try {
      const callback = this.#state === FULFILLED ? onFulfilled : onRejected;

      // 处理 .then 参数穿透
      if (typeof callback !== 'function') {
        this.#state === FULFILLED ? resolve(this.#value) : reject(this.#value);
        return;
      }
      
      const result = callback(this.#value);

      // 如果回调返回值是 Promise-like, 则等待其决议
      if (isPromiseLike(result)) {
        result.then(resolve, reject);
      } else {
        // 否则直接用返回值 resolve 新的 Promise
        resolve(result);
      }
    } catch (error) {
      // 捕获回调执行错误
      reject(error);
    }
  }

  /**
   * 核心方法，注册成功和失败的回调。
   * @param {function} onFulfilled - 成功回调。
   * @param {function} onRejected - 失败回调。
   * @returns {MyPromise} 返回一个新的 Promise，实现链式调用。
   */
  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handler = { onFulfilled, onRejected, resolve, reject };
      
      if (this.#state === PENDING) {
        this.#handlers.push(handler);
      } else {
        runMicrotask(() => this.#runOneHandler(handler));
      }
    });
  }

  /**
   * .then(null, onRejected) 的语法糖。
   * @param {function} onRejected - 失败回调。
   * @returns {MyPromise}
   */
  catch(onRejected) {
    return this.then(null, onRejected);
  }

  /**
   * 注册一个在 promise 敲定后调用的函数，无论成功或失败。
   * @param {function} onFinally - 敲定后执行的回调。
   * @returns {MyPromise}
   */
  finally(onFinally) {
    // 确保 onFinally 是函数
    const finalCallback = typeof onFinally === 'function' ? onFinally : () => {};

    return this.then(
      (value) => {
        finalCallback();
        return value; // 状态穿透：将原始成功值传递下去
      },
      (reason) => {
        finalCallback();
        throw reason; // 状态穿透：将原始失败原因继续抛出
      }
    );
  }
}
```
# 手写 Promise 核心笔记 (第一章：构造函数)

## 一、核心前置知识

### 1\. 为什么要手写 Promise

  - **深入理解**: 了解 Promise 内部工作原理、状态流转及异步处理机制。
  - **面试刚需**: 手写 Promise 是中高级前端面试的高频考题，用于考察候选人对 Promise 的理解深度。

### 2\. Promise/A+ 规范

  - **核心标准**: 它是 Promise 的实现标准，ES6 Promise 是其一种实现。
  - **核心定义**:
      - Promise 是一个拥有 `then` 方法的对象或函数。
      - **三大状态**:
          - `Pending` (等待中)
          - `Fulfilled` (已成功)
          - `Rejected` (已失败)
      - **状态唯一性**: 状态一旦从 `Pending` 变为 `Fulfilled` 或 `Rejected`，就不能再改变。

-----

## 二、构造函数 (Constructor) 实现步骤

### 1\. 初始化类结构

创建一个 `MyPromise` 类，其构造函数 `constructor` 接收一个执行器函数 `executor`。

```javascript
class MyPromise {
  constructor(executor) {
    // ...
  }
}
```

### 2\. 同步执行 Executor

> **重点**: `new Promise(executor)` 中的 `executor` 函数是 **同步执行** 的。

  - 在 `constructor` 中必须立即调用 `executor` 函数。
  - 向 `executor` 传递 `resolve` 和 `reject` 两个函数。

<!-- end list -->

```javascript
class MyPromise {
  constructor(executor) {
    // 立即执行 executor
    executor(this.resolve, this.reject);
  }

  resolve = (value) => {
    // ...
  };

  reject = (reason) => {
    // ...
  };
}
```

### 3\. 状态与结果管理

  - **私有属性**: 使用 `#` 定义私有属性，防止外部直接访问和修改，符合 Promise 封装特性。
      - `#state`: 存储 Promise 的当前状态，初始为 `Pending`。
      - `#value`: 存储成功时的值或失败时的原因。
  - **状态常量**: 将状态字符串定义为常量，便于维护和防止硬编码错误。

<!-- end list -->

```javascript
// 状态常量
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  #state = PENDING;
  #value = undefined;

  constructor(executor) {
    executor(this.#resolve, this.#reject);
  }

  #resolve = (value) => {
    // 改变状态为 fulfilled
    this.#state = FULFILLED;
    // 保存成功的结果
    this.#value = value;
  };

  #reject = (reason) => {
    // 改变状态为 rejected
    this.#state = REJECTED;
    // 保存失败的原因
    this.#value = reason;
  };
}
```

### 4\. 实现状态不可逆

> **重点**: Promise 状态一旦改变，便不能再迁移至任何其他状态。

  - 在 `resolve` 和 `reject` 内部增加判断，只有在 `Pending` 状态时才允许修改。

<!-- end list -->

```javascript
  #resolve = (value) => {
    // 只有在 pending 状态下才能改变
    if (this.#state !== PENDING) return;
    this.#state = FULFILLED;
    this.#value = value;
  };

  #reject = (reason) => {
    // 只有在 pending 状态下才能改变
    if (this.#state !== PENDING) return;
    this.#state = REJECTED;
    this.#value = reason;
  };
```

### 5\. 捕获同步错误

> **重点**: `executor` 中如果出现同步代码执行错误，Promise 状态会直接变为 `rejected`。

  - 使用 `try...catch` 包裹 `executor` 的执行，捕获同步错误并调用 `reject`。
  - **注意**: `try...catch` **无法捕获** `executor` 内部的 **异步错误** (如 `setTimeout` 中的错误)，这与原生 Promise 行为一致。

<!-- end list -->

```javascript
class MyPromise {
  // ...
  constructor(executor) {
    try {
      executor(this.#resolve, this.#reject);
    } catch (error) {
      this.#reject(error);
    }
  }
  // ...
}
```

### 6\. 代码重构与优化

  - **封装私有方法**: 将状态变更的逻辑抽离为独立的私有方法 `#setState`，使代码更清晰。
  - **使用常量**: 将所有状态字符串替换为之前定义的常量。

<!-- end list -->

```javascript
// 状态常量
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  #state = PENDING;
  #value = undefined;

  constructor(executor) {
    try {
      executor(this.#resolve, this.#reject);
    } catch (error) {
      this.#reject(error);
    }
  }

  #setState(newState, value) {
    if (this.#state !== PENDING) return;
    this.#state = newState;
    this.#value = value;
  }

  #resolve = (value) => {
    this.#setState(FULFILLED, value);
  };

  #reject = (reason) => {
    this.#setState(REJECTED, reason);
  };
}
```
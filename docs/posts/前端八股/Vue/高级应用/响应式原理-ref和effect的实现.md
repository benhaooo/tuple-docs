### Vue 响应式原理：`ref` 和 `effect` 的实现剖析

#### 1. 什么是 Vue 的响应式？

Vue 响应式的核心思想是：**当一个响应式数据发生变化时，所有依赖于这个数据的"副作用函数"都会自动重新执行。**

- **响应式数据 (Reactivity Data)**：例如通过 `ref()` 创建的数据。
- **副作用函数 (Side Effect Function)**：一个函数，其执行过程依赖（即访问）了响应式数据。在 Vue 中，组件的 `render` 函数、`watch` 回调、`computed` 计算等都是副作用函数的具体体现。`effect` 是这些功能底层的实现基础。

**示例：**

```javascript
const count = ref(0); // 'count' 是响应式数据

effect(() => {
  // 这个函数就是一个副作用函数，因为它依赖了 'count'
  console.log(count.value);
});

// 当 count 的值改变时，effect 内的函数会自动重新执行
setTimeout(() => {
  count.value = 1; // 这会触发 console.log(1)
}, 1000);
```

---

#### 2. 核心实现：从零构建 `ref` 和 `effect`

要理解响应式系统，最好的方式就是亲手实现它。

##### **第一步：`ref` 的基本结构 - 一个带有访问器的类**

`ref` 的本质并不是一个简单的值，而是一个对象。这个对象通过 `get` 和 `set` 访问器来拦截对 `.value` 属性的读写操作。

- **读操作 (`get`)**：此时我们需要知道"谁"在读取我，并把"它"记录下来。这个过程称为**依赖收集**。
- **写操作 (`set`)**：当我的值被改变时，我要通知所有之前记录过的"谁"，告诉它们"我变了，你们需要更新"。这个过程称为**触发更新**。

```javascript
// ref 的实现其实是一个类
class RefImpl {
  private _value: any; // 存储内部的真实值
  public deps = new Set(); // 使用 Set 存储所有依赖于此 ref 的副作用函数，自动去重

  constructor(value: any) {
    this._value = value;
  }

  // get 访问器，用于依赖收集
  get value() {
    console.log("正在收集依赖...");
    // track(); // 依赖收集的逻辑
    return this._value;
  }

  // set 访问器，用于触发更新
  set value(newValue: any) {
    console.log("正在触发更新...");
    this._value = newValue;
    // trigger(); // 触发更新的逻辑
  }
}
```

##### **第二步：`effect` 与跨作用域通信的"魔法"**

现在面临一个核心问题：在 `ref` 的 `get value()` 方法中，如何知道当前是哪个 `effect` 函数在执行？它们处于完全不同的作用域。

**解决方案：** 使用一个全局（或模块级）变量作为"信使"。

1.  创建一个全局变量 `activeEffect`，用于存储当前正在执行的副作用函数。
2.  在 `effect` 函数中，执行用户传入的函数 `fn` 之前，将 `fn` 赋值给 `activeEffect`。
3.  执行完毕后，立即将 `activeEffect` 清空。

由于 JavaScript 是单线程的，这种模式可以完美地保证在 `fn` 执行期间，`activeEffect` 的正确性。

```javascript
let activeEffect: Function | null = null; // 全局信使

function effect(fn: Function) {
  activeEffect = fn; // 1. 将副作用函数赋值给 activeEffect
  fn();              // 2. 执行副作用函数，这会触发 ref 的 get
  activeEffect = null; // 3. 执行完毕，清空
}
```

##### **第三步：依赖收集 (`track`) - 将 `ref` 和 `effect` 关联起来**

有了 `activeEffect` 这个信使，依赖收集的逻辑就清晰了。

```javascript
class RefImpl {
  // ... 其他代码 ...
  get value() {
    this.track(); // 调用依赖收集
    return this._value;
  }
  // ... 其他代码 ...

  track() {
    if (activeEffect) { // 只有在 effect 上下文中才收集
      this.deps.add(activeEffect); // 将当前激活的副作用函数存入 Set
    }
  }
}
```

##### **第四步：触发更新 (`trigger`) - 通知依赖执行**

当 `set value()` 被调用时，只需遍历之前收集到的所有依赖（副作用函数）并重新执行它们。

```javascript
class RefImpl {
  // ... 其他代码 ...
  set value(newValue: any) {
    this._value = newValue;
    this.trigger(); // 调用触发更新
  }

  trigger() {
    // 遍历所有依赖，并执行它们
    this.deps.forEach(effectFn => effectFn());
  }
}
```

---

#### 3. 完整实现与总结

将所有部分组合在一起，我们就得到了一个迷你的 Vue 响应式系统。

```typescript
// 全局变量，用于存储当前正在执行的副作用函数
let activeEffect: Function | null = null;

// ref 的实现类
class RefImpl<T> {
  private _value: T;
  // deps 用来存储所有依赖于此 ref 的副作用函数
  private deps = new Set<Function>();

  constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    this.track();
    return this._value;
  }

  set value(newValue: T) {
    this._value = newValue;
    this.trigger();
  }

  // 依赖收集
  private track() {
    if (activeEffect) {
      this.deps.add(activeEffect);
    }
  }

  // 触发更新
  private trigger() {
    this.deps.forEach(effectFn => effectFn());
  }
}

// effect 函数
function effect(fn: Function) {
  activeEffect = fn;
  fn(); // 执行会触发 get，进行依赖收集
  activeEffect = null;
}

// ref 工厂函数
function ref<T>(value: T) {
  return new RefImpl(value);
}

// --- 测试 ---
const count = ref(0);

effect(() => {
  // 这个函数会立即执行一次，打印 0
  // 执行期间，它访问了 count.value，触发 get，将自身作为依赖被收集
  console.log("Effect executed:", count.value);
});

// 1秒后，更新 count.value，触发 set
// set 会遍历 deps，重新执行上面被收集的 effect 函数，打印 1
setTimeout(() => {
  count.value = 1;
}, 1000);
```

#### 4. 关键点：访问器 vs. 代理

强调一个重要的概念：

-   **基础类型 (`ref`) 的响应式**：通过 `Object.defineProperty` 的 **访问器 (`get`/`set`)** 实现。因为基础类型的值无法被代理，我们总是通过 `.value` 来访问它，这给了我们拦截的机会。
-   **对象类型 (`reactive`) 的响应式**：通过 `Proxy` 实现。因为对象的属性很多，为每个属性都设置访问器是不现实的，`Proxy` 可以提供对整个对象的代理，实现更全面的拦截。

理解这个区别是掌握 Vue 响应式原理的关键。 
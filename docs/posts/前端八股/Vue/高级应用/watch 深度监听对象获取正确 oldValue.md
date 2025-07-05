### Vue `watch` 深度监听对象获取正确 `oldValue` 的学习笔记

旨在解决 `watch` 在深度监听对象时，`oldValue` 与 `newValue` 值始终相同的问题。

-----

#### 一、核心问题现象

当使用 `watch` 深度监听一个对象（`Object` 或 `Array`）时，在 `watch` 的回调函数中，我们期望拿到变化前的旧值（`oldValue`）和变化后的新值（`newValue`）。但实际情况是，`oldValue` 和 `newValue` 的值完全一样，都反映的是对象变化后的最新状态。

**示例代码:**

```javascript
const state = reactive({ a: { c: 0 } });

watch(state, (newValue, oldValue) => {
  console.log(newValue.a.c); // 输出 1
  console.log(oldValue.a.c); // 也输出 1，期望是 0
  console.log(newValue === oldValue); // 输出 true
}, { deep: true });

// 触发变化
state.a.c = 1;
```

-----

#### 二、根本原因：JavaScript 的引用类型

这个问题的根源在于 JavaScript 中对象的**引用传递**机制。

1.  **保存引用**：当你 `watch` 一个对象时，Vue 内部会保存一个对该对象的引用作为 `oldValue` 的来源。
2.  **原地修改**：当你修改对象的某个属性时（例如 `state.a.c = 1`），你是在**原地修改**这个对象，并没有创建一个新的对象。
3.  **共享引用**：因为 `oldValue` 和 `newValue` 都指向同一个对象的内存地址，所以当 `watch` 回调被触发时，它们自然都展示为对象被修改后的最新状态。Vue 不会自动为 `oldValue` 创建一个变化前的值的“快照”或“深拷贝”，因为对于大型复杂对象来说，这会带来巨大的性能开销。

-----

#### 三、解决方案：封装自定义 `watch` 函数 `watchOldValue`

我们可以封装一个高阶函数，该函数内部使用 `watch`，但通过手动管理值的快照来确保能拿到真正的 `oldValue`。

##### 3.1 核心思路

在 `watch` 触发时，我们拿到的 `newValue` 是最新的。我们可以在每次 `watch` 执行后，将当前的 `newValue` **深拷贝**一份并存储起来。在下一次 `watch` 触发时，这个被存储的拷贝就成了上一次的 `oldValue`。

##### 3.2 初步实现与 `JSON` 深拷贝的陷阱

一个简单实现深拷贝的方式是 `JSON.parse(JSON.stringify(obj))`。

```javascript
// 简化的逻辑
let oldValue;

// 监听一个 getter 函数，确保我们处理的是响应式对象
watch(() => source, (newValue) => {
    // oldValue 是上一次存储的拷贝
    // newValue 是当前最新的值
    callback(newValue, oldValue);

    // 将当前的新值深拷贝一份，作为下一次的 oldValue
    oldValue = JSON.parse(JSON.stringify(newValue));
}, { deep: true });
```

**⚠️注意：`JSON.stringify` 的缺陷**

这种方法虽然简单，但存在严重问题。`JSON.stringify` 在序列化时会**忽略**某些特定的数据类型，导致数据丢失：

  * 值为 `undefined` 的属性
  * `Symbol` 类型的属性
  * 函数 (`Function`)

**例如：** 如果对象中存在 `b: undefined`，经过 `JSON` 拷贝后，`b` 这个属性会直接丢失。

##### 3.3 优化方案：允许传入自定义深拷贝函数

为了解决 `JSON` 方案的缺陷，最健壮的方式是让使用者可以传入一个自定义的、更可靠的深拷贝函数（例如 `lodash.cloneDeep`）。

```javascript
// 封装的函数接收一个 options 对象
function watchOldValue(source, callback, options) {
  // 从 options 中解构出用户自定义的 clone 方法
  const { clone = (val) => JSON.parse(JSON.stringify(val)), ...watchOptions } = options || {};

  // ... 核心逻辑使用 clone 方法 ...
}
```

这样，用户可以根据项目情况选择最高效、最可靠的深拷贝库，若不提供，则默认使用 `JSON` 方法。

##### 3.4 边界情况处理：非对象类型

如果监听的源（`source`）是一个基础类型（如 `String`, `Number`），它本身就是值传递，`watch` 可以直接获取到正确的 `oldValue`，无需进行深拷贝。因此需要增加类型判断，跳过对基础类型的处理。

```javascript
// 在函数开始时进行判断
const value = toValue(source); // toValue 用于获取 ref 或 getter 的值

if (typeof value !== 'object' || value === null) {
  // 如果是基础类型，直接使用原生 watch，无需任何处理
  return watch(source, callback, options);
}
```

-----

#### 四、最终代码示例 (`watchOldValue.ts`)

以下是结合了上述所有优化点的最终代码实现。

```typescript
import { type WatchOptions, type WatchSource, toValue, watch } from 'vue';
import { cloneDeep } from 'lodash-es'; // 使用 lodash 作为示例

// 扩展原始 WatchOptions 类型，增加一个可选的 clone 方法
export interface WatchOldValueOptions<T> extends WatchOptions {
  clone?: (value: T) => T;
}

/**
 * 封装 watch，使其在深度监听对象时能够正确获取 oldValue。
 * @param source - 监听的源，与原生 watch一致。
 * @param callback - 回调函数，接收 newValue 和正确的 oldValue。
 * @param options - 配置项，可额外传入一个 clone 函数用于深拷贝。
 */
export function watchOldValue<T>(
  source: WatchSource<T>,
  callback: (newValue: T, oldValue: T | undefined, onCleanup: (fn: () => void) => void) => void,
  options?: WatchOldValueOptions<T>
) {
  // toValue 可以处理 source 是 ref、getter 或普通值的情况
  const initialValue = toValue(source);

  // 1. 处理边界情况：如果监听的是非对象，则直接使用原生 watch
  if (typeof initialValue !== 'object' || initialValue === null) {
    return watch(source, callback, options);
  }

  // 2. 解构配置，提供默认的深拷贝方法（推荐 lodash.cloneDeep）
  const { clone = cloneDeep, ...watchOptions } = options || {};

  let oldValue: T | undefined = clone(initialValue);

  return watch(source, (newValue, _, onCleanup) => {
    callback(newValue, oldValue, onCleanup);

    // 3. 每次回调后，将新值深拷贝作为下一次的旧值
    oldValue = clone(newValue);
  }, watchOptions);
}

// ---- 如何使用 ----
/*
import { reactive } from 'vue';
import { watchOldValue } from './watchOldValue';
import { cloneDeep } from 'lodash-es';

const state = reactive({ a: 0, b: undefined });

watchOldValue(
  () => state,
  (newValue, oldValue) => {
    console.log('New:', newValue); // { a: 1, b: undefined }
    console.log('Old:', oldValue); // { a: 0, b: undefined }
  },
  {
    deep: true,
    // clone: cloneDeep // 如果默认不是 lodash，可以在此传入
  }
);

state.a = 1;
*/
```

-----

#### 五、总结

  * `watch` 深度监听对象时 `oldValue` 与 `newValue` 相同，是由于 **JavaScript 的引用类型** 特性导致的。
  * 根本的解决方案是对被监听的对象进行**深拷贝**，以创建值的快照作为 `oldValue`。
  * `JSON.parse(JSON.stringify())` 是最便捷但有缺陷的深拷贝方法，会丢失 `undefined`、`Function` 等类型。
  * 最佳实践是封装一个高阶函数，它**允许用户传入一个可靠的深拷贝库**（如 `lodash.cloneDeep`），同时处理好**非对象**的边界情况，并提供完善的 **TypeScript 类型**支持。
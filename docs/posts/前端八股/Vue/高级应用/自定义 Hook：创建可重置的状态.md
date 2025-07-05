# Vue 自定义 Hook：创建可重置的状态

本文讲解了如何创建一个可重置状态的 Vue Composition API Hook，涵盖了从 `ref` 到 `reactive`，从基础实现到健壮性设计的演进过程。

-----

## 1\. 核心痛点：重置复杂状态的烦恼

在组件中，当 `state` 变得复杂时，编写一个 `reset` 函数会非常繁琐。

**原始写法:**

```javascript
const state = reactive({ a: 1, b: 'hello', c: [] });

// 当 state 属性增多时，reset 函数必须同步修改，难以维护
function reset() {
  state.a = 1;
  state.b = 'hello';
  state.c = [];
  // 如果 state 新增了 d, e, f... 这里也要跟着加
}
```

**目标**：创建一个通用的 Hook，能轻松将任何 `state` 重置回其初始值。

-----

## 2\. 方案一：`useResetableRef` - 回调函数模式

通过传递一个返回初始状态的**工厂函数**，每次重置时重新调用该函数即可获得一个全新的初始状态。

### 2.1. 使用方式

```javascript
import { useResetableRef } from './hooks';

// 将一个返回初始状态的函数作为参数传入
const [state, reset] = useResetableRef(() => ({
  a: 1,
  b: 2,
  c: [3],
}));
```

### 2.2. 实现原理

```javascript
import { ref } from 'vue';

function useResetableRef(callback) {
  // 1. 调用回调函数，获取初始状态，并将其放入 ref
  const state = ref(callback());

  // 2. 定义 reset 函数
  const reset = () => {
    // 每次重置时，重新调用回调函数获取全新的初始值
    state.value = callback();
  };

  // 3. 以数组形式返回，方便解构和重命名
  return [state, reset];
}
```

  - **优点**：实现简单，逻辑清晰，没有深拷贝带来的性能和类型问题。
  - **缺点**：调用者必须包裹一层函数，可能感觉不够直观。

-----

## 3\. 方案二：`useResetableRef` - 深拷贝模式

允许用户直接传递一个对象，通过内部的深拷贝机制来避免引用问题。

### 3.1. 错误的实现（引用问题）

如果只是简单地保存初始对象的引用，会导致重置失败。

```javascript
// 错误示例
function useResetableRef_Wrong(initialValue) {
  const innerInitialValue = initialValue; // 错误：这里只是引用赋值
  const state = ref(initialValue);

  const reset = () => {
    // 当 state.value.a 改变时, innerInitialValue.a 也跟着变了
    // 导致重置时赋的值是修改后的值
    state.value = innerInitialValue;
  };

  return [state, reset];
}
```

**核心原因**：`state` 和 `innerInitialValue` 指向同一个内存地址。修改 `state.value` 就是在修改 `innerInitialValue`。

### 3.2. 正确的实现（深拷贝）

在初始化和重置时都使用深拷贝，断开引用关系。

```javascript
import { ref } from 'vue';

// 简易深拷贝函数
const deepClone = (val) => {
  // 基础版，仅适用于 JSON 安全的对象
  return JSON.parse(JSON.stringify(val));
};

function useResetableRef(value) {
  // 1. 存储初始值的深拷贝副本
  const initialValue = deepClone(value);
  
  // 2. 用初始值的另一个深拷贝副本初始化 state
  // (防止外部在初始化后直接修改传入的 value 对象)
  const state = ref(deepClone(value));

  const reset = () => {
    // 3. 重置时，使用存储的副本创建一个新的深拷贝值
    state.value = deepClone(initialValue);
  };

  return [state, reset];
}
```

### 3.3. 增强深拷贝的健壮性

`JSON.stringify` 无法处理 `Map`, `Set`, `undefined` 等特殊类型。为了让 Hook 更通用，可以进行优化。

1.  **封装更强的深拷贝函数**：处理原始类型和 `null`。
2.  **允许用户传入自定义的拷贝函数**：提供更高的灵活性，用户可以选择 `lodash.cloneDeep` 或其他自定义实现。

**改进后的 Hook 结构:**

```javascript
function useResetableRef(value, cloneFn) {
  // 如果用户没有提供 clone 函数，则使用默认的简易版
  const deepClone = cloneFn || ((v) => JSON.parse(JSON.stringify(v)));
  
  // ...后续逻辑不变
  const initialValue = deepClone(value);
  const state = ref(deepClone(value));
  // ...
}
```

-----

## 4\. 进阶功能与优化

### 4.1. 支持 `reactive`

用户可能更喜欢直接操作对象而无需 `.value`。因此，可以创建一个 `useResetableReactive`。

**挑战**：`reactive` 对象的重置不能直接赋值 (`state = newObj`)，这会使其失去响应性。必须在原对象的引用上进行修改。

**错误方案**：`Object.assign(state, initialValue)`
此方法只会覆盖现有属性，**无法删除**在运行时新增的属性。

```javascript
// state = { a: 10, b: 2, newProp: 'extra' }
// initialValue = { a: 1, b: 2 }
// Object.assign(state, initialValue) -> state 变为 { a: 1, b: 2, newProp: 'extra' }
// newProp 属性残留了下来，重置不彻底
```

**正确方案**：**先删除、再合并**

```javascript
import { reactive } from 'vue';

function useResetableReactive(obj) {
  const initialValue = deepClone(obj); // 假设 deepClone 已定义
  const state = reactive(deepClone(obj));

  const reset = () => {
    // 1. 遍历当前 state，删除所有属性
    for (const key in state) {
      delete state[key];
    }
    // 2. 将初始值的所有属性合并回来
    Object.assign(state, initialValue);
  };

  return [state, reset];
}
```

### 4.2. 灵活命名与 TypeScript 类型推断

**问题**：如果 Hook 返回一个对象 `{ state, reset }`，用户想重命名必须使用 `const { state: myState } = useHook()`，比较繁琐。

**解决方案**：返回一个**数组** `[state, reset]`，用户可以通过数组解构任意命名 `const [myState, resetMyState] = useHook()`。

**TypeScript 陷阱**：直接返回数组，TS 可能会将其类型推断为联合类型 `(MyObject | Function)[]`，导致类型检查失败。

**解决方案**：使用 `as const` (常量断言)。

```typescript
function useResetableReactive<T extends object>(obj: T) {
  // ...实现...

  // 使用 as const 将返回类型断言为元组 (Tuple)
  // TS 会精确知道第一个元素是对象，第二个是函数
  return [state, reset] as const; 
}

// TS 类型推断结果: [Readonly<T>, () => void]
```
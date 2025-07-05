# Vue 响应式核心：`ref` 与 `reactive` 的正确使用场景

在 Vue 3 的 Composition API 中，`ref` 和 `reactive` 是创建响应式数据的两种核心方式。理解它们的差异和适用场景对于编写健壮、可维护的代码至关重要。本文档将根据常见困惑，深入解析两者的工作原理和最佳实践。

---

## 一、核心前置：一切始于 `Proxy`

要理解 `ref` 与 `reactive` 的区别，首先需要知道 Vue 3 响应式系统背后的功臣：**ES6 `Proxy`**。

`reactive` 函数内部直接使用了 `Proxy` 来实现对对象类型数据的劫持。然而，`Proxy` 有一个天生的限制：

> **`Proxy` 只能代理对象（Object、Array），不能代理基础数据类型（如 `String`, `Number`, `Boolean` 等）。**

如果你尝试将一个基础类型传递给 `Proxy`，JavaScript 会直接报错。这个限制是 `ref` 存在的核心原因。

```javascript
// reactive 的内部工作原理（简化版）
function reactive(obj) {
  return new Proxy(obj, { ... });
}

const state = reactive({ count: 1 }); // OK

const count = reactive(1); // ❌ Uncaught TypeError: Cannot create proxy with a non-object as target
```

---

## 二、`ref`：为所有值类型提供响应式能力

`ref` 的出现弥补了 `reactive` 的不足，它让任意类型的数据都能变为响应式。

### 场景1：处理基础数据类型

当你需要让一个数字、字符串或布尔值变为响应式时，必须使用 `ref`。

`ref` 通过将基础类型的值包装在一个特殊的对象中来解决 `Proxy` 的限制。这个对象拥有一个 `.value` 属性，Vue 会追踪对这个 `.value` 属性的读取和写入操作。

```typescript
import { ref } from 'vue';

const count = ref(0); // count 是一个 RefImpl 对象
console.log(count.value); // 0

function increment() {
  // 必须通过 .value 访问和修改
  count.value++; 
}
```
**工作原理**：对 `count.value` 的访问会触发 `getter`（依赖收集），对其的赋值会触发 `setter`（触发更新），从而让 Vue 的渲染系统知道何时需要重新渲染。

### 场景2：处理对象引用的变更（重要！）

这是 `ref` 与 `reactive` 最关键的区别，也是最容易出错的地方。

**问题**：当使用 `reactive` 定义一个对象或数组后，如果直接用一个新的对象或数组为其赋值，会 **丢失响应性**。

```typescript
import { reactive } from 'vue';

// 假设我们有一个从后端获取的用户列表
let list = reactive([
  { id: 1, name: 'A' }
]);

// 1秒后，模拟从后端获取了全新的数据
setTimeout(() => {
  const newList = [{ id: 2, name: 'B' }];
  list = newList; // ❌ 错误操作！
  // 这样赋值会使 list 变量指向一个新的普通数组，
  // 脱离了最初的响应式 Proxy 对象。
  // 界面将不会更新。
  console.log(list); // 控制台会打印新数组，但视图无变化
}, 1000);
```

**原因**：`reactive` 返回的是一个代理对象。当执行 `list = newList` 时，你只是改变了 `list` 这个变量的内存地址指向，让它指向了一个全新的、非响应式的数组。而组件模板中追踪的仍然是那个旧的、被代理的原始数组，因此无法感知到这个变化。

**解决方案**：使用 `ref` 来包裹你的对象或数组。

```typescript
import { ref } from 'vue';

const list = ref([
  { id: 1, name: 'A' }
]);

setTimeout(() => {
  const newList = [{ id: 2, name: 'B' }];
  // ✅ 正确操作！
  // 修改 .value 属性会被 ref 的 setter 捕获，从而触发更新
  list.value = newList; 
}, 1000);
```
**工作原理**：`list` 本身是一个 `ref` 对象，它的引用地址始终不变。我们修改的是 `list.value`，这个操作能够被 Vue 准确地追踪到，从而保证了响应性。

---

## 三、`reactive`：专注对象与数组的深度响应

当你的数据是对象或数组，并且你 **确信永远不会替换整个对象**，而是只修改其内部属性时，`reactive` 是一个很好的选择。它提供了深度的响应式转换，并且在模板中使用时无需 `.value`，代码更简洁。

```typescript
import { reactive } from 'vue';

const state = reactive({
  user: {
    name: 'Ben',
    age: 25
  },
  hobbies: ['coding', 'reading']
});

function updateUser() {
  // 修改内部属性，会触发视图更新
  state.user.name = 'Hao';
  state.hobbies.push('gaming');
}
```

---

## 四、总结与最佳实践

| 特性 | `ref` | `reactive` |
| :--- | :--- | :--- |
| **接受类型** | ✅ 所有类型 | ❌ 仅限对象、数组、Map、Set 等 |
| **访问/修改** | 需通过 `.value` | 直接操作对象 |
| **替换整个对象**| ✅ **支持**，通过 `.value` 赋值 | ❌ **不支持**，会丢失响应性 |
| **背后原理** | 将值包装为带 `.value` 的对象，依赖 `getter/setter` | 直接使用 `Proxy` |

### 核心准则

1.  **基础类型**：总是使用 `ref`。
2.  **引用类型（对象/数组）**：
    *   如果你需要 **重新赋值** 整个对象/数组（例如，从 API 获取数据后完全替换现有数据），**必须使用 `ref`**。
    *   如果你只是修改对象内部的属性或数组的元素，`reactive` 是一个不错的选择，因为无需 `.value`，代码更直观。

为了保持一致性和避免犯错，许多团队采用 **"优先使用 `ref`"** 的策略。这虽然牺牲了 `reactive` 在模板中免写 `.value` 的一点便利，但极大地降低了因意外重新赋值而导致响应性丢失的风险。 
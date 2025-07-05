### Vue 3.5 `useTemplateRef` 实现原理剖析学习笔记

#### 1. `useTemplateRef` 是什么？

`useTemplateRef` 是 Vue 3.5 版本中新增的一个 API，旨在提供一种更直观、更灵活的方式来获取模板（template）中的 DOM 元素引用。

#### 2. 背景：Vue 3.5 之前的模板引用方式

在 Vue 3.5 之前，我们获取模板中 DOM 元素的方式如下：

1.  在模板中的 DOM 元素上设置一个 `ref` 属性，其值为一个字符串。
2.  在 `<script setup>` 中，必须声明一个 **同名的 `ref` 变量** 来接收这个 DOM 元素的引用。

**示例代码：**

```vue
<template>
  <div ref="elRef">这是一个DOM元素</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 这里的变量名 "elRef" 必须和模板中的 ref="elRef" 完全一致
const elRef = ref(null);

onMounted(() => {
  console.log(elRef.value); // 打印出 <div> 元素
});
</script>
```

**这种方式的痛点：**

- **强耦合**：`<script>` 中的变量名和模板中的字符串值被强行绑定在一起，不够灵活，感觉有些"奇怪"。
- **命名限制**：如果模板中 `ref` 的名字改了，脚本中的变量名也必须手动同步修改。

#### 3. `useTemplateRef` 的优势与直观设计

`useTemplateRef` 解决了上述痛点，它提供了一种类似于 DOM 查询（如 `querySelector`）的体验。

**示例代码：**

```vue
<template>
  <div ref="elRef">这是一个DOM元素</div>
</template>

<script setup>
import { useTemplateRef } from 'vue'; // 假设这是官方API

// 变量名 'container' 可以随意命名
// useTemplateRef 接收模板 ref 的 key 作为参数
const container = useTemplateRef('elRef');

// container 是一个 ref 对象，其 .value 会在挂载后指向 DOM 元素
onMounted(() => {
  console.log(container.value); // 打印出 <div> 元素
});
</script>
```

**优势：**

- **解耦**：脚本中的变量名（如 `container`）与模板中的 `ref` 字符串（`elRef`）完全解耦。
- **直观**：逻辑更清晰，明确表达了"我想获取名为 'elRef' 的模板引用"这一意图。

---

#### 4. 核心实现：一步步构建我们自己的 `useTemplateRef`

手动实现一个 `useTemplateRef`，这能帮助我们深入理解其工作原理。

##### **第一步：基本结构**

函数接收一个 `key` (字符串)，并返回一个 `ref` 对象。

```javascript
import { shallowRef } from 'vue';

export function myUseTemplateRef(key) {
  const container = shallowRef(null);
  // ? 如何将 DOM 元素填充到 container.value 中？
  return container;
}
```

##### **第二步：找到 Vue 内部的关联机制**

- **关键入口点**: Vue 的组合式 API 提供了 `getCurrentInstance()` 方法，它可以获取当前组件的实例。
- **`instance.refs`**: 在组件实例上，有一个 `refs` 对象。这个对象存储了所有模板 `ref` 的映射关系，即 `{ ref名: DOM元素 }`。这正是 Vue 2 中 `this.$refs` 的本质。

我们可以利用 `instance.refs` 来建立连接。

##### **第三步：初次尝试 - 使用 `Object.defineProperty`**

我们的思路是：当 Vue 内部给 `instance.refs` 对象设置属性（如 `instance.refs.elRef = <div元素>`）时，我们通过 `Object.defineProperty` 拦截这个 `set` 操作，从而捕获到 DOM 元素。

```javascript
import { shallowRef, getCurrentInstance } from 'vue';

export function myUseTemplateRef(key) {
  const container = shallowRef(null);
  const vm = getCurrentInstance(); // 获取组件实例

  if (vm) {
    Object.defineProperty(vm.refs, key, {
      get() {
        return container.value;
      },
      set(value) { // value 就是 Vue 传入的 DOM 元素
        console.log('拦截到了 set 操作:', value);
        container.value = value;
      }
    });
  }
  return container;
}
```

##### **第四步：遇到问题与解决方案**

**问题一：`Uncaught TypeError: Cannot define property ..., object is not extensible`**

- **原因**: 这是一个 Vue 的性能优化策略。对于绝大多数不使用模板 `ref` 的组件，Vue 不会为每个实例都创建一个新的空 `refs` 对象（`{}`），因为即使是空对象也会占用内存。取而代之的是，所有这些实例的 `refs` 属性都指向一个**全局共享的、被冻结（`Object.freeze()`）的空对象**。被冻结的对象是不可扩展的，因此无法对其使用 `Object.defineProperty`。

- **解决方案**: 在定义属性前，检查 `vm.refs` 是否是那个被冻结的共享对象。如果是，就将其替换为一个新的、可写的普通空对象。

```javascript
// Vue 源码中的逻辑
if (vm.refs === EMPTY_OBJ) { // EMPTY_OBJ 是 Vue 内部的共享冻结对象
  vm.refs = {};
}

// 我们的模拟实现 (因为无法访问 EMPTY_OBJ)
// 直接替换即可
vm.refs = {};
```

**问题二：多次调用 `useTemplateRef` 导致监听被覆盖**

- **场景**: 在同一个组件中，如果调用两次 `useTemplateRef`：
  ```javascript
  const container1 = myUseTemplateRef('ref1');
  const container2 = myUseTemplateRef('ref2');
  ```
- **问题**: 第二次调用 `myUseTemplateRef` 时，会执行 `vm.refs = {}`，这会创建一个**全新的对象**，导致第一次调用时在旧对象上设置的 `defineProperty` 监听器失效。

- **解决方案**: 必须确保 `vm.refs = {}` 这个初始化操作对于每个组件实例只执行一次。

- **实现**: 使用 `WeakSet` 来记录哪些组件实例已经初始化过 `refs` 对象。`WeakSet` 很适合这个场景，因为它对 V8 垃圾回收友好，当组件实例被销毁后，`WeakSet` 中的引用会自动消失，不会造成内存泄漏。

##### **第五步：最终实现**

结合以上所有解决方案，我们得到了一个健壮的 `useTemplateRef` 实现。

```javascript
import { shallowRef, getCurrentInstance } from 'vue';

// 使用 WeakSet 确保每个组件实例的 refs 对象只被初始化一次
const initialedInstances = new WeakSet();

export function useTemplateRef(key) {
  const container = shallowRef(null);
  const vm = getCurrentInstance();

  if (vm) {
    // 检查当前实例是否已经初始化过
    if (!initialedInstances.has(vm)) {
      // 如果没有，将其 refs 替换为一个新对象，并进行标记
      vm.refs = {};
      initialedInstances.add(vm);
    }

    Object.defineProperty(vm.refs, key, {
      // 当外部代码访问 vm.refs.xxx 时，返回我们自己的 container.value
      get() {
        return container.value;
      },
      // 当 Vue 挂载并设置 DOM 元素时，将其存入我们的 container
      set(value) {
        container.value = value;
      },
    });
  }

  return container;
}
```

#### 5. 总结

`useTemplateRef` 的实现巧妙地利用了 Vue 内部的 `instance.refs` 机制。其核心是**拦截**和**代理**。

1.  **获取实例**: 通过 `getCurrentInstance()` 拿到组件实例。
2.  **处理优化**: 识别并处理 Vue 为性能优化的 "共享冻结 `refs` 对象" 的情况，通过 `WeakSet` 确保只对 `refs` 对象初始化一次，避免了多次调用时的相互覆盖。
3.  **拦截代理**: 使用 `Object.defineProperty` 监听特定 `ref` key 的 `get` 和 `set` 操作，将 Vue 内部的赋值操作代理到我们自己创建的 `shallowRef` (`container`) 上，最终返回这个 `ref` 对象给用户。

通过这个过程，我们不仅学会了 `useTemplateRef` 的用法，更深入地理解了 Vue 在性能优化和内部机制上的一些精妙设计。 
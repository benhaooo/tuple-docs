# 学习笔记：封装 Vue 组合式函数 useEventListener

## 1. 引言：什么是组合式函数？

在 Vue 3 中，组合式函数（Composition Function，通常称为 Hook）是一种利用 Vue 组合式 API 来封装和复用**有状态逻辑**的函数。

它的核心思想是，将原本分散在组件不同生命周期钩子（如 `onMounted`, `onUnmounted`）中的相关逻辑，聚合到一个独立的、可复用的函数中。这让我们的组件代码更简洁，逻辑更清晰。

本文将带你从零开始，构建一个功能完备的 `useEventListener` 函数。

## 2. 初始问题：重复的事件监听逻辑

在日常开发中，我们经常需要在组件挂载时监听事件，在组件卸载时移除监听，以防止内存泄漏。一个典型的例子如下：

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const count = ref(0);

// 在组件挂载时，给 window 添加鼠标移动事件
onMounted(() => {
  window.addEventListener('mousemove', () => {
    count.value++;
    console.log(count.value);
  });
});

// 在组件卸载时，移除事件
onUnmounted(() => {
  window.removeEventListener('mousemove', () => {
    // ...
  });
});
</script>
```

这段代码存在明显的**重复模式**:

-   每次都需要 `onMounted` + `onUnmounted` 的组合。
-   每次都需要调用 `addEventListener` 和 `removeEventListener`。

变化的部分仅仅是**事件目标**（这里是 `window`）、**事件类型**（`mousemove`）和**处理函数**。这正是组合式函数要解决的问题。

## 3. 封装之旅：一步步构建 `useEventListener`

### 第一步：基础抽象

我们先创建一个 `useEventListener.js` 文件，将最基础的逻辑抽离出来。

**目标**：接收 `事件类型` 和 `处理函数`，自动处理监听和移除。

```javascript
// useEventListener.js
import { onMounted, onUnmounted } from 'vue';

export function useEventListener(type, listener) {
  onMounted(() => {
    window.addEventListener(type, listener);
  });

  onUnmounted(() => {
    window.removeEventListener(type, listener);
  });
}
```

这样，在组件中就可以简化为一行调用：

```vue
// component.vue
import { useEventListener } from './useEventListener';

useEventListener('mousemove', () => console.log('mouse move!'));
```

### 第二步：支持 `options` 参数

`addEventListener` 的第三个参数 `options` 也应该是可配置的。

**目标**：让我们的 Hook 支持所有 `addEventListener` 的原生参数。

```javascript
// useEventListener.js
// ...
export function useEventListener(type, listener, options) { // 增加 options 参数
  onMounted(() => {
    window.addEventListener(type, listener, options); // 透传 options
  });

  onUnmounted(() => {
    window.removeEventListener(type, listener, options);
  });
}
```

### 第三步：支持自定义事件目标 (Target)

事件不总是监听在 `window` 上，也可能是一个 DOM 元素，通常通过 `ref` 获取。

**目标**：允许传入一个目标元素（`ref` 或普通元素）作为第一个参数。

```javascript
// useEventListener.js
import { onMounted, onUnmounted, unref } from 'vue'; // 引入 unref

export function useEventListener(target, type, listener, options) {
  // 使用 unref 获取 target 的实际 DOM 元素
  // unref 对于普通对象会直接返回，对于 ref 会返回 .value
  const targetElement = unref(target);

  onMounted(() => {
    targetElement.addEventListener(type, listener, options);
  });

  onUnmounted(() => {
    targetElement.removeEventListener(type, listener, options);
  });
}
```

### 第四步：处理动态 Ref（核心步骤）

如果 `ref` 绑定的元素是通过 `v-if` 控制的，当元素被移除时，`ref.value` 会变为 `null`。此时，事件监听应该被移除，而不是等到组件卸载。

**目标**：当 `target` 本身发生变化时，动态地添加和移除事件监听。

解决方案是使用 `watch` 来代替 `onMounted`。

```javascript
// useEventListener.js
import { watch, unref } from 'vue';

export function useEventListener(target, type, listener, options) {
  let cleanup = () => {}; // 声明一个空的清理函数

  // 使用 watch 监听 target 的变化
  watch(
    () => unref(target), // 监听解包后的 ref
    (element) => {
      // 1. 先执行上一次的清理函数，移除旧的监听
      cleanup();

      // 2. 如果新的 element 存在，则添加新的监听
      if (element) {
        element.addEventListener(type, listener, options);

        // 3. 保存本次的清理函数，用于下次 watch 触发或组件卸载时调用
        cleanup = () => {
          element.removeEventListener(type, listener, options);
        };
      }
    },
    { immediate: true } // 立即执行一次，用于初始挂载
  );

  // onUnmounted(() => cleanup()); // 仍然需要在卸载时清理
}
```

### 第五步：API 优化 - 函数重载

为了方便，当不传入 `target` 时，我们希望它能默认监听 `window`。

**目标**：实现 `useEventListener(type, listener)` 和 `useEventListener(target, type, listener)` 两种调用方式。

```javascript
// useEventListener.js
// ...
export function useEventListener(...args) {
  // 解构参数
  let target, type, listener, options;

  // 判断第一个参数是否为字符串，如果是，则目标为 window
  if (typeof args[0] === 'string') {
    [type, listener, options] = args;
    target = window;
  } else {
    [target, type, listener, options] = args;
  }

  // ... 后续逻辑同第四步 ...
}
```

### 第六步：支持手动停止监听

有时候我们需要在组件卸载前，手动停止事件监听。

**目标**：从 Hook 返回一个 `stop` 函数。

```javascript
// useEventListener.js
// ...
export function useEventListener(...args) {
  // ... 参数解析同第五步 ...

  let cleanup = () => {};

  const stopWatch = watch(
    () => unref(target),
    (element) => {
      cleanup();
      if (element) {
        element.addEventListener(type, listener, options);
        cleanup = () => {
          element.removeEventListener(type, listener, options);
        };
      }
    },
    { immediate: true }
  );

  const stop = () => {
    cleanup(); // 清理 DOM 事件
    stopWatch(); // 停止 watch
  };

  // onUnmounted(stop);

  return stop; // 返回 stop 函数
}
```

### 第七步：在组件外使用

`onUnmounted` 只能在组件 `setup` 期间使用。为了让 Hook 更通用，我们可以使用 `onScopeDispose`。

**目标**：让 Hook 在任何 effect 作用域（包括组件和 `effectScope`）内都能自动销毁。

```javascript
// useEventListener.js
import { watch, unref, onScopeDispose } from 'vue'; // 引入 onScopeDispose

export function useEventListener(...args) {
  // ... 省略参数解析和 watch 逻辑 ...

  const stop = () => {
    cleanup();
    stopWatch();
  };

  onScopeDispose(stop); // 当当前作用域销毁时，自动调用 stop

  return stop;
}
```

### 第八步：终极进化 - TypeScript 类型定义

至此，我们的函数在功能上已经非常完善。最后一步是为其添加精确的 TypeScript 类型，使其在开发中更加稳健可靠，并提供无与伦比的开发体验。

**类型定义的优势:**
-   **智能的自动补全**：IDE 知道 `target` 是 `window` 时，会自动提示 `scroll`、`resize` 等事件；当 `event` 是 `click` 时，会自动推断出 `listener` 的参数是 `MouseEvent`。
-   **编码时的错误检查**：防止传入错误的事件名或者类型不匹配的 `listener`。

**实现方式：函数重载**

由于我们的 Hook 支持两种调用方式（`useEventListener('click', ...)` 和 `useEventListener(myRef, 'click', ...)`），它们的参数不同。在 TypeScript 中，这种情况需要使用 **函数重载 (Function Overloads)** 来精确描述。

我们需要在函数实现前，定义两个函数签名：

1.  **Window 目标重载**:
    ```typescript
    export function useEventListener<K extends keyof WindowEventMap>(
      event: K, // 事件名被约束为 WindowEventMap 的键
      listener: (this: Window, ev: WindowEventMap[K]) => any, // listener 的 event 参数被精确推断
      options?: boolean | AddEventListenerOptions,
    ): () => void
    ```
    这个签名处理第一个参数是字符串（事件名）的情况，它假定目标是 `window`，并利用 TypeScript 内置的 `WindowEventMap` 接口来提供精确的事件名和事件对象的类型。

2.  **自定义 EventTarget 目标重载**:
    ```typescript
    export function useEventListener<T extends EventTarget>(
      target: MaybeRef<T>, // 目标可以是 Ref 或普通对象
      event: string,
      listener: EventListener, // 使用通用的 EventListener
      options?: boolean | AddEventListenerOptions,
    ): () => void
    ```
    这个签名处理第一个参数是事件目标（`ref` 或普通元素）的情况。它更加通用，适用于任何 `EventTarget`。

通过这两个重载签名，TypeScript 就可以理解 `useEventListener` 的不同用法，并在我们编码时提供相应的类型检查和智能提示。

## 4. 最终代码

综合以上所有步骤，我们得到了一个功能强大、类型安全且健壮的 `useEventListener` Hook。

```typescript
import { type Ref, watch, unref, onScopeDispose } from 'vue'

// 为了更好的类型推断，定义一个 MaybeRef 类型
type MaybeRef<T> = T | Ref<T | undefined | null>

// 重载 1: 监听 window 事件
// useEventListener('scroll', (event) => { ... })
export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions,
): () => void

// 重载 2: 监听自定义元素事件
// const myRef = ref(null)
// useEventListener(myRef, 'click', (event) => { ... })
export function useEventListener<T extends EventTarget>(
  target: MaybeRef<T>,
  event: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void

// 实现
export function useEventListener(...args: any[]): () => void {
  // 解析参数，实现函数重载
  let target: MaybeRef<EventTarget> | Window
  let event: string
  let listener: EventListener
  let options: boolean | AddEventListenerOptions | undefined

  if (typeof args[0] === 'string') {
    ;[event, listener, options] = args
    target = window
  } else {
    ;[target, event, listener, options] = args
  }

  // 核心逻辑
  let cleanup = () => {}

  const stopWatch = watch(
    () => unref(target),
    (el) => {
      cleanup() // 每次 target 变化时，先清理上一次的事件

      if (!el) {
        return
      }

      el.addEventListener(event, listener, options)

      // 保存本次的清理函数
      cleanup = () => {
        el.removeEventListener(event, listener, options)
      }
    },
    { immediate: true, flush: 'post' }, // immediate 保证立即执行，flush: 'post' 确保在 DOM 更新后执行
  )

  // 定义 stop 函数，用于手动停止和自动销毁
  const stop = () => {
    cleanup() // 清理 DOM 事件
    stopWatch() // 停止 watch
  }

  // 利用 onScopeDispose 实现自动销毁
  onScopeDispose(stop)

  // 返回手动停止函数
  return stop
}
```

## 5. 总结

通过八个步骤的逐步迭代，我们从一个简单的需求出发，成功地封装了一个集**自动清理、动态目标、API 优化、手动控制、类型安全**于一体的高级组合式函数。这个过程完整地展示了如何思考和构建一个可复用、健壮且对开发者友好的工具函数，它遵循了 Vue 设计的最佳实践，极大地提升了事件处理逻辑的可维护性和复用性。 
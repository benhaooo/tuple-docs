# Vue 内置组件 `keep-alive` 深度解析

## 1\. `keep-alive` 简介

`keep-alive` 是 Vue 的一个内置组件，它本身**不渲染任何 DOM 元素**，也不出现在父组件链中。它的核心作用是将其包裹的动态切换的组件**缓存**在内存中，避免组件在切换过程中被重复销毁和创建。

在 Vue 的内置组件中，我们已经学习过：

  * `transition` & `transition-group`：用于实现动画效果。
  * `slot`：用于实现内容分发（插槽）。
  * `component`：用于渲染动态组件。

`keep-alive` 是性能优化和面试中的一个重要知识点。

### `component` 动态组件回顾

`component` 组件可以通过 `:is` prop 动态地渲染不同的组件或 HTML 元素。

```vue
<template>
  <component :is="currentComponent"></component>
</template>

<script>
import CompA from './CompA.vue';
import CompB from './CompB.vue';

export default {
  data() {
    return {
      // 也可以是 'h1', 'p' 等 HTML 标签名
      currentComponent: CompA 
    }
  }
}
</script>
```

## 2\. `keep-alive` 的核心作用与优势

当组件在不同视图间频繁切换时，如果不使用 `keep-alive`，Vue 会销毁旧组件并创建新组件。这个过程会重复触发组件的生命周期钩子（如 `created`, `mounted`, `destroyed`），带来一定的性能开销。

`keep-alive` 通过缓存组件实例来解决这个问题。

  - **核心作用**：缓存内部组件实例。
  - **两大优势**：
    1.  **性能优化**：避免了组件重复创建和销毁带来的性能开销。
    2.  **状态保持**：保留了组件被缓存时的状态（data、DOM 状态等）。当组件切回时，可以恢复到离开前的样子，提升了用户体验。

## 3\. 使用场景

任何涉及组件动态切换的场景都可以考虑使用 `keep-alive`，最常见的有：

  - **`v-if` / `v-else-if` / `v-else`**：根据条件渲染不同组件。
  - **`component` 动态组件**：通过 `:is` 切换组件。
  - **`router-view`**：在 Vue Router 中，路由切换时，页面组件的渲染。这是最典型的应用场景。

## 4\. 基本用法与效果对比

### 不使用 `keep-alive`

当组件切换时，旧组件被销毁 (`destroyed` 钩子触发)，新组件被创建 (`created`, `mounted` 钩子触发)。组件内部的状态（如输入框内容）会丢失。

**示例代码：**

```vue
<template>
  <div>
    <button @click="switchComponent">Switch</button>
    <component :is="currentComponent"></component>
  </div>
</template>

<script>
import CompA from './CompA.vue';
import CompB from './CompB.vue';
import CompC from './CompC.vue';

export default {
  data() {
    return {
      // 使用 Object.freeze 优化，因为这些组件对象不需要响应式
      components: Object.freeze([CompA, CompB, CompC]),
      currentIndex: 0
    };
  },
  computed: {
    currentComponent() {
      return this.components[this.currentIndex];
    }
  },
  methods: {
    switchComponent() {
      this.currentIndex = (this.currentIndex + 1) % this.components.length;
    }
  }
};
</script>
```

**控制台输出（从 CompA -\> CompB）：**

```
CompA destroyed
CompB created
CompB mounted
```

### 使用 `keep-alive`

只需用 `<keep-alive>` 标签包裹动态组件即可。

```vue
<template>
  <div>
    <button @click="switchComponent">Switch</button>
    <keep-alive>
      <component :is="currentComponent"></component>
    </keep-alive>
  </div>
</template>
// ... script 部分同上
```

**效果分析：**

1.  **生命周期**：组件首次创建时，`created` 和 `mounted` 正常触发。切换出去后，组件实例被缓存，不会触发 `destroyed`。
2.  **状态保持**：再次切回该组件时，输入框等内部状态会被完整保留。
3.  **性能**：直接重用缓存的 DOM 和组件实例，效率极高。
4.  **代价**：用内存换取时间。缓存的组件实例会占用更多内存。

## 5\. `keep-alive` 的 Props

`keep-alive` 提供了三个 prop 来进行更精细的缓存控制。

### `include` & `exclude`

这两个 prop 用于**指定需要（或不需要）缓存的组件**。它们的匹配依据是组件的 `name` 选项。

  - **`include`**：白名单。只有 `name` 属性匹配的组件才会被缓存。
  - **`exclude`**：黑名单。`name` 属性匹配的组件**不会**被缓存。
  - **同时使用时**：`exclude` 的优先级高于 `include`。

**值类型：**

  - 字符串：用逗号分隔的组件名列表。
  - 数组：组件名组成的数组。
  - 正则表达式。

**示例：只缓存 CompA 和 CompB**

1.  **为组件设置 `name` 选项**

    ```javascript
    // 在 CompA.vue 中
    export default {
      name: 'CompA',
      // ...
    }

    // 在 CompB.vue 中
    export default {
      name: 'CompB',
      // ...
    }
    ```

2.  **在 `keep-alive` 中使用 `include`**

    ```vue
    <keep-alive :include="['CompA', 'CompB']">
      <component :is="currentComponent"></component>
    </keep-alive>

    <keep-alive include="CompA,CompB">
      <component :is="currentComponent"></component>
    </keep-alive>
    ```

    当切换到 `CompC` 时，它将不会被缓存，切换离开时会触发 `destroyed`。

### `max`

`max` prop 用于**设置最大缓存组件实例的数量**。它是一个数字。

  - **作用**：当缓存的组件数量超过 `max` 设定的值时，Vue 会将**最久没有被访问**的组件实例销毁掉，以释放内存。这是一种 **LRU (Least Recently Used) 缓存淘汰策略**。

**示例：最多缓存 2 个组件**

```vue
<keep-alive :max="2">
  <component :is="currentComponent"></component>
</keep-alive>
```

**执行流程：**

1.  切换到 `CompA`：`[CompA]` 被缓存。
2.  切换到 `CompB`：`[CompA, CompB]` 被缓存。
3.  切换到 `CompC`：缓存数量将超过 2。此时，最久未被访问的 `CompA` 会被销毁，然后 `CompC` 被缓存。缓存队列变为 `[CompB, CompC]`。

## 6\. 新增的生命周期钩子

被 `keep-alive` 缓存的组件，会拥有两个特殊的生命周期钩子函数。这适用于被缓存组件自身及其所有后代组件。

  - **`activated`**：在组件被**激活**（即从缓存中取出并显示到页面上）时调用。组件首次挂载时也会调用。
  - **`deactivated`**：在组件被**失活**（即从页面上移除并放入缓存）时调用。

这两个钩子解决了缓存组件无法感知自己何时被显示/隐藏的问题，允许我们在组件切换时执行特定逻辑（如开启/清除定时器、绑定/解绑事件等）。

**示例：**

```javascript
// 在 CompA.vue 中
export default {
  name: 'CompA',
  created() { console.log('CompA created'); },
  mounted() { console.log('CompA mounted'); },
  destroyed() { console.log('CompA destroyed'); },
  activated() {
    console.log('CompA activated'); // 启动定时器等
  },
  deactivated() {
    console.log('CompA deactivated'); // 清除定时器等
  }
}
```

**控制台输出流程：**

1.  **首次加载 CompA**：`created` -\> `mounted` -\> `activated`
2.  **切换到 CompB**：`deactivated` (CompA 的)
3.  **切换回 CompA**：`activated` (CompA 的)

## 7\. 实战案例：后台管理系统的标签页缓存

在后台管理系统中，我们经常使用标签页（Tabs）来管理打开的页面，希望关闭标签前，页面的状态能被保留。这正是 `keep-alive` 的用武之地。

**实现思路：**

1.  使用 `vuex` 或 `pinia` 维护一个需要被缓存的页面组件名（通常是路由名）的数组，例如 `cachedViews`。
2.  `router-view` 是路由页面的出口，用 `<keep-alive>` 包裹它。
3.  将 `<keep-alive>` 的 `include` 属性动态绑定到 `cachedViews` 数组。
4.  当用户打开一个新标签页时，将其对应的组件名 `push` 到 `cachedViews` 数组中。
5.  当用户关闭一个标签页时，从 `cachedViews` 数组中移除对应的组件名。

**示例代码：**

```vue
<template>
  <div id="app">
    <keep-alive :include="cachedViews">
      <router-view :key="key" />
    </keep-alive>
  </div>
</template>

<script>
export default {
  computed: {
    // 从 Vuex/Pinia store 中获取需要缓存的视图名称数组
    cachedViews() {
      return this.$store.state.tabs.cachedViews;
    },
    // key 确保即使是相同路由不同参数时也能刷新
    key() {
      return this.$route.path;
    }
  }
}
</script>
```

## 8\. 实现原理剖析 (伪代码)

`keep-alive` 的实现核心在于其 `render` 函数。它内部维护了两个主要的数据结构：

  - `cache`：一个对象，用于存储缓存的组件。`{ key: vnode }`
  - `keys`：一个数组，用于存储 `cache` 中每个组件的 `key`。`['key1', 'key2', ...]`，这个数组也用于实现 LRU 策略。

**核心渲染流程（伪代码）：**

```javascript
render() {
  // 1. 获取默认插槽中的 VNode
  const slot = this.$slots.default;
  const vnode = getFirstComponentChild(slot); // 找到第一个组件 VNode
  const componentOptions = vnode.componentOptions;

  if (componentOptions) {
    // 2. 获取组件的 key (若无则自动生成) 和 name
    const name = componentOptions.Ctor.options.name;
    const key = vnode.key;

    // 3. 判断是否需要缓存 (根据 include/exclude)
    if (name && (this.include && !matches(this.include, name)) || (this.exclude && matches(this.exclude, name))) {
      return vnode; // 不缓存，直接返回 VNode
    }
    
    const { cache, keys } = this;
    
    // 4. 检查是否有缓存
    if (cache[key]) {
      // 4.1. 命中缓存
      vnode.componentInstance = cache[key].componentInstance; // 重用实例
      // 调整 key 的位置到队尾，表示最近使用
      remove(keys, key);
      keys.push(key);
    } else {
      // 4.2. 未命中缓存
      cache[key] = vnode; // 缓存 VNode
      keys.push(key);
      // 4.3. 判断是否超出 max 限制
      if (this.max && keys.length > parseInt(this.max)) {
        // 如果超出，则移除队首（最久未使用）的缓存
        pruneCacheEntry(cache, keys[0], keys, this._vnode);
      }
    }
    
    // 标记 vnode 为 keep-alive，以便后续处理
    vnode.data.keepAlive = true; 
  }
  
  return vnode; // 返回（可能被处理过的）VNode
}
```

**总结流程：**

1.  在 `render` 函数中，获取默认插槽里的第一个组件 `VNode`。
2.  根据 `VNode` 的 `key` 去 `cache` 对象中查找是否有缓存的组件实例。
3.  **如果命中缓存**：直接将缓存的组件实例赋值给当前 `VNode` 的 `componentInstance` 属性，并调整该 `key` 在 `keys` 数组中的位置到末尾（表示最新使用）。
4.  **如果未命中缓存**：将当前 `VNode` 存入 `cache`，`key` 存入 `keys`。然后检查 `keys` 数组长度是否超过 `max`，如果超过，则移除 `keys` 数组的第一个元素（最久未使用的）以及 `cache` 中对应的条目，并执行销毁。
5.  最终返回这个 `VNode`。Vue 在后续的 patch 过程中，如果发现 `VNode` 拥有 `componentInstance`，就会跳过创建新实例的过程，直接重用现有实例。
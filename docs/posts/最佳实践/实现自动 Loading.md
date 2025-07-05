### **Vue 组件二次封装学习笔记：实现自动 Loading 的 `MyButton`**

旨在通过封装一个带有异步 `loading` 状态的按钮组件，深入理解 Vue 3 组件封装的核心概念和高级技巧。

#### 1\. 核心痛点：重复的异步 Loading 逻辑

在日常开发中，我们经常会编写类似下面的代码，即在发起异步请求前开启加载状态，请求结束后（无论成功或失败）再关闭加载状态。

```vue
<template>
  <el-button :loading="loading" @click="handleClick">点击我</el-button>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);

const handleClick = async () => {
  loading.value = true;
  try {
    // 模拟异步请求
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    console.log('请求完成');
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};
</script>
```

**问题**: 每个需要 `loading` 状态的按钮都需要重复编写 `loading` 状态的定义和 `try...finally` 的逻辑，代码冗余且不易维护。

**目标**: 封装一个 `MyButton` 组件，将 `loading` 逻辑内置，让使用者无需关心其内部实现。

-----

#### 2\. 封装过程与技术点详解

##### 2.1. 基础封装：`slot` 与 `$attrs`

首先，我们创建一个基础的 `MyButton` 组件，它接收父组件的点击事件，并能显示父组件传递的内容。

  - **`<slot />`**: 用于接收父组件传递的按钮文本或自定义内容。
  - **`$attrs`**: 一个非常有用的对象，它包含了所有**未被 `props` 声明**的父组件透传属性和事件。例如，父组件传递的 `type="primary"` 和 `@click="someFunction"` 都会出现在 `$attrs` 中。

<!-- end list -->

```vue
<template>
  <el-button :loading="loading" @click="handleInternalClick">
    <slot />
  </el-button>
</template>

<script setup>
import { ref, useAttrs } from 'vue';

const loading = ref(false);
const attrs = useAttrs(); // 获取 $attrs

const handleInternalClick = async () => {
  loading.value = true;
  try {
    // 关键：调用父组件传递的 onClick 事件
    // attrs.onClick 可能不存在，需要做可选链处理
    await attrs.onClick?.(); 
  } finally {
    loading.value = false;
  }
};
</script>
```

**此时，父组件的使用变得简洁：**

```vue
<template>
  <MyButton type="primary" @click="fetchData">请求数据</MyButton>
</template>
```

**优点**: 成功将 `loading` 逻辑内聚到组件内部。

-----

##### 2.2. 问题一：类型提示缺失

使用 `$attrs` 的一个显著缺点是**丢失了类型信息**。在父组件中使用 `MyButton` 时，IDE 无法提供像 `type`, `size`, `disabled` 等 Element Plus `el-button` 原生属性的类型提示和自动补全。

##### 2.3. 解决方案：`defineProps` 与 Element Plus 类型集成

为了解决类型问题，我们使用 `defineProps`，并直接从 Element Plus 导入其官方的 `buttonProps` 类型定义。

```typescript
// 从 element-plus 导入 buttonProps 类型定义
import { buttonProps } from 'element-plus';

// 使用 defineProps 继承原生按钮的所有 props
defineProps(buttonProps); 
```

-----

##### 2.4. 问题二：`props` 带来的新问题

引入 `defineProps(buttonProps)` 后，会引发两个新问题：

1.  **Prop 命名冲突**: 我们组件内部的 `loading` 状态与 `buttonProps` 中的 `loading` 属性重名。
2.  **Props 必填错误**: Element Plus 的 `buttonProps` 类型定义中，某些属性（如 `disabled`）可能被标记为必填，导致父组件在使用 `MyButton` 时，即使不需要这些属性，TypeScript 也会报错提示缺少必填项。

##### 2.5. 解决方案：TypeScript 工具类型 `Omit` 和 `Partial`

TypeScript 强大的工具类型可以完美解决上述问题。

  - **`Omit<Type, Keys>`**: 用于从一个类型 `Type` 中移除指定的属性 `Keys`，返回一个新的类型。
  - **`Partial<Type>`**: 用于将一个类型 `Type` 中的所有属性变为可选（`?`）。

**组合使用来修复 `props` 定义：**

```typescript
// MyButton.vue (v2)
import { buttonProps } from 'element-plus';

// 1. 使用 Omit 剔除原生的 loading 属性，避免命名冲突
type MyButtonProps = Omit<typeof buttonProps, 'loading'>;

// 2. 使用 Partial 将所有属性变为可选，解决必填问题
const props = defineProps<Partial<MyButtonProps>>();
```

> **重点**: `typeof buttonProps` 是获取 `buttonProps` 对象本身的类型，这对于 `Omit` 和 `Partial` 是必需的。

-----

##### 2.6. 问题三：事件重复触发

完成类型修复后，我们发现点击按钮时，父组件的 `@click` 事件被触发了**两次**。

**原因**: Vue 的**属性继承 (`Attribute Inheritance`)**。

1.  Vue 默认会将父组件传递的、未被 `props` 接收的属性（这里是 `@click` 事件监听器）自动应用到子组件的根元素上。这是**第一次**触发。
2.  我们在组件内部的 `handleInternalClick` 方法中，通过 `$attrs.onClick()` 手动调用了父组件的事件。这是**第二次**触发。

##### 2.7. 解决方案：关闭属性继承 `inheritAttrs: false`

我们可以通过 `defineOptions` 宏来关闭默认的属性继承行为。

```typescript
// MyButton.vue (最终版)
<script setup lang="ts">
// ...
defineOptions({
  inheritAttrs: false,
});
// ...
</script>
```

当 `inheritAttrs` 设置为 `false` 后，`@click` 事件将不会自动绑定到 `MyButton` 的根元素上，它只会存在于 `$attrs` 对象中，等待我们手动调用。这样就完美解决了事件重复触发的问题。

-----

#### 3\. 最终代码与总结

##### `MyButton.vue` (完整实现)

```vue
<template>
  <el-button :loading="loading" v-bind="$attrs">
    <slot />
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { buttonProps } from 'element-plus';

// 关闭属性继承，防止事件等属性被自动应用到根元素上
defineOptions({
  inheritAttrs: false,
});

// 使用 TS 工具类型处理 props，提供完善的类型提示且避免冲突
type MyButtonProps = Partial<Omit<typeof buttonProps, 'loading'>>;
defineProps<MyButtonProps>();

// 组件内部维护的 loading 状态
const loading = ref(false);

// 注意：由于关闭了 inheritAttrs，@click 事件现在位于 $attrs 中
// 我们不再需要一个内部的 click handler，v-bind="$attrs" 会自动处理它。
// 但是为了控制 loading，我们仍需劫持点击事件。
// 因此，一个更健壮的方式是重新监听 click，并阻止原始事件冒泡。

import { useAttrs } from 'vue';
const attrs = useAttrs();

const handleInternalClick = async () => {
  if (loading.value) return; // 防止重复点击
  loading.value = true;
  try {
    if (attrs.onClick) {
      // @ts-ignore
      await attrs.onClick();
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <el-button :loading="loading" :="props" @click="handleInternalClick">
    <slot />
  </el-button>
</template>

```

#### 核心知识点回顾

1.  **组件封装思想**: 将通用但重复的逻辑（如异步 `loading`）内聚到子组件中，简化父组件的使用。
2.  **`$attrs`**: 获取所有未被 `props` 声明的透传属性和事件，是实现深度封装的关键。
3.  **`inheritAttrs: false`**: 关闭默认的属性继承，避免不期望的副作用（如事件重复触发），配合 `v-bind="$attrs"` 可以精细化地控制属性应用位置。
4.  **TypeScript Utility Types**:
      - `Omit<T, K>`: 移除类型中的某些属性。
      - `Partial<T>`: 将类型中的所有属性变为可选。
5.  **类型继承**: 直接从 UI 库（如 Element Plus）导入并复用其 `props` 类型定义，是保证类型一致性和开发效率的高效方式。
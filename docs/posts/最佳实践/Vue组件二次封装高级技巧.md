# Vue 组件二次封装高级技巧

整理了在 Vue 3 `<script setup>` 环境下进行组件二次封装时，针对三个核心问题的"王炸级"解决方案。

## 背景：为什么要二次封装？

在日常开发中，我们经常需要对第三方组件库（如 Element Plus, Ant Design Vue）的组件进行二次封装，其主要目的有两个：

1.  **功能扩展**：为原始组件增加一些业务所需的特定功能，如预设格式、默认行为等。
2.  **统一风格**：在项目中统一组件的调用方式和样式，便于维护。

二次封装看似简单，但要做到完美，需要解决以下三个关键问题：

1.  **属性 (`Props`) 穿透**：如何将父组件传递的属性无损地应用到内部组件上？
2.  **插槽 (`Slots`) 穿透**：如何将父组件定义的插槽内容正确地放置到内部组件的指定位置？
3.  **方法 (`Methods`) 暴露**：如何让父组件能够调用到内部组件的实例方法？

---

## 一、属性穿透：告别无提示的 `v-bind="$attrs"`

**痛点：**
常规做法是使用 `v-bind="$attrs"` 将所有未被 `props` 接收的属性传递给内部组件。这种方式虽然能实现功能，但有一个致命缺点：**父组件在使用时会丢失 IDE 的属性提示和类型校验**，开发体验大打折扣。

**解决方案：`defineProps` + 类型导入**

核心思路是：**显式声明 Props，并从源组件库导入其类型定义**。

1.  **导入 Props 类型**：大部分优秀的组件库都会导出其组件的 Props 类型定义。我们可以直接导入。

    ```typescript
    // 以 Element Plus 的 Input 组件为例
    import type { InputProps } from 'element-plus';
    ```

2.  **声明 Props**: 使用 `defineProps` 结合导入的类型。因为我们是二次封装，不应该强制父组件传递所有 Props，所以使用 TypeScript 的 `Partial<>` 工具类型将所有属性变为可选。

    ```typescript
    const props = defineProps<Partial<InputProps>>();
    ```
    *注意：如果组件库只导出了 `props` 配置对象而没有导出其 TS 类型，则可以使用 `defineProps<Partial<typeof inputProps>>` 的方式。*

3.  **绑定 Props 和事件**: `defineProps` 会从 `$attrs` 中分离出声明过的 props。因此，`$attrs` 中只剩下事件监听器和其他 HTML Attributes。我们需要将 `props` 和 `$attrs` 一同绑定到内部组件上。

    ```html
    <!-- 在封装组件的 template 中 -->
    <template>
      <el-input v-bind="{ ...props, ...$attrs }" />
    </template>
    ```

**效果：**
通过这种方式，父组件在使用我们的封装组件时，能够享受到和使用原始组件一样的 **完美属性提示和类型检查**。

---

## 二、插槽穿透：一行代码搞定所有插槽

**痛点：**
传统的插槽穿透方式是在模板中用 `v-for` 遍历 `$slots` 对象，再用动态插槽名 `<slot :name="name" />` 来渲染，代码非常啰嗦和不雅。

**解决方案：`h` 函数 (Render Function) + `$slots`**

核心思路是：**利用 `h` 函数创建虚拟节点 (VNode)，它的第三个参数可以直接接收一个 slots 对象。** 这种方式通常需要将模板的渲染逻辑转移到 `<script>` 中。

1.  **准备工作**: 在 `<script setup>` 中导入 `h` 函数和 `useSlots`、`useAttrs`。

    ```typescript
    import { h, useSlots, useAttrs, defineProps } from 'vue';
    import ElInput from 'element-plus/es/components/input'; // 建议从具体路径导入以优化打包
    import type { InputProps } from 'element-plus';
    ```

2.  **创建并渲染 VNode**:
    我们可以不使用 `<template>` 标签，而是直接在 `<script setup>` 中创建 VNode 并结合动态组件 `<component :is="...">` 来渲染。

    ```vue
    <script setup>
    // ...导入语句
    
    // 1. 接收属性
    const props = defineProps<Partial<InputProps>>();
    
    // 2. 获取 attrs 和 slots
    const attrs = useAttrs();
    const slots = useSlots();

    // 3. 使用 h 函数创建 VNode
    // h(组件, 属性/事件, 插槽)
    const vnode = h(ElInput, { ...props, ...attrs }, slots);
    </script>

    <template>
      <!-- 4. 使用动态组件渲染 VNode -->
      <component :is="vnode" />
    </template>
    ```

**效果：**
无论有多少个插槽，包括默认插槽和具名插槽，都可以通过这种方式完美穿透，代码极其简洁、优雅。

---

## 三、方法暴露：让父组件无感调用内部方法

**痛点：**
我们希望父组件能通过 `ref` 直接调用内部 `el-input` 的 `focus()`、`clear()` 等方法。常规的 `defineExpose` 需要手动列出所有要暴露的方法，非常繁琐且容易遗漏。

**解决方案（终极版）：函数式 `ref` + `getCurrentInstance` + `exposedProxy`**

核心思路是：**利用 `ref` 的函数形式，在内部组件挂载时，获取其实例，并动态地将它设置为当前封装组件的 `expose` 内容及其代理。**

1.  **获取当前组件实例**: 使用 `getCurrentInstance()`。

    ```typescript
    import { getCurrentInstance } from 'vue';

    const vm = getCurrentInstance();
    ```

2.  **创建 ref 回调函数**: 定义一个函数，它将被用作 `ref` 的值。这个函数会在组件挂载时接收到组件实例，卸载时接收到 `null`。

    ```typescript
    const onRefChange = (instance) => { // instance 是内部 el-input 的实例
      if (vm) {
        // 关键点：同时更新 exposed 和 exposedProxy
        // 这样可以确保无论 Vue 内部机制如何，父组件都能拿到最新的实例。
        // 当组件卸载时，instance 为 null，我们暴露一个空对象，防止外部访问 ref.value 出错。
        vm.exposed = instance || {};
        vm.exposedProxy = instance || {};

        // 也可以简写为:
        // vm.exposed = vm.exposedProxy = instance || {};
      }
    };
    ```

    **为什么这个补充很重要？**

    直接修改 `vm.exposed` 在大多数情况下是有效的。但 Vue 的设计中，`exposedProxy` 才是最终暴露给父组件的响应式代理。通过同时更新两者，我们确保了逻辑上的**完全一致性**和**健壮性**，避免了在某些边缘场景下（例如与 Vue Devtools 交互或在特定的 Vue 版本中）可能出现的潜在问题。这体现了对 Vue 内部工作原理的深刻理解，也是"王炸"技巧的精髓所在。

3.  **在 `h` 函数中应用 `ref`**: 将 `onRefChange` 函数作为 `ref` 属性传递给 `h` 函数。

    ```typescript
    const vnode = h(
      ElInput,
      {
        ...props,
        ...attrs,
        ref: onRefChange // 应用函数式 ref
      },
      slots
    );
    ```

**效果：**
父组件现在可以像这样使用：

```vue
<script setup>
import { ref, onMounted } from 'vue';
import MyInput from './MyInput.vue';

const myInputRef = ref(null);

onMounted(() => {
  // myInputRef.value 现在就是 el-input 的实例！
  console.log(myInputRef.value);

  // 可以直接调用 el-input 的原生方法
  myInputRef.value.focus();
  
  setTimeout(() => {
    myInputRef.value.clear();
  }, 2000);
});
</script>

<template>
  <MyInput ref="myInputRef" v-model="someValue" />
</template>
```
父组件获取到的 `ref` 就是 `el-input` 的实例本身，而不是我们封装组件的实例，实现了方法的"透明"暴露，调用体验和直接使用 `el-input` 完全一致。

---

## 总结

通过以上三种高级技巧，我们可以构建出专业、健壮、易用的二次封装组件：

| 问题 | 传统方案 (缺陷) | 王炸级方案 | 核心技术 |
| :--- | :--- | :--- | :--- |
| **属性穿透** | `v-bind="$attrs"` (丢失类型提示) | `defineProps<Partial<Type>>` | `defineProps` + TS 类型体操 |
| **插槽穿透** | `v-for="$slots"` (代码繁琐) | `h(Comp, props, $slots)` | `h` 渲染函数 |
| **方法暴露** | `defineExpose({ a,b,c })` (需手动罗列) | 函数式 `ref` + `getCurrentInstance` | `ref` 函数 + `vm.exposed/Proxy` |

掌握这些技巧，将显著提升你的 Vue 组件开发水平。建议回顾并改造自己项目中已有的二次封装组件，消除潜在的维护隐患。 
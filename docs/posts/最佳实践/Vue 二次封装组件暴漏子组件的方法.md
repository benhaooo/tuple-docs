# Vue 组件二次封装学习笔记

核心解决在二次封装 Vue 组件时，如何优雅地将内部组件的**属性、方法和插槽**暴露给父组件使用的问题。

## 核心问题

当我们将一个基础组件（如 Element Plus 的 `el-input`）封装成自己的业务组件（如 `my-input`）时，会遇到以下三个典型问题：

1.  父组件传递的 `v-model`、`placeholder` 等属性无法直接生效。
2.  父组件无法调用内部组件的实例方法，如 `focus()`、`blur()` 等。
3.  父组件传入的 `slot` 无法正确渲染到内部组件的位置。

本笔记将围绕这三个问题，提供一套完整且健壮的解决方案。

-----

## 1\. 属性穿透 (`v-bind="$attrs"`)

**问题**：默认情况下，父组件绑定的属性（除了 `props` 和 `emits` 中定义的）不会被子组件的根元素继承。

**解决方案**：使用 `v-bind="$attrs"` 将所有未被 `props` 声明的属性一次性向下传递给内部的组件。

**示例**：
在封装的 `MyInput.vue` 组件中，将 `$attrs` 绑定到 `el-input` 上。

```vue
<template>
  <el-input ref="inputRef" v-bind="$attrs" />
</template>

<script setup>
// ...
</script>
```

**效果**：这样，父组件在使用 `MyInput` 时，绑定的 `v-model`、`placeholder`、`clearable` 等所有 `el-input` 支持的属性都能正常工作。

```vue
<template>
  <my-input v-model="message" placeholder="请输入内容..." />
</template>
```

-----

## 2\. 方法暴露 (`defineExpose` + `Proxy`)

**问题**：父组件通过 `ref` 获取到的是我们的封装组件实例，而不是内部的 `el-input` 实例，因此无法直接调用 `el-input` 的 `focus` 等方法。

### 错误示范：逐个暴露

手动通过 `defineExpose` 暴露每一个需要的方法。

```javascript
// MyInput.vue
const inputRef = ref();
defineExpose({
  focus: () => inputRef.value.focus(),
  // 如果还需要暴露 submit, clear 等方法，需要继续手动添加
  // submit: () => input-ref.value.submit(),
});
```

  - **缺点**：非常繁琐，不易维护。一旦内部组件增加了新方法，封装组件也需要同步修改。

### 推荐方案：使用 `Proxy` 动态代理

通过 `Proxy` 创建一个代理对象，将所有方法访问都动态转发到内部组件的 `ref` 上，实现方法的“完美转发”。

**实现步骤**：

1.  创建一个 `Proxy` 实例，并将其暴露给父组件。
2.  在 `Proxy` 的 `get` 陷阱中，返回内部组件 `ref` 上对应的方法或属性。
3.  **（关键）** 在 `Proxy` 中添加 `has` 陷阱并返回 `true`，以通过 Vue 内部的 `in` 操作符检查，否则代理会失效。

**代码示例**：

```vue
<template>
  <el-input ref="inputRef" v-bind="$attrs" />
</template>

<script setup>
import { ref } from 'vue';

const inputRef = ref();

defineExpose(new Proxy({}, {
  get(target, key, receiver) {
    // 将所有属性和方法的获取请求，都转发到内部的 el-input 实例上
    return Reflect.get(inputRef.value, key, receiver);
  },
  has(target, key) {
    // 欺骗 Vue，让它认为我们暴露的对象上存在所有可能的属性
    // 这是为了通过 Vue 内部的 "key in instance" 检查
    return true;
  }
}));
</script>
```

**效果**：现在，父组件可以像直接操作 `el-input` 一样，调用其所有方法。

```vue
<template>
  <my-input ref="myInputRef" />
  <button @click="handleFocus">点击聚焦</button>
</template>

<script setup>
import { ref } from 'vue';
const myInputRef = ref();

const handleFocus = () => {
  myInputRef.value.focus(); // 成功调用！
};
</script>
```

### 需要避免的方案：`onMounted` 中合并对象

提一种**不推荐**的写法：在 `onMounted` 钩子中，将内部组件 `ref` 的属性合并到一个新对象中再暴露。

  - **缺陷 1**：如果内部组件由 `v-if="false"` 控制，`onMounted` 时 `ref` 为空，导致暴露出去的是一个空对象。
  - **缺陷 2**：即使初始为 `true`，如果 `v-if` 的值后续变为 `false`，内部组件实例被销毁，但暴露出去的对象引用不会更新，导致方法调用时组件实例不存在而出错。

**结论**：`Proxy` 方案是动态的，总能访问到 `ref` 的最新状态，因此更加健壮可靠。

-----

## 3\. 插槽穿透 (动态 `v-slot`)

**问题**：父组件为封装组件提供的具名或默认插槽，需要被正确地传递给内部组件。

**解决方案**：遍历父组件传入的 `$slots` 对象，并使用动态插槽语法 `<slot :name="name">` 将其一一渲染。同时，需要将作用域插槽的 `props` 也透传回去。

**代码示例**：

```vue
<template>
  <el-input ref="inputRef" v-bind="$attrs">
    <template v-for="(slot, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps"></slot>
    </template>
  </el-input>
</template>

<script setup>
// ... script 部分同上 ...
</script>
```

**效果**：父组件可以正常使用 `el-input` 支持的所有插槽，如 `prepend`、`append` 等。

```vue
<template>
  <my-input v-model="message">
    <template #prepend>Http://</template>
    <template #append>.com</template>
  </my-input>
</template>
```

-----

## 总结

通过组合运用以下三个技巧，可以实现一个高复用性、功能完备的二次封装组件：

1.  **`v-bind="$attrs"`**：透传所有 HTML 属性和组件 `props`。
2.  **`defineExpose(new Proxy(...))`**：动态暴露内部组件的所有方法和实例属性。
3.  **动态 `v-slot`**：透传所有父级传入的插槽。

```vue
<template>
  <el-input ref="inputRef" v-bind="$attrs" />
</template>

<script setup>
// ...
</script>
```

**效果**：这样，父组件在使用 `MyInput` 时，绑定的 `v-model`、`placeholder`、`clearable` 等所有 `el-input` 支持的属性都能正常工作。

```vue
<template>
  <my-input v-model="message" placeholder="请输入内容..." />
</template>
```

-----

## 2\. 方法暴露 (`defineExpose` + `Proxy`)

**问题**：父组件通过 `ref` 获取到的是我们的封装组件实例，而不是内部的 `el-input` 实例，因此无法直接调用 `el-input` 的 `focus` 等方法。

### 错误示范：逐个暴露

手动通过 `defineExpose` 暴露每一个需要的方法。

```javascript
// MyInput.vue
const inputRef = ref();
defineExpose({
  focus: () => inputRef.value.focus(),
  // 如果还需要暴露 submit, clear 等方法，需要继续手动添加
  // submit: () => input-ref.value.submit(),
});
```

  - **缺点**：非常繁琐，不易维护。一旦内部组件增加了新方法，封装组件也需要同步修改。

### 推荐方案：使用 `Proxy` 动态代理

通过 `Proxy` 创建一个代理对象，将所有方法访问都动态转发到内部组件的 `ref` 上，实现方法的“完美转发”。

**实现步骤**：

1.  创建一个 `Proxy` 实例，并将其暴露给父组件。
2.  在 `Proxy` 的 `get` 陷阱中，返回内部组件 `ref` 上对应的方法或属性。
3.  **（关键）** 在 `Proxy` 中添加 `has` 陷阱并返回 `true`，以通过 Vue 内部的 `in` 操作符检查，否则代理会失效。

**代码示例**：

```vue
<template>
  <el-input ref="inputRef" v-bind="$attrs" />
</template>

<script setup>
import { ref } from 'vue';

const inputRef = ref();

defineExpose(new Proxy({}, {
  get(target, key, receiver) {
    // 将所有属性和方法的获取请求，都转发到内部的 el-input 实例上
    return Reflect.get(inputRef.value, key, receiver);
  },
  has(target, key) {
    // 欺骗 Vue，让它认为我们暴露的对象上存在所有可能的属性
    // 这是为了通过 Vue 内部的 "key in instance" 检查
    return true;
  }
}));
</script>
```

**效果**：现在，父组件可以像直接操作 `el-input` 一样，调用其所有方法。

```vue
<template>
  <my-input ref="myInputRef" />
  <button @click="handleFocus">点击聚焦</button>
</template>

<script setup>
import { ref } from 'vue';
const myInputRef = ref();

const handleFocus = () => {
  myInputRef.value.focus(); // 成功调用！
};
</script>
```

### 需要避免的方案：`onMounted` 中合并对象

提一种**不推荐**的写法：在 `onMounted` 钩子中，将内部组件 `ref` 的属性合并到一个新对象中再暴露。

  - **缺陷 1**：如果内部组件由 `v-if="false"` 控制，`onMounted` 时 `ref` 为空，导致暴露出去的是一个空对象。
  - **缺陷 2**：即使初始为 `true`，如果 `v-if` 的值后续变为 `false`，内部组件实例被销毁，但暴露出去的对象引用不会更新，导致方法调用时组件实例不存在而出错。

**结论**：`Proxy` 方案是动态的，总能访问到 `ref` 的最新状态，因此更加健壮可靠。

-----

## 3\. 插槽穿透 (动态 `v-slot`)

**问题**：父组件为封装组件提供的具名或默认插槽，需要被正确地传递给内部组件。

**解决方案**：遍历父组件传入的 `$slots` 对象，并使用动态插槽语法 `<slot :name="name">` 将其一一渲染。同时，需要将作用域插槽的 `props` 也透传回去。

**代码示例**：

```vue
<template>
  <el-input ref="inputRef" v-bind="$attrs">
    <template v-for="(slot, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps"></slot>
    </template>
  </el-input>
</template>

<script setup>
// ... script 部分同上 ...
</script>
```

**效果**：父组件可以正常使用 `el-input` 支持的所有插槽，如 `prepend`、`append` 等。

```vue
<template>
  <my-input v-model="message">
    <template #prepend>Http://</template>
    <template #append>.com</template>
  </my-input>
</template>
```

-----

## 总结

通过组合运用以下三个技巧，可以实现一个高复用性、功能完备的二次封装组件：

1.  **`v-bind="$attrs"`**：透传所有 HTML 属性和组件 `props`。
2.  **`defineExpose(new Proxy(...))`**：动态暴露内部组件的所有方法和实例属性。
3.  **动态 `v-slot`**：透传所有父级传入的插槽。
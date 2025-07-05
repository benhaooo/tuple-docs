### Vue `watchEffect` 依赖收集机制深度解析

这份笔记旨在帮助你理解 `watchEffect` 的核心工作原理，特别是它的依赖收集机制，从而避免在开发中遇到意想不到的“不更新”问题。

#### 核心问题

当 `watchEffect` 内的逻辑因为条件判断（如 `if` 语句）而没有执行到某个响应式变量的读取时，这个变量的变更**不会**触发 `watchEffect` 的重新执行。

#### 场景复现

让我们通过一个具体的例子来理解这个机制。

**1. 初始代码**

```vue
<template>
  <button @click="toggleB">点击切换 B 的值</button>
</template>

<script setup>
import { ref, watchEffect } from 'vue';

// 1. 定义两个响应式变量
const a = ref(true);
const b = ref(false);

// 2. 使用 watchEffect 监听
watchEffect(() => {
  // 关键：这里有一个或(||)条件判断
  if (a.value || b.value) {
    console.log('watchEffect 执行了');
  }
  // 注意：由于 a.value 为 true，b.value 的读取操作从未被执行
});

// 3. 定义一个方法，点击时只修改 b 的值
const toggleB = () => {
  b.value = !b.value;
  console.log(`B 的值被修改为: ${b.value}`);
};
</script>
```

**2. 初始执行**

  * 页面加载时，`watchEffect` 会**立即执行一次**。
  * 在执行过程中，它会“追踪”或“收集”所有被**实际读取**过的响应式变量作为依赖。
  * 在上述代码中，`watchEffect` 执行 `if (a.value || b.value)`。
  * 因为 `a.value` 是 `true`，JavaScript 的“短路效应”导致 `b.value` **不会被读取**。
  * 因此，`watchEffect` **只收集到了 `a` 作为它的依赖**，而没有收集到 `b`。

**3. 问题表现**

  * 当用户点击按钮，调用 `toggleB` 函数时，只有 `b.value` 的值发生了改变。
  * 由于 `b` 并没有被 `watchEffect` 所依赖，所以 `watchEffect` 不会重新执行。
  * 这导致了我们看到的现象：无论如何点击按钮，控制台都不会再次打印 "watchEffect 执行了"。

#### 问题根源：依赖收集的原理

`watchEffect` 的工作机制可以总结为：**“你用到了谁，我就监视谁”**。

  * **依赖收集 (Dependency Collection)**：`watchEffect` 在首次执行时，会像一个侦探，记录下它在函数体内部访问（`getter`）过的所有响应式数据源。
  * **触发更新 (Trigger Update)**：只有当这些被记录下来的依赖项发生变化时，`watchEffect` 才会重新执行。
  * 在我们的例子中，由于条件判断的短路，`b` 从未被访问，因此它不在 `watchEffect` 的“监视名单”上。

#### 如何解决？

如果你希望无论条件如何，`watchEffect` 都能被 `a` 或 `b` 的变化所触发，你需要确保它们都被访问到。

**方法一：强制访问**

在 `watchEffect` 内部，显式地读取你希望追踪的每一个变量。

```javascript
watchEffect(() => {
  // 在条件判断前，先访问一下 b.value，强制收集依赖
  b.value; 

  if (a.value || b.value) {
    console.log('watchEffect 执行了，依赖已被收集');
  }
});
```

这样修改后，首次执行时 `b.value` 被读取，`b` 就成功被添加到了依赖列表中。之后再修改 `b` 的值，`watchEffect` 就会正常重新执行。

**方法二：使用 `watch`**

如果你的监听逻辑依赖于复杂的条件，并且希望更明确地控制依赖源，使用 `watch` 会是更好的选择。`watch` 允许你显式地指定要监听的数据源。

```javascript
import { ref, watch } from 'vue';

const a = ref(true);
const b = ref(false);

// 显式指定监听 a 和 b
watch([a, b], ([newA, newB]) => {
  if (newA || newB) {
    console.log('watch 执行了');
  }
});
```

#### 核心要点总结

  * `watchEffect` 会自动收集其在**执行路径**中**实际读取**的响应式依赖。
  * 如果一个响应式变量因为条件判断（如 `if`, `&&`, `||`）而未被读取，它就不会成为依赖。
  * 要确保一个变量被追踪，就必须保证 `watchEffect` 的函数体中存在对该变量的**读取操作**。
  * 对于需要明确指定依赖源或逻辑复杂的场景，使用 `watch` 通常是更稳妥、更清晰的选择。
# Vue 中父组件更新 prop 后立即调用子组件方法，为何获取的是旧值？

## 一、问题场景

1.  **父组件 (App)**

      * 有一个状态 `userId`，初始值为 `1`。
      * 将 `userId` 通过 prop 传递给子组件 `UserInfo`。
      * 有一个更新方法，将 `userId` 修改为 `2`。
      * 在修改 `userId` 后，**立即**调用子组件暴露的 `getUserInfo` 方法。

2.  **子组件 (UserInfo)**

      * 通过 `props`接收 `userId`。
      * 暴露一个方法 `getUserInfo`，该方法会读取并打印 `props.userId` 的值。

**现象**：父组件将 `userId` 更新为 `2` 后，立即调用的 `getUserInfo` 方法打印出的 `userId` 仍然是旧值 `1`。

## 二、核心原因：Vue 的异步更新机制

  - **结论**：Vue 的 DOM 更新是**异步**的。当你在父组件中修改一个响应式数据时，视图（包括子组件的 props）不会立即更新。
  - **深入理解**：Props 对象是在 `render` 函数执行过程中生成的。父组件的数据变更后，会触发一次重新渲染，但这个重新渲染的操作会被 Vue 放入一个异步队列（微任务队列）中，等待当前同步代码执行完毕后再执行。

## 三、执行流程拆解

1.  **初始渲染**

      * 父组件执行 `render` 函数，生成 VNode。
      * VNode 中包含传递给子组件的 props，此时为 `{ userId: 1 }`。
      * 子组件接收 props，并完成挂载。

2.  **更新操作**

      * **步骤 1：修改父组件数据**
          * 父组件将自身的 `userId` 从 `1` 修改为 `2`。
      * **步骤 2：调度异步更新**
          * Vue 侦测到数据变化，计划执行一次更新。
          * **关键**：它并**不立即**执行 `render` 函数来更新 VNode 和子组件的 props，而是将这个更新任务推入微任务队列。
      * **步骤 3：执行同步代码**
          * 父组件的更新逻辑继续**同步**执行，此时调用了子组件的 `getUserInfo` 方法。
      * **步骤 4：获取旧 Prop**
          * 由于更新任务还在队列中，子组件的 `render` 函数还未被重新调用，因此其内部的 `props` 对象依然是旧的 `{ userId: 1 }`。
          * `getUserInfo` 方法读取并打印出 `1`。
      * **步骤 5：执行异步更新**
          * 所有同步代码执行完毕。
          * 事件循环 (Event Loop) 开始处理微任务队列中的更新任务。
          * Vue 执行 `render` 函数，通过 `diff` 算法对比新旧 VNode，发现 `userId` 变为 `2`。
          * Vue 更新子组件的 props，并重新渲染子组件。此时，子组件才真正拿到最新的值 `2`。

## 四、解决方案

### 方案一：使用 `nextTick` (等待下次 DOM 更新)

将调用子组件方法的操作放入 `nextTick` 的回调函数中，确保在 props 更新之后再执行。

```javascript
// 父组件中
import { nextTick } from 'vue';

async function updateUser() {
  userId.value = 2; // 更新数据
  // 等待 DOM 更新循环结束后再执行
  await nextTick();
  // 此刻 props 已更新
  childRef.value.getUserInfo(); // 输出 2
}
```

### 方案二：主动传参

在调用子组件方法时，直接将最新的值作为参数传递过去。

```javascript
// 父组件中
function updateUser() {
  userId.value = 2;
  // 直接把新值传过去
  childRef.value.getUserInfo(userId.value); // 输出 2
}

// 子组件中
function getUserInfo(id) {
  // 使用传入的 id，而不是 props.userId
  console.log('获取到的用户ID是：', id);
}
```

### 方案三：在子组件中使用 `watch` 监听 (推荐)

这是最符合 Vue 设计思想的方式，让子组件自己响应 props 的变化，而不是由父组件命令式地调用。

```javascript
// 子组件中
import { watch } from 'vue';

const props = defineProps(['userId']);

// 监听 props.userId 的变化
watch(() => props.userId, (newValue, oldValue) => {
  console.log(`userId 从 ${oldValue} 变为 ${newValue}`);
  // 在这里执行获取最新用户信息的逻辑
  // ...
}, { immediate: true }); // immediate: true 可在初始渲染时就执行一次
```

**为什么推荐 `watch`？**

  * **解耦**：子组件负责管理自身因 props 变化而产生的行为，逻辑更内聚。
  * **声明式**：代码意图更清晰，明确表达了“当 `userId` 变化时，就去做某件事”。
  * **可靠性**：能稳定地捕获到每一次 props 的变化，避免因调用时机问题导致 bug。
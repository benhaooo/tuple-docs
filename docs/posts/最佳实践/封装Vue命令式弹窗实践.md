# 封装 Vue 命令式弹窗：从原理到实践

这份笔记将带你深入理解如何将一个标准的 Vue 声明式弹窗封装成一个更灵活、更便捷的命令式组件。我们将探讨其背后的原理、遇到的挑战以及最终的解决方案。

## 一、 核心痛点：为什么需要命令式弹窗？

在日常开发中，我们通常这样使用弹窗组件（以 Ant Design Vue 为例）：

```vue
<template>
  <a-button @click="visible = true">打开弹窗</a-button>
  <a-modal v-model:open="visible" title="登录" @ok="handleOk">
    <LoginForm ref="loginFormRef" />
  </a-modal>
</template>

<script setup>
import { ref } from 'vue';

// 1. 控制可见性
const visible = ref(false);
// 2. 获取内部组件实例
const loginFormRef = ref(null);

// 3. 处理确认事件
const handleOk = () => {
  loginFormRef.value?.submit();
};
</script>
```

这种方式的问题在于：
*   **状态冗余**: 每个弹窗都需要在父组件中定义一个 `ref` (如 `visible`) 来控制其显隐。
*   **逻辑分散**: 开关弹窗的逻辑、获取实例的 `ref`、事件回调等散落在父组件的 `script` 中，当一个页面有多个弹窗时，代码会变得非常臃肿和混乱。

## 二、 理想的调用方式：一行代码的优雅

我们期望的调用方式应该像调用一个普通函数一样简单：

```javascript
import { showLoginModal } from './showModal.js';

function handleLoginClick() {
  showLoginModal({
    // 传递给内部表单组件的 props
    props: {
      message: "欢迎登录"
    },
    // 传递给 Modal 组件自身的 props
    modalProps: {
      title: "自定义标题"
    },
    // 事件回调
    onOk: (formInstance) => {
      // 可以在此调用表单内部暴露的方法
      return formInstance.submit(); 
    }
  });
}
```

## 三、 实现步骤与挑战

为了实现上述目标，我们需要动态地创建、渲染和销毁弹窗组件。

### 1. 基本思路：`h` 函数与 `createApp`

我们可以使用 Vue 的 `h` (hyperscript) 渲染函数在 JavaScript 中创建 VNode，然后利用 `createApp` 将其渲染到页面的真实 DOM 中。

```javascript
import { h, createApp } from 'vue';
import { Modal } from 'ant-design-vue';
import YourFormComponent from './YourFormComponent.vue';

function showModal() {
  // 1. 创建一个容器 div
  const container = document.createElement('div');
  document.body.appendChild(container);

  // 2. 使用 h 函数创建 VNode
  const dialogVNode = h(Modal, { /* modal props */ }, {
    default: () => h(YourFormComponent, { /* form props */ })
  });

  // 3. 创建独立的 App 实例并挂载
  const app = createApp({
      render: () => dialogVNode
  });
  app.mount(container);
}
```

很快，我们会遇到第一个问题。

### 2. 挑战一：组件未注册与样式丢失

**问题**：弹窗内的 `a-input`, `a-button` 等组件无法正确渲染。
**原因**：`createApp` 创建了一个全新的、隔离的 Vue 应用实例。它不包含我们在 `main.js` 中通过 `app.use(Antd)` 全局注册的组件和插件。

**解决方案**：将插件注册逻辑抽取成一个独立的函数，在主应用和命令式弹窗的实例中都调用它，以确保环境一致。

```javascript
// src/plugins.js
import Antd from 'ant-design-vue';

export function loadPlugins(app) {
  app.use(Antd);
  // app.use(router);
  // app.use(pinia);
}

// main.js
// ...
loadPlugins(app);

// showModal.js
// ...
const app = createApp(/* ... */);
loadPlugins(app); // 确保新实例也注册了插件
app.mount(container);
```

### 3. 挑战二：弹窗的关闭、动画与销毁

**问题1：无法关闭**。直接在 `onCancel` 回调中调用 `app.unmount()` 会立即销毁组件，导致弹窗的关闭动画丢失。

**问题2：响应式失效**。如果我们尝试用一个 `ref` 来控制弹窗的 `open` 属性，会发现更改 `ref` 的值并不会让弹窗关闭。

```javascript
// 这样是行不通的
const open = ref(true);
const dialogVNode = h(Modal, {
  open: open.value, // 传入的是一个固定的布尔值，不是响应式的
  onCancel: () => {
    open.value = false; // 这里的变更无法被侦测到并触发重渲染
  }
});
```
**原因**：`ref` 的值发生改变时，需要一个响应式作用域 (如 `watchEffect`) 来追踪变化并触发组件的重渲染。我们的函数调用处于一个普通的 JS 环境，缺少这个机制。

**解决方案**：将 VNode 的创建过程包裹在一个函数中，使其成为一个**函数式组件**。函数式组件的执行本身就在一个响应式作用域内。

同时，为了保留动画，我们不能立即卸载组件，而应该在**动画播放完毕后**再执行清理工作。`a-modal` 恰好提供了 `afterClose` 这个完美的钩子。

```javascript
import { h, createApp, ref, reactive } from 'vue';

function showModal() {
  // ...
  const state = reactive({
    open: true,
  });

  const app = createApp({
    // 将 VNode 的创建变成一个 render 函数，形成函数式组件
    render() {
      return h(Modal, {
        open: state.open,
        // 动画结束后销毁应用实例和 DOM
        afterClose: () => {
          app.unmount();
          document.body.removeChild(container);
        },
        onCancel: () => {
          state.open = false; // 现在可以正常工作了
        },
        // ... 其他 props
      });
    }
  });
  // ...
}
```
> **备用方案**：如果组件库没有提供 `afterClose` 钩子，可以使用 `setTimeout` 延迟销毁，时长可以估算为动画的持续时间（如 `300ms`）。

### 4. 挑战三：与内部组件通信（调用`submit`）

**问题**：如何在 `onOk` 回调中调用内部表单组件暴露的 `submit` 方法？
**原因**：我们需要获取到内部组件的实例。

**解决方案**：
1.  **内部组件**：使用 `defineExpose` 暴露方法。
    ```vue
    // LoginForm.vue
    const submit = () => { /* ... */ };
    defineExpose({ submit });
    ```
2.  **命令式函数**：创建一个 `ref`，并将其作为 `ref` prop 传递给内部组件的 VNode。Vue 会自动将组件实例赋值给这个 `ref`。

```javascript
function showModal() {
  const formInstanceRef = ref(null);

  // ...
  const app = createApp({
    render() {
      return h(Modal, {
        onOk: async () => {
          // 通过 .value 访问实例并调用方法
          await formInstanceRef.value?.submit();
          // 提交成功后关闭弹窗
          state.open = false;
        }
      }, {
        default: () => h(YourFormComponent, {
          // 关键：将 ref 传递给 VNode
          ref: formInstanceRef
        })
      });
    }
  });
  // ...
}
```

### 5. 挑战四：处理异步与加载状态

**问题**：表单提交通常是异步的，点击"确定"按钮后应该有 `loading` 状态，并且在提交失败时不应关闭弹窗。

**解决方案**：利用 `a-modal` 的 `confirmLoading` 属性，并结合 `try...finally` 确保 `loading` 状态总是能被正确重置。

```javascript
function showModal() {
  const formInstanceRef = ref(null);
  const state = reactive({
    open: true,
    loading: false, // 1. 添加 loading 状态
  });

  const app = createApp({
    render() {
      return h(Modal, {
        open: state.open,
        confirmLoading: state.loading, // 2. 绑定 loading 状态
        afterClose: () => { /* ... */ },
        onOk: async () => {
          if (!formInstanceRef.value) return;

          try {
            state.loading = true; // 3. 开始时开启 loading
            await formInstanceRef.value.submit(); // 等待异步提交
            state.open = false; // 4. 成功后关闭弹窗
          } catch (error) {
            // 提交失败（如校验不通过），Promise被拒绝，在此捕获
            console.error("提交失败:", error);
          } finally {
            state.loading = false; // 5. 无论成功失败，最后都关闭 loading
          }
        },
        // ...
      });
    }
  });
  // ...
}
```

## 四、 最终封装与 API 设计

为了拥有更好的灵活性，我们可以将关闭、获取实例等能力返回给调用者。

```javascript
// Final showModal.js
import { h, createApp, ref, reactive } from 'vue';
import { Modal } from 'ant-design-vue';
import { loadPlugins } from './plugins';
import YourFormComponent from './YourFormComponent.vue';

export function showCustomModal(options = {}) {
  const { props, modalProps, onOk } = options;
  const container = document.createElement('div');
  document.body.appendChild(container);

  const formInstanceRef = ref(null);
  const state = reactive({
    open: true,
    loading: false,
  });

  const unmount = () => {
    state.open = false;
  };

  const app = createApp({
    render() {
      return h(
        Modal,
        {
          ...modalProps,
          open: state.open,
          confirmLoading: state.loading,
          afterClose: () => {
            app.unmount();
            if (container.parentNode) {
              container.parentNode.removeChild(container);
            }
          },
          onCancel: unmount,
          onOk: async () => {
            try {
              state.loading = true;
              // 将实例作为参数传给 onOk 回调
              await onOk?.(formInstanceRef.value);
              unmount();
            } catch (err) {
              console.error(err);
            } finally {
              state.loading = false;
            }
          },
        },
        {
          default: () => h(YourFormComponent, { ...props, ref: formInstanceRef }),
        }
      );
    },
  });

  loadPlugins(app);
  app.mount(container);

  // 返回关闭句柄和实例 ref
  return {
    unmount,
    instance: formInstanceRef,
  };
}
```

## 五、 调试技巧

当使用 `createApp` 创建命令式弹窗后，在 Vue Devtools 中，你会看到多个 Vue 应用实例。你需要选择新创建的那个 "App" 根节点来检查和调试弹窗内部的组件状态。当弹窗关闭并销毁后，对应的 App 实例会从 Devtools 中消失。 
### Vue 全局 Loading 解决方案：优雅处理并发请求

#### 一、 问题背景：常规方案的局限性

在许多项目中，全局 Loading 是一个非常普遍的需求。一个基础的实现方案通常如下：

1.  **定义一个全局状态**：使用 `ref` 创建一个布尔类型的响应式变量来控制 Loading 的显示和隐藏。

    ```javascript
    // store/loading.js
    import { ref } from 'vue';
    export const isLoading = ref(false);
    ```

2.  **在请求拦截器中控制状态**：在发送请求前，将 `isLoading` 设置为 `true`；请求结束后（无论成功或失败），将其设置为 `false`。

    ```javascript
    // api/axios.js
    import { isLoading } from '@/store/loading';

    // 请求拦截器
    axios.interceptors.request.use(config => {
      isLoading.value = true;
      return config;
    });

    // 响应拦截器
    axios.interceptors.response.use(response => {
      isLoading.value = false;
      return response;
    }, error => {
      isLoading.value = false;
      return Promise.reject(error);
    });
    ```

3.  **在根组件中使用**：将 Loading 组件的显示与 `isLoading` 状态绑定。

    ```vue
    <!-- App.vue -->
    <template>
      <router-view />
      <GlobalLoading v-if="isLoading" />
    </template>
    ```

这个方案在处理单个请求时表现良好。但是，当应用中存在 **并发请求** 时，问题就暴露出来了。

**并发场景下的问题：**

假设页面同时触发了两个 API 请求（请求 A 和 请求 B）。

1.  **请求 A** 开始 -> `isLoading` 变为 `true`，Loading 动画显示。
2.  **请求 B** 开始 -> `isLoading` 仍为 `true`。
3.  **请求 A** (耗时3秒) 先返回 -> `isLoading` 被置为 `false`，Loading 动画 **立即消失**。
4.  **请求 B** (耗时5秒) 仍在处理中。

**结果**：用户看到 Loading 动画在第二个请求还未完成时就提前消失了，这不符合预期。Loading 应该在 **所有** 并发请求都完成后才消失。

---
#### 二、 核心思路：引用计数法

为了解决上述问题，我们不能简单地使用一个布尔值来跟踪状态。正确的思路是 **引用计数（Reference Counting）**。

-   维护一个计数器 `loadingCount`，初始值为 `0`。
-   每当一个请求 **开始** 时，将 `loadingCount` 加 1。
-   每当一个请求 **结束** 时，将 `loadingCount` 减 1。
-   Loading 动画的显示与否，取决于 `loadingCount` 是否大于 `0`。

这样，只有当最后一个请求返回，`loadingCount` 变为 `0` 时，Loading 动画才会消失。

---
#### 三、 技术实现：巧用 `customRef` 封装逻辑

Vue 3 提供的 `customRef` API 非常适合用来封装这种带有计数逻辑的自定义响应式状态。`customRef` 允许我们显式地控制依赖跟踪 (`track`) 和更新触发 (`trigger`)。

下面是使用 `customRef` 实现带引用计数的全局 Loading 状态的代码：

```javascript
// store/loading.js
import { customRef } from 'vue';

const useLoading = () => {
  let loadingCount = 0; // 计数器变量，不直接暴露

  // customRef 接收一个工厂函数
  return customRef((track, trigger) => {
    return {
      // get 访问器：当读取 .value 时触发
      get() {
        track(); // 1. 收集依赖：告诉 Vue 这个值被读取了
        return loadingCount > 0; // 2. 返回计算后的布尔值
      },
      // set 设置器：当写入 .value 时触发
      set(value) {
        // 3. 根据传入的布尔值更新计数器
        if (value) {
          loadingCount++;
        } else {
          loadingCount--;
        }

        // 4. 边界处理：防止计数器变为负数
        if (loadingCount < 0) {
            loadingCount = 0;
        }
        // 更优雅的写法:
        // loadingCount = Math.max(0, loadingCount);

        trigger(); // 5. 触发更新：通知 Vue 状态已改变，需要更新视图
      }
    };
  });
};

export const isLoading = useLoading();
```

**代码解析：**

1.  **`track()`**: 在 `get` 方法中调用。当 `isLoading.value` 被读取时，Vue 会记录下是哪个组件或副作用函数依赖了这个状态。
2.  **`get` 返回值**: 返回的不再是原始值，而是 `loadingCount > 0` 这个动态计算出来的布尔值。这是整个方案的核心。
3.  **`set(value)`**: 当执行 `isLoading.value = true` 或 `isLoading.value = false` 时，`set` 方法被调用。我们在这里不直接存储 `true` 或 `false`，而是用它来控制 `loadingCount` 的增减。
4.  **边界处理**: 如果因为某些原因（例如，响应拦截器被意外执行多次），`loadingCount` 减成了负数，我们需要将其重置为 `0`，以避免逻辑错误。
5.  **`trigger()`**: 在 `set` 方法中调用。当 `loadingCount` 发生变化后，通知所有依赖 `isLoading` 的地方进行更新。

现在，请求拦截器的逻辑保持不变，但其行为已经因为我们自定义的 `ref` 而变得正确了。

---
#### 四、 代码优化

`set` 方法中的 `if/else` 逻辑可以被简化为一行：

```javascript
// ...
set(value) {
  // value 为 true 时加 1，为 false 时加 -1
  loadingCount += value ? 1 : -1;
  loadingCount = Math.max(0, loadingCount); // 边界处理
  trigger();
}
// ...
```
这种写法更简洁，意图也同样清晰。

---
#### 五、 总结

通过使用 Vue 3 的 `customRef`，我们成功地将复杂的 **引用计数** 逻辑封装在一个行为与普通 `ref` 一致的响应式变量中。这不仅解决了并发请求下的全局 Loading 问题，也提供了一个高度可复用且优雅的解决方案，充分体现了组合式 API 的灵活性和强大能力。 
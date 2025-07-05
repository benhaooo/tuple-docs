# Vue `watch` 的隐藏功能：暂停与恢复

## 1\. 核心功能

在 **Vue 3.5** 及以上版本中，`watch` API 新增了**暂停 (pause)** 和**恢复 (resume)** 监听的能力，而不仅仅是完全停止。

## 2\. 使用方法

`watch` 函数的返回值现在是一个对象，可以从中解构出所需的控制函数。

```javascript
import { watch, ref } from 'vue';

const source = ref(0);

// 从 watch 返回值中解构出暂停和恢复函数
const { pause, resume, stop } = watch(source, (newValue) => {
  console.log('watch triggered:', newValue);
});
```

  - **`pause()`**: 暂停 `watch` 回调的触发。
  - **`resume()`**: 恢复 `watch` 的监听，使其能再次被触发。
  - **`stop()`**: 永久停止 `watch` 的监听（与旧版行为一致）。

## 3\. 功能演示流程

1.  **正常监听**: `watch` 正常触发。
2.  **调用 `pause()`**: 在某个特定条件下（例如，数值达到 10），调用 `pause()` 函数。
3.  **暂停阶段**: 此时，即使源数据继续变化，`watch` 的回调函数也不会执行。
4.  **调用 `resume()`**: 在另一个条件下（例如，数值达到 30），调用 `resume()` 函数。
5.  **恢复监听**: `watch` 恢复正常工作，后续的数据变化会再次触发回调。

## 4\. 注意事项与兼容性

  * **向后兼容**:

      * 该功能不会影响原有 `stop` 函数的使用。
      * 你依然可以直接将 `watch` 的返回值作为 `stop` 函数使用，如下所示：
        ```javascript
        // 传统用法，依旧有效
        const stopWatcher = watch(...);
        stopWatcher(); // 调用即停止
        ```
      * 即使解构出了 `pause` 和 `resume`，原有的 `stop` 函数依然可用。

  * **底层实现**:

      * 此功能是基于 `ReactiveEffect` 类实现的，`watch` 因此获得了暂停和恢复的能力。
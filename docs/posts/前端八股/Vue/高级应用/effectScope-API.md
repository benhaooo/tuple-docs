# Vue `effectScope` API 学习笔记

`effectScope` 是 Vue 3.2 中引入的一个高级 API，主要用于集中管理和销毁一组响应式副作用（Reactivity Effects）。虽然在日常业务组件开发中不常用，但它对于封装可重用的组合式函数（Composables）或开发库来说，是一个非常强大的工具。

## 1. 为什么需要 `effectScope`？(问题场景)

假设我们有一个场景，其中包含多个响应式副作用，例如 `watch`、`watchEffect`、`computed` 等。当我们需要在某个时刻（例如组件卸载时）停止所有这些副作用时，传统的做法会比较繁琐。

**示例：手动停止多个副作用**

```javascript
import { ref, watch, watchEffect, effect } from 'vue';

const counter = ref(0);

// 1. 创建了 watchEffect
const stopWatchEffect = watchEffect(() => {
  console.log('watchEffect 触发:', counter.value);
});

// 2. 创建了 watch
const stopWatch = watch(counter, () => {
  console.log('watch 触发');
});

// 3. 创建了 computed
const double = computed(() => {
    console.log('computed 触发');
    return counter.value * 2;
});


// 需要手动收集所有停止函数
const stopHandlers = [stopWatchEffect, stopWatch, double.effect.stop];

function stopAllEffects() {
  console.log('--- 停止所有副作用 ---');
  stopHandlers.forEach(stop => stop());
}

// 在需要的时候调用
// stopAllEffects();
```

**痛点分析：**

*   **手动管理**：需要为每一个副作用单独创建一个变量来接收其 `stop` 函数。
*   **代码繁琐**：随着副作用增多，管理 `stop` 函数的数组会变得越来越长，代码也显得冗余。
*   **容易遗漏**：在复杂的逻辑中，很容易忘记收集某个副作用的停止函数，导致内存泄漏。

## 2. `effectScope` 的基本用法

`effectScope` 提供了一种更优雅、更集中的方式来解决上述问题。

**示例：使用 `effectScope` 重构**

```javascript
import { ref, watch, watchEffect, computed, effectScope } from 'vue';

// 1. 创建一个 effect scope
const scope = effectScope();

const counter = ref(0);
let double;

// 2. 在 scope.run() 的回调函数中定义所有副作用
scope.run(() => {
  watchEffect(() => {
    console.log('watchEffect 触发:', counter.value);
  });

  watch(counter, () => {
    console.log('watch 触发');
  });

  double = computed(() => {
    console.log('computed 触发');
    return counter.value * 2;
  });
});

// 3. 当需要停止时，只需调用 scope.stop()
function stopAllEffects() {
    console.log('--- 停止所有副作用 ---');
    scope.stop();
}

// 在需要的时候调用
// stopAllEffects();
```

**优势：**

*   **自动收集**：`effectScope` 会自动收集在其 `run` 方法中创建的所有副作用。
*   **集中控制**：只需调用一次 `scope.stop()` 即可销毁作用域内所有的副作用，代码非常简洁。
*   **逻辑清晰**：将相关的副作用封装在同一个作用域内，提高了代码的可读性和内聚性。

## 3. 高级特性

### 嵌套作用域

`effectScope` 支持嵌套。默认情况下，当父级作用域被销毁时，所有嵌套的子作用域也会被一并销毁。

```javascript
const parentScope = effectScope();

parentScope.run(() => {
  // 父级作用域的副作用
  watchEffect(() => console.log('父级 Scope', counter.value));

  const childScope = effectScope();
  childScope.run(() => {
    // 子级作用域的副作用
    watchEffect(() => console.log('子级 Scope', counter.value));
  });
});

// 调用 parentScope.stop() 会同时停止父级和子级的 watchEffect
// parentScope.stop();
```

### 分离作用域 (Detached Scope)

如果你希望子作用域不随父作用域的销毁而销毁，可以在创建时传入 `true`，使其成为一个"分离的"作用域。

```javascript
const parentScope = effectScope();

parentScope.run(() => {
  watchEffect(() => console.log('父级 Scope', counter.value));

  // 创建一个分离的子作用域
  const detachedChildScope = effectScope(true /* detached */);
  detachedChildScope.run(() => {
    watchEffect(() => console.log('分离的子级 Scope', counter.value));
  });

  // 如果需要，可以手动停止子作用域
  // detachedChildScope.stop();
});

// 调用 parentScope.stop() 只会停止父级的 watchEffect，
// 分离的子作用域不受影响。
// parentScope.stop();
```

## 4. 工作原理简介

`effectScope` 的工作机制可以概括为以下几个步骤：

1.  **创建实例**：`effectScope()` 创建一个 `EffectScope` 实例。
2.  **激活作用域**：当调用 `scope.run(fn)` 时，Vue 会将当前 `scope` 实例设置为全局的"活动作用域"。
3.  **收集副作用**：在 `fn` 函数执行期间，任何新创建的副作用（如 `watch`, `computed` 等）在内部都会检测到这个"活动作用域"，并将自己注册到该作用域的副作用列表中。
4.  **统一销毁**：当调用 `scope.stop()` 时，`EffectScope` 实例会遍历其内部收集到的所有副作用，并依次执行它们各自的 `stop()` 方法。

## 5. 总结

`effectScope` 是一个为解决特定场景而设计的强大工具。它通过提供一个统一的 API 来管理副作用的生命周期，极大地简化了复杂组合式函数和库的开发。

-   **核心价值**：自动收集和集中销毁副作用。
-   **适用场景**：封装需要进行复杂状态管理的组合式函数（Composables）、插件或库的开发。
-   **日常开发**：在编写普通业务组件时，Vue 组件本身的 `setup` 函数已经隐式地创建了一个 `effectScope`，并在组件卸载时自动销毁，因此我们通常不需要手动使用它。 
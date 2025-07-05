# `v-model` 原理详解

## 一、核心概念：语法糖

`v-model` 本质上是一个**语法糖**（Syntactic Sugar）。无论它作用于原生表单元素还是自定义组件，其底层实现都会被编译器转换为一个**属性绑定**和一个**事件监听**。

  - **属性绑定**：通常是 `value` 属性。
  - **事件监听**：通常是 `input` 事件。

> **关键点**：面试时不能只回答“`v-model` 是 `value` 属性和 `input` 事件的语法糖”，因为这并不完全准确，具体生成的属性和事件会根据作用的元素类型而变化。

## 二、作用于原生表单元素

`v-model` 会根据作用的表单元素类型，智能地编译成最合适的属性和事件组合。

### 1\. 作用于文本框 (`<input type="text">`)

  - **编译结果**：

      - 属性：`value`
      - 事件：`input`

  - **VNode 证据**：
    在编译后的虚拟节点（VNode）中，`v-model` 指令本身意义不大。真正起作用的是它生成的 `data` 对象中的内容：

      - `value` 属性会被绑定为 `v-model` 指向的数据值（例如：`loginId` 的值 'ABC'）。
      - `on` 对象中会注册一个 `input` 事件监听器，当用户输入时，该监听器会触发，从而更新绑定的数据。

    <!-- end list -->

    ```javascript
    // VNode 中与 v-model 相关的部分
    {
      data: {
        // ... 其他属性
        domProps: {
          value: 'ABC' // 属性绑定
        },
        on: {
          input: function($event) { ... } // 事件监听
        }
      }
    }
    ```

### 2\. 作用于复选框 (`<input type="checkbox">`)

  - **编译结果**：

      - 属性：`checked`
      - 事件：`change`

  - **VNode 证据**：
    当 `v-model` 用于复选框时，VNode 中生成的属性不再是 `value`，而是 `checked` (布尔值)；监听的事件也变成了 `change` 事件。这证明了 `v-model` 的智能适配能力。

    ```javascript
    // VNode 中与 v-model 相关的部分
    {
      data: {
        // ... 其他属性
        domProps: {
          checked: true // 属性绑定
        },
        on: {
          change: function($event) { ... } // 事件监听
        }
      }
    }
    ```

### 总结

| 元素/类型         | 生成的属性      | 生成的事件 |
| ----------------- | --------------- | ---------- |
| 文本框、文本域    | `value`         | `input`    |
| 复选框、单选框    | `checked`       | `change`   |
| 下拉选择框        | `value`         | `change`   |

## 三、作用于自定义组件

`v-model` 同样可以作用于自定义组件，实现父子组件之间的双向数据绑定。

### 1\. 默认行为

在自定义组件上使用 `v-model`，例如 `<custom-component v-model="myData"></custom-component>`，等效于：

```vue
<custom-component :value="myData" @input="newData => myData = newData"></custom-component>
```

  - **编译结果**：

      - 向子组件传递一个名为 `value` 的 prop。
      - 在子组件上监听一个名为 `input` 的自定义事件。

  - **子组件实现**：
    为了配合 `v-model`，子组件内部需要：

    1.  通过 `props` 选项接收 `value` 属性。
    2.  在需要更新数据时，通过 `this.$emit('input', newValue)` 触发 `input` 事件，并将新值作为参数传出。

    <!-- end list -->

    ```vue
    // number-component.vue (子组件)
    <template>
      <div>
        <button @click="changeValue(-1)">-</button>
        <span>{{ value }}</span>
        <button @click="changeValue(1)">+</button>
      </div>
    </template>

    <script>
    export default {
      props: {
        value: Number // 1. 接收 value prop
      },
      methods: {
        changeValue(amount) {
          // 2. 抛出 input 事件，将新值传递给父组件
          this.$emit('input', this.value + amount);
        }
      }
    }
    </script>
    ```

### 2\. 自定义行为

默认生成的 `value` 属性和 `input` 事件是可以自定义的。这在某些场景下非常有用，比如一个组件可能需要多个类似 `v-model` 的功能，或者 `value` prop 已被用于其他目的。

  - **如何自定义**：
    在**子组件**中添加 `model` 选项。

      - `prop`: 指定接收父组件值的属性名。
      - `event`: 指定通知父组件更新的事件名。

  - **示例**：
    将默认的 `value`/`input` 修改为 `number`/`change`。

    ```vue
    // number-component.vue (子组件)
    <script>
    export default {
      // 1. 使用 model 选项进行自定义
      model: {
        prop: 'number',  // 属性名改为 'number'
        event: 'change'  // 事件名改为 'change'
      },
      props: {
        number: Number // 2. props 中接收的属性名也要对应修改
      },
      methods: {
        changeValue(amount) {
          // 3. 抛出的事件名也要对应修改
          this.$emit('change', this.number + amount);
        }
      }
    }
    </script>
    ```

    当这样配置后，父组件的 `<number-component v-model="age"></number-component>` 就等效于 `<number-component :number="age" @change="newAge => age = newAge"></number-component>`。
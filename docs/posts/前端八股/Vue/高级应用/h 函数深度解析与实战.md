# Vue `h` 函数深度解析与实战笔记

`h` 函数（`hyperscript` 的简称）是 Vue 中一个非常核心且强大的 API，它允许我们用 JavaScript 的函数式写法来创建虚拟 DOM（VNode）。这在需要高度编程化和动态性的场景下非常有用，例如编写渲染函数、函数式组件、或对组件进行二次封装。

## 一、 `h` 函数基础

### 1. 什么是 `h` 函数?

`h` 函数本质上是 `createVNode` 函数的一个别名。它的核心作用是**创建一个虚拟节点 (VNode)**，这个 VNode 是 Vue 用来描述真实 DOM 结构的对象。

我们可以使用 `<component :is="vnode" />` 将 `h` 函数返回的 VNode 渲染到页面上。

```typescript
// 示例：创建一个简单的 VNode
import { h } from 'vue'

const vnode = h('div', 'hello world')

// 在 template 中使用
// <component :is="vnode" />
```

### 2. 基本语法与参数

`h` 函数通常接收三个参数：`h(type, props, children)`

#### **参数一：`type` (类型)**

-   **类型**: `string | Component | FunctionalComponent | Object`
-   **描述**:
    -   可以是 HTML 标签名字符串，如 `'div'`, `'p'`, `'span'`。
    -   也可以是一个 Vue 组件对象。

#### **参数二：`props` (属性)**

-   **类型**: `Object`
-   **描述**: 一个对象，包含了要传递给节点的属性。
    -   HTML 属性，如 `id`, `class`。
    -   DOM `props`，如 `innerHTML`。
    -   组件 `props`。
    -   事件监听器，以 `on` 开头，如 `onClick`, `onMousedown`。

```typescript
import { h } from 'vue'

// 传递 style 和一个点击事件
const vnode = h(
  'div',
  {
    style: {
      color: 'red'
    },
    onClick: () => console.log('clicked!')
  },
  'hello world'
)
```

#### **参数三：`children` (子节点)**

-   **类型**: `string | Array | Object`
-   **描述**: 定义了节点的子元素。
    -   **字符串**: 表示文本子节点。
    -   **数组**: 包含多个 VNode 的数组，用于渲染列表。
    -   **对象**: 用于传递具名插槽或作用域插槽。

```typescript
// 子节点是数组
h('div', [
  h('span', 'hello world'),
  h('p', '这是一个p标签')
])

// 子节点是插槽对象 (后面会详细讲解)
h(MyComponent, {}, {
  header: () => h('div', 'Header Slot Content'),
  default: () => h('div', 'Default Slot Content')
})
```

### 3. 核心：响应式原理

一个非常关键的问题是：为什么在 `setup` 中直接使用 `ref` 变量，当 `ref` 变化时，视图不会更新？

**错误示例（非响应式）：**

```typescript
import { h, ref } from 'vue'

const message = ref('Initial Message')

// 在 setup 中立即执行 h 函数
const vnode = h('div', message.value)

setTimeout(() => {
  message.value = 'Updated Message' // 页面不会更新
}, 2000)
```

-   **原因**: `h` 函数在 `setup` 执行时被立即调用，此时它只读取了 `message.value` 的初始值。`setup` 函数本身不是一个响应式的 effect 上下文，因此 Vue 的响应式系统**无法追踪**到 `message` 这个依赖。当 `message` 后续变化时，没有任何机制来触发 VNode 的重新创建。

**正确示例（响应式）：**

将 `h` 函数的调用包裹在一个**函数**中。

```typescript
import { h, ref } from 'vue'

const message = ref('Initial Message')

// 将 VNode 的创建过程变成一个函数
const createVNode = () => h('div', message.value)

// 页面会更新！
setTimeout(() => {
  message.value = 'Updated Message'
}, 2000)

// 在 template 中使用 <component :is="createVNode()" />
// 或者直接将函数作为组件传递
const MyComponent = () => h('div', message.value)
// <component :is="MyComponent" />
```

-   **原因**: 当我们将一个**返回 VNode 的函数**传递给 `<component :is="...">` 时，Vue 会将它视为一个**函数式组件**。Vue 的渲染器在执行这个函数来获取 VNode 时，是在一个**响应式 effect** 上下文中执行的。因此，`message` 作为依赖被成功追踪，当它变化时，会触发组件的重新渲染，从而调用该函数重新生成 VNode。

### 4. `h` 与函数式组件

当 `h` 函数被包裹在函数中返回时，这个函数就扮演了**函数式组件**的角色。它可以接收 `props` 和 `context`（包含 `slots`, `emit`, `attrs`）。

```typescript
import { h, FunctionalComponent } from 'vue'

// 1. 定义 props 类型
interface MyComponentProps {
  count: number;
}

// 2. 使用 FunctionalComponent<T> 来获得类型提示
const MyFunctionalComponent: FunctionalComponent<MyComponentProps> = (props, context) => {
  // props 是响应式的，可以直接使用
  // context.slots 用于访问插槽
  // context.emit 用于触发事件

  return h('div', [
    h('div', `Count from props: ${props.count}`),
    // 调用默认插槽并渲染
    context.slots.default ? context.slots.default() : 'Default Content'
  ])
}
```

### 5. 插槽 (Slots) 的处理

#### 具名插槽

通过 `context.slots` 对象，我们可以像调用函数一样调用和渲染特定的插槽。

```typescript
// 函数式组件内
const MyComponent = (props, { slots }) => {
  return h('div', [
    slots.header ? slots.header() : null, // 渲染 header 插槽
    h('div', '--- Container ---'),
    slots.default ? slots.default() : null // 渲染默认插槽
  ])
}
```

#### 作用域插槽

如果插槽需要从组件内部接收数据，可以在调用插槽函数时传递参数。

```typescript
// 函数式组件内
const MyComponent = (props, { slots }) => {
  const scopeData = ref('data from component')
  return h('div', [
    // 将 scopeData 传递给 header 插槽
    slots.header ? slots.header({ data: scopeData.value }) : null
  ])
}

// 在父组件中使用
h(MyComponent, null, {
  // 接收作用域插槽的数据
  header: (scope) => h('div', `Received from component: ${scope.data}`)
})
```

### 6. 组件嵌套与插槽透传

`h` 函数非常适合用于组件的二次封装，它可以轻松地将插槽“透传”给内部的子组件。

```typescript
// 二次封装一个 HelloWorld 组件
import { h } from 'vue'
import HelloWorld from './HelloWorld.vue'

const MyWrapper = (props, { slots, attrs }) => {
  // 将外部传递给 MyWrapper 的所有属性 (attrs) 和插槽 (slots)
  // 直接传递给内部的 HelloWorld 组件
  return h(HelloWorld, attrs, slots)
}
```

### 7. 监听组件事件

与监听原生 DOM 事件类似，你可以通过在 `props` 对象中传递以 `on` 开头的函数来监听子组件通过 `emit` 触发的自定义事件。事件名需要遵循驼峰式命名（e.g., `my-event` 变为 `onMyEvent`）。

```typescript
// ChildComponent.vue
// <script setup>
const emit = defineEmits(['myEvent'])
setTimeout(() => {
  emit('myEvent', 'some data from child')
}, 2000)
// </script>

// Parent using h function
import { h } from 'vue'
import ChildComponent from './ChildComponent.vue'

const vnode = h(ChildComponent, {
  // 监听子组件的 'myEvent' 事件
  onMyEvent: (payload) => {
    console.log('Custom event received!', payload) // "Custom event received! some data from child"
  }
})
```

## 二、 `h` 函数核心使用场景

### 场景一：UI 库的自定义渲染 (e.g., Ant Design Vue Table)

在许多 UI 库中，例如表格的列定义，我们常常需要自定义某一列的渲染逻辑。除了使用模板插槽，`h` 函数提供了一种更编程式、更内聚的写法。

```typescript
import { h } from 'vue'
import { Table } from 'ant-design-vue'

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    // 使用 customRender 定义自定义渲染逻辑
    customRender: ({ text, record, index }) => {
      // text: 当前单元格的值
      // record: 当前行的数据
      // index: 当前行的索引
      return h(
        'a',
        {
          href: `/#/user/${record.id}`,
          onClick: () => console.log('view user:', text)
        },
        `${text} - ${index}`
      )
    }
  },
  // ... other columns
];
```

**对比**:
-   **模板插槽**: 结构清晰，适合复杂的 DOM 结构。
-   **`h` 函数**: 逻辑和视图内聚在 JS 对象中，适合简单的、动态性强的渲染。
-   **JSX**: 语法更接近 HTML，可读性好，也是一个优秀的选择。

三者没有绝对优劣，根据团队习惯和业务复杂度选择即可。

### 场景二：命令式组件调用 (e.g., Dialog, Notification)

有时我们需要通过调用一个函数来打开弹窗或显示通知，而不是在模板中预先写好组件标签。`h` 函数是实现这种模式的核心。

**实现思路**:

1.  创建一个函数（如 `showDialog`）。
2.  函数内部，使用 `h` 函数定义弹窗组件的 VNode。
3.  使用 `createApp` 将 VNode 转换成一个独立的 Vue 应用实例。
4.  动态创建一个 `div` 元素，并将其挂载到 `document.body` 上。
5.  将 Vue 应用实例 `mount` 到这个 `div` 上。
6.  **（关键）** 提供一个销毁函数，在弹窗关闭时，`unmount` 应用实例并从 DOM 中移除 `div`，防止内存泄漏。

```typescript
import { createApp, h } from 'vue'
import MyDialog from './MyDialog.vue'

function showDialog() {
  const hostDiv = document.createElement('div')
  document.body.appendChild(hostDiv)

  const cleanup = () => {
    app.unmount()
    document.body.removeChild(hostDiv)
  }

  const app = createApp({
    render() {
      return h(MyDialog, {
        // ...props
        // 监听关闭事件来执行清理
        onClose: () => cleanup()
      })
    }
  })

  app.mount(hostDiv)
}
```

### 场景三：高阶组件 (HOC) 与二次封装

这是 `h` 函数最能体现其强大编程能力的地方。当我们需要封装一个现有组件，为其增加或修改功能，同时又希望透明地传递所有原始的 `props` 和 `slots` 时，`h` 函数是最佳选择。

如上文 **“组件嵌套与插槽透传”** 部分所示，通过 `h(Component, attrs, slots)` 这种简洁的语法，可以完美实现属性和插槽的透传，这是模板语法难以优雅实现的。这种方式对于创建可复用的、高内聚的组件逻辑非常有用。
# Vue 中 v-for 为何不建议使用 index 作为 key？

## 一、核心问题

在 `v-for` 循环渲染列表时，如果对列表进行 **增/删/排序** 等操作，使用 `index` 作为 `key` 值，可能会导致 **渲染错误、状态混乱** 的问题。

## 二、问题复现

**初始场景**：一个列表，包含 "张三" 和 "李四"，每个列表项后面都有一个输入框。我们分别在输入框中输入 "张三媳妇" 和 "李四媳妇"。

```html
<ul>
  <li v-for="(item, index) in list" :key="???">
    {{ item.name }}
    <input type="text">
  </li>
</ul>
```

**操作**：在列表 **最前面** 添加一项 "老王"。

-----

### 场景一：当 `key = index` (错误情况)

**代码**：

```javascript
// key 绑定的是 index
const list = [{name: '张三'}, {name: '李四'}]
// 在前方插入'老王'
list.unshift({name: '老王'})
```

**表现**：

  * "老王" 后面跟的输入框内容是 "张三媳妇"。
  * "张三" 后面跟的输入框内容是 "李四媳妇"。
  * "李四" 后面跟的输入框是空的 (新建的)。

 **结果**：数据与视图状态完全错乱。

-----

### 场景二：当 `key = item.id` (正确情况)

**代码**：

```javascript
// key 绑定的是唯一的 item.id
const list = [{id: 1, name: '张三'}, {id: 2, name: '李四'}]
// 在前方插入'老王'
list.unshift({id: 3, name: '老王'})
```

**表现**：

  * "老王" 被正确添加，后面是空的输入框。
  * "张三" 和 "李四" 的数据及输入框内容 "张三媳妇"、"李四媳妇" 保持不变。

**结果**：更新行为完全符合预期。

## 三、原理详解：Vue 的 Diff 算法与 Key 的作用

Vue 在更新虚拟 DOM (VNode) 时，会采用一种高效的 **Diff (差异对比) 算法**。`key` 在此过程中扮演着 "身份证" 的角色，帮助 Vue 识别节点是否为同一个，从而决定是 **复用旧节点** 还是 **创建新节点**。

**核心更新规则**：当新旧两个虚拟节点的 `tag` (标签名) 和 `key` 都相同时，Vue 会认为它们是同一个节点，并尝试 **就地复用 (patch)** 旧的 DOM 元素，只更新其变化的内容。

-----

### 情况一：`key` 是唯一 ID (如 `item.id`)

1.  **更新前 (旧节点)**：
      * `<li key="1">张三</li>` (内含输入框 "张三媳妇")
      * `<li key="2">李四</li>` (内含输入框 "李四媳妇")
2.  **更新后 (新节点)**：
      * `<li key="3">老王</li>`
      * `<li key="1">张三</li>`
      * `<li key="2">李四</li>`
3.  **Diff 过程**：
      * **新节点 1 (`key=3`)**：Vue 在旧节点中找不到 `key=3` 的节点，认定为 **全新节点**，于是 **创建** 一个新的 `<li>` 元素。
      * **新节点 2 (`key=1`)**：Vue 在旧节点中找到了 `key=1` 的节点，认定为 **同一节点**，于是 **复用** 该 DOM 元素，仅更新其数据部分 (文本从'张三'更新为'张三')。重要的是，DOM 元素本身及其内部未被 Vue 绑定的状态 (如输入框的值) 得以保留。
      * **新节点 3 (`key=2`)**：同上，复用 `key=2` 的旧节点。

**结论**：通过唯一的 `key`，Vue 精准地识别了哪些节点是新增的，哪些是需要复用的，从而保证了更新的正确性。

-----

### 情况二：`key` 是索引 `index`

1.  **更新前 (旧节点)**：
      * `<li key="0">张三</li>` (内含输入框 "张三媳妇")
      * `<li key="1">李四</li>` (内含输入框 "李四媳妇")
2.  **更新后 (新节点)**：
      * `<li key="0">老王</li>`
      * `<li key="1">张三</li>`
      * `<li key="2">李四</li>`
3.  **Diff 过程**：
      * **新节点 1 (`key=0`, `name=老王`)**：Vue 发现新节点的 `key` 是 `0`，它会去匹配旧节点中 `key=0` 的节点 (即原来的"张三")。因为 `tag` 和 `key` 都相同，Vue 决定 **就地复用**。它将旧的 `<li>` 元素复用，只把文本内容从 "张三" 更新为 "老王"。**但输入框作为该 DOM 元素的子节点被完整保留了下来**，导致 "老王" 后面出现了 "张三媳妇"。
      * **新节点 2 (`key=1`, `name=张三`)**：Vue 匹配到旧节点中 `key=1` 的节点 (即原来的"李四")，再次 **就地复用**。将文本从 "李四" 更新为 "张三"，输入框 "李四媳妇" 被保留。
      * **新节点 3 (`key=2`, `name=李四`)**：Vue 在旧节点中找不到 `key=2` 的节点，认定为 **全新节点**，于是 **创建** 一个新的、干净的 `<li>` 元素。

**结论**：使用 `index` 作为 `key`，当列表顺序发生变化时，Vue 会错误地复用 DOM 节点，只更新数据，而保留了旧 DOM 的状态（如 `input` 的值），造成数据与视图状态不匹配。

## 四、结论与最佳实践

1.  **核心原则**：`key` 必须是 **稳定、唯一** 的值。它应该与数据项一一对应，而不是与它在数组中的位置挂钩。
2.  **禁用场景**：**绝对不要** 在列表的顺序会改变、会进行增删操作时使用 `index` 作为 `key`。
3.  **可用场景**：如果列表是纯粹的静态展示，未来不会有任何顺序变化或增删，那么使用 `index` 作为 `key` 是可以接受的（但仍然不推荐）。
4.  **最佳实践**：始终使用数据本身提供的唯一标识（如 `item.id`、`item.uuid` 等）作为 `key`，这是最安全、最高效的做法。
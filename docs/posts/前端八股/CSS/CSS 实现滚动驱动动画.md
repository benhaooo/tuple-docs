### **CSS 滚动驱动动画：`animation-timeline` 学习笔记**

这是一份关于如何使用纯 CSS 实现滚动驱动动画的学习纪要。其核心是利用 `animation-timeline` 这一强大的新特性，摆脱对 JavaScript 的依赖。

-----

#### **一、核心概念：什么是 `animation-timeline`？**

`animation-timeline` 是一个 CSS 属性，它允许我们将动画的播放进度与某个滚动容器（scroll container）的滚动进度进行关联。简单来说，**当用户滚动页面或某个元素时，我们可以让另一个元素播放动画，且动画的进度完全由滚动距离控制**。

-----

#### **二、实现原理：如何关联滚动与动画？**

实现滚动驱动动画主要涉及两个关键步骤和两个核心 CSS 属性：

1.  **在滚动容器上定义一个“时间线”名称**：

      * 使用 `scroll-timeline-name` 属性。
      * 这个名称可以任意指定，它的作用是作为一个唯一的标识符。
      * **示例**：给名为 `.container` 的滚动元素定义一个时间线。

    <!-- end list -->

    ```css
    .container {
      scroll-timeline-name: --my-scrolling-animation;
      /* 让元素可以滚动 */
      overflow: scroll;
    }
    ```

2.  **在执行动画的元素上应用这个“时间线”**：

      * 使用 `animation-timeline` 属性。
      * 将该属性的值设置为上一步定义的名称。
      * 这样，CSS 就知道这个元素的动画应该由哪个滚动条来控制。
      * **示例**：让 `.square` 元素在 `.container` 滚动时执行 `rotate-animation` 动画。

    <!-- end list -->

    ```css
    .square {
      /* 引用定义好的时间线 */
      animation-timeline: --my-scrolling-animation;
      /* 指定要执行的动画 */
      animation-name: rotate-animation;
    }

    /* 定义一个常规的旋转动画 */
    @keyframes rotate-animation {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    ```

**重点**：`scroll-timeline-name` 和 `animation-timeline` 的值必须**完全对应**，才能建立关联。

-----

#### **三、进阶用法：控制动画的触发区间**

我们不仅能将整个滚动过程与动画关联，还可以精确控制动画在滚动的**某个特定区间**内发生。

  * **实现方式**：通过修改 `@keyframes` 规则中的百分比。

  * **示例**：让动画只在滚动进度达到 20% 时开始，到 50% 时结束。

    ```css
    @keyframes move-animation {
      /* 动画在滚动 20% 之前保持初始状态 */
      from, 20% {
        transform: translateX(0);
      }
      /* 动画在滚动 50% 时达到结束状态 */
      50%, to {
        transform: translateX(100px);
      }
    }
    ```

**效果**：元素在滚动开始时静止不动，当滚动条达到 20% 的位置时开始移动，滚动到 50% 的位置时移动结束，之后即使再滚动，元素也保持在结束状态。

-----

#### **四、关键特性总结**

  * **纯 CSS 实现**：无需任何 JavaScript 代码即可创建复杂的滚动交互动画。
  * **监听任意元素**：不仅可以监听整个页面（`<html>` 或 `<body>`）的滚动，也可以监听任何设置了 `overflow: scroll` 的元素的滚动。
  * **支持多方向**：无论是**垂直滚动**还是**横向滚动**，都可以作为动画的时间线。
  * **精准控制**：可以通过 `@keyframes` 精确定义动画在滚动过程中的触发和结束点。

-----

#### **五、浏览器兼容性**

这是一个非常现代的特性，目前兼容性有限，需要特别注意。

  * **Chrome**：在 **115** 及以上版本才支持。
  * **现状**：目前还未广泛普及，但“**未来可期**”。
  * **未来展望**：随着浏览器支持度的提升，该特性有望在未来替代大量用于实现滚动动画的 JavaScript 代码，简化开发流程。

**建议**：在学习和使用前，可以先在 [MDN Web Docs](https://www.google.com/search?q=https://developer.mozilla.org/zh-CN/docs/Web/CSS/animation-timeline) 等网站上查询最新的兼容性信息。
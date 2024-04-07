# 检测方法
- **引用基数**（有循环引用bug）
- **标记清除**

从js根属性window遍历是否能到达


*闭包不算是内存泄漏，但闭包的数据是不可以被回收的

**检测手段**：浏览器调试工具 performance（性能）
# 内存泄漏场景

- 被全局变量、函数引用，组件销毁时未清除 -->null
- 被全局事件、定时器引用，组件销毁时未清除
- 被自定义事件引用，组件销毁时未清除
```javascript
beforeUnMount(() => {
    if (intervalId) {
        clearInterval(intervalId)
    }
    window.removeEventListener('resize', callback)
    event.off('test', callback)
})
```

# WeakMap WeakSet

- key/成员 只能是引用对象
- 不可以进行forEach()遍历、for-of循环等迭代操作
- 无size属性和方法
- 引用：存储DOM元素、私有变量等

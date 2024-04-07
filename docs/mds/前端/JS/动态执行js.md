## eval
- 同步
- 当前运行作用域
## setTimeout

- 第一个参数可以传入函数，也可以传入代码片段
- 异步
- 全局作用域
## script
```javascript
let script = document.createElement('script');
script.textContent = "console.log('111')";//innerHTML
document.documentElement.append(script);
```

- 同步
- 全局作用域
## Function
```javascript
new Function('console.log(a)')
```

- 同步
- 全局作用域

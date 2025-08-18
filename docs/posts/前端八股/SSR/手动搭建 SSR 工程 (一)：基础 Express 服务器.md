# 手动搭建 SSR 工程 (一)：基础 Express 服务器

## 1\. 目标

搭建一个基础的 `Express` 服务器。作为 SSR 项目的基石，该服务器需要能响应浏览器请求并返回一个 HTML 页面。

## 2\. 初始化项目和安装 Express

### 2.1. 创建项目结构

在项目根目录下创建一个 `src` 文件夹，用于存放所有源代码。

```bash
# 项目结构
.
├── package.json
└── src
```

### 2.2. 安装 Express

使用 npm 安装 `express`。

```bash
npm i express
```

## 3\. 创建基础服务器 (`src/server.js`)

在 `src` 目录下新建 `server.js` 文件。

### 3.1. 编写服务器代码

```javascript
// 1. 导入 express
const express = require('express');

// 2. 创建 express 应用实例
const app = express();

// 4. 定义要响应的 HTML 内容
const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>SSR</title>
  </head>
  <body>
    <div id="root">
      <h1>Hello SSR</h1>
    </div>
  </body>
  </html>
`;

// 5. 监听所有 GET 请求，并返回 HTML 页面
// 使用 '*' 通配符，确保所有路由请求都返回同一个页面，这是单页应用(SPA)的基础
app.get('*', (req, res) => {
  res.send(html);
});

// 3. 监听端口，并启动服务器
app.listen(8080, () => {
  console.log('Server start on http://localhost:8080');
});
```

## 4\. 启动与测试服务器

### 4.1. 启动服务器

在终端中运行以下命令：

```bash
node src/server.js
```

服务器启动成功后，终端会显示：`Server start on http://localhost:8080`。

### 4.2. 测试

打开浏览器，访问 `http://localhost:8080`，页面会显示 "Hello SSR"。查看网页源代码，可以看到服务器返回的完整 HTML 结构。

## 5\. 优化开发体验

### 5.1. 添加 npm 脚本

为了方便启动服务器，在 `package.json` 文件中添加 `scripts` 命令。

```json
// package.json
{
  // ... 其他配置
  "scripts": {
    "dev:start": "node src/server.js"
  },
  // ... 其他配置
}
```

现在，可以使用以下命令启动服务器：

```bash
npm run dev:start
```

### 5.2. 使用 `nodemon` 实现服务器自动重启

**问题**: 修改 `server.js` 代码后，需要手动停止并重启服务器才能生效。

**解决方案**: 使用 `nodemon` 工具来监控文件变化，并自动重启服务器。

1.  **安装 `nodemon`**

    将其安装为开发依赖 (`--save-dev` 或 `-D`)，因为它只在开发阶段需要。

    ```bash
    npm i nodemon -D
    ```

2.  **更新 `package.json` 中的脚本**

    修改 `dev:start` 脚本，使用 `nodemon` 来启动和监控服务。

      - `nodemon`: 启动 `nodemon`。
      - `--watch src`: 指定 `nodemon` 监控 `src` 目录下的所有文件变化。
      - `--exec "node src/server.js"`: 当文件发生变化时，执行 `node src/server.js` 命令来重启服务器。

    <!-- end list -->

    ```json
    // package.json
    {
      // ... 其他配置
      "scripts": {
        "dev:start": "nodemon --watch src --exec \"node src/server.js\""
      },
      // ... 其他配置
    }
    ```

3.  **重新启动服务器**

    运行更新后的脚本：

    ```bash
    npm run dev:start
    ```

    现在，每当你修改并保存 `src` 目录下的任何文件，`nodemon` 都会自动重新启动服务器，让你的代码更改立即生效。
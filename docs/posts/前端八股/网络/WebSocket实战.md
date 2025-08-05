# 使用 WebSocket 和 Socket.IO 构建聊天室

## 一、 WebSocket 基础

### 1\. 概念

WebSocket 是 HTML5 提供的一种在单个 TCP 连接上进行**全双工通信**的协议。它允许服务器主动向客户端推送信息，也允许客户端随时向服务器发送信息。

  - **与 HTTP 的区别**：HTTP 是单向的请求-响应模式，而 WebSocket 建立连接后，客户端和服务器地位平等，可以随时向对方发送数据。
  - **握手阶段**：WebSocket 连接的建立需要一个“握手”过程。这个过程通过一个普通的 HTTP GET 请求完成，请求头中包含特定字段（如 `Upgrade: websocket`, `Connection: Upgrade`）来告知服务器希望升级协议。服务器若同意，会返回状态码 `101 Switching Protocols`。

### 2\. 原生 WebSocket API

浏览器提供了 `WebSocket` 构造函数来创建一个 WebSocket 实例，这个过程就在发起握手。

```javascript
// 1. 建立连接（发起握手）
// ws:// 或 wss:// (加密)
const ws = new WebSocket('ws://localhost:9527');
```

#### a. WebSocket 实例的事件

连接过程是异步的，需要通过监听事件来获知连接状态和接收数据。

  - **`onopen`**: 连接成功建立后触发，只触发一次。

    ```javascript
    ws.onopen = function() {
      console.log('成功连接到服务器');
    };
    ```

  - **`onmessage`**: 当客户端收到服务器发来的消息时触发，可以触发多次。

    ```javascript
    ws.onmessage = function(e) {
      // e.data 包含了服务器发送的数据（可以是文本或二进制）
      console.log('收到服务器消息:', e.data);
    };
    ```

  - **`onclose`**: 当连接关闭时触发（无论由哪一方关闭）。

    ```javascript
    ws.onclose = function() {
      console.log('连接已关闭');
    };
    ```

#### b. WebSocket 实例的方法

  - **`send(data)`**: 向服务器发送数据。

    ```javascript
    // 在连接成功后，可以随时发送消息
    ws.send('你好，服务器！');
    ```

    > **注意**：`send` 方法是异步的，它只负责把消息发出去，本身不会返回服务器的响应。服务器的响应需要通过 `onmessage` 事件来接收。

  - **`close()`**: 主动关闭连接。

    ```javascript
    ws.close();
    ```

#### c. WebSocket 实例的属性

  - **`readyState`**: 返回当前连接的状态。
      - `0` (CONNECTING): 正在连接中。
      - `1` (OPEN): 已经连接成功，可以进行通信。
      - `2` (CLOSING): 正在关闭中。
      - `3` (CLOSED): 已经关闭。

### 3\. 原生 API 的局限性

原生 WebSocket API 虽然功能齐全，但在复杂应用（如一个页面既有聊天，又有实时行情）中会遇到问题：所有类型的消息都通过唯一的 `onmessage` 事件接收，客户端难以区分收到的数据究竟是什么。

```javascript
// 收到消息 "['张三', '李四']"
// 收到消息 "{ "user": "王五", "content": "大家好" }"
// 收到消息 "101.5"
// 收到消息 "['张三', '李四', '赵六']"

ws.onmessage = function(e) {
  // 如何在这里区分这是用户列表、聊天消息还是K线价格？
  // 非常混乱！
  const data = e.data;
  // 需要复杂的逻辑来解析和分发消息
}
```

虽然可以通过约定 JSON 格式（如 `{ type: 'chat', data: ... }`）来解决，但这增加了复杂性。

-----

## 二、 Socket.IO

Socket.IO 是一个非常流行的 WebSocket 库，它封装了原生 API，提供了一套更强大、更易用的事件驱动模型来解决上述问题。

### 1.核心思想：事件驱动

Socket.IO 的核心是将不同类型的消息归类到不同的**事件**中。客户端和服务器通过\*\*监听（on）**和**触发（emit）\*\*自定义事件来进行通信，使得消息处理逻辑非常清晰。

  - **监听事件 (`on`)**: 相当于注册一个回调函数，当收到特定事件的消息时执行。这是**接收**消息。
  - **触发事件 (`emit`)**: 主动发送一个消息，并为其指定一个事件名。这是**发送**消息。

> **双方地位平等**：客户端和服务器都可以既监听对方的事件，也向对方触发事件。

### 2\. 使用 Socket.IO

> **重要前提**：由于 Socket.IO 内部有自己独特的消息格式，因此**客户端和服务器必须同时使用 Socket.IO 库**才能正常通信。

#### a. 安装与引入

可以通过 CDN 或 npm 包管理器来使用。

**CDN:**

```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
```

**NPM:**

```bash
npm install socket.io-client
```

```javascript
import { io } from "socket.io-client";
```

#### b. 客户端 API

1.  **初始化连接**
    `io()` 函数用于创建连接，它返回一个 `socket` 实例。

    ```javascript
    // io 对象由引入的脚本提供
    // 连接到指定的服务器地址
    const socket = io('ws://localhost:9527');
    ```

2.  **监听事件 (`socket.on`)**
    根据与服务器约定好的事件名，监听来自服务器的消息。

    ```javascript
    // 假设与服务器约定了 'update-user' 事件，用于接收更新后的用户列表
    socket.on('update-user', (userList) => {
      console.log('聊天室成员已更新:', userList);
      // 在这里更新你的UI...
    });

    // 假设约定了 'new-chat-message' 事件，用于接收新的聊天消息
    socket.on('new-chat-message', (message) => {
      console.log('收到新消息:', message);
      // 在这里将新消息添加到聊天窗口...
    });
    ```

3.  **触发事件 (`socket.emit`)**
    向服务器发送消息，并指定事件名。

    ```javascript
    // 假设约定了 'send-chat-message' 事件，用于发送聊天消息
    // 第二个参数是要发送的数据
    socket.emit('send-chat-message', {
      text: '大家好，我是新来的！',
      timestamp: Date.now()
    });
    ```

4.  **断开连接 (`socket.disconnect`)**
    主动断开与服务器的连接。

    ```javascript
    socket.disconnect();
    ```

#### c. 注意事项

  - **内置事件**：Socket.IO有一些内置的事件名，如 `connect`, `disconnect`, `error`。我们应避免使用这些名称来定义自己的业务事件。
  - **事件命名**：为了避免冲突，建议为自定义事件名加上统一的前缀，例如 `chat:message` 或 `$message`。
  - **浏览器兼容**：Socket.IO 的一大优势是，如果检测到浏览器不支持 WebSocket，它会自动降级使用**长轮询 (long-polling)** 等技术来模拟实时通信，而开发者无需修改任何代码。

-----

## 三、 实战：Vue + Socket.IO 实现聊天室

### 1\. 项目搭建

1.  **创建 Vue 项目**：`vue create chat-room`
2.  **安装 Socket.IO 客户端**: `npm install socket.io-client`
3.  **准备UI组件**：一个聊天窗口组件 (`ChatWindow.vue`)，它接收数据（props）并派发事件（emit），本身不处理网络逻辑。
      - **Props**:
          - `me` (String): 当前用户的昵称。
          - `users` (Array): 聊天室在线用户列表。
          - `history` (Array): 历史聊天记录。
      - **Events**:
          - `@chat` (Function): 当用户在输入框回车发送消息时触发，并回传消息内容。

### 2\. 核心逻辑实现

在父组件（如 `App.vue`）中，我们处理所有的 Socket.IO 通信。

```vue
<template>
  <div id="app">
    <ChatWindow
      :me="me"
      :users="users"
      :history="history"
      @chat="handleChat"
    />
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import ChatWindow from './components/ChatWindow.vue';

export default {
  components: { ChatWindow },
  data() {
    return {
      socket: null, // 用于保存 socket 实例
      me: '',       // 我的昵称
      users: [],    // 用户列表
      history: [],  // 聊天记录
    };
  },
  created() {
    // 1. 组件创建时，建立 WebSocket 连接
    this.socket = io('ws://localhost:9527'); // 替换为你的服务器地址

    // 2. 监听服务器触发的各种事件
    this.listenServerEvents();
  },
  beforeDestroy() {
    // 3. 组件销毁前，断开连接，释放资源
    if (this.socket) {
      this.socket.disconnect();
    }
  },
  methods: {
    listenServerEvents() {
      // 监听服务器分配的用户名
      this.socket.on('name', (name) => {
        this.me = name;
      });

      // 监听用户列表更新
      this.socket.on('update-user', (users) => {
        this.users = users;
      });

      // 监听历史消息记录
      this.socket.on('history', (history) => {
        this.history = history;
      });
      
      // 监听其他人发送的新消息
      this.socket.on('message', (msg) => {
        this.history.push(msg);
      });
    },

    // 4. 处理UI组件派发的事件，向服务器发送消息
    handleChat(content) {
      // 触发 'message' 事件，将消息内容发送给服务器
      this.socket.emit('message', content);
      
      // 为了即时显示，也可以将自己的消息立即添加到历史记录
      // （服务器之后也会推送，但可能会有延迟）
      const myMessage = {
          name: this.me,
          content: content,
          time: new Date().toLocaleTimeString()
      }
      this.history.push(myMessage);
    },
  },
};
</script>
```

### 3\. 逻辑解析

1.  **连接与断开**：在 `created` 钩子中建立连接，在 `beforeDestroy` 钩子中断开连接，这是管理网络连接生命周期的标准做法。
2.  **数据流（服务器 -\> 客户端）**：通过 `socket.on` 监听服务器的事件 (`name`, `update-user`, `history`, `message`)，拿到数据后更新 `data` 中的相应属性 (`me`, `users`, `history`)。由于 Vue 的响应式系统，UI会自动更新。
3.  **数据流（客户端 -\> 服务器）**：通过 `@chat` 监听子组件的发送行为，在 `handleChat` 方法中使用 `socket.emit` 将用户的输入内容发送给服务器。
4.  **服务器的智能**：客户端发送消息时，只需要发送内容即可。服务器可以根据该消息是从哪个 TCP 通道（socket 连接）传来的，来判断是哪个用户发送的，无需客户端额外传递用户信息。
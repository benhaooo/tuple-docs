# Axios 请求封装与统一错误处理笔记

## 一、 封装背景与核心痛点

1.  **代码冗余**：在每个 API 请求后，都需要手动编写 `if/else` 来判断业务状态码 (`code === 0` 为成功)，导致逻辑重复。
2.  **逻辑分散**：Token 过期处理、权限验证等通用逻辑散落在各个业务组件中，难以维护。
3.  **数据结构层级深**：每次成功后都需要通过 `.data.data` 的方式才能获取到真正的核心数据。

**目标**：通过 `axios` 拦截器，实现请求的统一处理，让业务代码只关注核心逻辑。
- **成功**：直接在 `.then()` 中获取核心数据。
- **失败**：直接在 `.catch()` 中捕获错误。

---

## 二、 核心解决方案：Axios 拦截器

Axios 拦截器分为 **请求拦截器 (Request Interceptor)** 和 **响应拦截器 (Response Interceptor)**。

### 1. 请求拦截器 (Request Interceptor)

主要用于在请求发送前进行预处理。

-   **统一注入 Token**：
    -   从本地存储（如 `localStorage`）获取 Token。
    -   如果 Token 存在，则将其统一添加到请求头 `headers` 的 `Authorization` 字段中。
    -   前后端需约定好 `Key` 的名称和 `Value` 的格式（如是否需要 `Bearer ` 前缀）。
-   **无 Token 处理**：
    -   如果请求需要 Token 但本地不存在，可直接中断请求，并执行退出登录操作，跳转到登录页。

```javascript
// 请求拦截器
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    // 根据后端要求，添加到请求头
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // 如果没有token，可以取消请求或重定向到登录页
    // logout(); 
    // return Promise.reject(new Error('No token'));
  }
  return config;
}, error => {
  // 对请求错误做些什么
  return Promise.reject(error);
});
```

### 2. 响应拦截器 (Response Interceptor)

是本次封装的核心，用于对服务端的响应进行统一处理。

#### 2.1 统一处理业务状态码

-   **获取响应数据**：从 `response.data` 中解构出业务状态码 `code` 和数据 `data`。
-   **成功处理 (`code === 0`)**：
    -   请求成功，直接 `return response.data.data`，将核心业务数据返回给 `.then()`。
    -   这样业务组件中拿到的就是简化后的数据，无需再 `.data.data`。
-   **失败处理 (`code !== 0`)**：
    -   请求失败，通过 `return Promise.reject(new Error(message))` 将请求拒绝掉，后续逻辑将直接进入 `.catch()`。

#### 2.2 优雅地处理各类错误码

**重点**：必须严格区分 **业务状态码** 和 **HTTP 状态码**，它们处理的层次和位置不同。

-   **业务状态码 (Business Status Code)**
    -   **定义**：前后端约定好的，用于表示具体业务逻辑状态的码，如 `10` 代表 Token 过期，`100` 代表无权限。
    -   **处理方式**：在响应拦截器的 **成功回调** (`onFulfilled`) 中，根据 `response.data.code` 进行判断。
    -   **优化**：将错误码和对应的处理函数（如提示信息、退出登录）维护成一个 `Map` 或对象，使逻辑更清晰、易扩展。

    ```javascript
    // 业务错误码处理映射
    const businessErrorCodeMap = {
      10: (msg) => {
        // ElMessage.error(msg || 'Token已过期，请重新登录');
        // logout();
      },
      100: (msg) => {
        // ElMessage.error(msg || '您没有该操作权限');
      }
    };
    
    // 在响应拦截器中使用
    if (code !== 0) {
      const handler = businessErrorCodeMap[code];
      if (handler) {
        handler(response.data.message); // 使用后端返回的 message
      }
      return Promise.reject(response.data);
    }
    ```

-   **HTTP 状态码 (HTTP Status Code)**
    -   **定义**：由 HTTP 协议定义的标准状态码，如 `404 Not Found`, `500 Internal Server Error`, `403 Forbidden`。
    -   **处理方式**：在响应拦截器的 **失败回调** (`onRejected`) 中，通过 `error.response.status` 获取并处理。
    -   **注意**：**不要** 将业务状态（如 Token 过期）与 HTTP 状态码（如 `401` 或 `403`）混用，以免造成混乱。业务逻辑问题应由业务状态码处理。

    ```javascript
    // HTTP 状态码处理
    axios.interceptors.response.use(
      response => { /* ...业务状态码处理... */ },
      error => {
        if (error.response) {
          const status = error.response.status;
          switch (status) {
            case 404:
              // ElMessage.error('接口不存在');
              break;
            case 500:
              // ElMessage.error('服务器错误');
              break;
            // ... 其他 HTTP 错误处理
          }
        }
        return Promise.reject(error);
      }
    );
    ```

#### 2.3 处理特殊响应类型（如文件下载）

-   **问题**：下载文件时，响应体通常是二进制数据流（`Blob`），不包含 `code`, `data` 等字段。
-   **解决方案**：在处理响应数据前，先判断其类型。如果是 `Blob` 类型，则直接返回整个 `response.data`，不走业务状态码判断逻辑。

```javascript
// 在响应拦截器成功回调的开头
if (response.data instanceof Blob) {
  return response; // 或 return response.data，取决于业务需要
}

// ...后续是处理 JSON 数据的逻辑
const { code, data, message } = response.data;
```

---

## 三、 最终效果

经过封装后，业务组件中的 API 调用代码变得极其简洁和清晰。

```javascript
// 封装前
api.getData().then(res => {
  if (res.data.code === 0) {
    // 成功逻辑
    const list = res.data.data;
    // ...
  } else if (res.data.code === 10) {
    // Token 过期逻辑
    logout();
  } else {
    // 其他错误
    Message.error(res.data.message);
  }
});

// 封装后
api.getData()
  .then(data => {
    // 成功逻辑，data 已是核心数据
    const list = data;
    // ...
  })
  .catch(error => {
    // 失败逻辑，所有业务和HTTP错误都在此捕获
    // 错误提示已在拦截器中统一处理，这里可进行额外操作
    console.error('请求失败:', error);
  });
```
# 深入理解 Cookie

## 一、为什么需要 Cookie？—— HTTP 的无状态性

HTTP 协议是\*\*无状态（Stateless）\*\*的。这意味着服务器无法知道两次连续的请求是否来自同一个客户端。

  - **生活中的比喻**：去银行办业务，每次与柜员交互，都需要重新验证你的身份（账号密码），银行不会因为你“刚刚来过”就记住你。
  - **Web 中的问题**：
    1.  用户使用账号密码登录。服务器验证成功。
    2.  连接断开。
    3.  用户再次请求一个需要权限的接口（如：添加管理员）。
    4.  服务器不知道这个请求者是谁，因为它不记得“刚刚登录成功”的那个用户。

**解决方案**：每次请求都携带账号密码？理论上可行，但极其繁琐且不安全。

**更好的方案**：**认证不认人**。服务器在用户成功登录后，发给客户端一个**凭证（证件）**。客户端保存这个凭证，并在后续的每一次请求中都带上它。服务器通过验证这个凭证来确认用户的身份和权限。

## 二、Cookie 是什么？

在 `localStorage` (HTML5) 出现之前，浏览器端用于保存这个“凭证”的主要机制就是 **Cookie**。

Cookie 就像一个**智能卡包**，它具备以下特点：

  - **存放多个凭证**：可以为不同的网站（如百度、淘宝）存放各自的凭证。
  - **自动出示凭证**：访问百度时，会自动带上百度颁发的凭证。
  - **正确出示凭证**：访问麦当劳时，不会错误地出示肯德基的凭证。
  - **管理凭证有效期**：凭证会过期，到期后会自动作废。

> **定义**：卡包里的每一张卡片，就称为一个 **cookie**。它本质上是服务器保存在浏览器上的一小块数据，浏览器会在后续请求中将其发送回同一个服务器。

我们可以在浏览器开发者工具中查看网站颁发的 Cookie：

## 三、Cookie 的内部结构

每个 Cookie（每张卡片）包含以下核心信息：

| 属性 | 说明 | 示例 |
| :--- | :--- | :--- |
| **`Name=Value`** | **键值对**，这是 Cookie 的核心。 | `userID=12345` |
| **`Domain`** | **域**，指定了此 Cookie 属于哪个网站。 | `Domain=.example.com` |
| **`Path`** | **路径**，指定了此 Cookie 在网站下的哪个路径生效。 | `Path=/` |
| **`Expires/Max-Age`** | **过期时间**，定义了 Cookie 的生命周期。 | `Expires=Wed, 21 Oct 2026 07:28:00 GMT` |
| **`Secure`** | **安全标志**，规定此 Cookie 只能通过 HTTPS 协议传输。 | `Secure` |
| **`HttpOnly`** | **HttpOnly 标志**，规定此 Cookie 不能被客户端脚本 (JavaScript) 访问。 | `HttpOnly` |

-----

## 四、Cookie 的发送：如何自动出示凭证

当浏览器向服务器发起请求时，它会自动检查“卡包”中的所有 Cookie，并将**同时满足以下所有条件**的 Cookie 附加到请求头（`Request Header`）中发送给服务器。

### 匹配规则

1.  **未过期**：Cookie 必须在其 `Expires` 或 `Max-Age` 定义的有效期内。
2.  **域（Domain）匹配**：
      * 请求的域名必须是 Cookie 的 `Domain` 或其子域名。
      * 例如，`Domain=.baidu.com` 的 Cookie 会在请求 `www.baidu.com`、`tieba.baidu.com` 和 `baidu.com` 时被发送。
      * 例如，`Domain=www.baidu.com` 的 Cookie **不会**在请求 `tieba.baidu.com` 时被发送，但会在请求 `www.baidu.com` 时发送。
3.  **路径（Path）匹配**：
      * 请求的路径必须是 Cookie 的 `Path` 或其子路径。
      * 例如，`Path=/` 的 Cookie 会在请求该域名下**所有路径**（如 `/news`, `/admin/login`）时被发送。
      * 例如，`Path=/news` 的 Cookie 会在请求 `/news` 和 `/news/sports` 时被发送，但**不会**在请求 `/images` 时发送。
4.  **安全（Secure）匹配**：
      * 如果 Cookie 设置了 `Secure` 标志，那么它只会在 **HTTPS** 请求中被发送。

### 发送格式

满足条件的多个 Cookie 会被组合成一个 `Cookie` 请求头字段，每个键值对之间用分号和空格（` ;  `）隔开。

```http
GET /index.html HTTP/1.1
Host: www.example.com
Cookie: name1=value1; name2=value2; name3=value3
```

-----

## 五、Cookie 的来源：如何获得凭证

Cookie 有两种来源：

### 1\. 服务器端响应（最主要来源）

服务器通过在 HTTP 响应头（`Response Header`）中添加 `Set-Cookie` 字段来创建和发送 Cookie 给浏览器。

```http
HTTP/1.1 200 OK
Content-Type: text/html
Set-Cookie: token=a_very_long_encrypted_string; Max-Age=3600; Path=/; HttpOnly
Set-Cookie: theme=dark; Path=/
```

  - **`Set-Cookie` 语法**：`Set-Cookie: <name>=<value>[; Expires=<date>][; Max-Age=<seconds>][; Domain=<domain>][; Path=<path>][; Secure][; HttpOnly]`
  - **参数说明**：
      - `Expires`：设置一个**绝对**过期时间（GMT 格式）。
      - `Max-Age`：设置一个从当前时间开始的**相对**秒数作为有效期。
      - **`Expires` 和 `Max-Age` 同时存在时，`Max-Age` 优先。**
      - 如果两者都**未设置**，该 Cookie 成为**会话 Cookie (Session Cookie)**，在浏览器关闭时失效。
      - `Domain` 和 `Path` 如不设置，默认使用当前请求的域名和路径。
      - `HttpOnly`：一个重要的安全设置，防止 XSS 攻击盗取 Cookie。设置后，该 Cookie 对客户端 JavaScript `document.cookie` 不可见。

### 2\. 客户端脚本设置

客户端可以通过 JavaScript 直接操作 `document.cookie` 来创建、修改和读取（非 `HttpOnly`）的 Cookie。

#### 创建和修改 Cookie

```javascript
// 创建一个简单的会话 cookie
document.cookie = "username=JohnDoe";

// 创建一个带过期时间和路径的 cookie (有效期为 1 小时)
document.cookie = "city=Shanghai; max-age=3600; path=/";

// 修改 cookie 的值（通过覆盖）
document.cookie = "username=JaneDoe";
```

#### 读取 Cookie

读取 `document.cookie` 会返回一个字符串，包含所有当前页面可访问的 Cookie。需要手动解析。

```javascript
// 返回格式："username=JaneDoe; city=Shanghai"
let allCookies = document.cookie;
console.log(allCookies);
```

-----

## 六、Cookie 的删除

要删除一个 Cookie，本质上是设置一个已过期的 Cookie 来覆盖它。

#### 1\. 服务器端删除

服务器发送一个与待删除 Cookie 的 `Name`, `Domain`, `Path` 完全相同的 `Set-Cookie` 响应头，并将其 `Expires` 设为过去的时间或 `Max-Age` 设为负数。

```http
Set-Cookie: token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/
// 或者
Set-Cookie: token=; Max-Age=-1; Path=/
```

#### 2\. 客户端删除

通过 JavaScript 设置 `max-age=-1`。

```javascript
// 确保 path 与要删除的 cookie 一致
document.cookie = "username=; max-age=-1; path=/";
```

> **注意**：修改或删除 Cookie 时，必须确保其 `Domain` 和 `Path` 与原始 Cookie 完全匹配，否则你会创建一个新的同名但作用域不同的 Cookie，而不是操作旧的那个。

## 七、总结与面试要点

1.  **为什么需要 Cookie？**

      * 因为 HTTP 协议是无状态的，Cookie 用于在客户端存储状态信息（如身份凭证），以实现会话跟踪。

2.  **Cookie 的登录流程**

    1.  **客户端**：发送账号密码请求登录。
    2.  **服务器**：验证成功后，在响应头中通过 `Set-Cookie` 发送一个包含加密身份信息的凭证（如 `token`）。
    3.  **客户端**：浏览器自动存储此 Cookie。
    4.  **后续请求**：浏览器自动携带此 Cookie 访问同域名的其他页面。
    5.  **服务器**：读取请求中的 Cookie，验证凭证，确认用户身份并授权操作。

3.  **核心面试题**：

      * **场景题**：给定多个 Cookie（包含各自的 `Domain`, `Path`, `Secure` 等属性），再给出一个请求的 URL，问哪些 Cookie 会被发送？（考察对匹配规则的理解）。
      * **`localStorage`, `sessionStorage`, `Cookie` 的区别？**
      * **什么是 `HttpOnly`？有什么用？** (防止 XSS 攻击)。
      * **什么是 `Secure` 属性？** (保证 Cookie 只在 HTTPS 下传输)。
      * **如何删除一个 Cookie？** (设置过期时间为过去)。

---

### 八、Cookie vs. Web Storage (localStorage & sessionStorage)

这三者都用于在浏览器端（客户端）存储数据，但它们之间存在显著差异，这也是常见的前端面试题。

#### 1. `localStorage` 与 `sessionStorage`

这两者的核心区别仅在于**数据的生命周期**：
-   **`sessionStorage`**：**会话级存储**。数据仅在当前浏览器窗口的会话期间有效，一旦窗口或标签页关闭，数据就会被清除。
-   **`localStorage`**：**持久化存储**。除非用户手动清除浏览器缓存或通过代码删除，否则数据将永久保存在客户端。

#### 2. Cookie 与 Web Storage 的详细对比

| 特性 | Cookie | Web Storage (`localStorage` / `sessionStorage`) |
| :--- | :--- | :--- |
| **与服务器通信** | 浏览器会在每次请求时**自动**将符合条件的 Cookie 附加到请求头中发送给服务器，即使是不需要这些数据的请求（如请求图片、CSS），增加了不必要的流量。 | 数据不会自动发送给服务器，需要通过 **JavaScript 代码手动**读取并添加到请求中（例如，放在请求体或自定义请求头里）。 |
| **浏览器行为** | **有默认行为**。浏览器会自动处理服务器响应头中的 `Set-Cookie` 字段来保存 Cookie，并在请求时自动发送。这对于非 Ajax 的页面跳转场景非常方便。 | **无任何默认行为**。所有数据的读取、保存、发送都必须由前端开发者手动编写 JavaScript 代码完成，这给予了开发者更高的控制权。 |
| **大小限制** | 非常小，单个域名下的 Cookie 总大小通常限制在 **4KB** 左右。 | 容量大得多，通常在 **5MB - 10MB** 之间（各浏览器实现不同）。 |
| **作用域** | 与 **域（Domain）** 和 **路径（Path）** 强关联。不同的路径下可以有同名的 Cookie。 | 只与 **域（Origin）** 关联，同一域名下的所有页面共享同一个 `localStorage` 和 `sessionStorage`。没有路径限制。 |
| **安全性** | 由于其自动发送的特性，容易受到 **CSRF（跨站请求伪造）** 攻击。虽然后续增加了 `HttpOnly`, `Secure`, `SameSite` 等属性来增强安全性，但历史包袱较重。 | 由于需要手动操作，可以有效避免 CSRF 攻击。开发者可以精确控制何时以及如何发送数据。 |
| **API** | 通过 `document.cookie` 操作，API 比较原始，需要手动解析字符串，不方便使用。 `HttpOnly` 属性可禁止 JS 访问。 | 提供了简洁的 API：`setItem()`, `getItem()`, `removeItem()`, `clear()`。 |
| **兼容性** | **兼容性极好**，所有浏览器都支持，甚至包括非常古老的版本。 | **HTML5** 新增的特性，在现代浏览器中普遍支持，但不支持老旧浏览器（约 2014 年之前）。 |

---

### 九、实战中如何选择？

在实际开发中，选择哪种存储方式通常取决于**后端 API 的设计**。

1.  **后端使用 `Set-Cookie` 响应头**
    * 如果后端在用户登录成功后，通过响应头 `Set-Cookie: token=...` 来下发凭证。
    * **前端什么都不用做**。浏览器会自动保存这个 Cookie，并在后续请求中自动携带它。这是最传统也最省事的方式。

2.  **后端在响应体或自定义响应头中返回凭证**
    * 如果后端将凭证（如 `token`）放在响应体（JSON 数据）或一个自定义的响应头（如 `Authorization`）中返回。
    * **前端需要手动处理**。在 Ajax 请求的回调函数中：
        * 使用 JavaScript 获取到这个 `token`。
        * 调用 `localStorage.setItem('token', ...)` 将其保存到 `localStorage` 中。
        * 在后续的请求中，再手动从 `localStorage` 中读出 `token`，并添加到请求头中（如 `headers: { 'Authorization': 'Bearer ' + token }`）。
    * 这种方式在现代前后端分离的项目中更为常见，因为它提供了更好的安全性和灵活性。
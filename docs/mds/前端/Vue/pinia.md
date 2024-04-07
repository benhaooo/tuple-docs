## 状态持久化
`npm i pinia-plugin-persistedstate`
```javascript
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
```
![image.png](https://cdn.nlark.com/yuque/0/2024/png/22602718/1711701253110-80b49492-b826-4019-95a9-ae67a667fb12.png#averageHue=%23bfab6c&clientId=u2377ecf7-c765-4&from=paste&height=157&id=uca0168c2&originHeight=314&originWidth=698&originalType=binary&ratio=2&rotation=0&showTitle=false&size=24081&status=done&style=none&taskId=uac2c01be-73b9-4a83-9678-2f1b0ca63eb&title=&width=349)

## 用户登录
#### 区分登录和非登录状态
```vue
<div v-if="userStore.userInfo.token"></div>
```

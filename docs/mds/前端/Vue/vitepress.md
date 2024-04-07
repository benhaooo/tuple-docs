[VitePress | Vite & Vue Powered Static Site Generator](https://vitepress.dev/zh/)
# 
追加内容样式
可以直接在md文件编写html标签也可以编写样式，若使用tailwindcss需要安装插件
# 自动生成侧边栏
```javascript
import path from 'path'
import fs from 'fs'

// 定义文件根目录
const DIR_PATH = path.resolve()
// 定义白名单，过滤掉不是文章的文件和文件夹
const WHITE_LIST = ['index.md', '.vitepress', 'node_modules', 'package-lock.json', 'package.json']

const isDirectory = (path) => fs.lstatSync(path).isDirectory()


const intersections = (arr1, arr2) => Array.from(new Set(arr1.filter((item) => !new Set(arr2).has(item))))

function getList(params, path1, pathname) {
  const res = [];
  for (let file of params) {
    const dir = path.join(path1, file); // 拼接完整路径
    const isDir = isDirectory(dir); // 判断是否为文件夹
    if (isDir) {
      // 如果是文件夹，则递归调用getList构建子菜单
      const files = fs.readdirSync(dir);
      res.push({
        text: file,
        collapsible: true,
        items: getList(files, dir, `${pathname}/${file}`), 
      });
    } else {
      // 如果是文件且扩展名为.md，则添加到菜单列表中
      const name = path.basename(file, '.md'); // 去掉扩展名获取文件名
      const suffix = path.extname(file); // 获取文件扩展名
      if (suffix !== '.md') continue; // 如果不是.md文件，则跳过
      res.push({
        text: name,
        link: `${pathname}/${name}.html`, // 构建链接
      });
    }
  }
  return res;
}

export const set_sidebar = (pathname) => {
  const dirPath = path.join(DIR_PATH, pathname); // 拼接完整路径
  const files = fs.readdirSync(dirPath); // 读取目录下的文件和文件夹
  const items = intersections(files, WHITE_LIST); // 过滤掉白名单中的文件和文件夹
  let relativePath = pathname.replace(/^docs\/?/, ''); // 移除docs前缀，得到相对路径
  if (relativePath.startsWith('/')) {
    relativePath = relativePath.substring(1); // 移除开头的斜杠
  }
  // 调用getList构建侧边栏菜单并返回
  return getList(items, dirPath, `/${relativePath}`);
}
```
使用：


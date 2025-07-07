// @ts-nocheck
import { defineConfig } from 'vitepress'
import { withMermaid } from "vitepress-plugin-mermaid";
import * as fs from 'fs'
import * as path from 'path'

// 约定式配置
const { nav, sidebar } = generateNavAndSidebar()

// 生成缺失的index.md文件
generateMissingIndexFiles()

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  title: "为下个 offer 充电的前端er 🔋",
  description: "主攻：前端八股｜最佳实践｜AI",
  
  buildEnd: () => {
    // 构建结束时再次检查并生成index.md文件，确保所有页面都有index
    generateMissingIndexFiles()
  },
  
  themeConfig: {
    nav,
    sidebar,
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/benhaooo' }
    ],

    search: {
      provider: 'local'
    }
  }
}))

/**
 * 生成缺失的index.md文件
 */
function generateMissingIndexFiles() {
  const docsPath = path.resolve('docs')
  const postsDir = path.join(docsPath, 'posts')
  
  if (!fs.existsSync(postsDir)) {
    return
  }
  
  // 扫描所有分类目录和子目录
  scanAndGenerateIndex(postsDir)
}

/**
 * 递归扫描目录并生成缺失的index.md文件
 */
function scanAndGenerateIndex(dirPath, depth = 0) {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
    const dirName = path.basename(dirPath)
    const indexPath = path.join(dirPath, 'index.md')
    
    // 收集目录信息用于生成index.md
    const subDirs = []
    const mdFiles = []
    
    // 先收集信息
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name)
      
      if (file.isDirectory()) {
        subDirs.push({
          name: file.name,
          path: `./${file.name}/`
        })
        
        // 递归处理子目录
        scanAndGenerateIndex(fullPath, depth + 1)
      } else if (file.isFile() && (file.name.endsWith('.md') || file.name.endsWith('.mdx')) && file.name !== 'index.md') {
        mdFiles.push({
          name: file.name.replace(/\.mdx?$/, ''),
          path: `./${file.name.replace(/\.mdx?$/, '')}`
        })
      }
    }
    
    // 无论是否存在index.md，都重新生成
    generateIndexContent(indexPath, dirName, subDirs, mdFiles)
  } catch (error) {
    console.error(`扫描目录 ${dirPath} 出错:`, error)
  }
}

/**
 * 生成index.md文件内容
 */
function generateIndexContent(indexPath, dirName, subDirs, mdFiles) {
  try {
    // 为不同类型的目录选择合适的emoji
    const categoryEmojis = {
      'AI探索': '🤖',
      '最佳实践': '⭐',
      '前端八股': '📚',
      'CSS': '🎨',
      'HTML': '📄',
      'JavaScript': '⚡',
      'TypeScript': '📘',
      'React': '⚛️',
      'Vue': '🟢',
      'Node.js': '🟩',
      '浏览器': '🌐',
      '网络': '🌍',
      '设计模式': '📐',
      '数据结构与算法': '🧮',
      '性能优化': '⚡',
      '构建工具': '🔧',
      '软技能与项目经验': '🤝',
      'Promise': '🔄',
      '响应式核心': '📲',
      '组件基础': '🧩',
      '高级应用': '🚀',
      '框架原理': '⚙️',
      '场景': '🎭',
      'tools': '🛠️',
      'prompt': '💬'
    }
    
    // 获取当前目录的emoji，如果没有预设则使用默认emoji
    const dirEmoji = categoryEmojis[dirName] || '📁'
    
    // 生成标题
    let content = `# ${dirEmoji} ${dirName}\n\n`
    
    // 添加友好的介绍
    content += `欢迎来到 **${dirName}** 章节！这里汇集了相关的内容和资源。\n\n`
    
    // 添加分割线
    content += `---\n\n`
    
    // 添加子目录链接
    if (subDirs.length > 0) {
      content += `## 📂 子目录\n\n`
      
      for (const subDir of subDirs) {
        // 获取子目录的emoji，如果没有预设则使用默认emoji
        const subDirEmoji = categoryEmojis[subDir.name] || '📁'
        content += `- ${subDirEmoji} [**${subDir.name}**](${subDir.path})\n`
      }
      
      content += '\n'
    }
    
    // 添加文件链接
    if (mdFiles.length > 0) {
      content += `## 📝 文章\n\n`
      
      // 添加文章列表描述
      content += `以下是本章节的所有文章：\n\n`
      
      // 使用不同的emoji来增加视觉多样性
      const fileEmojis = ['📄', '📃', '📑', '📜', '📰', '📋']
      
      for (let i = 0; i < mdFiles.length; i++) {
        const file = mdFiles[i]
        const emojiIndex = i % fileEmojis.length
        content += `- ${fileEmojis[emojiIndex]} [**${file.name}**](${file.path})\n`
      }
    }
    
    // 如果既没有子目录也没有文件，添加默认内容
    if (subDirs.length === 0 && mdFiles.length === 0) {
      content += `## 🚧 敬请期待\n\n`
      content += `这个目录下暂时没有内容，我们正在努力创建相关资源！\n\n`
      content += `![建设中](https://cdn.pixabay.com/photo/2017/06/16/07/26/under-construction-2408062_960_720.png)\n`
    }
    
    // 添加页脚
    content += `\n---\n\n`
    content += `> 🔍 没找到你需要的内容？可以通过搜索功能查找或[联系我们](https://github.com/benhaooo)提出建议！\n`
    
    // 写入文件
    fs.writeFileSync(indexPath, content, 'utf-8')
    console.log(`已生成 index.md: ${indexPath}`)
  } catch (error) {
    console.error(`生成 index.md 出错 ${indexPath}:`, error)
  }
}

/**
 * 生成导航和侧边栏配置
 */
function generateNavAndSidebar() {
  const docsPath = path.resolve('docs')
  const postsDir = path.join(docsPath, 'posts')
  const defaultNav = [
    { text: '首页', link: '/' },
    { text: 'AI 工具', link: 'http://ai.tech-tuple.top', target: '_blank' }
  ]
  const defaultSidebar = {}

  if (!fs.existsSync(postsDir)) {
    return { nav: defaultNav, sidebar: defaultSidebar };
  }
  
  try {
    const categories = fs.readdirSync(postsDir).filter(
      dir => fs.statSync(path.join(postsDir, dir)).isDirectory()
    )
    
    const nav = [...defaultNav]
    const sidebar = {}
    
    for (const category of categories) {
      const categoryPath = `/posts/${category}/`
      const categoryDir = path.join(postsDir, category)
      
      // --- Nav Generation (Dynamic) ---
      const subDirs = fs.readdirSync(categoryDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());

      if (subDirs.length > 0) {
        // If there are subdirectories, create a dropdown menu
        const menuItems = subDirs.map(subDir => ({
          text: subDir.name,
          link: `${categoryPath}${subDir.name}/`
        }));
        nav.push({
          text: category,
          items: menuItems
        });
      } else {
        // If there are no subdirectories, create a direct link
        nav.push({
          text: category,
          link: categoryPath
        });
      }
      
      // --- Sidebar Generation ---
      // 1. Generate sidebar for the top-level category
      const topLevelItems = []
      scanDirectory(categoryDir, categoryPath, topLevelItems)
      sidebar[categoryPath] = [{ text: category, items: topLevelItems }]

      // 2. Generate specific sidebars for each subdirectory
      for (const subDir of subDirs) {
        const subDirPath = `${categoryPath}${subDir.name}/`;
        const subDirFullPath = path.join(categoryDir, subDir.name);

        const subDirItems = [];
        scanDirectory(subDirFullPath, subDirPath, subDirItems);
        
        if (subDirItems.length > 0 || fs.existsSync(path.join(subDirFullPath, 'index.md'))) {
            sidebar[subDirPath] = [{
                text: subDir.name,
                items: subDirItems
            }];
        }
      }
    }
    
    return { nav, sidebar }
  } catch (error) {
    console.error('生成配置出错:', error)
    return { nav: defaultNav, sidebar: defaultSidebar }
  }
}

/**
 * 递归扫描目录以生成侧边栏项目
 */
function scanDirectory(dir, basePath, items) {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    // 优先处理子目录
    for (const file of files) {
      if (file.isDirectory()) {
        const subDirFullPath = path.join(dir, file.name);
        const subDirPath = `${basePath}${file.name}/`;
        const subDirItems = [];
        scanDirectory(subDirFullPath, subDirPath, subDirItems);
        
        if (subDirItems.length > 0) {
          items.push({
            text: file.name,
            collapsed: false,
            items: subDirItems,
          });
        } else if (fs.existsSync(path.join(subDirFullPath, 'index.md'))) {
          items.push({
            text: file.name,
            link: subDirPath,
          });
        }
      }
    }

    // 然后处理当前目录下的 Markdown 文件
    for (const file of files) {
      if (file.isFile() && (file.name.endsWith('.md') || file.name.endsWith('.mdx')) && file.name !== 'index.md') {
        const filePath = path.join(dir, file.name);
        const title = file.name.replace(/\.mdx?$/, '');
        const linkPath = `${basePath}${file.name.replace(/\.mdx?$/, '')}`;
        
        items.push({
          text: title,
          link: linkPath,
        });
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dir} 出错:`, error);
  }
}

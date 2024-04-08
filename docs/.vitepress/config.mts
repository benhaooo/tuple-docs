import { defineConfig } from 'vitepress'
import { set_sidebar } from './gen_sidebar.mjs'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/tuple-docs/",
  head: [["link", { rel: "icon", href: "/tuple-docs/assets/喜欢.svg" }]],
  title: "Tuple 的文档站",
  description: "我来求索、我来赋值、我来塑造数字世界。我以程序织就算法经纬，春播灵感，秋收创新，静候脉络之树硕果累累",
  
  themeConfig: {
    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonText: "搜索文档",
            buttonAriaLabel: "搜索文档",
          },
          modal: {
            noResultsText: "无法找到相关结果",
            resetButtonTitle: "清除查询条件",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },
    logo: "/assets/喜欢.svg",
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      {
        text: '前端',
        items: [
          { text: 'Vue', link: '/mds/前端/Vue/组合式函数' },
          { text: 'JS', link: '/mds/前端/JS/动态执行js' },
          { text: '最佳实践', link: '/mds/前端/最佳实践/导航栏' }
        ]
      },
      { text: '后端', link: '/markdown-examples' },
      { text: 'DevOps', link: '/markdown-examples' },

    ],

    outlineTitle: "目录",
    outline: [2, 6],

    sidebar: {
      '/mds/前端/Vue': set_sidebar('docs/mds/前端/Vue'),
      '/mds/前端/JS': set_sidebar('docs/mds/前端/JS'),
      '/mds/前端/最佳实践': set_sidebar('docs/mds/前端/最佳实践'),

      // 'mds/前端/Vue': [
      //   { text: 'pinia', link: '/mds/前端/Vue/pinia' },
      //   { text: '组合式函数', link: 'docs/mds/前端/Vue/组合式函数' }
      // ],
      // 'mds/前端/JS': [
      //   { text: '动态执行js', link: '/mds/前端/JS/动态执行js' },
      //   { text: '手动触发事件', link: '/mds/前端/JS/手动触发事件' },
      //   { text: 'GC', link: '/mds/前端/JS/GC' },
      // ]
    },





    socialLinks: [
      { icon: 'github', link: 'https://github.com/benhaooo' }
    ]
  }
})
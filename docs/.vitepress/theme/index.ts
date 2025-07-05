// 导入默认主题
import DefaultTheme from 'vitepress/theme'
// 导入自定义样式
import './style.css'
// 导入自定义布局组件
import Layout from './Layout.vue'

// 扩展默认主题
export default {
  ...DefaultTheme,
  // 使用自定义布局组件覆盖默认布局
  Layout
} 
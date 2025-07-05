<script setup lang="ts">
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { nextTick, provide } from 'vue'

const { isDark } = useData()

// 判断浏览器是否支持 View Transitions API
const enableTransitions = () =>
  'startViewTransition' in document &&
  window.matchMedia('(prefers-reduced-motion: no-preference)').matches

// 提供主题切换函数给默认主题使用
provide('toggle-appearance', async ({ clientX: x, clientY: y }: MouseEvent) => {
  // 如果浏览器不支持 View Transitions API，则直接切换主题
  if (!enableTransitions()) {
    isDark.value = !isDark.value
    return
  }

  // 计算从点击位置到视口最远角的距离作为最终半径
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  )

  // 在动画开始前获取当前主题状态
  const isCurrentlyDark = isDark.value

  // 使用 View Transitions API 启动过渡
  const transition = document.startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  })

  await transition.ready

  // 定义正向和反向的剪切路径(从小圆到大圆，或从大圆到小圆)
  const expandingCircle = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${endRadius}px at ${x}px ${y}px)`
  ]
  const contractingCircle = [
    `circle(${endRadius}px at ${x}px ${y}px)`,
    `circle(0px at ${x}px ${y}px)`
  ]

  // 如果当前是暗色模式切换到亮色模式，使用扩散效果
  // 如果当前是亮色模式切换到暗色模式，使用收缩效果
  const clipPath = isCurrentlyDark ? expandingCircle : contractingCircle

  document.documentElement.animate(
    { clipPath },
    {
      duration: 500,
      easing: 'ease-in',
      // 正确选择伪元素：切换到暗色模式时使用new，切换到亮色模式时使用old
      pseudoElement: `::view-transition-${isCurrentlyDark ? 'new' : 'old'}(root)`
    }
  )
})
</script>

<template>
  <DefaultTheme.Layout />
</template>

<style>
/* 禁用默认的淡入淡出动画 */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
}

/* 确保混合模式正确，避免在动画过程中出现颜色闪烁 */
::view-transition-new(root) {
  mix-blend-mode: normal;
}

::view-transition-old(root),
.dark::view-transition-new(root) {
  z-index: 1;
}

::view-transition-new(root),
.dark::view-transition-old(root) {
  z-index: 9999;
}

/* 禁用主题切换按钮内部的默认动画，只保留我们的圆形扩散动画 */
.VPSwitchAppearance {
  width: 22px !important;
}

.VPSwitchAppearance .check {
  transform: none !important;
}
</style> 
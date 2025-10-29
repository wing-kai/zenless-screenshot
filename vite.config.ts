import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production'
    ? '/zenless-screenshot/' // 替换为你的GitHub仓库名称
    : '/',
  plugins: [
    vue(),
    vueJsx(),
    UnoCSS({
      rules: [
        ['hidden', { display: 'none' }]
      ]
    })
  ],
  // 配置打包后的目录
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3213
  }
})

import { defineStore } from "pinia";

export enum ThemeMode {
  System = 'system',
  Light = 'Light',
  Dark = 'Dark'
}

/** 可选语言 */
export enum AvailableLanguage {
  SimplifiedChinese = 'zh-CN',
  Japanese = 'ja-JP'
}

/** 偏好设置 */
const usePreferenceStore = defineStore('preferenceStore', {
  state() {
    return {
      themeMode: ThemeMode.System,
      locale: null as AvailableLanguage | null
    }
  },
  actions: {
    /** 暗黑模式是否激活中 */
    isDarkThemeActivated() {
      const mqList = window.matchMedia('(prefers-color-scheme: dark)')
      if (this.themeMode === ThemeMode.Dark) {
        return true
      }

      if ((this.themeMode === ThemeMode.System) && mqList.matches) {
        return true
      }

      return false
    },
    /** 切换主题 */
    switchThemeMode() {
      if (this.themeMode === ThemeMode.System) {
        this.themeMode = ThemeMode.Light
      } else if (this.themeMode === ThemeMode.Light) {
        this.themeMode = ThemeMode.Dark
      } else {
        this.themeMode = ThemeMode.System
      }
    }
  },
  persist: true
})

export default usePreferenceStore
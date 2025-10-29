import { createI18n } from 'vue-i18n'

import zhCN from './locales/zh-CN.json'
import jaJP from './locales/ja-JP.json'

const SupportedLocales = ['zh-CN', 'ja-JP', 'zh', 'ja'] as String[];
const FallbackLocale = 'zh-CN';

/**
 * 获取浏览器首选语言，并尝试匹配应用支持的语言
 * @returns {string} 匹配到的语言代码
 */
export function getBrowserLocale(): string {
  const browserLocales =
    navigator.languages === undefined
      ? [navigator.language]
      : navigator.languages;

  // 1. 尝试匹配语言代码的前缀 (例如 'en-US' 匹配 'en')
  for (const browserLocale of browserLocales) {
    const langCode = browserLocale.split('-')[0];
    if (SupportedLocales.includes(langCode || FallbackLocale)) {
      return langCode || FallbackLocale;
    }
  }

  // 2. 尝试精确匹配 (例如 'en-US' 匹配 'en-US')
  for (const browserLocale of browserLocales) {
    if (SupportedLocales.includes(browserLocale)) {
      return browserLocale;
    }
  }

  // 3. 如果都没有匹配到，返回备用语言
  return FallbackLocale;
}

// Type-define 'zh-CN' as the master schema for the resource
type MessageSchema = typeof zhCN

const i18n = createI18n<[MessageSchema], 'zh-CN' | 'ja-JP' | 'zh' | 'ja'>({
  locale: getBrowserLocale(),
  // 调试的时候可以打开以下注释
  // locale: 'ja-JP',
  fallbackLocale: 'zh-CN',
  legacy: false,
  globalInjection: true,
  messages: {
    'zh-CN': zhCN,
    'ja-JP': jaJP,
    'zh': zhCN,
    'ja': jaJP
  }
})

export default i18n
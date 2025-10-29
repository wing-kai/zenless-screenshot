import 'virtual:uno.css'

import { createApp } from 'vue'

import pinia from './store';
import App from './app.tsx'
import i18n from './i18n';

const app = createApp(App)

app.use(i18n)
app.use(pinia)

;(async () => {
  const naive = (await import('naive-ui')).default
  app.use(naive)

  app.mount(document.getElementById('app') as HTMLElement)
})();
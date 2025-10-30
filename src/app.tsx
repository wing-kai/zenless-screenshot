import { type GlobalTheme, darkTheme, lightTheme } from "naive-ui";
import { defineComponent, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { defineStore } from "pinia";
import jszip from 'jszip'
import { getBrowserLocale } from "./i18n";
import usePreferenceStore, { AvailableLanguage, ThemeMode } from "./store/preference";

const useLocaleSettingHook = () => {
  const preferencesStore = usePreferenceStore()
  const i18n = useI18n()

  const onClickSetLocale = (locale: AvailableLanguage) => () => {
    if (preferencesStore.locale === locale) {
      preferencesStore.locale = null
      i18n.locale.value = getBrowserLocale()
      return
    }

    preferencesStore.locale = locale
    i18n.locale.value = locale
  }

  const languageList = ref([
    { label: 'language.zh_cn', value: AvailableLanguage.SimplifiedChinese },
    { label: 'language.ja_jp', value: AvailableLanguage.Japanese }
  ])

  return {
    languageList,
    onClickSetLocale
  }
}

const Setting = defineComponent({
  setup() {
    const preferencesStore = usePreferenceStore()
    const themeSetting = usePreferenceStore()
    const { t } = useI18n()
    const { onClickSetLocale, languageList } = useLocaleSettingHook()

    return () => (
      <div class="flex flex-col">
        <n-button onClick={themeSetting.switchThemeMode}>
          {
            themeSetting.themeMode === ThemeMode.Light ? t('theme.light') : themeSetting.themeMode === ThemeMode.Dark ? t('theme.dark') : t('theme.system')
          }
        </n-button>
        <n-divider></n-divider>
        <div class="flex gap-4">
          {
            languageList.value.map(lang => (
              <n-button
                key={lang.value}
                type={lang.value === preferencesStore.locale ? 'primary' : 'default'}
                onClick={onClickSetLocale(lang.value)}
              >{lang.label.startsWith('language.') ? t(lang.label) : lang.label}</n-button>
            ))
          }
        </div>
      </div>
    )
  }
})

const DEFAULT_BACKGROUND_COLOR = '#222222'
const DEFAULT_RENDER_COUNT = 5

/** 根据传入的数字，输出指定长度的数组 */
const getArray = (length: number) => {
  const arr = []
  for (let i = 0; i < length; i++) {
    arr.push(i)
  }
  return arr
}

class FileObject {
  readonly originFile: File
  readonly id: string

  readonly image: HTMLImageElement
  public backgroundColor: string = DEFAULT_BACKGROUND_COLOR
  public renderCount: number = DEFAULT_RENDER_COUNT

  constructor(file: File) {
    this.id = uuidv4()
    this.originFile = file
    this.image = new Image()
    this.image.src = URL.createObjectURL(file)
  }

  drawContext(ctx: CanvasRenderingContext2D) {
    // clearContext
    ctx.clearRect(0, 0, this.image.width, this.image.height)

    // drawBackgroundRect
    ctx.fillStyle = this.backgroundColor
    ctx.fillRect(0, 0, this.image.width, this.image.height)

    getArray(this.renderCount).forEach(() => {
      // drawImage
      ctx.drawImage(this.image, 0, 0, this.image.width, this.image.height)
    })
  }

  async getFile() {
    // 先将图片绘制到canvas，然后下载该文件
    const canvas = document.createElement('canvas')
    canvas.width = this.image.width
    canvas.height = this.image.height

    const ctx = canvas.getContext('2d')!
    this.drawContext(ctx)

    // 获取 blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject()
          return
        }

        resolve(blob)
      })
    })

    return new File([blob], 'fix_' + this.originFile.name, { type: 'image/png' })
  }
}

/**
 * 获取随机uuid字符串
 * @returns {string} uuid 字符串
 */
export const uuidv4 = (): string => {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (+c ^ (window!.crypto!.getRandomValues(new Uint8Array(1))![0]! & (15 >> (+c / 4)))).toString(16)
  )
}

const useFileStore = defineStore('file', {
  state() {
    return {
      files: [] as FileObject[],
      fileNameSet: new Set<string>()
    }
  },
  actions: {
    /** 添加多个文件 */
    addFiles(files: File[]) {
      files.forEach(file => {
        if (this.fileNameSet.has(file.name)) {
          return
        }

        this.fileNameSet.add(file.name)
        this.files.push(new FileObject(file))
      })
    },
    /** 删除单个文件 */
    deleteFile(index: number) {
      this.fileNameSet.delete(this.files[index]!.originFile.name)
      this.files.splice(index, 1)
    },
    /** 清空文件 */
    clearFiles() {
      this.files = []
      this.fileNameSet.clear()
    }
  }
})

const usePreviewDialogStore = defineStore('preview-dialog', {
  state() {
    return {
      show: false,
      file: null as FileObject | null,
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      /** 图片叠加渲染数 */
      renderCount: DEFAULT_RENDER_COUNT
    }
  },
  actions: {
    showDialog(file: FileObject) {
      this.file = file
      this.show = true
    }
  }
})

const App = defineComponent({
  setup() {
    const { t } = useI18n()

    const fileStore = useFileStore()

    const inputRef = ref<HTMLInputElement>()
    const onClickUploadButton = () => {
      inputRef.value!.value = ''
      inputRef.value!.click()
    }
    const onInputChange = (e: Event) => {
      // 获取文件并添加到 fileStore
      const files = (e.target as HTMLInputElement).files
      if (!files) return
      fileStore.addFiles(Array.from(files))
    }

    const onClickClearAllFiles = () => {
      fileStore.clearFiles()
    }

    const downloading = ref(false)
    const onClickDownloadAllFiles = async () => {
      downloading.value = true

      try {
        const zip = new jszip()

        const files = await Promise.all(fileStore.files.map(file => file.getFile()))
        files.forEach(file => {
          zip.file(file.name, file)
        })

        const blob = await zip.generateAsync({ type: 'blob' })

        const anchor = document.createElement('a')
        anchor.href = URL.createObjectURL(blob)
        anchor.download = 'fix_images_archive.zip'
        anchor.click()

        URL.revokeObjectURL(anchor.href)
      } finally {
        setTimeout(() => {
          downloading.value = false
        }, 1000)
      }
    }

    const previewDialogStore = usePreviewDialogStore()
    watch(() => previewDialogStore.backgroundColor, (value) => {
      fileStore.files.forEach(file => {
        file.backgroundColor = value
      })
    })
    watch(() => previewDialogStore.renderCount, (value) => {
      fileStore.files.forEach(file => {
        file.renderCount = value
      })
    })

    const onClickPreviewOneFile = (index: number) => () => {
      previewDialogStore.showDialog(fileStore.files[index]!)
    }
    const onClickDeleteOneFile = (index: number) => () => {
      fileStore.deleteFile(index)
    }
    const onClickDownloadOneFile = (index: number) => async () => {
      const file = await fileStore.files[index]!.getFile()
      const anchor = document.createElement('a')
      anchor.href = URL.createObjectURL(file)
      anchor.download = file.name
      anchor.click()
    }

    return () => (
      <>
        <n-layout class="w-100dvw h-100dvh" has-sider bordered={true}>
          <n-layout-sider bordered={true}
            class="border-l-1 border-gray-300"
            content-class="flex flex-col p-4 gap-4"
          >
            <n-button onClick={onClickUploadButton}>{t('button.add_image')}</n-button>
            <input
              ref={inputRef} onChange={onInputChange}
              type="file" style="display:none;" accept="image/png" multiple
            />
            <n-button onClick={onClickClearAllFiles}>{t('button.clear_image')}</n-button>
            <n-button
              onClick={onClickDownloadAllFiles} loading={downloading.value}
              disabled={downloading.value || fileStore.files.length === 0}
            >{t('button.download_all')}</n-button>
            <n-divider class="m-0!"></n-divider>
            <n-h3 class="m-0!">{t('label.background_color')}</n-h3>
            <n-color-picker v-model:value={previewDialogStore.backgroundColor} modes={['hex']}></n-color-picker>
            <n-h3 class="m-0!">{t('label.render_count')}</n-h3>
            <n-input-number v-model:value={previewDialogStore.renderCount} min={1} max={30}></n-input-number>
            <n-h3 class="m-0! mt-auto!">{t('label.theme_mode')}</n-h3>
            <n-divider class="m-0!"></n-divider>
            <Setting />
            <n-divider class="m-0!"></n-divider>
            <iframe
              title="ghbtns"
              class="ghbtns"
              src="https://ghbtns.com/github-btn.html?user=wing-kai&amp;repo=zenless-screenshot&amp;type=star&amp;count=true"
              frameborder="0"
              scrolling="0"
              width="80px"
              height="20px"
            />
          </n-layout-sider>
          <n-layout content-class="flex flex-col">
            <n-layout-content content-class="p-4" bordered={true}>
              {
                fileStore.files.length ? (
                  <n-grid class="gap-4!" cols="2 840:3 1300:4">
                    {
                      fileStore.files.map((file, index) => (
                        <n-grid-item key={file.id}>
                          <n-card content-class="flex flex-col p-2! gap-2">
                            <div class="w-full">
                              <n-ellipsis>
                                <n-text strong style="user-select:none;">{file.originFile.name}</n-text>
                              </n-ellipsis>
                            </div>
                            <svg class="w-full" viewBox="0 0 160 90">
                              <rect x="0" y="0" width="160" height="90" fill={previewDialogStore.backgroundColor}></rect>
                              {
                                getArray(file.renderCount).map(() => (
                                  <image
                                    width="100%" height="100%"
                                    preserveAspectRatio="xMidYMid meet"
                                    xlinkHref={file.image.src}
                                  />
                                ))
                              }
                            </svg>
                            <div class="flex gap-2">
                              <n-button size="small" type="info" onClick={onClickPreviewOneFile(index)}>{t('button.preview')}</n-button>
                              <n-button size="small" type="success" onClick={onClickDownloadOneFile(index)}>{t('button.download')}</n-button>
                              <n-button size="small" class="ms-auto" type="error" onClick={onClickDeleteOneFile(index)}>{t('button.delete')}</n-button>
                            </div>
                          </n-card>
                        </n-grid-item>
                      ))
                    }
                  </n-grid>
                ) : (
                  <div class="flex flex-col m-10">
                    <n-h1 class="m-0!">{t('app.title')}</n-h1>
                    <n-p class="m-0!">{t('app.instruction_1')}</n-p>
                    <n-p class="m-0!">{t('app.instruction_2')}</n-p>
                    <n-p class="m-0!">{t('app.instruction_3')}</n-p>
                  </div>
                )
              }
            </n-layout-content>
          </n-layout>
        </n-layout>
        <n-modal v-model:show={previewDialogStore.show} transform-origin="center">
          <n-card class="w-60dvw">
            <svg class="w-full" viewBox="0 0 160 90">
              <rect x="0" y="0" width="160" height="90" fill={previewDialogStore.backgroundColor}></rect>
              {
                previewDialogStore.file && (
                  getArray(previewDialogStore.file.renderCount).map(() => (
                    <image
                      width="100%" height="100%"
                      preserveAspectRatio="xMidYMid meet"
                      xlinkHref={previewDialogStore.file!.image.src}
                    />
                  ))
                )
              }
            </svg>
            <div>
              <n-color-picker v-model:value={previewDialogStore.backgroundColor} modes={['hex']}></n-color-picker>
            </div>
          </n-card>
        </n-modal>
      </>
    )
  }
})

const useLocaleHook = () => {
  const preferenceSetting = usePreferenceStore()
  const i18n = useI18n()

  const setHtmlLang = () => {
    // document.documentElement.lang = preferenceSetting.language
    i18n.locale.value = preferenceSetting.locale || getBrowserLocale()
  }

  onBeforeMount(setHtmlLang)

  watch(() => preferenceSetting.locale, setHtmlLang)
}

/**
 * 根组件
 * 
 * 用于装载一些 naiveUI 的全局性配置，例如 message provider
 * 如果想引入 useMessage ，需要和 provider 分开为两个组件
 */
const CommonGlobalConfig = defineComponent({
  name: 'common-global-config',
  components: {
    App,
  },
  setup() {
    const mqList = window.matchMedia('(prefers-color-scheme: dark)');
    const preferenceSetting = usePreferenceStore()

    // 渲染前，装载明暗色主题
    const theme = ref<GlobalTheme | null>(null)
    const setTheme = () => {
      theme.value = preferenceSetting.isDarkThemeActivated() ? darkTheme : lightTheme
    }

    onBeforeMount(() => {
      setTheme()

      mqList.addEventListener('change', setTheme)
    })

    watch(() => preferenceSetting.themeMode, setTheme)

    useLocaleHook()

    return () => (
      <n-config-provider theme={theme.value} abstract={true}>
        <n-message-provider>
          <n-dialog-provider>
            <app />
          </n-dialog-provider>
        </n-message-provider>
      </n-config-provider>
    )
  }
})

export default CommonGlobalConfig
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const isNativeApp = Capacitor.isNativePlatform()

export async function openExternalUrl(url: string) {
  if (isNativeApp) {
    await Browser.open({ url })
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function saveTextFile(
  name: string,
  contents: string,
  type: string,
  title: string
) {
  if (isNativeApp) {
    const result = await Filesystem.writeFile({
      path: name,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    })

    try {
      await Share.share({
        title,
        text: `${title} from MapVenture`,
        files: [result.uri],
        dialogTitle: `Save or share ${name}`
      })
    } finally {
      void Filesystem.deleteFile({
        path: name,
        directory: Directory.Cache
      }).catch(() => undefined)
    }
    return
  }

  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

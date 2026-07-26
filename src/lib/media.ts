import type { PhotoAsset } from '../types'

const MAX_IMAGE_EDGE = 1600

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

export async function preparePhoto(file: File): Promise<PhotoAsset> {
  const original = await fileToDataUrl(file)

  try {
    const image = await loadImage(original)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: 'image/jpeg',
      dataUrl: canvas.toDataURL('image/jpeg', 0.82),
      createdAt: Date.now()
    }
  } catch {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || 'image/jpeg',
      dataUrl: original,
      createdAt: Date.now()
    }
  }
}

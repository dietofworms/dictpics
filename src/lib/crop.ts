import type { Area } from 'react-easy-crop'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read that image'))
    image.src = src
  })
}

const MAX_PHOTO_SIDE = 8000

export async function cropToDataUrl(src: string, pixels: Area): Promise<string> {
  const image = await loadImage(src)
  if (image.naturalWidth > MAX_PHOTO_SIDE || image.naturalHeight > MAX_PHOTO_SIDE) {
    throw new Error('That image is too large.')
  }
  const longest = Math.max(pixels.width, pixels.height)
  const scale = longest > 1200 ? 1200 / longest : 1
  const width = Math.max(1, Math.round(pixels.width * scale))
  const height = Math.max(1, Math.round(pixels.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not crop that image')
  context.drawImage(image, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, width, height)
  // A new JPEG from the canvas does not carry the file's EXIF or GPS block.
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  if (!dataUrl.startsWith('data:image/jpeg')) throw new Error('Could not crop that image')
  return dataUrl
}

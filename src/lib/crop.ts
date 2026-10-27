import type { Area } from 'react-easy-crop'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read that image'))
    image.src = src
  })
}

export async function cropToDataUrl(src: string, pixels: Area): Promise<string> {
  const image = await loadImage(src)
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
  return canvas.toDataURL('image/jpeg', 0.92)
}

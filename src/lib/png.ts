import { domToBlob } from 'modern-screenshot'

export async function pageToPng(node: HTMLElement): Promise<Blob> {
  if (document.fonts) await document.fonts.ready
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
  return domToBlob(node, {
    scale: 2,
    backgroundColor: '#f4efe4',
    font: { preferredFormat: 'woff2' },
  })
}

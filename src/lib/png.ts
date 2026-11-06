import { domToBlob } from 'modern-screenshot'

export async function pageToPng(node: HTMLElement): Promise<Blob> {
  if (document.fonts) await document.fonts.ready
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
  // Use the page's own size, not its on-screen size: the preview may be
  // scaled down to fit a phone, and the export should not shrink with it.
  return domToBlob(node, {
    width: node.offsetWidth,
    height: node.offsetHeight,
    scale: 2,
    backgroundColor: '#f4efe4',
  })
}

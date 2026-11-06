import { ImagePlus } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { cropToDataUrl } from '@/lib/crop.ts'
import { Button } from '@/components/ui/button.tsx'
import { Label } from '@/components/ui/label.tsx'

export function PhotoField({
  photo,
  onPhoto,
}: {
  photo: string | null
  onPhoto: (photo: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const sourceRef = useRef<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixels, setPixels] = useState<Area | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    return () => {
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current)
    }
  }, [])

  function replaceSource(next: string | null) {
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current)
    sourceRef.current = next
    setSource(next)
    setPixels(null)
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    if (!allowed.has(file.type)) {
      setError('Choose a JPEG, PNG, WebP, or GIF.')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Choose an image under 12 MB.')
      return
    }
    setError(null)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    replaceSource(URL.createObjectURL(file))
  }

  async function confirmCrop() {
    if (!source || !pixels) {
      setError('Adjust the crop, then use it.')
      return
    }
    setBusy(true)
    try {
      const dataUrl = await cropToDataUrl(source, pixels)
      onPhoto(dataUrl)
      replaceSource(null)
      setError(null)
    } catch (error) {
      replaceSource(null)
      setError(error instanceof Error ? error.message : "That image couldn't be cropped. Try another one.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="photo">Photograph</Label>
      <input
        ref={inputRef}
        id="photo"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileChange}
      />
      {source ? (
        <div className="grid gap-2">
          <div className="relative h-72 overflow-hidden rounded-md bg-[#1c1612]">
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={4 / 5}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_cropped, nextPixels) => setPixels(nextPixels)}
            />
          </div>
          <label className="grid gap-1 text-sm" htmlFor="zoom">
            Zoom
            <input
              id="zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void confirmCrop()} disabled={busy}>
              Use this crop
            </Button>
            <Button type="button" variant="outline" onClick={() => replaceSource(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {photo ? (
            <img src={photo} alt="Cropped photograph preview" className="h-20 w-16 rounded-sm border border-[#c9b79a] object-cover" />
          ) : (
            <div className="grid h-20 w-16 place-items-center rounded-sm border border-dashed border-[#b7a58c] text-[#7a6b5a]">
              <ImagePlus />
            </div>
          )}
          <div className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              {photo ? 'Replace photograph' : 'Upload photograph'}
            </Button>
            {photo ? (
              <Button type="button" variant="ghost" onClick={() => onPhoto(null)}>
                Remove photograph
              </Button>
            ) : null}
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">Stays in this browser. It is not uploaded.</p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

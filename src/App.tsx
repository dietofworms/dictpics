import { Dices, Download, Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DictionaryPage } from '@/components/DictionaryPage.tsx'
import { PhotoField } from '@/components/PhotoField.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { publicAsset } from '@/lib/assets.ts'
import { deriveModel, type EntryMode, type LookupStatus } from '@/lib/model.ts'
import { pageToPng } from '@/lib/png.ts'
import { entryFilename, shareBlob, triggerDownload } from '@/lib/share.ts'
import { isLikelySlur } from '@/lib/slurs.ts'
import { OWN_WORDING, pickRandomTerm, SKIP_SLURS_DEFAULT, termsForPicker } from '@/lib/terms.ts'
import { lookupTerm } from '@/lib/lookup.ts'
import { LookupUnavailableError, STATIC_HOST_LOOKUP_MESSAGE, type UrbanEntry } from '@/lib/urban.ts'

const fieldClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function App() {
  const pageRef = useRef<HTMLElement>(null)
  const [skipSlurs, setSkipSlurs] = useState(SKIP_SLURS_DEFAULT)
  const [mode, setMode] = useState<EntryMode>('curated')
  const [term, setTerm] = useState('')
  const [customTerm, setCustomTerm] = useState('')
  const [customDefinition, setCustomDefinition] = useState('')
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [status, setStatus] = useState<LookupStatus>('idle')
  const [entry, setEntry] = useState<UrbanEntry | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const choices = useMemo(() => termsForPicker(skipSlurs), [skipSlurs])

  useEffect(() => {
    if (mode !== 'curated' || !term) {
      setEntry(null)
      setStatus('idle')
      return
    }
    if (skipSlurs && isLikelySlur(term)) {
      setEntry(null)
      setStatus('idle')
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    setEntry(null)
    lookupTerm(term, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (!result) {
          setStatus('missing')
          return
        }
        setEntry(result)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof LookupUnavailableError) {
          setStatus('unavailable')
          return
        }
        setStatus('error')
      })

    return () => controller.abort()
  }, [mode, term, retryNonce])

  const model = deriveModel({
    mode,
    term,
    customTerm,
    customDefinition,
    name,
    photo,
    skipSlurs,
    status,
    entry,
  })

  const canExport = model.kind === 'urban' || (model.kind === 'custom' && model.definition.length > 0)

  function onTermChange(value: string) {
    if (value === OWN_WORDING) {
      setMode('custom')
      setCustomTerm((current) => current || term)
      return
    }
    setMode('curated')
    setTerm(value)
  }

  function onRandom() {
    const next = pickRandomTerm(skipSlurs, Math.random, mode === 'curated' ? term : undefined)
    setMode('curated')
    setTerm(next.word)
  }

  function onSkipChange(checked: boolean) {
    setSkipSlurs(checked)
    if (checked && mode === 'curated' && term && isLikelySlur(term)) {
      setTerm('')
      setEntry(null)
      setStatus('idle')
    }
  }

  function useOwnWording() {
    setCustomTerm((current) => current || term)
    setMode('custom')
  }

  async function capture() {
    const node = pageRef.current
    if (!node) throw new Error('Page is not ready')
    setExportError(null)
    return pageToPng(node)
  }

  async function onDownload() {
    if (!canExport) return
    setExporting(true)
    try {
      const blob = await capture()
      triggerDownload(blob, entryFilename(model.term))
    } catch {
      setExportError("Couldn't make the PNG.")
    } finally {
      setExporting(false)
    }
  }

  async function onShare() {
    if (!canExport) return
    setExporting(true)
    try {
      const blob = await capture()
      const result = await shareBlob(blob, entryFilename(model.term), model.term)
      if (result === 'unavailable') {
        setExportError("Web Share isn't available in this browser. Download the PNG instead.")
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setExportError("Couldn't share the page.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#e6dccb] text-[#241c14]">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
        <img
          src={publicAsset('logo.webp')}
          alt="dictpics"
          className="h-12 w-12 rounded-md border border-[#d7c7ae] bg-white object-cover"
        />
        <div>
          <p className="font-display text-3xl leading-none">dictpics</p>
          <p className="mt-1 text-sm text-[#5c5146]">A photograph beside a real Urban Dictionary entry.</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl items-start gap-6 px-4 pb-16 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="grid gap-4 rounded-lg border border-[#d7c7ae] bg-[#f7f1e6] p-4 shadow-sm" aria-label="Entry controls">
          <PhotoField photo={photo} onPhoto={setPhoto} />
          <div className="grid gap-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              value={name}
              maxLength={60}
              placeholder="Who is in the photograph?"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="term">Term</Label>
            <div className="flex gap-2">
              <select
                id="term"
                className={fieldClass}
                value={mode === 'custom' ? OWN_WORDING : term}
                onChange={(event) => onTermChange(event.target.value)}
              >
                <option value="">Choose a term</option>
                {choices.map((choice) => (
                  <option key={choice.word} value={choice.word}>
                    {choice.word}
                  </option>
                ))}
                <option value={OWN_WORDING}>Use my own wording</option>
              </select>
              <Button type="button" variant="secondary" onClick={onRandom}>
                <Dices /> Random
              </Button>
            </div>
          </div>
          {mode === 'custom' ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="custom-term">Your word</Label>
                <Input
                  id="custom-term"
                  value={customTerm}
                  maxLength={80}
                  onChange={(event) => setCustomTerm(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="custom-definition">Your definition</Label>
                <Textarea
                  id="custom-definition"
                  value={customDefinition}
                  maxLength={2000}
                  placeholder="Your own wording, if the dictionary doesn't have it."
                  onChange={(event) => setCustomDefinition(event.target.value)}
                />
              </div>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3 rounded-md border border-[#e2d3be] px-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="skip-slurs">Skip likely slurs</Label>
              <p id="skip-slurs-hint" className="text-sm text-muted-foreground">
                {skipSlurs
                  ? 'On. Likely slurs are left out of the list and your own wording.'
                  : 'Off. The list includes every curated term.'}
              </p>
            </div>
            <Switch
              id="skip-slurs"
              checked={skipSlurs}
              onCheckedChange={onSkipChange}
              aria-describedby="skip-slurs-hint"
            />
          </div>
          {status === 'loading' && mode === 'curated' ? (
            <p role="status" className="text-sm text-muted-foreground">
              Looking up “{term}”…
            </p>
          ) : null}
          {model.kind === 'missing' || model.kind === 'error' || model.kind === 'unavailable' ? (
            <div className="grid gap-2">
              <p className="text-sm">
                {model.kind === 'missing'
                  ? 'Urban Dictionary has no entry for this word.'
                  : model.kind === 'unavailable'
                    ? STATIC_HOST_LOOKUP_MESSAGE
                    : "The lookup didn't go through."}
              </p>
              <div className="flex flex-wrap gap-2">
                {model.kind === 'error' ? (
                  <Button type="button" variant="outline" onClick={() => setRetryNonce((value) => value + 1)}>
                    Try again
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={useOwnWording}>
                  Use my own wording
                </Button>
              </div>
            </div>
          ) : null}
        </section>
        <section className="grid min-w-0 gap-3" aria-label="Preview">
          <div className="overflow-x-auto pb-2">
            <DictionaryPage model={model} pageRef={pageRef} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onDownload()} disabled={!canExport || exporting}>
              <Download /> Download PNG
            </Button>
            <Button type="button" variant="outline" onClick={() => void onShare()} disabled={!canExport || exporting}>
              <Share2 /> Web Share
            </Button>
          </div>
          {exportError ? (
            <p role="alert" className="text-sm">
              {exportError}
            </p>
          ) : null}
          <p className="max-w-xl text-sm text-[#5c5146]">
            Listed terms are looked up live. Definitions are not saved in the app. Photos never leave this browser.
          </p>
        </section>
      </main>
    </div>
  )
}

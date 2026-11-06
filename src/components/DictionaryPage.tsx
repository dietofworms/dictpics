import type { ReactNode, RefObject } from 'react'
import { publicAsset } from '@/lib/assets.ts'
import { guideWords, pageNumberFor } from '@/lib/dictionary.ts'
import type { PageModel } from '@/lib/model.ts'
import { definitionParts, type UrbanEntry } from '@/lib/urban.ts'

function RichText({ text }: { text: string }) {
  const lines = text.replaceAll('\r\n', '\n').split('\n')
  return lines.map((line, index) => (
    <span key={index}>
      {index > 0 ? <br /> : null}
      {definitionParts(line).map((part, partIndex) =>
        part.type === 'linked' ? (
          <em key={partIndex}>{part.value}</em>
        ) : (
          <span key={partIndex}>{part.value}</span>
        ),
      )}
    </span>
  ))
}

function Plate({ photo, name }: { photo: string | null; name: string }) {
  if (!photo) return null
  return (
    <figure className="dict-plate">
      <img
        src={photo}
        alt={name ? `Photograph of ${name}` : 'Photograph for this entry'}
        draggable={false}
      />
      <figcaption>{name || 'Plate'}</figcaption>
    </figure>
  )
}

function CreditUrban({ entry }: { entry: UrbanEntry }) {
  return (
    <p className="dict-credit">
      <span>Definition: Urban Dictionary</span>
      {entry.author ? <span> · {entry.author}</span> : null}
      {entry.permalink ? (
        <span>
          {' · '}
          <a href={entry.permalink} target="_blank" rel="noopener noreferrer">
            view on Urban Dictionary
          </a>
        </span>
      ) : null}
    </p>
  )
}

function PageFrame({
  pageRef,
  term,
  name,
  busy = false,
  children,
  credit,
}: {
  pageRef: RefObject<HTMLElement | null>
  term: string
  name: string
  busy?: boolean
  children: ReactNode
  credit?: ReactNode
}) {
  const guides = guideWords(term, name)
  const page = pageNumberFor(term, name)
  return (
    <article ref={pageRef} className="dict-page" aria-label="Dictionary page" aria-busy={busy}>
      <div className="dict-running">
        <span>{guides.left}</span>
        <span className="page-no">{page}</span>
        <span className="dict-running-right">{guides.right}</span>
      </div>
      <hr className="dict-rule" />
      {children}
      <footer className="dict-foot">
        {credit ?? <p className="dict-credit">dictpics</p>}
        <div className="dict-brand">
          <img src={publicAsset('logo.webp')} alt="" width={32} height={32} />
          <span>dictpics</span>
        </div>
      </footer>
    </article>
  )
}

export function DictionaryPage({
  model,
  pageRef,
}: {
  model: PageModel
  pageRef: RefObject<HTMLElement | null>
}) {
  if (model.kind === 'empty') {
    return (
      <article ref={pageRef} className="dict-page" aria-label="Dictionary page">
        <div className="dict-running">
          <span>dictpics</span>
          <span className="page-no">—</span>
          <span className="dict-running-right">dictpics</span>
        </div>
        <hr className="dict-rule" />
        <p className="dict-muted">Choose a term to open an entry. Your photograph stays in this browser.</p>
        <footer className="dict-foot">
          <p className="dict-credit">dictpics</p>
          <div className="dict-brand">
            <img src={publicAsset('logo.webp')} alt="" width={32} height={32} />
            <span>dictpics</span>
          </div>
        </footer>
      </article>
    )
  }

  if (model.kind === 'skipped') {
    return (
      <article ref={pageRef} className="dict-page" aria-label="Dictionary page">
        <div className="dict-running">
          <span>dictpics</span>
          <span className="page-no">—</span>
          <span className="dict-running-right">dictpics</span>
        </div>
        <hr className="dict-rule" />
        <p className="dict-muted">Skipped. That wording looks like a slur, and the filter is on.</p>
      </article>
    )
  }

  const photo = model.photo
  const body = (
    <div className={photo ? 'dict-entry' : 'dict-entry no-photo'}>
      <div>
        <h1 className={model.term.length > 18 ? 'dict-word dict-word-long' : 'dict-word'}>{model.term}</h1>
        {model.name && !photo ? <p className="dict-subject">{model.name}</p> : null}
        {model.kind === 'loading' ? (
          <p className="dict-muted">Looking up this word on Urban Dictionary…</p>
        ) : null}
        {model.kind === 'missing' ? (
          <p className="dict-muted">Urban Dictionary has no entry for this word.</p>
        ) : null}
        {model.kind === 'error' ? (
          <p className="dict-muted">The lookup didn't go through.</p>
        ) : null}
        {model.kind === 'custom' && model.definition ? (
          <p className="dict-def">
            <RichText text={model.definition} />
          </p>
        ) : null}
        {model.kind === 'custom' && !model.definition ? (
          <p className="dict-muted">Add your wording to finish this entry.</p>
        ) : null}
        {model.kind === 'urban' ? (
          <>
            <p className="dict-def">
              <RichText text={model.entry.definition} />
            </p>
            {model.entry.example ? (
              <p className="dict-example">
                <RichText text={model.entry.example} />
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      <Plate photo={photo} name={model.name} />
    </div>
  )

  const credit =
    model.kind === 'urban' ? (
      <CreditUrban entry={model.entry} />
    ) : model.kind === 'custom' && model.definition ? (
      <p className="dict-credit">Wording: your own</p>
    ) : (
      <p className="dict-credit">dictpics</p>
    )

  return (
    <PageFrame pageRef={pageRef} term={model.term} name={model.name} busy={model.kind === 'loading'} credit={credit}>
      {body}
    </PageFrame>
  )
}

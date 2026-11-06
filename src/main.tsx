import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/wght.css'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/source-serif-4/wght.css'
import '@fontsource-variable/source-serif-4/wght-italic.css'
import './index.css'
import App from './App.tsx'

// GitHub Pages cannot send frame-ancestors or X-Frame-Options, so refuse to
// render inside another site's frame to block clickjacking.
function framedByOtherSite(): boolean {
  try {
    return window.top !== window.self && window.top?.location.origin !== window.location.origin
  } catch {
    return true
  }
}

const root = document.getElementById('root')!
if (framedByOtherSite()) {
  root.textContent = 'dictpics cannot be shown inside another site. Open it directly.'
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

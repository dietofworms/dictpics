import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { resetLookupProbe } from '../lib/lookup.ts'

beforeEach(() => {
  resetLookupProbe()
})

afterEach(() => {
  cleanup()
})

import { cleanText } from './atlantico/normalize'

export type FaqSections = {
  included: string[]
  notIncluded: string[]
  notes: string
}

const HEADER_INCLUDED = /^\s*(inclus|incluido|included|enthalten|incluso|включено|comprend)\s*[:：]?\s*$/i
const HEADER_NOT_INCLUDED = /^\s*(non\s*inclus|no\s*incluido|not\s*included|nicht\s*enthalten|non\s*incluso|не\s*включено|ne\s*comprend\s*pas)\s*[:：]?\s*$/i
const HEADER_NOTES = /^\s*(remarque|nota|note|hinweis|примечание|notas?)\s*[:：]?\s*$/i

const INLINE_INCLUDED = /^(inclus|incluido|included|enthalten|incluso|включено|comprend)\s*[:：]\s*(.+)$/i
const INLINE_NOT_INCLUDED = /^(non\s*inclus|no\s*incluido|not\s*included|nicht\s*enthalten|non\s*incluso|не\s*включено|ne\s*comprend\s*pas)\s*[:：]\s*(.+)$/i

function splitSentences(text: string): string[] {
  return text
    .split(/[.·•]\s*|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
}

export function parseFaq(faq: string | null | undefined): FaqSections {
  const empty: FaqSections = { included: [], notIncluded: [], notes: '' }
  if (!faq) return empty

  const clean = cleanText(faq)
  if (!clean) return empty

  const lines = clean.split(/\n+/).map((l) => l.trim()).filter(Boolean)

  let current: 'included' | 'notIncluded' | 'notes' | null = null
  const buckets = { included: [] as string[], notIncluded: [] as string[], notes: [] as string[] }

  for (const line of lines) {
    if (HEADER_INCLUDED.test(line)) { current = 'included'; continue }
    if (HEADER_NOT_INCLUDED.test(line)) { current = 'notIncluded'; continue }
    if (HEADER_NOTES.test(line)) { current = 'notes'; continue }

    const inlineInc = line.match(INLINE_INCLUDED)
    if (inlineInc) { current = 'included'; buckets.included.push(...splitSentences(inlineInc[2])); continue }
    const inlineNot = line.match(INLINE_NOT_INCLUDED)
    if (inlineNot) { current = 'notIncluded'; buckets.notIncluded.push(...splitSentences(inlineNot[2])); continue }

    if (current === 'included') buckets.included.push(...splitSentences(line))
    else if (current === 'notIncluded') buckets.notIncluded.push(...splitSentences(line))
    else buckets.notes.push(line)
  }

  return {
    included: buckets.included.filter(Boolean),
    notIncluded: buckets.notIncluded.filter(Boolean),
    notes: buckets.notes.join('\n'),
  }
}

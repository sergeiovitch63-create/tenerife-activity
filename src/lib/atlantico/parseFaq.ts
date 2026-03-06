/**
 * Parse tour.faq text into structured sections for display.
 * Handles formats like:
 * "Included: English speaking guide. Air-conditioned bus.
 *  Not Included: Lunch. Cableway.
 *  Duration: approximately 4-5 hours.
 *  Note: The tour starts once..."
 */

import { decodeTextFromApi } from './htmlAssets'

export type FaqSection =
  | { type: 'included'; title: string; icon: string; items: string[] }
  | { type: 'not-included'; title: string; icon: string; items: string[] }
  | { type: 'duration'; title: string; icon: string; text: string }
  | { type: 'notes'; title: string; icon: string; items: string[] }
  | { type: 'accessibility'; title: string; icon: string; items: string[] }

const SECTION_PATTERNS: Array<{
  type: FaqSection['type']
  regex: RegExp
  title: string
  icon: string
  asList: boolean
}> = [
  { type: 'included', regex: /Included\s*:\s*([\s\S]*?)(?=Not\s+Included\s*:|Duration\s*:|Note\s*:|Notes\s*:|Accessibility\s*:|Prevention|Covid|$)/i, title: 'Included', icon: '✅', asList: true },
  { type: 'not-included', regex: /Not\s+Included\s*:\s*([\s\S]*?)(?=Duration\s*:|Note\s*:|Notes\s*:|Accessibility\s*:|Prevention|Covid|$)/i, title: 'Not Included', icon: '❌', asList: true },
  { type: 'duration', regex: /Duration\s*:\s*([\s\S]*?)(?=Note\s*:|Notes\s*:|Accessibility\s*:|Prevention|Covid|$)/i, title: 'Duration', icon: '⏱', asList: false },
  { type: 'notes', regex: /Notes?\s*:\s*([\s\S]*?)(?=Accessibility\s*:|Prevention|Covid|$)/i, title: 'Important Notes', icon: '📝', asList: true },
  { type: 'accessibility', regex: /Accessibility\s*:\s*([\s\S]*?)(?=Prevention|Covid|Included\s*:|Not\s+Included\s*:|Duration\s*:|$)/i, title: 'Accessibility', icon: '♿', asList: true },
]

function splitIntoItems(text: string): string[] {
  return text
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function stripHtml(html: string): string {
  // First decode HTML entities, then strip HTML tags, then clean whitespace
  const decoded = decodeTextFromApi(html)
  return decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Remove Covid/Prevention related content - truncate everything from that point
 */
function stripCovidPrevention(text: string): string {
  const lower = text.toLowerCase()
  const covidIdx = lower.indexOf('covid')
  const preventionIdx = lower.indexOf('prevention')
  let cutIdx = -1
  if (covidIdx >= 0 && (preventionIdx < 0 || covidIdx < preventionIdx)) cutIdx = covidIdx
  if (preventionIdx >= 0 && (cutIdx < 0 || preventionIdx < cutIdx)) cutIdx = preventionIdx
  if (cutIdx > 0) {
    return text.slice(0, cutIdx).trim()
  }
  return text
}

/**
 * Parse faq text into structured sections.
 * Returns empty array if text is empty or only contains Covid/Prevention content.
 */
export function parseFaqSections(faqText: string | null | undefined): FaqSection[] {
  if (!faqText || typeof faqText !== 'string') return []

  let text = stripCovidPrevention(stripHtml(faqText))
  if (!text.trim()) return []

  const sections: FaqSection[] = []

  for (const { type, regex, title, icon, asList } of SECTION_PATTERNS) {
    const match = text.match(regex)
    if (!match || !match[1]) continue

    const content = match[1].trim()
    if (!content) continue

    if (asList) {
      const items = splitIntoItems(content)
      if (items.length > 0) {
        sections.push({ type, title, icon, items } as FaqSection)
      }
    } else {
      sections.push({ type, title, icon, text: content } as FaqSection)
    }
  }

  return sections
}

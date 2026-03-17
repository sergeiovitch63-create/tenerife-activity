/**
 * Must See Carousel - Title to Group Code mapping
 * Maps each card title to /activite/group-details?code={groupCode}
 * null = fallback to /search?q={title}
 * Codes from Atlantico API (group.Code)
 */
export const MUST_SEE_GROUP_MAP: Record<string, string | null> = {
  // Row 1
  'Club Termal': '35',
  'Loro Parque': '3',
  'Flamenco': '347',
  'Siam Park': '14',
  'Jungle Park': '34',
  'Shogun Boat': '70',
  'Aqualand': '22',
  // Row 2
  'Buggy': '507',
  'La Palma con Almuerzo': '514',
  'Poema del Mar Gran Canaria': '417',
  'Scandal Dinner Show': '284',
  'Teide by Night': '515',
  'Teide Tour with Cable Car': '508',
  'Utopia': '140',
  'Sky of Tenerife': '522',
}

export function getMustSeeHref(title: string): string {
  const code = MUST_SEE_GROUP_MAP[title]
  if (code) {
    return `/activite/group-details?code=${encodeURIComponent(code)}`
  }
  return `/search?q=${encodeURIComponent(title)}`
}

/** Ordered list of must-see activities (carousel row1 + row2) for the Must See page */
export const MUST_SEE_ORDERED: Array<{ title: string; code: string }> = [
  { title: 'Club Termal', code: '35' },
  { title: 'Loro Parque', code: '3' },
  { title: 'Flamenco', code: '347' },
  { title: 'Siam Park', code: '14' },
  { title: 'Jungle Park', code: '34' },
  { title: 'Shogun Boat', code: '70' },
  { title: 'Aqualand', code: '22' },
  { title: 'Buggy', code: '507' },
  { title: 'La Palma con Almuerzo', code: '514' },
  { title: 'Poema del Mar Gran Canaria', code: '417' },
  { title: 'Scandal Dinner Show', code: '284' },
  { title: 'Teide by Night', code: '515' },
  { title: 'Teide Tour with Cable Car', code: '508' },
  { title: 'Utopia', code: '140' },
  { title: 'Sky of Tenerife', code: '522' },
]

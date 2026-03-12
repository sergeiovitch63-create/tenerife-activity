import { readFileSync, writeFileSync } from 'fs'

function normalize(s) {
  if (!s || typeof s !== 'string') return ''
  return s
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&ordm;/g, '°')
    .replace(/&amp;/g, '&')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&acute;/g, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+&\s+/g, ' and ')
    .trim()
}

const data = JSON.parse(readFileSync('data/all-group-details.json', 'utf8'))
const byCode = {}
const byText = {}
for (const t of data) {
  if (!t.description || t.description.length < 50) continue
  const key = normalize(t.description)
  if (!key) continue
  byCode[t.code] = { name: t.name, desc: key }
  byText[key] = { code: t.code, name: t.name }
}
writeFileSync('data/descriptions-by-code.json', JSON.stringify(byCode, null, 2))
writeFileSync('data/descriptions-keys.json', JSON.stringify(Object.keys(byText), null, 2))
console.log('Descriptions:', Object.keys(byCode).length)

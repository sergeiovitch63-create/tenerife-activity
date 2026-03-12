import { readFileSync, writeFileSync } from 'fs'
const data = JSON.parse(readFileSync('data/all-group-details.json', 'utf8'))
const names = []
const descs = []
for (const t of data) {
  if (t.name) names.push(t.name.trim())
  if (t.description) {
    const d = t.description.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
    if (d.length > 30) descs.push(d)
  }
}
writeFileSync('data/tour-names.json', JSON.stringify([...new Set(names)], null, 2))
writeFileSync('data/tour-descriptions.json', JSON.stringify(descs.slice(0, 100), null, 2))
console.log('Names:', names.length, 'Descs:', descs.length)

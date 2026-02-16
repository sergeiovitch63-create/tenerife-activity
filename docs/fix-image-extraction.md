# Fix Image Extraction - Bug Critique

## Problème identifié

Aucune image n'apparaissait dans le catalogue (cards = "No photo").

**Cause :** `hydration.ts` ne cherchait que dans `groupDetails.image || group.image`, manquant d'autres champs possibles utilisés par l'API Atlantico.

## Solution

### 1. Fonction utilitaire `extractAtlanticoImage()`

**Location :** `src/lib/atlantico/quality.ts`

Cherche dans tous les champs possibles :
- `raw.image`
- `raw.img`
- `raw.photo`
- `raw.picture`
- `raw.images[0]`
- `raw.gallery[0]`
- `raw.photos[0]`
- `raw.media[0].url`
- `raw.media[0]`

Utilise `buildAtlanticoImageUrl()` pour construire l'URL complète.

### 2. Correction dans `hydrateTour()`

**Avant :**
```typescript
const image = buildAtlanticoImageUrl(groupDetails.image || group.image)
```

**Après :**
```typescript
// Extract image from groupDetails (tries multiple field names)
let image = extractAtlanticoImage(groupDetails)
// Fallback to group.image if groupDetails didn't have image
if (!image) {
  image = extractAtlanticoImage(group)
}
```

### 3. Amélioration dans `normalizeTour()`

**Avant :**
Cherche manuellement dans `tour.raw.groupDetails?.image`, `tour.raw.groupList?.image`, etc.

**Après :**
Utilise `extractAtlanticoImage()` pour une recherche exhaustive :
```typescript
// Try fallback from raw (use extractAtlanticoImage for comprehensive search)
if (tour.raw) {
  // Try groupDetails first (most common location)
  if (tour.raw.groupDetails) {
    image = extractAtlanticoImage(tour.raw.groupDetails)
  }
  // Try groupList if groupDetails didn't have image
  if (!image && tour.raw.groupList) {
    image = extractAtlanticoImage(tour.raw.groupList)
  }
  // Try raw root level
  if (!image) {
    image = extractAtlanticoImage(tour.raw)
  }
}
```

### 4. Endpoint debug `/api/debug/image-sample`

**GET `/api/debug/image-sample`** (DEV only)

Retourne pour 5 tours :
```json
{
  "total": 200,
  "sampled": 5,
  "samples": [
    {
      "id": "123",
      "title": "Whale Watching Tour",
      "imageNormalized": "https://static.atlantico-excursiones.com/images/whale.jpg",
      "imageFromNormalize": "https://static.atlantico-excursiones.com/images/whale.jpg",
      "eventImage": null,
      "rawImageCandidates": {
        "image": "whale.jpg",
        "img": null,
        "images0": null,
        "gallery0": null,
        "photo": null,
        "picture": null
      },
      "hasImage": true
    }
  ]
}
```

## Vérifications

### 1. Test debug endpoint
```bash
curl "http://localhost:3000/api/debug/image-sample"
```

**Vérifier :**
- `imageNormalized` doit être une URL complète si image trouvée
- `rawImageCandidates` montre tous les champs testés
- `hasImage: true` si une image est disponible

### 2. Rebuild cache

**Core :**
```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{"language": "ENG", "refreshMode": "core", "includeRaw": true}'
```

**Dynamic :**
```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{"language": "ENG", "refreshMode": "dynamic", "priceDate": "20240115", "limitsMonth": "202401"}'
```

### 3. Vérifier UI

**Liste :** `/en/catalog` ou `/en/activities`
- Les cards doivent afficher des images (pas "No photo")

**Détail :** `/en/activities/[slug]`
- Image hero doit être visible

## Fichiers modifiés

1. `src/lib/atlantico/quality.ts`
   - Ajout de `extractAtlanticoImage()` (exporté)
   - Amélioration de `normalizeTour()` pour utiliser `extractAtlanticoImage()`

2. `src/lib/atlantico/hydration.ts`
   - Import de `extractAtlanticoImage` depuis `quality.ts`
   - Correction de `hydrateTour()` pour utiliser `extractAtlanticoImage()`

3. `src/app/api/debug/image-sample/route.ts` (nouveau)
   - Endpoint DEV pour debug des images

## Règles de fallback image

**Ordre de priorité :**

1. **Dans `hydrateTour()` :**
   - `extractAtlanticoImage(groupDetails)` → cherche dans tous les champs possibles
   - `extractAtlanticoImage(group)` → fallback si groupDetails n'a pas d'image

2. **Dans `normalizeTour()` (si image toujours null) :**
   - `extractAtlanticoImage(tour.raw.groupDetails)` → depuis raw si disponible
   - `extractAtlanticoImage(tour.raw.groupList)` → fallback groupList
   - `extractAtlanticoImage(tour.raw)` → fallback root raw
   - `extractAtlanticoImage(event.raw)` → fallback première image d'event

3. **Si aucune image trouvée :**
   - Retourne `null`
   - UI affiche placeholder (géré côté UI)

## Compilation TypeScript

```bash
npx tsc --noEmit --skipLibCheck
```
Exit code: `0` (aucune erreur)

## Résultat attendu

✅ Images visibles sur les cards
✅ Images visibles sur les pages détail
✅ Plus de "No photo" si raw contient une image
✅ URL complètes construites via `buildAtlanticoImageUrl()`























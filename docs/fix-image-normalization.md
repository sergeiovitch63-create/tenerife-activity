# Fix Image Normalization - Correction Critique

## Problème identifié

Les images étaient correctement extraites (`extractAtlanticoImage` OK), mais l'UI affichait encore "No photo" car `tour.image` n'était pas forcé après normalisation.

**Cause :** `normalizeTour()` vérifiait d'abord `tour.image` et ne le recalculait pas si déjà défini (même incorrectement).

## Solution

### 1. Correction dans `normalizeTour()`

**Changement principal :** Toujours recalculer l'image depuis `tour.raw`, en ignorant `tour.image` initial.

**Avant :**
```typescript
// Normalize image
let image: string | null = tour.image || null
if (!image) {
  // Try fallback from raw...
}
```

**Après :**
```typescript
// Normalize image - ALWAYS recalculate from raw if available (ignore tour.image initial)
// This ensures image is always extracted correctly regardless of previous value
let image: string | null = null

// Try to extract from raw first (most reliable source)
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

// Try first event image if still no image
if (!image && tour.events && tour.events.length > 0) {
  for (const event of tour.events) {
    if (event.raw) {
      image = extractAtlanticoImage(event.raw)
      if (image) break
    }
  }
}

// Fallback to tour.image if no raw data available (shouldn't happen after hydration, but safety)
if (!image && tour.image) {
  // Ensure image is a valid URL
  image = buildAtlanticoImageUrl(tour.image) || tour.image
}
```

### 2. Assignation explicite de `tour.image`

**Dans `normalizeTour()` :**
```typescript
return {
  ...tour,
  title: normalizedTitle,
  description,
  duration,
  image, // IMPORTANT: Always explicitly set (null if not found, URL if found)
  basePrice,
  currency,
}
```

### 3. Vérification dans `hydrateTour()`

`hydrateTour()` appelle bien `normalizeTour()` après avoir construit le tour :

```typescript
const tour: FullTour = {
  id: groupId,
  // ... other fields
  image, // Initial extraction (may be null or incorrect)
}

// Apply normalization
const normalized = normalizeTour(tour)
return normalized // normalized.image is now ALWAYS correct
```

### 4. Endpoint debug mis à jour

**GET `/api/debug/image-sample`**

**Nouvelle réponse :**
```json
{
  "total": 200,
  "sampled": 5,
  "samples": [
    {
      "id": "123",
      "title": "Whale Watching Tour",
      "tourImage": "https://static.atlantico-excursiones.com/images/whale.jpg",
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
      "hasImage": true,
      "imageMatches": true
    }
  ],
  "note": "tourImage is the final tour.image (used by UI). imageFromNormalize shows what extractAtlanticoImage() found. imageMatches indicates if normalization was applied correctly."
}
```

**Champs retournés :**
- `tourImage` : `tour.image` final (utilisé par l'UI)
- `imageFromNormalize` : Ce que `extractAtlanticoImage()` trouve depuis raw
- `imageMatches` : `true` si `tour.image === imageFromNormalize` (normalisation appliquée correctement)
- `hasImage` : `true` si `tour.image` existe

## Règles de normalisation image

**Ordre de priorité (dans `normalizeTour()`) :**

1. **Depuis `tour.raw.groupDetails`** → `extractAtlanticoImage(tour.raw.groupDetails)`
2. **Depuis `tour.raw.groupList`** → `extractAtlanticoImage(tour.raw.groupList)` (si groupDetails n'a pas d'image)
3. **Depuis `tour.raw` root** → `extractAtlanticoImage(tour.raw)` (si groupList n'a pas d'image)
4. **Depuis premier event raw** → `extractAtlanticoImage(event.raw)` (si raw n'a pas d'image)
5. **Fallback `tour.image` initial** → `buildAtlanticoImageUrl(tour.image)` (sécurité, ne devrait pas arriver)

**Résultat :**
- `tour.image` est **toujours** recalculé depuis raw si disponible
- `tour.image` est **toujours** assigné explicitement dans le retour de `normalizeTour()`
- `tour.image` est `null` si aucune image trouvée (UI affiche placeholder)

## Vérifications

### 1. Test debug endpoint
```bash
curl "http://localhost:3000/api/debug/image-sample"
```

**Vérifier :**
- `tourImage` doit être une URL complète si image trouvée
- `imageMatches` doit être `true` (normalisation appliquée)
- `hasImage` doit être `true` si image disponible

### 2. Rebuild cache CORE (OBLIGATOIRE)

```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{"language": "ENG", "refreshMode": "core", "includeRaw": true}'
```

**Important :** `includeRaw: true` est nécessaire pour que `normalizeTour()` puisse extraire l'image depuis raw.

### 3. Rebuild cache dynamic (optionnel)

```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{"language": "ENG", "refreshMode": "dynamic", "priceDate": "20240115", "limitsMonth": "202401"}'
```

### 4. Vérifier API catalog

```bash
curl "http://localhost:3000/api/catalog/full?thin=smart"
```

**Vérifier :**
- `items[0].image` doit être une URL complète si image trouvée
- `items[0].image` doit être `null` si aucune image trouvée (pas d'URL vide)

### 5. Vérifier UI

**Liste :** `/en/catalog` ou `/en/activities`
- Les cards doivent afficher des images (pas "No photo")
- Image hero visible sur chaque card

**Détail :** `/en/activities/[slug]`
- Image hero visible en haut de la page

## Fichiers modifiés

1. **`src/lib/atlantico/quality.ts`**
   - Correction de `normalizeTour()` pour toujours recalculer l'image depuis raw
   - Assignation explicite de `tour.image` dans le retour

2. **`src/app/api/debug/image-sample/route.ts`**
   - Mise à jour des champs retournés (`tourImage`, `imageMatches`)
   - Note explicative mise à jour

## Compilation TypeScript

```bash
npx tsc --noEmit --skipLibCheck
```
Exit code: `0` (aucune erreur)

## Résultat attendu

✅ `tour.image` est **toujours** recalculé depuis raw si disponible
✅ `tour.image` est **toujours** assigné explicitement dans `normalizeTour()`
✅ Images visibles sur toutes les cards
✅ Images visibles sur pages détail
✅ Plus aucun "No photo" si raw contient une image
✅ URL complètes construites via `buildAtlanticoImageUrl()`

## Notes importantes

1. **`includeRaw: true` est obligatoire** pour le refresh core, sinon `tour.raw` ne sera pas disponible et `normalizeTour()` ne pourra pas extraire l'image.

2. **Rebuild cache CORE est obligatoire** après cette correction pour appliquer la nouvelle normalisation.

3. **`normalizeTour()` est appelé dans `hydrateTour()`** après construction du tour, donc tous les tours hydratés auront `image` correctement normalisé.














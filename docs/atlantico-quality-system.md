# Système de Qualité et Filtrage Atlantico

## Vue d'ensemble

Le système de qualité Atlantico permet de :
- **Normaliser** les données (tours et events) lors de l'hydratation
- **Filtrer** les items selon leur qualité (mode `full` vs `sellable`)
- **Analyser** la qualité du catalogue via un rapport détaillé

## Fichiers créés/modifiés

### Fichiers créés
- `src/lib/atlantico/quality.ts` - Normalisation et évaluation de qualité
- `src/app/api/catalog/quality-report/route.ts` - Endpoint de rapport qualité (DEV only)

### Fichiers modifiés
- `src/lib/atlantico/hydration.ts` - Application de `normalizeTour` et `normalizeEvent` lors de l'hydratation
- `src/app/api/catalog/full/route.ts` - Ajout du paramètre `mode=full|sellable`
- `src/app/api/catalog/item/route.ts` - Ajout du paramètre `mode=full|sellable`

## Normalisation (Server-side)

### `normalizeTour(tour: FullTour): FullTour`

Fonctions de normalisation appliquées automatiquement lors de l'hydratation :

1. **Titre** : Sanitize HTML, trim, fallback "Untitled Tour" si vide
2. **Description** : Sanitize HTML, trim
3. **Duration** : Arrondi à 2 décimales, null si invalide
4. **Image** : 
   - Si null, tente fallback sur `raw.groupDetails.image` ou `raw.groupList.image`
   - Sinon tente première image trouvée dans les events
   - Utilise `buildAtlanticoImageUrl()` pour construire l'URL complète
5. **basePrice** :
   - Si null/0, calcule le min des `event.price.adult > 0` ou `session.price > 0`
   - Arrondi à 2 décimales
6. **Currency** : Toujours "EUR" (si absent)

### `normalizeEvent(event: FullEvent): FullEvent`

1. **Titre** : Sanitize HTML, trim
2. **Times** : Array de strings normalisé (trim, filter empty)
3. **Days** : Array de strings normalisé (trim, filter empty)
4. **Prix event-level** : Calcule le min prix parmi `event.price.adult` et `session.price`

## Filtres qualité (deux modes)

### Mode `full` (par défaut)
Affiche tous les items sans filtre.

### Mode `sellable`
Filtre les items selon les règles strictes définies dans `evaluateTourQuality()`.

### `evaluateTourQuality(tour: FullTour): { sellable: boolean, reasons: string[] }`

Règles SELLABLE (strictes) :

#### ❌ Blocking (fait échouer `sellable`)

1. **Title trop court ou vide** : `title_too_short_or_empty`
   - Titre doit être non vide ET longueur >= 6 caractères

2. **Title contient zone géographique** : `title_contains_geographic_zone`
   - Pattern : `/\b(area|zone|zones|north|south|east|west)\b/i`
   - Exemples exclus : "North Area", "Zone South", etc.

3. **Title contient mot-clé catégorie** : `title_contains_category_keyword`
   - Pattern : `/\bcategory|categor(i|í)a|categoria|categoría\b/i`
   - Exemples exclus : "Category Excursions", "Categoría Tours", etc.

4. **Pas de prix disponible** : `no_price_available`
   - Doit avoir AU MOINS un event avec :
     - `event.price.adult > 0` OU
     - Au moins une `session.price > 0`
   - Sinon vérifie `tour.basePrice > 0` comme fallback

#### ✅ Non-blocking (ajoute reason mais n'empêche pas `sellable`)

- **Image manquante** : Accepté (UI a placeholder)
- **Description vide** : Accepté si events ont des infos utiles (times, days, route, meetingPoints)

### Comment ajuster les règles

Modifier `src/lib/atlantico/quality.ts` :

```typescript
export function evaluateTourQuality(tour: FullTour): QualityEvaluation {
  const reasons: string[] = []

  // Ajouter/modifier règles ici
  if (/* nouvelle condition */) {
    reasons.push('nouvelle_reason')
  }

  // Définir quelles reasons sont blocking
  const blockingReasons = reasons.filter((r) =>
    r === 'title_too_short_or_empty' ||
    r === 'title_contains_geographic_zone' ||
    r === 'title_contains_category_keyword' ||
    r === 'no_price_available' ||
    r === 'nouvelle_reason' // Ajouter ici si blocking
  )

  const sellable = blockingReasons.length === 0
  return { sellable, reasons }
}
```

## Endpoints API

### GET `/api/catalog/full`

**Query params :**
- `mode` : `full` | `sellable` (default: `full`)
- `lang` : Filtre langue (optionnel)
- `merged` : `0` | `1` (merge avec curation)
- `includeRaw` : `0` | `1` (inclure raw data)
- `thin` : `0` | `1` (mode allégé)

**Exemple réponse (mode=sellable, DEV) :**
```json
{
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "language": "ENG",
  "itemCount": 150,
  "items": [...],
  "quality": {
    "123": { "sellable": true, "reasons": [] },
    "456": { "sellable": false, "reasons": ["title_too_short_or_empty"] }
  }
}
```

**Exemple réponse (mode=full) :**
```json
{
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "language": "ENG",
  "itemCount": 200,
  "items": [...]
}
```

### GET `/api/catalog/item`

**Query params :**
- `id` : Tour ID
- `slug` : Tour slug (alternative à id)
- `mode` : `full` | `sellable` (default: `full`)
- `lang` : Filtre langue (optionnel)
- `merged` : `0` | `1`
- `includeRaw` : `0` | `1`

**Réponse si `mode=sellable` et item non-sellable :**
```json
{
  "ok": false,
  "reason": "not_sellable",
  "message": "Item does not meet sellable quality criteria",
  "quality": {
    "sellable": false,
    "reasons": ["title_too_short_or_empty", "no_price_available"]
  }
}
```
Status: `404`

**Réponse si `mode=sellable` et item sellable (DEV) :**
```json
{
  "id": "123",
  "title": "Whale Watching Tour",
  "description": "...",
  "basePrice": 45.00,
  "currency": "EUR",
  "events": [...],
  "quality": {
    "sellable": true,
    "reasons": []
  }
}
```

### GET `/api/catalog/quality-report` (DEV ONLY)

**Query params :**
- `merged` : `0` | `1` (utiliser curation)

**Réponse en production :**
```json
{ "error": "Not found" }
```
Status: `404`

**Réponse en DEV :**
```json
{
  "total": 200,
  "sellable": 150,
  "nonSellable": 50,
  "sellablePercentage": 75,
  "topReasons": [
    { "reason": "no_price_available", "count": 30 },
    { "reason": "title_too_short_or_empty", "count": 15 },
    { "reason": "title_contains_geographic_zone", "count": 5 }
  ],
  "examples": [
    {
      "id": "456",
      "title": "North Area",
      "reasons": ["title_contains_geographic_zone", "no_price_available"]
    },
    {
      "id": "789",
      "title": "Cat",
      "reasons": ["title_too_short_or_empty"]
    }
  ],
  "language": "ENG",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Tests curl

### 1. Full mode (liste complète)
```bash
curl "http://localhost:3000/api/catalog/full?mode=full"
```

### 2. Sellable mode (filtré)
```bash
curl "http://localhost:3000/api/catalog/full?mode=sellable&merged=1"
```

### 3. Item sellable OK
```bash
curl "http://localhost:3000/api/catalog/item?id=123&mode=sellable"
```

### 4. Quality report (DEV only)
```bash
curl "http://localhost:3000/api/catalog/quality-report?merged=1"
```

## Intégration dans l'hydratation

La normalisation est appliquée automatiquement lors de l'hydratation :

```typescript
// Dans hydrateEvent()
const event = { /* ... */ }
return normalizeEvent(event) // ✅ Appliqué

// Dans hydrateTour()
const tour = { /* ... */ }
return normalizeTour(tour) // ✅ Appliqué
```

**Important** : Le cache contient toujours les données complètes (mode `full`). Le filtrage `sellable` se fait au moment de servir l'API, pas dans le cache.

## Notes importantes

1. **DEV vs PROD** :
   - Le champ `quality` n'apparaît que en DEV
   - `/api/catalog/quality-report` retourne 404 en PROD

2. **Performance** :
   - La normalisation se fait une seule fois lors de l'hydratation
   - Le filtrage `sellable` est rapide (évaluation simple)

3. **Compatibilité** :
   - N'affecte pas les paramètres existants (`merged`, `thin`, `includeRaw`)
   - Mode `full` reste le comportement par défaut

4. **Règles ajustables** :
   - Toutes les règles sont dans `evaluateTourQuality()`
   - Facile d'ajouter/modifier des patterns ou conditions














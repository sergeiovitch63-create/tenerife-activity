# Correction Normalisation dans hydration.ts

## Problème identifié

La normalisation était appliquée directement dans le `return`, rendant le code moins lisible et potentiellement problématique pour le debugging.

## Correction appliquée

### 1. `hydrateEvent()` - Ligne 302-319

**Avant :**
```typescript
const event: FullEvent = {
  // ... construction
}

// Apply normalization
return normalizeEvent(event)
```

**Après :**
```typescript
const event: FullEvent = {
  // ... construction
}

// Apply normalization
const normalized = normalizeEvent(event)
return normalized
```

### 2. `hydrateTour()` - Ligne 422-438

**Avant :**
```typescript
const tour: FullTour = {
  // ... construction
}

// Apply normalization
return normalizeTour(tour)
```

**Après :**
```typescript
const tour: FullTour = {
  // ... construction
}

// Apply normalization
const normalized = normalizeTour(tour)
return normalized
```

## Points importants

### ✅ Normalisation uniquement dans le try block

- La normalisation est appliquée **après** la construction de l'objet
- **Jamais** dans le `catch` block
- Dans le `catch`, on retourne un objet minimal non-normalisé ou `null`

### ✅ Catch blocks inchangés

**`hydrateEvent()` catch :**
```typescript
catch (error) {
  // Event fetch failed
  if (process.env.ATLANTICO_DEBUG === '1') {
    console.error(`[HYDRATION] Event ${eventCode} failed:`, error instanceof Error ? error.message : 'Unknown')
  }

  // Return event with error in DEV (non-normalisé)
  if (process.env.NODE_ENV === 'development') {
    return {
      id: eventCode,
      rawError: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  return null
}
```

**`hydrateTour()` catch :**
```typescript
catch (error) {
  if (process.env.ATLANTICO_DEBUG === '1') {
    console.error(`[HYDRATION] Tour failed:`, error instanceof Error ? error.message : 'Unknown')
  }
  return null
}
```

### ✅ Imports vérifiés

```typescript
import { normalizeTour, normalizeEvent } from './quality'
```

**Aucune dépendance cyclique :**
- `hydration.ts` importe depuis `quality.ts`
- `quality.ts` n'importe **pas** depuis `hydration.ts`

## Vérifications de normalisation

### 1. `basePrice` calculé si absent

✅ La normalisation calcule `basePrice` depuis les events si `null` ou `0` :
- Cherche le min des `event.price.adult > 0`
- Cherche le min des `session.price > 0`
- Arrondi à 2 décimales

### 2. `image` est URL complète

✅ Utilise `buildAtlanticoImageUrl()` :
- Convertit les filenames en URLs complètes
- Fallback sur `raw.groupDetails.image` ou `raw.groupList.image`
- Fallback sur première image trouvée dans les events

### 3. `description`/`title` sont sanitizés

✅ Utilise `sanitizeText()` :
- Strip HTML tags
- Trim whitespace
- Handle null/undefined

### 4. `times` sont normalisés

✅ Normalisation des times :
- Array de strings
- Trim chaque time
- Filter empty strings
- Format cohérent (HH:MM si applicable)

## Tests

### Endpoint de test : `/api/debug/normalize-sample`

**Route :** `GET /api/debug/normalize-sample`

**Query params :**
- `lang` : Language code (default: `ENG`)

**Réponse (DEV only) :**
```json
{
  "success": true,
  "tourId": "123",
  "tourSlug": "whale-watching-tour",
  "language": "ENG",
  "diff": {
    "tour": {
      "before": {
        "title": "Raw title from API",
        "description": "Raw description",
        "image": "image.jpg",
        "basePrice": null,
        "duration": 4.5,
        "currency": "EUR"
      },
      "after": {
        "title": "Sanitized Title",
        "description": "Sanitized description",
        "image": "https://static.atlantico-excursiones.com/images/image.jpg",
        "basePrice": 45.00,
        "duration": 4.5,
        "currency": "EUR"
      }
    },
    "event": {
      "before": {
        "title": "Event name",
        "times": ["09:00", "14:00"],
        "days": ["Monday", "Tuesday"]
      },
      "after": {
        "title": "Event name",
        "times": ["09:00", "14:00"],
        "days": ["Monday", "Tuesday"]
      }
    }
  },
  "computedFields": {
    "basePriceCalculated": "✓",
    "imageUrlComplete": "✓",
    "titleSanitized": "✓",
    "descriptionSanitized": "✓",
    "timesNormalized": "✓"
  }
}
```

**En production :**
```json
{ "error": "Not found" }
```
Status: `404`

### Test avec curl

```bash
# Test normalization sample (DEV only)
curl "http://localhost:3000/api/debug/normalize-sample?lang=ENG"

# Avec autre langue
curl "http://localhost:3000/api/debug/normalize-sample?lang=ESP"
```

### Vérification TypeScript

✅ **Compilation réussie :**
```bash
npx tsc --noEmit --skipLibCheck
```
Exit code: `0` (pas d'erreurs)

## Résumé des changements

### Fichiers modifiés

1. **`src/lib/atlantico/hydration.ts`**
   - `hydrateEvent()` : Séparation normalisation en 2 lignes
   - `hydrateTour()` : Séparation normalisation en 2 lignes

2. **`src/lib/atlantico/quality.ts`**
   - Correction TypeScript : vérification `undefined` pour `event.price.adult`

3. **`src/app/api/debug/normalize-sample/route.ts`** (nouveau)
   - Endpoint DEV pour tester la normalisation
   - Retourne before/after diff

### Aucun breaking change

- Les catch blocks retournent toujours des objets minimaux ou `null`
- La normalisation reste appliquée uniquement sur les objets valides
- Les imports restent inchangés (pas de cycle)

## Conclusion

✅ Normalisation correctement appliquée après construction des objets
✅ Jamais dans les catch blocks
✅ Code compilable (TypeScript strict)
✅ Endpoint de test disponible (DEV only)























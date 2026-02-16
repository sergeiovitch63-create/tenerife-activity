# Architecture "Super Catalogue" - Analyse et Proposition

## 1. INVENTAIRE DES FICHIERS ATLANTICO

### 1.1 Appels Atlantico (fetch/client)
- `src/lib/atlantico/fetch.ts` - Fetch avec retry/timeout
- `src/lib/atlantico/config.ts` - Configuration (baseUrl, timeout, token)
- `src/lib/atlantico/pricing.ts` - Logique de pricing (loadLimits + loadPrices)
- `src/lib/atlantico/prices.ts` - Parse loadPrices response
- `src/lib/atlantico/limits.ts` - Parse loadLimits response
- `src/lib/atlantico/price-normalize.ts` - Normalisation des prix
- `src/lib/atlantico/images.ts` - Extraction d'images
- `src/lib/atlantico/mappers.ts` - Mapping Atlantico → Domain
- `src/lib/atlantico/date.ts` - Utilitaires de dates

### 1.2 Routes API Next.js (/api/atlantico/*)
- `src/app/api/atlantico/group/[groupId]/[lang]/route.ts` - GET groupDetails
- `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts` - GET eventDetails
- `src/app/api/atlantico/prices/[eventCode]/route.ts` - GET loadPrices
- `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts` - GET loadLimits
- `src/app/api/atlantico/tours/[lang]/route.ts` - GET groupsList normalisé
- `src/app/api/atlantico/tours-enriched/[lang]/route.ts` - GET groupsList + groupDetails + pricing
- `src/app/api/atlantico/tours-pricing/[lang]/route.ts` - GET tours avec pricing
- `src/app/api/atlantico/group-details/[code]/[lang]/route.ts` - GET groupDetails (alias)
- `src/app/api/atlantico/catalog/[lang]/route.ts` - GET catalog mixte
- `src/app/api/atlantico/catalog/route.ts` - GET catalog (sans lang)
- `src/app/api/atlantico/catalog-debug/[lang]/route.ts` - GET debug catalog
- `src/app/api/atlantico/health/route.ts` - GET health check
- `src/app/api/atlantico/ip/route.ts` - GET IP check
- Routes debug: `debug-classifications`, `debug-images`, `debug-item-schema`, `debug-pricing`, `generate-category-mapping`

### 1.3 Types/Mapping
- `src/core/entities/experience.ts` - Interface Experience (domain)
- `src/lib/atlantico/mappers.ts` - Types AtlanticoGroupDetails, AtlanticoEventDetails, ActivityLite
- `src/data/atlantico/atlantico-experience.repository.ts` - Repository implémentant ExperienceRepository

### 1.4 UI/Pages consommant les données
- `src/app/[locale]/activities/[slug]/page.tsx` - Page détail activité (groupDetails + eventDetails + pricing)
- `src/app/[locale]/activities/page.tsx` - Liste activités
- `src/app/[locale]/catalog/page.tsx` - Page catalog
- `src/app/[locale]/debug/catalog/page.tsx` - Debug catalog
- `src/app/[locale]/debug/atlantico/page.tsx` - Debug Atlantico

---

## 2. FLUX ACTUEL DES DONNÉES

### 2.1 Flux Principal (Page Détail Activité)

```
1. User visite /[locale]/activities/[slug]
   ↓
2. Page fetch `/api/atlantico/group-details/${slug}/${lang}`
   ↓
3. Route API → fetchAtlantico(`/groupDetails/${code}/${lang}`)
   ↓
4. Si 404 → try `/api/atlantico/event/${slug}/${lang}` pour trouver groupCode
   ↓
5. Page extrait eventCodes depuis groupDetails
   ↓
6. Pour chaque eventCode:
   - Fetch `/api/atlantico/event/${eventCode}/${lang}` (eventDetails)
   - Fetch `/api/atlantico/availability/${eventCode}/${lang}?month=YYYY-MM-01` (loadLimits)
   - Fetch `/api/atlantico/prices/${eventCode}?date=YYYY-MM-DD` (loadPrices)
   ↓
7. Page agrège: groupDetails + eventDetails[] + limits[] + prices[]
   ↓
8. UI affiche: titre, images, description, options, horaires, prix
```

### 2.2 Flux Catalog (Liste Tours)

```
1. User visite /[locale]/catalog
   ↓
2. Page fetch `/api/atlantico/tours/[lang]` OU `/api/atlantico/tours-enriched/[lang]`
   ↓
3. Route API:
   a) Fetch `/groupsList/${lang}/-1` (tous les tours)
   b) Pour chaque tour (optionnel):
      - Fetch `/groupDetails/${code}/${lang}`
      - Extract eventCodes
      - Fetch pricing via loadLimits + loadPrices
   ↓
4. Normalise et retourne array de tours
   ↓
5. UI affiche liste avec images, titres, prix
```

### 2.3 Points de Performance Actuels

- **Cache Next.js**: 5 min (groupDetails/eventDetails), 60s (prices/limits)
- **Concurrency**: Limité à 5-8 requêtes parallèles
- **Retry**: 2 tentatives avec backoff exponentiel
- **Timeout**: 10s par défaut (configurable via ATLANTICO_TIMEOUT_MS)

### 2.4 Problèmes Identifiés

1. **Multiples appels API** pour chaque page (groupDetails + N×eventDetails + N×limits + N×prices)
2. **Pas de cache persistant** entre redémarrages
3. **Données fragmentées** (group, events, limits, prices séparés)
4. **Pas de pré-hydratation** (tout est fetché à la demande)
5. **Dépendance réseau** pour chaque requête utilisateur

---

## 3. ARCHITECTURE "SUPER CATALOGUE" PROPOSÉE

### 3.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    JOB D'HYDRATATION                         │
│  (POST /api/catalog/refresh - protégé ADMIN_PASSWORD)       │
│                                                              │
│  1. Fetch groupsList/${lang}/-1                             │
│  2. Pour chaque group:                                       │
│     - Fetch groupDetails/${code}/${lang}                     │
│     - Extract eventCodes                                     │
│     - Pour chaque eventCode:                                 │
│       * Fetch eventDetails/${eventCode}/${lang}              │
│       * Fetch loadLimits/${eventCode}/${lang}/${month}       │
│       * Fetch loadPrices/${eventCode}/${date}                │
│  3. Agrège tout dans un objet structuré                      │
│  4. Écrit dans /src/data/atlantico_full_catalog.json         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CACHE JSON LOCAL                          │
│  /src/data/atlantico_full_catalog.json                       │
│                                                              │
│  Structure: {                                                │
│    metadata: { generatedAt, lang, totalGroups, ... },       │
│    groups: { [code]: FullGroupData }                        │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ENDPOINT GET /api/catalog/full                  │
│                                                              │
│  - Lit le cache JSON                                         │
│  - Retourne tout ou filtre par groupCode/eventCode          │
│  - Option includeRaw=true pour DEV                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      UI (non modifié)                        │
│  - Continue d'utiliser les routes existantes                 │
│  - Ou migre vers /api/catalog/full                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Fichiers à Créer/Modifier

#### Fichiers à CRÉER:

1. **`src/lib/atlantico/hydration.ts`**
   - Job d'hydratation complet
   - Fonction `hydrateFullCatalog(lang: string, includeRaw?: boolean): Promise<FullCatalog>`
   - Gestion concurrency, retry, timeout
   - Logs DEV détaillés

2. **`src/app/api/catalog/full/route.ts`**
   - GET: Lit cache JSON et retourne
   - Query params: `?groupCode=XXX&eventCode=YYY&includeRaw=true`
   - Cache HTTP: 1h (stale-while-revalidate 10min)

3. **`src/app/api/catalog/refresh/route.ts`**
   - POST: Protégé par ADMIN_PASSWORD
   - Appelle `hydrateFullCatalog()`
   - Écrit dans `/src/data/atlantico_full_catalog.json`
   - Retourne stats (temps, groupes, events, erreurs)

4. **`src/data/atlantico_full_catalog.json`**
   - Fichier JSON généré (ajouté à .gitignore)
   - Structure complète du catalogue

5. **`src/lib/atlantico/catalog-types.ts`**
   - Types TypeScript pour le catalogue complet
   - `FullCatalog`, `FullGroupData`, `FullEventData`, etc.

#### Fichiers à MODIFIER:

1. **`.gitignore`**
   - Ajouter `src/data/atlantico_full_catalog.json`

2. **`src/app/[locale]/activities/[slug]/page.tsx`** (optionnel, future migration)
   - Utiliser `/api/catalog/full?groupCode=${slug}` au lieu de multiples fetchs

---

## 4. SCHÉMA JSON FINAL (TypeScript)

### 4.1 Types Principaux

```typescript
// src/lib/atlantico/catalog-types.ts

/**
 * Catalogue complet Atlantico
 */
export interface FullCatalog {
  metadata: CatalogMetadata
  groups: Record<string, FullGroupData> // key = groupCode
}

/**
 * Métadonnées du catalogue
 */
export interface CatalogMetadata {
  generatedAt: string // ISO timestamp
  lang: string // 'ENG', 'ESP', etc.
  totalGroups: number
  totalEvents: number
  version: string // '1.0.0'
  includeRaw?: boolean // true si mode DEV avec raw data
}

/**
 * Données complètes d'un groupe (tour)
 */
export interface FullGroupData {
  // Identifiants
  code: string
  id: string | null
  
  // Informations de base
  title: string
  descriptionHtml: string
  excerpt: string
  imageUrl: string | null
  
  // Métadonnées
  duration: number | null // heures
  location: string | null
  category: string | null
  classification: string | null
  
  // Pricing (depuis groupDetails ou premier event)
  fromPrice: number | null
  currency: string // 'EUR'
  
  // Events associés
  events: Record<string, FullEventData> // key = eventCode
  
  // Raw data (optionnel, DEV uniquement)
  _raw?: {
    groupList?: any
    groupDetails?: any
  }
}

/**
 * Données complètes d'un event (option/activité)
 */
export interface FullEventData {
  // Identifiants
  code: string
  id: string | null
  
  // Informations de base
  name: string
  title: string | null
  description: string | null
  shortDescription: string | null
  
  // Images
  imageUrl: string | null
  imageUrls: string[]
  
  // Pricing
  prices: EventPricing
  
  // Disponibilité
  availability: EventAvailability
  
  // Horaires/Sessions
  times: string[] // ['09:00', '14:00', ...]
  sessions: EventSession[] // Sessions avec dates
  
  // Métadonnées
  duration: number | null // heures
  location: string | null
  meetingPoint: string | null
  language: string | null
  groupSize: string | null
  
  // Raw data (optionnel, DEV uniquement)
  _raw?: {
    eventDetails?: any
    limits?: any
    prices?: any
  }
}

/**
 * Pricing d'un event
 */
export interface EventPricing {
  // Prix depuis loadPrices (date spécifique)
  byDate: Record<string, PriceBreakdown> // key = YYYY-MM-DD
  
  // Prix depuis eventDetails (fallback)
  fromEventDetails: {
    adult: number | null
    child: number | null
    infant: number | null
    currency: string
  }
  
  // Prix minimum calculé
  minPrice: number | null
  minPriceDate: string | null // YYYY-MM-DD
}

/**
 * Breakdown de prix pour une date
 */
export interface PriceBreakdown {
  adult: number | null
  child: number | null
  infant: number | null
  currency: string
  date: string // YYYY-MM-DD
}

/**
 * Disponibilité d'un event
 */
export interface EventAvailability {
  // Limites par mois
  byMonth: Record<string, MonthAvailability> // key = YYYY-MM-01
  
  // Prochaine date disponible
  nextAvailableDate: string | null // YYYY-MM-DD
  
  // Weekdays disponibles (1=Monday, 7=Sunday)
  weekdays: number[]
}

/**
 * Disponibilité pour un mois
 */
export interface MonthAvailability {
  month: string // YYYY-MM-01
  dates: Record<string, DateAvailability> // key = YYYY-MM-DD
  weekdays: number[] // [1,2,3,4,5,6,7]
}

/**
 * Disponibilité pour une date
 */
export interface DateAvailability {
  date: string // YYYY-MM-DD
  limit: number
  used: number
  remaining: number
  available: boolean
}

/**
 * Session d'un event (date + horaire)
 */
export interface EventSession {
  date: string // YYYY-MM-DD
  time: string // '09:00'
  available: boolean
  remaining: number
}
```

### 4.2 Exemple JSON (extrait)

```json
{
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "lang": "ENG",
    "totalGroups": 150,
    "totalEvents": 450,
    "version": "1.0.0",
    "includeRaw": false
  },
  "groups": {
    "1317": {
      "code": "1317",
      "id": "1317",
      "title": "Teide Sunset Tour",
      "descriptionHtml": "<p>Experience the sunset...</p>",
      "excerpt": "Experience the sunset from the highest point in Spain...",
      "imageUrl": "https://static.atlantico-excursiones.com/images/teide-sunset.jpg",
      "duration": 8,
      "location": "Tenerife",
      "category": "EXCURSIONS",
      "classification": "NATURE",
      "fromPrice": 45.00,
      "currency": "EUR",
      "events": {
        "1317": {
          "code": "1317",
          "id": "1317",
          "name": "Teide Sunset Tour",
          "title": "Teide Sunset Tour",
          "description": "Full description...",
          "imageUrl": "https://static.atlantico-excursiones.com/images/teide-sunset.jpg",
          "imageUrls": ["https://..."],
          "prices": {
            "byDate": {
              "2024-01-20": {
                "adult": 45.00,
                "child": 25.00,
                "infant": 0,
                "currency": "EUR",
                "date": "2024-01-20"
              }
            },
            "fromEventDetails": {
              "adult": 45.00,
              "child": 25.00,
              "infant": 0,
              "currency": "EUR"
            },
            "minPrice": 45.00,
            "minPriceDate": "2024-01-20"
          },
          "availability": {
            "byMonth": {
              "2024-01-01": {
                "month": "2024-01-01",
                "dates": {
                  "2024-01-20": {
                    "date": "2024-01-20",
                    "limit": 50,
                    "used": 10,
                    "remaining": 40,
                    "available": true
                  }
                },
                "weekdays": [1,2,3,4,5,6,7]
              }
            },
            "nextAvailableDate": "2024-01-20",
            "weekdays": [1,2,3,4,5,6,7]
          },
          "times": ["09:00", "14:00", "18:00"],
          "sessions": [
            {
              "date": "2024-01-20",
              "time": "09:00",
              "available": true,
              "remaining": 40
            }
          ],
          "duration": 8,
          "location": "Tenerife",
          "meetingPoint": "Hotel pickup",
          "language": "ENG",
          "groupSize": "Max 50"
        }
      }
    }
  }
}
```

---

## 5. POINTS DE PERFORMANCE/SÉCURITÉ

### 5.1 Performance

1. **Concurrency**
   - Groups: 5 parallèles
   - Events par group: 3 parallèles
   - Limits/Prices: 5 parallèles
   - Timeout global: 30s par group

2. **Cache**
   - JSON file: Persistant entre redémarrages
   - HTTP cache: 1h (stale-while-revalidate 10min)
   - Revalidation: Manuel via POST /api/catalog/refresh

3. **Taille du fichier**
   - Estimer: ~150 groups × ~3 events × ~50KB = ~22MB
   - Compression: Gzip automatique (Next.js)
   - Streaming: Possible si > 50MB

4. **Timeouts**
   - Fetch Atlantico: 10s (configurable)
   - Job total: 5min max (fail si timeout)
   - Retry: 2 tentatives avec backoff

### 5.2 Sécurité

1. **Protection refresh**
   - POST /api/catalog/refresh protégé par `x-admin-password` header
   - Vérification: `header === process.env.ADMIN_PASSWORD`
   - Retourne 401 si incorrect

2. **Fichier JSON**
   - Ajouté à `.gitignore` (ne pas commiter)
   - Permissions: 644 (readable par serveur)
   - Pas de secrets dans le JSON

3. **Raw data**
   - `includeRaw=true` uniquement en DEV
   - Production: `includeRaw=false` (réduit taille)

4. **Rate limiting** (optionnel)
   - Max 1 refresh toutes les 5 minutes
   - Lock file pour éviter refresh concurrents

### 5.3 Logs DEV

```typescript
// Exemples de logs
console.log('[HYDRATION_START]', { lang, includeRaw })
console.log('[HYDRATION_GROUP]', { code, eventsCount, duration: 'Xms' })
console.log('[HYDRATION_EVENT]', { code, hasPrice, hasAvailability })
console.log('[HYDRATION_STATS]', {
  totalGroups: 150,
  totalEvents: 450,
  withPrice: 400,
  withAvailability: 420,
  errors: 5,
  duration: '2m30s'
})
```

---

## 6. VARIABLES D'ENV REQUISES

### 6.1 Existantes (déjà utilisées)
- `ATLANTICO_BASE_URL` - URL base API Atlantico
- `ATLANTICO_TOKEN` - Token auth (optionnel)
- `ATLANTICO_TIMEOUT_MS` - Timeout fetch (défaut: 10000)
- `ATLANTICO_REVALIDATE_SECONDS` - Cache revalidation (défaut: 300)
- `ATLANTICO_GROUP_IDS` - Liste group IDs autorisés (optionnel, format: "31,32,33")
- `ATLANTICO_OFFICE` - Code office pour loadPrices (optionnel)
- `ADMIN_PASSWORD` - Mot de passe pour refresh (déjà utilisé)

### 6.2 Nouvelles (optionnelles)
- `CATALOG_HYDRATION_MAX_CONCURRENT_GROUPS` - Max groups parallèles (défaut: 5)
- `CATALOG_HYDRATION_MAX_CONCURRENT_EVENTS` - Max events parallèles (défaut: 3)
- `CATALOG_HYDRATION_TIMEOUT_MS` - Timeout total job (défaut: 300000 = 5min)
- `CATALOG_INCLUDE_RAW` - Inclure raw data en production (défaut: false, DEV: true)

---

## 7. PLAN D'IMPLÉMENTATION

### Phase 1: Infrastructure
1. Créer `src/lib/atlantico/catalog-types.ts` (types)
2. Créer `src/lib/atlantico/hydration.ts` (job)
3. Créer `src/app/api/catalog/refresh/route.ts` (POST)
4. Créer `src/app/api/catalog/full/route.ts` (GET)
5. Ajouter `src/data/atlantico_full_catalog.json` à `.gitignore`

### Phase 2: Test
1. Tester POST /api/catalog/refresh (génère JSON)
2. Tester GET /api/catalog/full (lit JSON)
3. Vérifier taille fichier, performance, logs

### Phase 3: Migration UI (optionnel, future)
1. Modifier `src/app/[locale]/activities/[slug]/page.tsx` pour utiliser `/api/catalog/full`
2. Réduire appels API multiples → 1 seul fetch

---

## 8. ESTIMATIONS

- **Temps d'hydratation**: ~2-5 minutes pour 150 groups
- **Taille fichier**: ~20-30MB (sans raw), ~50-100MB (avec raw)
- **Temps de chargement GET**: < 100ms (lecture fichier)
- **Fréquence refresh**: 1x/jour ou manuel

---

## 9. AVANTAGES

1. **Performance**: 1 seul fetch au lieu de N×4
2. **Stabilité**: Pas de dépendance réseau à chaque requête
3. **Complétude**: Toutes les données en un seul endroit
4. **Debug**: Raw data disponible en DEV
5. **Scalabilité**: Cache persistant, refresh manuel

---

## 10. INCONVÉNIENTS / LIMITATIONS

1. **Données statiques**: Nécessite refresh manuel pour updates
2. **Taille fichier**: Peut être volumineux (20-100MB)
3. **Complexité**: Job d'hydratation complexe
4. **Maintenance**: Gérer les erreurs partielles (certains groups/events peuvent échouer)

---

FIN DU DOCUMENT























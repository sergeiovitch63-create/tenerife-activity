# Audit Intégration Atlantico - État Actuel

**Date:** 2026-01-16  
**Auditeur:** Senior Fullstack Review  
**Scope:** Intégration complète Atlantico API dans Next.js App Router

---

## 1) Endpoints Atlantico Câblés

### Routes API Next.js (`/api/atlantico/*`)

| Endpoint | Fichier | Fonction | Status |
|----------|---------|----------|--------|
| `GET /api/atlantico/health` | `src/app/api/atlantico/health/route.ts` | Health check | ✅ OK |
| `GET /api/atlantico/ip` | `src/app/api/atlantico/ip/route.ts` | IP publique serveur | ✅ OK |
| `GET /api/atlantico/catalog` | `src/app/api/atlantico/catalog/route.ts` | Liste classifications + groups | ✅ OK |
| `GET /api/atlantico/catalog/[lang]` | `src/app/api/atlantico/catalog/[lang]/route.ts` | Catalog complet par langue | ✅ OK |
| `GET /api/atlantico/group/[groupId]/[lang]` | `src/app/api/atlantico/group/[groupId]/[lang]/route.ts` | Détails d'un group | ✅ OK |
| `GET /api/atlantico/group-details/[code]/[lang]` | `src/app/api/atlantico/group-details/[code]/[lang]/route.ts` | Détails group (alternatif) | ✅ OK |
| `GET /api/atlantico/event/[eventCode]/[lang]` | `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts` | Détails d'un event | ✅ OK |
| `GET /api/atlantico/prices/[eventCode]` | `src/app/api/atlantico/prices/[eventCode]/route.ts` | Prix pour date (`loadPrices`) | ✅ OK |
| `GET /api/atlantico/availability/[eventCode]/[lang]` | `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts` | Disponibilité (`loadLimits`) | ✅ OK |
| `GET /api/atlantico/tours/[lang]` | `src/app/api/atlantico/tours/[lang]/route.ts` | Tours enrichis | ⚠️ Legacy |
| `GET /api/atlantico/tours-enriched/[lang]` | `src/app/api/atlantico/tours-enriched/[lang]/route.ts` | Tours avec pricing | ⚠️ Legacy |
| `GET /api/atlantico/tours-pricing/[lang]` | `src/app/api/atlantico/tours-pricing/[lang]/route.ts` | Pricing uniquement | ⚠️ Legacy |
| `GET /api/atlantico/catalog-debug/[lang]` | `src/app/api/atlantico/catalog-debug/[lang]/route.ts` | Debug catalog | 🔧 DEV |
| `GET /api/atlantico/debug-classifications/[lang]` | `src/app/api/atlantico/debug-classifications/[lang]/route.ts` | Debug classifications | 🔧 DEV |
| `GET /api/atlantico/debug-images/[lang]` | `src/app/api/atlantico/debug-images/[lang]/route.ts` | Debug images | 🔧 DEV |
| `GET /api/atlantico/debug-item-schema/[lang]` | `src/app/api/atlantico/debug-item-schema/[lang]/route.ts` | Debug schema | 🔧 DEV |
| `GET /api/atlantico/debug-pricing/[groupCode]/[lang]` | `src/app/api/atlantico/debug-pricing/[groupCode]/[lang]/route.ts` | Debug pricing | 🔧 DEV |

### Super Catalog (`/api/catalog/*`)

| Endpoint | Fichier | Fonction | Status |
|----------|---------|----------|--------|
| `GET /api/catalog/full` | `src/app/api/catalog/full/route.ts` | Catalog complet (cache JSON) | ✅ **PRINCIPAL** |
| `GET /api/catalog/item` | `src/app/api/catalog/item/route.ts` | Item unique (id/slug) | ✅ OK |
| `POST /api/catalog/refresh` | `src/app/api/catalog/refresh/route.ts` | Régénère cache (admin) | ✅ OK |

### Services & Helpers (`src/lib/atlantico/*`)

| Fichier | Fonction | Status |
|---------|----------|--------|
| `config.ts` | Configuration API (baseUrl, timeout, token) | ✅ OK |
| `fetch.ts` | Fetch avec retry/timeout | ✅ OK |
| `client.ts` | Client unifié (`atlanticoGet`, `buildAtlanticoImageUrl`) | ✅ OK |
| `images.ts` | Extraction/normalisation URLs images | ✅ OK |
| `mappers.ts` | Mapping Atlantico → Domain entities | ✅ OK |
| `pricing.ts` | Pricing utilities (`getNextAvailableDate`, `getPriceForDate`) | ✅ OK |
| `limits.ts` | Parsing `loadLimits` + calcul next date | ✅ OK |
| `prices.ts` | Parsing `loadPrices` response | ✅ OK |
| `price-normalize.ts` | Normalisation prix depuis raw | ✅ OK |
| `quality.ts` | Évaluation qualité tour + filtrage | ✅ OK |
| `hydration.ts` | Hydration complète (core + dynamic) | ✅ OK |
| `catalog-types.ts` | Types TypeScript (FullTour, FullEvent, etc.) | ✅ OK |
| `date.ts` | Utilitaires dates (YYYY-MM-DD, etc.) | ✅ OK |
| `locale.ts` | Mapping locale → lang Atlantico | ✅ OK |
| `vip-detection.ts` | Détection VIP (⚠️ **DÉPRÉCIÉ** - curation manuelle maintenant) | ❌ OBSOLÈTE |

---

## 2) Flow de Données Actuel

### Architecture: **Super Catalog (Cache JSON)**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. RÉGÉNÉRATION CACHE (Admin)                               │
│    POST /api/catalog/refresh                                │
│    → hydrateFullCatalog()                                   │
│    → Appelle Atlantico API:                                 │
│      • /clasificationList/{lang}                            │
│      • /groupsList/{lang}/{page}                            │
│      • /groupDetails/{groupId}/{lang}                        │
│      • /eventDetails/{eventCode}/{lang}                      │
│      • /loadPrices/{eventCode}/{date}/{office?}              │
│      • /loadLimits/{eventCode}/{lang}/{month}                │
│    → Écrit dans:                                            │
│      • data/atlantico_catalog_core.json (stable)              │
│      • data/atlantico_catalog_dynamic.json (prices/limits)    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LECTURE CACHE (Front-end)                                │
│    GET /api/catalog/full?lang=ENG&merged=1&mode=sellable    │
│    → Lit data/atlantico_catalog_core.json                   │
│    → Lit data/atlantico_catalog_dynamic.json                │
│    → Merge core + dynamic                                    │
│    → Lit data/curation.json                                 │
│    → Applique curation (enabled/featured/priority/vibe_id) │
│    → Applique overrides (image/title/description)           │
│    → Filtre mode=sellable (quality.ts)                      │
│    → Retourne FullTour[]                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PAGE DÉTAIL                                              │
│    GET /api/catalog/item?slug=xxx&merged=1                  │
│    → Même logique que /full mais pour 1 item                │
│    → Utilisé par /activities/[slug]                         │
└─────────────────────────────────────────────────────────────┘
```

### Points Clés:

- **Pas de DB Supabase pour les activités** → Cache JSON uniquement (`data/*.json`)
- **Curation manuelle** → `data/curation.json` (enabled/featured/priority/vibe_id/overrides)
- **Pas de write DB** → Pas de stockage des bookings/réservations
- **Cache statique** → Régénéré manuellement via `/api/catalog/refresh` (admin)

### Où ça casse:

1. **Cache stale** → Si `atlantico_catalog_core.json` est vieux, données obsolètes
2. **Prix/dispo non à jour** → `dynamic.json` doit être rafraîchi régulièrement
3. **Pas de fallback live** → Si cache corrompu, pas de fallback vers API directe
4. **Pas de DB** → Impossible de tracker les bookings/analytics

---

## 3) Modèle Interne

### Type Principal: `FullTour` (`src/lib/atlantico/catalog-types.ts`)

```typescript
interface FullTour {
  id: string                    // Event code ou group code
  code?: string                 // Code Atlantico
  slug: string                  // Slug URL-friendly
  title: string                 // Titre
  description: string           // Description complète
  image: string | null          // Image principale
  duration: number | null       // Durée en heures
  basePrice?: number | null     // Prix de base
  currency: 'EUR'               // Devise
  events: FullEvent[]           // Options/horaires
  
  // Curation (merged=1)
  enabled?: boolean
  featured?: boolean
  priority?: number
  vibe_id?: string | null
  
  // Overrides (merged=1)
  imageOverrideUrl?: string | null
  titleOverride?: string | null
  shortDescriptionOverride?: string | null
  
  // Display (computed, merged=1)
  displayTitle?: string         // titleOverride ?? title
  displayDescription?: string   // shortDescriptionOverride ?? description
  displayImage?: string | null  // imageOverrideUrl ?? image ?? fallback
}
```

### Type Event: `FullEvent`

```typescript
interface FullEvent {
  id: string                    // Event code
  title?: string                // Titre option
  days?: string[]               // ['Monday', 'Tuesday', ...]
  times?: string[]              // ['09:00', '14:00', ...]
  price?: EventPrice            // Prix pour date
  availability?: EventAvailability // Dispo par mois
}
```

### Type Domain: `Experience` (`src/core/entities/experience.ts`)

```typescript
interface Experience {
  id: string
  slug: string
  title: string
  description: string
  price: number
  currency: string
  imageUrl?: string
  vibeId: string
  // ... autres champs
}
```

**⚠️ Problème:** `Experience` est un modèle legacy. Le code utilise maintenant `FullTour` directement.

### Base de Données

**❌ Aucune table Supabase pour les activités.**

- Pas de table `experiences`
- Pas de table `bookings`
- Pas de table `reservations`
- Curation stockée dans `data/curation.json` (fichier local)

**✅ Supabase utilisé uniquement pour:**
- Admin auth (si configuré)
- Potentiellement d'autres features non-Atlantico

---

## 4) Gestion des Images

### Flow Images

1. **Extraction** (`src/lib/atlantico/images.ts`)
   - `extractCoverImage()` → Extrait 1ère image depuis raw Atlantico
   - `extractImageUrls()` → Extrait toutes les images
   - Priorités: `imageUrl` → `image` → `imageFilename` → `images[]` → `photos[]`

2. **Normalisation** (`src/lib/atlantico/client.ts`)
   - `buildAtlanticoImageUrl()` → Convertit filename → URL complète
   - Base URL: `ATLANTICO_IMAGES_BASE_URL` ou `ATLANTICO_BASE_URL/images`
   - Fallback: `https://static.atlantico-excursiones.com/images` (⚠️ peut ne pas résoudre)

3. **Override** (Curation)
   - `imageOverrideUrl` dans `curation.json` → Priorité absolue
   - `displayImage` = `imageOverrideUrl ?? image ?? fallback`

4. **Fallback** (`src/lib/images/fallback.ts`)
   - `getFallbackImageForTour()` → Placeholder déterministique
   - Mapping vibe → placeholder (`/placeholders/hiking.jpg`, etc.)
   - Hash du slug si pas de mapping

### Configuration Next.js

```javascript
// next.config.mjs
images: {
  remotePatterns: [
    { hostname: '**.atlantico-excursiones.com' },
    { hostname: 'api.tenerife-activity.com' }, // ✅ Ajouté récemment
  ]
}
```

### Problèmes Potentiels

- ⚠️ Base URL images peut être incorrecte (NXDOMAIN sur `static.atlantico-excursiones.com`)
- ✅ Override curation fonctionne
- ✅ Fallback placeholders fonctionne

---

## 5) État Fonctionnalités

| Fonctionnalité | Status | Fichiers | Notes |
|----------------|--------|----------|-------|
| **Catalogue (liste activités)** | ✅ **OK** | `src/app/api/catalog/full/route.ts`<br>`src/app/[locale]/activities/page.tsx` | Cache JSON, filtrage qualité, curation |
| **Détails activité** | ✅ **OK** | `src/app/api/catalog/item/route.ts`<br>`src/app/[locale]/activities/[slug]/page.tsx` | Merge core+dynamic, curation, overrides |
| **Event/options (zones/horaire)** | ✅ **OK** | `FullEvent` dans cache | `days[]`, `times[]`, `meetingPoints[]` |
| **Prix (loadPrices)** | ✅ **OK** | `src/lib/atlantico/pricing.ts`<br>`src/app/api/atlantico/prices/[eventCode]/route.ts` | Endpoint OK, parsing OK, cache 60s |
| **Dispo (loadLimits)** | ✅ **OK** | `src/lib/atlantico/limits.ts`<br>`src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts` | Parsing multiple formats, nextDate calculé |
| **Réservation (confirm/payment)** | ❌ **MANQUE** | - | Pas d'endpoint, pas de DB, redirect externe uniquement |
| **Annulation (cancelBooking)** | ❌ **MANQUE** | - | Pas d'endpoint, pas de DB |

### Détails

**✅ Catalogue:**
- Cache JSON (`atlantico_catalog_core.json` + `dynamic.json`)
- Filtrage qualité (`quality.ts` exclut zones/transport)
- Curation manuelle (`curation.json`)
- Mode `sellable` filtre les non-bookables

**✅ Détails:**
- Merge core + dynamic
- Curation overrides (image/title/description)
- Display fields calculés
- Events avec prix/dispo

**✅ Prix:**
- Endpoint `/api/atlantico/prices/[eventCode]?date=YYYY-MM-DD`
- Parsing `loadPrices` response (`parseLoadPricesResponse`)
- Fallback vers `eventDetails` raw price si `loadPrices` échoue
- Cache 60s

**✅ Dispo:**
- Endpoint `/api/atlantico/availability/[eventCode]/[lang]?month=YYYY-MM-01`
- Parsing multiple formats (`dates.wdays[]`, `dates[]`, etc.)
- Calcul `nextAvailableDate` (`pickNextAvailableDateFromLimits`)
- Cache 60s

**❌ Réservation:**
- Pas d'endpoint `/api/atlantico/booking` ou `/api/booking`
- Pas de DB pour stocker bookings
- Redirect externe uniquement (`/out/booking?slug=xxx`)
- Pas de confirmation/payment tracking

**❌ Annulation:**
- Pas d'endpoint
- Pas de DB pour tracker annulations

---

## 6) Erreurs/Logs Récents

### Erreur: "South Area" affiché comme activité

**Cause:** Filtrage qualité insuffisant dans `quality.ts`

**Fichiers concernés:**
- `src/lib/atlantico/quality.ts` (ligne 239-241)
- `src/app/api/catalog/route.ts` (ligne 134-147)

**Logique actuelle:**
```typescript
// Exclut si title contient "area/zone" ET pas de prix ET pas d'image
const isAreaZone = titleLower.includes('area') || titleLower.includes('zone')
if (isAreaZone && !price && !image) {
  // Exclu
}
```

**Problème:** Si une zone a un prix ou une image, elle passe le filtre.

**Solution:** Exclure systématiquement les zones/areas, indépendamment du prix/image.

### Autres Erreurs Potentielles

1. **Images non résolues**
   - Base URL `static.atlantico-excursiones.com` peut être NXDOMAIN
   - **Fix:** Utiliser `ATLANTICO_IMAGES_BASE_URL` ou découvrir via `/api/debug/image-host`

2. **Cache stale**
   - Si `atlantico_catalog_core.json` est vieux, données obsolètes
   - **Fix:** Régénérer via `/api/catalog/refresh` régulièrement

3. **Prix/dispo non à jour**
   - `dynamic.json` doit être rafraîchi quotidiennement
   - **Fix:** Cron job pour refresh dynamic uniquement

4. **VIP detection obsolète**
   - `isVipTour()` dans `vip-detection.ts` n'est plus utilisé
   - **Fix:** Supprimer le fichier (déjà remplacé par curation manuelle)

---

## 7) Plan d'Action (Priorité Haute → Basse)

### 🔴 Priorité HAUTE

#### 1. Fixer filtrage zones/areas
**Fichier:** `src/lib/atlantico/quality.ts`  
**Action:** Exclure systématiquement les titres contenant "area", "zone", "south area", "north area", etc., même s'ils ont un prix/image.  
**Test:** Vérifier que `/api/catalog/full?mode=sellable` ne retourne plus "South Area".

#### 2. Vérifier base URL images
**Fichier:** `src/lib/atlantico/client.ts`  
**Action:** Tester que `ATLANTICO_IMAGES_BASE_URL` ou `ATLANTICO_BASE_URL/images` résout correctement. Si NXDOMAIN, découvrir la bonne URL via `/api/debug/image-host`.  
**Test:** Vérifier qu'une activité sans override affiche bien son image.

#### 3. Stabiliser cache refresh
**Fichier:** `src/app/api/catalog/refresh/route.ts`  
**Action:** Ajouter validation que le cache généré est valide (itemCount > 0, items non vides). Ajouter rollback si refresh échoue.  
**Test:** Tester refresh avec données invalides.

### 🟡 Priorité MOYENNE

#### 4. Ajouter fallback live si cache corrompu
**Fichier:** `src/app/api/catalog/full/route.ts`  
**Action:** Si cache JSON est corrompu ou vide, fallback vers API Atlantico directe (avec limite de rate).  
**Test:** Supprimer `atlantico_catalog_core.json` et vérifier que l'API fonctionne quand même.

#### 5. Automatiser refresh dynamic (prices/limits)
**Fichier:** Nouveau script/cron  
**Action:** Cron job quotidien pour refresh uniquement `dynamic.json` (prices/limits) sans toucher `core.json`.  
**Test:** Vérifier que les prix/dispo sont à jour après refresh.

#### 6. Nettoyer code legacy
**Fichiers:** 
- `src/lib/atlantico/vip-detection.ts` (supprimer)
- `src/data/atlantico/atlantico-experience.repository.ts` (marquer deprecated)
- `src/app/api/atlantico/tours/*` (marquer deprecated)

**Action:** Supprimer ou marquer clairement comme deprecated.  
**Test:** Vérifier qu'aucune page n'utilise ces endpoints.

### 🟢 Priorité BASSE

#### 7. Ajouter monitoring cache
**Fichier:** Nouveau endpoint `/api/catalog/status`  
**Action:** Endpoint qui retourne l'âge du cache, nombre d'items, dernière mise à jour.  
**Test:** Vérifier que l'endpoint retourne les bonnes infos.

#### 8. Optimiser merge core+dynamic
**Fichier:** `src/app/api/catalog/full/route.ts`  
**Action:** Si `dynamic.json` est absent, retourner quand même `core.json` (sans prix/dispo).  
**Test:** Supprimer `dynamic.json` et vérifier que l'API fonctionne.

#### 9. Ajouter validation schéma
**Fichier:** `src/lib/atlantico/catalog-types.ts`  
**Action:** Ajouter validation runtime que `FullTour` respecte le schéma (Zod ou similaire).  
**Test:** Tester avec cache corrompu.

#### 10. Documenter endpoints
**Fichier:** `docs/atlantico-api.md` (nouveau)  
**Action:** Documenter tous les endpoints, leurs params, leurs réponses, leurs erreurs.  
**Test:** Vérifier que la doc est à jour.

---

## Résumé Exécutif

**✅ Ce qui fonctionne:**
- Super Catalog (cache JSON) avec merge core+dynamic
- Curation manuelle (enabled/featured/priority/vibe_id/overrides)
- Prix et disponibilité (endpoints OK, parsing OK)
- Images avec override et fallback
- Pages liste et détail

**❌ Ce qui manque:**
- Réservation/booking (pas d'endpoint, pas de DB)
- Annulation (pas d'endpoint, pas de DB)
- Refresh automatique du cache
- Fallback live si cache corrompu

**⚠️ Ce qui casse:**
- Zones/areas affichées comme activités (filtrage insuffisant)
- Images peuvent ne pas résoudre (base URL incorrecte)
- Cache peut être stale (pas de refresh automatique)

**🎯 Actions immédiates:**
1. Fixer filtrage zones/areas (1h)
2. Vérifier base URL images (30min)
3. Stabiliser cache refresh (1h)

**Total estimé:** 2h30 pour stabiliser l'affichage d'une activité proprement.














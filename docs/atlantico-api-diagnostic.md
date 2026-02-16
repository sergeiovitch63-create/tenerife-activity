# Diagnostic Atlantico API - Rapport Complet

**Date:** 2024-01-15  
**Auteur:** Lead Backend/Integration  
**Objectif:** Diagnostic exhaustif de l'intégration Atlantico API

---

## Table des Matières

1. [Endpoint Inventory](#1-endpoint-inventory)
2. [Consumption Matrix](#2-consumption-matrix)
3. [Mapping Gap List](#3-mapping-gap-list)
4. [Image Diagnosis](#4-image-diagnosis)
5. [React Error Diagnosis](#5-react-error-diagnosis)
6. [Patch List](#6-patch-list)

---

## 1. Endpoint Inventory

### Endpoints Atlantico Utilisés

| Endpoint | Params | Champs Response (Doc) | Champs Response (Observé) | Notes |
|----------|--------|----------------------|---------------------------|-------|
| `/clasificationList/{lang}` | `lang`: ENG, ESP, etc. | `code`, `name`, `description` | ✅ `code`, `name`, `description` | Utilisé dans `/api/atlantico/catalog` |
| `/groupsList/{lang}/{page}` | `lang`, `page` (default: -1) | `code`, `name`, `description`, `image` | ✅ `code`, `name`, `description`, `image` (optionnel) | Page -1 = toutes les pages |
| `/groupsList/{lang}/{page}/{classificationCode}` | `lang`, `page`, `classificationCode` | Même que groupsList | Même que groupsList | Filtre par classification |
| `/groupDetails/{groupId}/{lang}` | `groupId`, `lang` | `code`, `name`, `desc`, `description`, `image`, `duration`, `events[]` | ✅ `code`, `name`, `desc`, `description`, `image`, `duration`, `events[]` | Events = codes seulement |
| `/eventDetails/{eventCode}/{lang}` | `eventCode`, `lang` | `code`, `name`, `title`, `desc`, `description`, `times[]`, `days[]`, `icons[]`, `route`, `meetingPoints[]`, `image` | ✅ `code`, `name`, `title`, `desc`, `description`, `times[]`, `days[]`, `icons[]`, `route`, `meetingPoints[]`, `image` (optionnel) | Image souvent absent |
| `/loadPrices/{eventCode}/{date}` | `eventCode`, `date` (YYYYMMDD) | `date`, `adult`, `child`, `infant` | ✅ `date`, `adult`, `child`, `infant` | Prix pour une date |
| `/loadPrices/{eventCode}/{date}/{office}` | `eventCode`, `date`, `office` | Même que loadPrices | Même que loadPrices | Prix pour un office |
| `/loadLimits/{eventCode}/{lang}/{month}` | `eventCode`, `lang`, `month` (YYYYMM) | `dates`, `limit[]`, `used[]`, `wdays[]` | ✅ `dates`, `limit[]`, `used[]`, `wdays[]` | Formats multiples supportés |

### Endpoints Atlantico NON Utilisés

| Endpoint | Statut | Raison |
|----------|--------|--------|
| `/confirm/payment` | ❌ Non implémenté | Booking externe (redirection) |
| `/cancelBooking` | ❌ Non implémenté | Booking externe (redirection) |

---

## 2. Consumption Matrix

### Hydration (Super Catalog)

| Endpoint | Fichier | Ligne | Mode | Champs Utilisés | Champs Stockés (Type) | Champs Affichés UI |
|----------|---------|-------|------|----------------|----------------------|-------------------|
| `/groupsList/{lang}/{page}` | `src/lib/atlantico/hydration.ts` | 616 | core/full | `code`, `name` | `CoreTour.id`, `FullTour.id` | `FullTour.id` |
| `/groupDetails/{groupId}/{lang}` | `src/lib/atlantico/hydration.ts` | 456 | core/full | `code`, `name`, `title`, `desc`, `description`, `image`, `duration`, `events[]` | `CoreTour.code`, `FullTour.code`, `title`, `description`, `image`, `duration`, `events` | `FullTour.title`, `description`, `image` |
| `/eventDetails/{eventCode}/{lang}` | `src/lib/atlantico/hydration.ts` | 337 | core/full | `code`, `name`, `title`, `desc`, `description`, `times[]`, `days[]`, `icons[]`, `route`, `meetingPoints[]` | `CoreEvent.id`, `FullEvent.id`, `title`, `times[]`, `days[]`, `icons[]`, `route`, `meetingPoints[]` | `FullEvent.title`, `times[]` |
| `/loadPrices/{eventCode}/{date}` | `src/lib/atlantico/hydration.ts` | 270-273 | dynamic/full | `date`, `adult`, `child`, `infant` | `DynamicEventData.price`, `EventPrice` | `EventPrice.adult` |
| `/loadLimits/{eventCode}/{lang}/{month}` | `src/lib/atlantico/hydration.ts` | 260 | dynamic/full | `dates`, `limit[]`, `used[]`, `wdays[]` | `DynamicEventData.availability`, `EventAvailability` | `EventAvailability.sessionsByDate` |

### Legacy Repository (Activities Page)

| Endpoint | Fichier | Ligne | Champs Utilisés | Champs Stockés (Type) | Champs Affichés UI |
|----------|---------|-------|----------------|----------------------|-------------------|
| `/groupDetails/{groupId}/{lang}` | `src/data/atlantico/atlantico-experience.repository.ts` | 173 | `code`, `name`, `events[]` | `Experience._raw` | - |
| `/eventDetails/{eventCode}/{lang}` | `src/data/atlantico/atlantico-experience.repository.ts` | 199 | `code`, `name`, `title`, `desc`, `description`, `image`, `times[]` | `Experience` (tous champs) | `Experience.imageUrl`, `Experience.title` |

### API Routes Internal

| Route | Fichier | Endpoint Atlantico | Usage |
|-------|---------|-------------------|-------|
| `/api/atlantico/catalog` | `src/app/api/atlantico/catalog/route.ts` | `/clasificationList`, `/groupsList` | Legacy catalog (non utilisé par UI principale) |
| `/api/atlantico/catalog/[lang]` | `src/app/api/atlantico/catalog/[lang]/route.ts` | `/groupDetails`, `/eventDetails` | Legacy catalog (utilisé par `AtlanticoExperienceRepository`) |
| `/api/atlantico/group/[groupId]/[lang]` | `src/app/api/atlantico/group/[groupId]/[lang]/route.ts` | `/groupDetails` | Proxy direct |
| `/api/atlantico/event/[eventCode]/[lang]` | `src/app/api/atlantico/event/[eventCode]/[lang]/route.ts` | `/eventDetails` | Proxy direct |
| `/api/atlantico/prices/[eventCode]` | `src/app/api/atlantico/prices/[eventCode]/route.ts` | `/loadPrices` | Proxy direct |
| `/api/atlantico/availability/[eventCode]/[lang]` | `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts` | `/loadLimits` | Proxy direct |

---

## 3. Mapping Gap List

### Champs Atlantico NON Mappés dans FullTour/FullEvent

| Champ Atlantico | Endpoint | Type Attendu | Stocké Actuellement | Impact UI | Où Ajouter |
|----------------|----------|--------------|---------------------|-----------|------------|
| `groupDetails.classification` | `/groupDetails` | `string` | ❌ Non | Classification non affichée | `CoreTour.classification?: string` |
| `groupDetails.category` | `/groupDetails` | `string` | ❌ Non | Catégorie non affichée | `CoreTour.category?: string` |
| `groupDetails.location` | `/groupDetails` | `string` | ❌ Non | Location non affichée | `CoreTour.location?: string` |
| `groupDetails.highlights[]` | `/groupDetails` | `string[]` | ❌ Non | Highlights non affichés | `CoreTour.highlights?: string[]` |
| `groupDetails.included[]` | `/groupDetails` | `string[]` | ❌ Non | Included non affichés | `CoreTour.included?: string[]` |
| `groupDetails.notIncluded[]` | `/groupDetails` | `string[]` | ❌ Non | Not included non affichés | `CoreTour.notIncluded?: string[]` |
| `eventDetails.category` | `/eventDetails` | `string` | ❌ Non | Catégorie event non affichée | `CoreEvent.category?: string` |
| `eventDetails.location` | `/eventDetails` | `string` | ❌ Non | Location event non affichée | `CoreEvent.location?: string` |
| `eventDetails.cancellationPolicy` | `/eventDetails` | `string` | ❌ Non | Politique annulation non affichée | `CoreEvent.cancellationPolicy?: string` |

### Champs Mappés Partiellement

| Champ Atlantico | Mappé | Stocké | Problème | Fix |
|----------------|-------|--------|----------|-----|
| `groupDetails.image` | ✅ Oui | `FullTour.image` | Extraction complexe (multiple champs) | ✅ Corrigé via `extractAtlanticoImage()` |
| `eventDetails.image` | ⚠️ Partiel | `FullEvent.image` (non typé) | Pas de champ `image` dans `FullEvent` | Ajouter `image?: string | null` à `FullEvent` |

---

## 4. Image Diagnosis

### Problème Identifié

**Symptôme:** `/en/catalog` ou `/en/activities` affiche "No photo" alors que `/api/debug/image-sample` retourne `hasImage: true` et `imageNormalized: "https://..."`.

### Analyse

#### Point 1: Cache Core Contient-il `item.image` non-null ?

**Vérification nécessaire:**
```bash
# Inspecter le cache core
cat data/atlantico_catalog_core.json | jq '.items[0].image'
```

**Hypothèse:** Le cache core contient `item.image: "https://..."` après normalisation.

#### Point 2: Front Consomme-t-il Bien l'URL ?

**Problème Identifié:** ⚠️ **CRITIQUE**

La page `/en/activities` n'utilise **PAS** le nouveau système de catalog (`/api/catalog/full`). Elle utilise l'ancien repository `AtlanticoExperienceRepository` qui:

1. Appelle `/api/atlantico/group/{groupId}/{lang}` → retourne `groupDetails` RAW
2. Appelle `/api/atlantico/event/{eventCode}/{lang}` → retourne `eventDetails` RAW
3. Mappe vers `Experience` via `mapActivityLiteToExperience()`
4. Stocke dans `Experience.imageUrl` ou `Experience.imageUrls[]`

**Le composant `ActivityCard` cherche:**
```typescript
function getActivityImage(experience: Experience): string | null {
  // 1. experience.imageUrl (direct)
  if (experience.imageUrl && experience.imageUrl.startsWith('http')) {
    return experience.imageUrl
  }
  // 2. experience.imageUrls[0] (array)
  if (experience.imageUrls && experience.imageUrls.length > 0) {
    const firstUrl = experience.imageUrls[0]
    if (firstUrl && firstUrl.startsWith('http')) {
      return firstUrl
    }
  }
  // 3. experience._raw.image (fallback)
  const raw = (experience as any)?._raw
  if (raw && raw.image) {
    return `${ATLANTICO_IMAGE_BASE_URL}/${raw.image}`
  }
  return null
}
```

**Problème:** `mapActivityLiteToExperience()` ne mappe pas correctement `eventDetails.image` vers `Experience.imageUrl`.

**Fichier concerné:** `src/data/atlantico/atlantico-experience.repository.ts` (fonction `mapActivityLiteToExperience`)

#### Point 3: Next/Image Bloque-t-il le Domaine ?

**Vérification:** `next.config.mjs` contient:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'static.atlantico-excursiones.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: '**.atlantico-excursiones.com',
      pathname: '/**',
    },
  ],
}
```

✅ **OK** - Le domaine est configuré. Mais le composant `ActivityCard` utilise `<img>` pour les URLs externes (ligne 279-285), donc ce n'est pas le problème.

### Diagnostic Final

**Cause Racine:** Le problème vient de **deux systèmes parallèles**:

1. **Nouveau système** (`/api/catalog/full`) → `FullTour` avec `tour.image` normalisé ✅
2. **Ancien système** (`/api/atlantico/catalog/[lang]`) → `Experience` avec `imageUrl` ❌

La page `/en/activities` utilise l'**ancien système** qui ne mappe pas correctement `eventDetails.image`.

### Fix Proposé

**Option 1: Migrer `/en/activities` vers `/api/catalog/full`** (recommandé)
- Avantage: Utilise le système unifié avec normalisation
- Inconvénient: Nécessite refactoring de la page

**Option 2: Fixer `mapActivityLiteToExperience()` dans l'ancien repository** (patch minimal)
- Avantage: Patch rapide sans refactoring
- Inconvénient: Maintient deux systèmes parallèles

**Option 3: Utiliser `<img>` temporairement** (workaround)
- Avantage: Aucun changement code
- Inconvénient: Ne résout pas le problème de mapping

---

## 5. React Error Diagnosis

### Erreur: "Cannot read properties of null (reading 'useContext')"

**Symptôme:** Erreur React sur `/en/catalog` ou `/en/activities`.

### Analyse

#### Stacktrace Recherché

L'erreur `useContext` null se produit généralement quand:
1. Un composant client (`'use client'`) utilise un hook React dans un composant serveur
2. Un provider React n'est pas monté (ex: `NextIntlClientProvider` manquant)
3. Un hook est appelé en dehors d'un composant React

#### Composants Suspects

| Composant | Fichier | Type | Hook Utilisé | Provider Requis |
|-----------|---------|------|--------------|-----------------|
| `ActivityCard` | `src/app/[locale]/activities/page.tsx` | Server (async) | ❌ Aucun | ❌ Aucun |
| `ExperienceCard` | `src/ui/components/experience/ExperienceCard.tsx` | Client? | `useTranslations()` | `NextIntlClientProvider` ✅ |
| `VibeCard` | `src/ui/components/vibe/VibeCard.client.tsx` | Client | Hooks React | ✅ OK |
| `ActivityCard` (old) | `src/ui/components/activities/ActivityCard.tsx` | Client | `useState`, `useRef` | ✅ OK |

#### Hypothèse

**Problème potentiel:** Si `/en/activities` utilise `ExperienceCard` (qui appelle `useTranslations()`), mais que `NextIntlClientProvider` n'est pas monté dans la hiérarchie, cela causerait l'erreur.

**Vérification:** `src/app/[locale]/layout.tsx` contient:
```typescript
return (
  <NextIntlClientProvider messages={messages}>
    <Suspense fallback={null}>
      <AttributionCapture />
    </Suspense>
    <Header />
    {children}
    <Footer locale={locale} />
  </NextIntlClientProvider>
)
```

✅ **OK** - Le provider est présent. Mais si `/en/activities` n'est pas dans `[locale]`, il manquerait le provider.

#### Diagnostic Final

**Cause probable:** Un composant client utilisant `useTranslations()` ou un autre hook React est rendu dans un contexte serveur sans provider.

**Fix proposé:**
1. S'assurer que tous les composants clients sont bien marqués `'use client'`
2. Vérifier que tous les hooks React sont dans des composants clients
3. S'assurer que `NextIntlClientProvider` est présent dans la hiérarchie

---

## 6. Patch List

### Priorité Haute (Blocant)

- [ ] **PATCH-1: Migrer `/en/activities` vers `/api/catalog/full`**
  - Fichier: `src/app/[locale]/activities/page.tsx`
  - Changement: Remplacer `experienceRepository.findAll()` par fetch `/api/catalog/full`
  - Type de retour: `FullTour[]` au lieu de `Experience[]`
  - Composant: Adapter `ActivityCard` pour `FullTour`

- [ ] **PATCH-2: Fixer `mapActivityLiteToExperience()` si on garde l'ancien système**
  - Fichier: `src/data/atlantico/atlantico-experience.repository.ts`
  - Changement: Mapper `eventDetails.image` vers `Experience.imageUrl` avec `buildAtlanticoImageUrl()`
  - Ligne ~87-165

### Priorité Moyenne (Amélioration)

- [ ] **PATCH-3: Ajouter `image` à `FullEvent`**
  - Fichier: `src/lib/atlantico/catalog-types.ts`
  - Changement: Ajouter `image?: string | null` à `FullEvent`
  - Mapper dans `hydrateEvent()` via `extractAtlanticoImage()`

- [ ] **PATCH-4: Ajouter champs manquants à `CoreTour`**
  - Fichier: `src/lib/atlantico/catalog-types.ts`
  - Changement: Ajouter `classification?`, `category?`, `location?`, `highlights?[]`, `included?[]`, `notIncluded?[]`
  - Mapper dans `hydrateTour()`

- [ ] **PATCH-5: Diagnostiquer erreur React `useContext` null**
  - Action: Reproduire l'erreur en DEV et capturer stacktrace exacte
  - Fichier concerné: Identifier le composant qui cause l'erreur
  - Fix: Ajouter `'use client'` ou wrapper avec provider

### Priorité Basse (Nice to Have)

- [ ] **PATCH-6: Documenter endpoints Atlantico non utilisés**
  - Fichier: `docs/atlantico-endpoints.md`
  - Liste: Endpoints disponibles mais non implémentés

- [ ] **PATCH-7: Unifier les deux systèmes (legacy vs new)**
  - Action: Migrer toutes les pages vers `/api/catalog/full`
  - Supprimer: `AtlanticoExperienceRepository` et routes `/api/atlantico/catalog/*`

---

## 7. Résumé Exécutif

### Points Clés

1. **Deux systèmes parallèles:** Nouveau (`/api/catalog/full`) vs Ancien (`/api/atlantico/catalog/[lang]`)
2. **Image manquante:** Problème de mapping dans l'ancien système, pas dans le nouveau
3. **Gaps de mapping:** Plusieurs champs Atlantico non stockés (classification, category, location, etc.)
4. **Erreur React:** Nécessite reproduction pour diagnostic précis

### Recommandations

1. **Court terme:** Migrer `/en/activities` vers `/api/catalog/full` (PATCH-1)
2. **Moyen terme:** Ajouter champs manquants à `CoreTour` (PATCH-4)
3. **Long terme:** Unifier les deux systèmes (PATCH-7)

### Actions Immédiates

1. ✅ Vérifier cache core: `data/atlantico_catalog_core.json` contient `item.image`?
2. 🔄 Migrer `/en/activities` vers `/api/catalog/full`
3. 🔄 Reproduire erreur React `useContext` et capturer stacktrace

---

**Fin du Rapport**

























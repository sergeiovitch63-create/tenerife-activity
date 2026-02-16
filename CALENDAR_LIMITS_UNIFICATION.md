# Unification Calendar et Limits - Source de Vérité Unique

**Date:** 2026-01-XX  
**Problème:** Le calendrier UI utilise `/api/atlantico/calendar` mais on a renforcé `/api/atlantico/limits`. Logs montrent `calendar/route.ts` renvoie 0 dates/sessions pour `eventId=1420`.

---

## FICHIERS MODIFIÉS

### 1. **`src/lib/atlantico/normalizeLimits.ts`** (NOUVEAU)

**Fonction partagée - Source de vérité unique:**
- `normalizeLimits(eventId, language, month)` - Fonction principale
- `normalizeMonth(monthStr)` - Normalisation du mois
- `extractSessions(raw, month)` - Extraction des sessions (tous formats)
- `extractDates(raw, month)` - Extraction des dates

**Fonctionnalités:**
- Appelle l'upstream `loadLimits/{eventId}/{lang}/{monthStart}`
- Parse RAW + capture status code
- Normalise sessions (YYYYMMDD → YYYY-MM-DD)
- Retourne `{ quote, wdays, dates, sessionsByDay }` (format unique)
- Logs DEV server-side détaillés

### 2. **`src/app/api/atlantico/calendar/route.ts`**

**Modifications:**
- ✅ Supprimé: `CalendarConcurrencyLimiter`, `normalizeToMonthStart`, `extractDatesFromLimits`, `extractSessionsByDate`
- ✅ Utilise maintenant: `normalizeLimits()` (source de vérité unique)
- ✅ Retourne format simple pour le widget:
  - `availableDates` (YYYY-MM-DD[])
  - `sessionsByDate` (map)
- ✅ Logs DEV server-side:
  - `baseUrl`, `fullUrl` upstream
  - `upstreamStatus`
  - `sessionKeysCount`
  - `sessionsByDayKeys`

### 3. **`src/app/api/atlantico/limits/route.ts`**

**Modifications:**
- ✅ Supprimé: `normalizeMonth`, `extractSessions`, `extractDates` (fonctions locales)
- ✅ Utilise maintenant: `normalizeLimits()` (source de vérité unique)
- ✅ Code simplifié: ~40 lignes au lieu de ~380

### 4. **`src/components/catalog/BookingWidget.tsx`**

**Modifications:**
- ✅ Ajout debug DEV: affiche `eventId origin` (option.value depuis bookingOptions)
- ✅ Vérification: `selectedEventId` provient bien de `bookingOptions[].id` qui vient de `groupDetails.ids` (t_id Atlantico)

### 5. **`src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx`**

**Modifications:**
- ✅ Ajout debug DEV: affiche `eventId origin` (eventOption.eventId depuis eventOptions)
- ✅ Vérification: `selectedEventId` provient bien de `eventOptions[].eventId` qui utilise `eventDetails.code` (t_id Atlantico)

---

## VÉRIFICATION DU MAPPING EVENTID

### BookingWidget.tsx

**Source de `selectedEventId`:**
```typescript
// bookingOptions sont construits dans normalizeGroups()
const bookingOptions = useMemo(() => {
  // options proviennent de normalizeGroups() qui utilise:
  // - eventIds extraits de groupDetails.ids (format ",184,546")
  // - buildBookingOptions(eventIds, ...) qui retourne:
  //   { id: eventId, label: ..., pProd: ... }
  //   où eventId = code Atlantico (t_id)
}, [options, eventIds])

// selectedEventId = bookingOptions[].id = code Atlantico (t_id)
const [selectedEventId, setSelectedEventId] = useState<string>('')
```

**Vérification:**
- ✅ `selectedEventId` provient de `bookingOptions[].id`
- ✅ `bookingOptions[].id` = `eventId` depuis `groupDetails.ids`
- ✅ `groupDetails.ids` contient les codes Atlantico (ex: "184", "546")
- ✅ **Confirmé:** `selectedEventId` est bien le t_id Atlantico, pas un id interne

**Debug DEV ajouté:**
```typescript
<div>eventId origin: <strong>
  {(() => {
    const option = bookingOptions.find(opt => opt.id === selectedEventId)
    return option ? `option.value="${option.id}" (from bookingOptions)` : 'unknown'
  })()}
</strong></div>
```

### ActivityDetailClient.tsx

**Source de `selectedEventId`:**
```typescript
// eventOptions sont construits dans page.tsx
// - Utilise getEventDetails(eventIdFromGroup, lang)
// - Extrait eventCode = details.code || details.Code || eventIdFromGroup
// - eventOptions.push({ eventId: String(eventCode), ... })
//   où eventCode = code Atlantico (t_id)

const [selectedEventId, setSelectedEventId] = useState<string>('')
```

**Vérification:**
- ✅ `selectedEventId` provient de `eventOptions[].eventId`
- ✅ `eventOptions[].eventId` = `eventCode` depuis `eventDetails.code`
- ✅ `eventDetails.code` est le code Atlantico (t_id)
- ✅ **Confirmé:** `selectedEventId` est bien le t_id Atlantico, pas un id interne

**Debug DEV ajouté:**
```typescript
<div>eventId origin: <strong>
  {(() => {
    const option = eventOptions.find(opt => opt.eventId === selectedEventId)
    return option ? `eventOption.eventId="${option.eventId}" (from eventOptions)` : 'unknown'
  })()}
</strong></div>
```

---

## EXPLICATION DU BUG

### Bug 1: Divergence Calendar vs Limits

**Problème:**
- `calendar/route.ts` utilisait sa propre logique de normalisation
- `limits/route.ts` utilisait une autre logique de normalisation
- Résultat: incohérences entre les deux endpoints

**Solution:**
- ✅ Création de `normalizeLimits()` (source de vérité unique)
- ✅ `calendar/route.ts` et `limits/route.ts` utilisent maintenant la même fonction
- ✅ Normalisation identique pour les deux endpoints

### Bug 2: EventId Incorrect (si confirmé)

**Hypothèse:**
- Si `eventId=1420` est utilisé, c'est probablement un id interne (catalog)
- L'API Atlantico attend un t_id (code événement, ex: 184, 546)

**Vérification:**
- ✅ `selectedEventId` dans `BookingWidget` provient de `bookingOptions[].id` = code Atlantico
- ✅ `selectedEventId` dans `ActivityDetailClient` provient de `eventOptions[].eventId` = code Atlantico
- ✅ Debug DEV ajouté pour tracer l'origine de `selectedEventId`

**Si `eventId=1420` apparaît:**
- Vérifier dans le debug DEV: `eventId origin`
- Si l'origine est "unknown" ou ne vient pas de `bookingOptions`/`eventOptions`, corriger:
  - Dropdown value doit être `event.code` (t_id Atlantico)
  - Pas un id de catalog interne

---

## TESTS RECOMMANDÉS

### Test sur `/en/catalog/506`

1. **Ouvrir `/en/catalog/506`**
2. **Sélectionner option 184** dans le dropdown
3. **Vérifier le debug DEV:**
   - `selectedEventId (t_id): 184`
   - `eventId origin: option.value="184" (from bookingOptions)`
4. **Vérifier les logs serveur (DEV):**
   - `[NORMALIZE_LIMITS] Request:` avec `eventId: "184"`
   - `[CALENDAR] Response:` avec `sessionsByDayKeys > 0` si dispo réelle
5. **Vérifier l'appel API:**
   - `/api/atlantico/calendar?eventId=184&month=2026-01-01`
   - Doit renvoyer `sessionsByDayKeys > 0` si disponibilité réelle

### Logs DEV Attendus

**Console serveur (DEV):**
```
[NORMALIZE_LIMITS] Request: {
  baseUrl: 'https://api.atlanticoexcursiones.com',
  endpoint: '/loadLimits/184/ENG/2026-01-01',
  fullUrl: 'https://api.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  language: 'ENG',
  month: '2026-01-01'
}

[NORMALIZE_LIMITS] Response analysis: {
  ...
  extracted: {
    sessionsByDayKeys: 5,
    sessionsByDaySample: ['2026-01-15', '2026-01-16', '2026-01-17'],
    datesCount: 5
  }
}

[CALENDAR] Response: {
  baseUrl: 'https://api.atlanticoexcursiones.com',
  fullUrl: 'https://api.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  upstreamStatus: 200,
  eventId: '184',
  sessionKeysCount: 5,
  sessionsByDayKeys: 5,
  availableDatesCount: 5,
  hasSessions: true
}
```

---

## RÉSUMÉ

### Fichiers Modifiés

1. ✅ `src/lib/atlantico/normalizeLimits.ts` (NOUVEAU) - Fonction partagée
2. ✅ `src/app/api/atlantico/calendar/route.ts` - Utilise normalizeLimits
3. ✅ `src/app/api/atlantico/limits/route.ts` - Utilise normalizeLimits
4. ✅ `src/components/catalog/BookingWidget.tsx` - Debug DEV eventId origin
5. ✅ `src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx` - Debug DEV eventId origin

### Explication du Bug

1. **Divergence calendar vs limits:**
   - Les deux endpoints utilisaient des logiques de normalisation différentes
   - Solution: fonction partagée `normalizeLimits()` (source de vérité unique)

2. **EventId incorrect (si confirmé):**
   - Si `eventId=1420` apparaît, c'est probablement un id interne
   - Vérification: `selectedEventId` provient bien de codes Atlantico (t_id)
   - Debug DEV ajouté pour tracer l'origine

### Actions Suivantes

1. Tester sur `/en/catalog/506` avec option 184
2. Vérifier les logs DEV pour confirmer que `eventId=184` (t_id) est utilisé
3. Si `eventId=1420` apparaît, utiliser le debug DEV pour identifier la source et corriger

---

**Fin du document**













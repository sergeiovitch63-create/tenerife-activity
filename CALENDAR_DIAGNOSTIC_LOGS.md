# Diagnostic Calendrier Atlantico - Logs DEV

**Date:** 2026-01-XX  
**Objectif:** Diagnostiquer pourquoi `availableDates` est vide en vérifiant l'URL upstream exacte et le parsing.

---

## A) VÉRIFICATION URL UPSTREAM EXACTE

### Endpoint confirmé

**Fichier:** `src/lib/atlantico/normalizeLimits.ts` (ligne 403)

```typescript
const endpoint = `/loadLimits/${eventId}/${normalizedLang}/${normalizedMonth}`
const baseUrl = getBaseUrl() // testapi.atlanticoexcursiones.com ou api.atlanticoexcursiones.com
const fullUrl = `${baseUrl}${endpoint}`
```

**Format exact:**
- ✅ `/loadLimits/` (pas `loadLimit`, pas `limits`, pas `calendar`)
- ✅ `{eventId}` = Code (t_id Atlantico)
- ✅ `{normalizedLang}` = CAS/ENG/FRA/RUS/ALE/ITA
- ✅ `{normalizedMonth}` = YYYY-MM-01 (premier jour du mois)

**Exemple:**
```
https://testapi.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01
```

### Logs DEV server-side ajoutés

**1. Log request (avant fetch):**
```typescript
console.log('[ATLANTICO_UPSTREAM]', {
  baseUrl,        // testapi.atlanticoexcursiones.com ou api.atlanticoexcursiones.com
  fullUrl,        // URL complète avec endpoint
  eventId,       // Code (t_id)
  lang: normalizedLang,  // CAS/ENG/FRA/etc.
  monthStart: normalizedMonth,  // YYYY-MM-01
})
```

**2. Log response (après fetch):**
```typescript
console.log('[ATLANTICO_UPSTREAM_RESPONSE]', {
  fullUrl,
  eventId,
  upstreamStatus,  // HTTP status code (200, 404, etc.)
  responsePreview, // 150 premiers caractères de la réponse
})
```

**3. Log parsing (après extraction):**
```typescript
console.log('[ATLANTICO_PARSING]', {
  fullUrl,
  eventId,
  upstreamStatus,
  sessionKeysFound: sessionKeys.length,  // Nombre de clés YYYYMMDD trouvées
  availableDatesCount: Object.keys(sessionsByDay).length,  // Nombre de dates disponibles
  hasSessions: hasSessions || hasSessionsByDate,  // true si sessions présentes
  responsePreview,
  sessionKeysSample: sessionKeys.slice(0, 3),  // 3 premières clés YYYYMMDD
})
```

**4. Log warning si empty (status=200 mais 0 dates):**
```typescript
console.warn('[ATLANTICO_EMPTY]', {
  fullUrl,
  eventId,
  upstreamStatus,
  sessionKeysFound: sessionKeys.length,
  rawTopKeys: Object.keys(raw).slice(0, 10),  // 10 premières clés top-level
  hasSessions,
  hasSessionsByDate,
  responsePreview,
})
```

---

## B) VÉRIFICATION CODE (t_id) ATLANTICO

### Source de `selectedEventId`

**1. BookingWidget.tsx (catalog pages):**
- `selectedEventId` = `bookingOptions[].id`
- `bookingOptions[].id` = `eventId` depuis `groupDetails.ids` (ex: "184", "546")
- ✅ **Confirmé:** `selectedEventId` est bien le t_id Atlantico

**2. ActivityDetailClient.tsx (activity pages):**
- `selectedEventId` = `eventOptions[].eventId`
- `eventOptions[].eventId` = `eventDetails.code` (extrait dans `page.tsx`)
- ✅ **Confirmé:** `selectedEventId` est bien le t_id Atlantico (via `eventDetails.code`)

### Logs DEV UI ajoutés

**BookingWidget.tsx:**
```typescript
{process.env.NODE_ENV === 'development' && selectedEventId && (
  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
    <div className="font-semibold mb-2">🔍 DEV Debug:</div>
    <div>selectedGroupId (t_group): <strong>{groupKey}</strong></div>
    <div>selectedEventId (t_id): <strong>{selectedEventId}</strong></div>
    <div>eventId origin: <strong>
      {(() => {
        const option = bookingOptions.find(opt => opt.id === selectedEventId)
        return option ? `option.value="${option.id}" (from bookingOptions)` : 'unknown'
      })()}
    </strong></div>
    <div>monthStart sent: <strong>{normalizedMonth}</strong></div>
    <div>availableDates count: <strong>{availableDates.length}</strong></div>
    <div>sessionsByDay keys: <strong>{Object.keys(sessionsByDay).length}</strong></div>
  </div>
)}
```

**ActivityDetailClient.tsx:**
```typescript
{process.env.NODE_ENV === 'development' && selectedEventId && (
  <div className="mt-8 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
    <div className="font-semibold mb-2">🔍 DEV Debug:</div>
    <div>selectedEventId (t_id): <strong>{selectedEventId}</strong></div>
    <div>eventId origin: <strong>
      {(() => {
        const option = eventOptions.find(opt => opt.eventId === selectedEventId)
        return option ? `eventOption.eventId="${option.eventId}" (from eventOptions)` : 'unknown'
      })()}
    </strong></div>
    <div>t_group: <strong>{item.groupCode}</strong></div>
    <div>monthStart sent: <strong>{normalizedMonth}</strong></div>
    <div>availableDates count: <strong>{availableDates.length}</strong></div>
    <div>sessionsByDay keys: <strong>{Object.keys(sessionsByDay).length}</strong></div>
  </div>
)}
```

---

## C) VÉRIFICATION PARSING

### Formats supportés

**1. Top-level YYYYMMDD keys:**
```typescript
raw[YYYYMMDD] = { sessions: [...], ... }
```

**2. Nested sessions object:**
```typescript
raw.sessions[YYYYMMDD] = [...]
```

**3. Nested sessionsByDate object:**
```typescript
raw.sessionsByDate[YYYYMMDD] = [...]
```

**4. Array format (legacy):**
```typescript
raw.dates[] = ["YYYYMMDD", ...]
raw.limit[] = [limit, ...]
raw.used[] = [used, ...]
```

### Conversion YYYYMMDD → YYYY-MM-DD

**Fichier:** `src/lib/atlantico/normalizeLimits.ts` (fonction `extractSessions`)

```typescript
// Parse YYYYMMDD key
const date = parseYYYYMMDD(dateKey)  // "20260115" → Date object
const ymd = toYMD(date)  // Date object → "2026-01-15"
sessionsByDay[ymd] = sessions  // Stocke avec clé YYYY-MM-DD
```

**Filtrage:**
- ✅ Filtre les clés avec `/^\d{8}$/` (exactement 8 chiffres)
- ✅ Vérifie que la date est dans le mois demandé
- ✅ Vérifie que la date n'est pas dans le passé (`isFutureOrToday`)

---

## D) EXEMPLES DE LOGS ATTENDUS

### Exemple 1: Succès (sessions trouvées)

```
[ATLANTICO_UPSTREAM] {
  baseUrl: 'https://testapi.atlanticoexcursiones.com',
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  lang: 'ENG',
  monthStart: '2026-01-01'
}

[ATLANTICO_UPSTREAM_RESPONSE] {
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  upstreamStatus: 200,
  responsePreview: '{"quote":50,"sessions":{"20260115":[{"time":"09:00","available":25}],"20260116":[{"time":"09:00","available":20}]}}'
}

[ATLANTICO_PARSING] {
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  upstreamStatus: 200,
  sessionKeysFound: 2,
  availableDatesCount: 2,
  hasSessions: true,
  responsePreview: '{"quote":50,"sessions":{"20260115":[{"time":"09:00","available":25}],"20260116":[{"time":"09:00","available":20}]}}',
  sessionKeysSample: ['20260115', '20260116']
}
```

### Exemple 2: Empty (status=200 mais 0 sessions)

```
[ATLANTICO_UPSTREAM] {
  baseUrl: 'https://testapi.atlanticoexcursiones.com',
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/1420/ENG/2026-01-01',
  eventId: '1420',
  lang: 'ENG',
  monthStart: '2026-01-01'
}

[ATLANTICO_UPSTREAM_RESPONSE] {
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/1420/ENG/2026-01-01',
  eventId: '1420',
  upstreamStatus: 200,
  responsePreview: '{"quote":0,"dates":[]}'
}

[ATLANTICO_PARSING] {
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/1420/ENG/2026-01-01',
  eventId: '1420',
  upstreamStatus: 200,
  sessionKeysFound: 0,
  availableDatesCount: 0,
  hasSessions: false,
  responsePreview: '{"quote":0,"dates":[]}',
  sessionKeysSample: []
}

[ATLANTICO_EMPTY] {
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/1420/ENG/2026-01-01',
  eventId: '1420',
  upstreamStatus: 200,
  sessionKeysFound: 0,
  rawTopKeys: ['quote', 'dates'],
  hasSessions: false,
  hasSessionsByDate: false,
  responsePreview: '{"quote":0,"dates":[]}'
}
```

### Exemple 3: Erreur (404 ou autre)

```
[ATLANTICO_UPSTREAM] {
  baseUrl: 'https://testapi.atlanticoexcursiones.com',
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/9999/ENG/2026-01-01',
  eventId: '9999',
  lang: 'ENG',
  monthStart: '2026-01-01'
}

[ATLANTICO_UPSTREAM_RESPONSE] {
  fullUrl: 'https://testapi.atlanticoexcursiones.com/loadLimits/9999/ENG/2026-01-01',
  eventId: '9999',
  upstreamStatus: 404,
  responsePreview: '{"error":"Event not found"}'
}
```

---

## E) ACTIONS DE DIAGNOSTIC

### Si `upstreamStatus = 404`:
- ❌ **Problème:** EventId incorrect (pas un vrai t_id Atlantico)
- ✅ **Fix:** Vérifier que `selectedEventId` provient bien de `groupDetails.ids` ou `eventDetails.code`

### Si `upstreamStatus = 200` mais `sessionKeysFound = 0`:
- ❌ **Problème:** Parsing incorrect OU zéro sessions réel
- ✅ **Fix:** Examiner `responsePreview` et `rawTopKeys` pour ajuster le parsing

### Si `upstreamStatus = 200` et `sessionKeysFound > 0` mais `availableDatesCount = 0`:
- ❌ **Problème:** Conversion YYYYMMDD → YYYY-MM-DD ou filtrage trop strict
- ✅ **Fix:** Vérifier `parseYYYYMMDD` et `toYMD`, vérifier filtres `isFutureOrToday` et mois

### Si `eventId` ressemble à 4 chiffres non présent dans `groupDetails.ids`:
- ❌ **Problème:** Utilisation d'un id interne (catalog) au lieu d'un t_id Atlantico
- ✅ **Fix:** Corriger dropdown pour utiliser `eventDetails.code` (t_id) au lieu de l'id interne

---

## F) FICHIERS MODIFIÉS

1. **`src/lib/atlantico/normalizeLimits.ts`**
   - ✅ Logs DEV améliorés: `[ATLANTICO_UPSTREAM]`, `[ATLANTICO_UPSTREAM_RESPONSE]`, `[ATLANTICO_PARSING]`, `[ATLANTICO_EMPTY]`
   - ✅ Vérification endpoint: `/loadLimits/` confirmé
   - ✅ Parsing supporte: `raw[YYYYMMDD]`, `raw.sessions[YYYYMMDD]`, `raw.sessionsByDate[YYYYMMDD]`, array format

2. **`src/components/catalog/BookingWidget.tsx`**
   - ✅ Panneau debug DEV: affiche `selectedGroupId`, `selectedEventId`, `eventId origin`, `monthStart`, `availableDates count`

3. **`src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx`**
   - ✅ Panneau debug DEV: affiche `selectedEventId`, `eventId origin`, `t_group`, `monthStart`, `availableDates count`

---

**Fin du document**











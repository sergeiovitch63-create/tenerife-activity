# Améliorations Debug Endpoint /api/atlantico/limits

**Date:** 2026-01-XX  
**Objectif:** Comprendre pourquoi `sessionsByDate` est vide (0 keys) pour `/en/catalog/506`

---

## MODIFICATIONS APPLIQUÉES

### 1. Logs DEV Server-Side Détaillés

**Fichier:** `src/app/api/atlantico/limits/route.ts`

**Logs ajoutés (DEV uniquement):**

#### A. Log de requête (avant fetch)
```typescript
console.log('[ATLANTICO_LIMITS] Request:', {
  baseUrl,           // testapi.atlanticoexcursiones.com ou api.atlanticoexcursiones.com
  endpoint,          // /loadLimits/{eventId}/{lang}/{month}
  fullUrl,           // URL complète upstream
  eventId,           // Code événement (t_id)
  language: normalizedLang,  // Langue normalisée (ENG, CAS, etc.)
  month,             // Mois normalisé (YYYY-MM-01)
})
```

#### B. Log d'analyse de réponse (après fetch)
```typescript
console.log('[ATLANTICO_LIMITS] Response analysis:', {
  baseUrl,
  endpoint,
  fullUrl,
  eventId,
  language: normalizedLang,
  month,
  upstreamStatus,    // Status code HTTP (200, 404, etc.)
  responsePreview,   // 200 premiers caractères du RAW upstream
  structure: {
    hasSessions,     // Existe-t-il "sessions" ?
    hasSessionsByDay, // Existe-t-il "sessionsByDay" ?
    hasSessionsByDate, // Existe-t-il "sessionsByDate" ?
    rawKeys,         // 10 premières clés top-level
    sessionKeys,     // 3 premières clés de sessions (YYYYMMDD)
  },
  extracted: {
    sessionsByDayKeys,    // Nombre de clés extraites
    sessionsByDaySample,   // 3 premières clés extraites
    datesCount,            // Nombre de dates extraites
  },
})
```

#### C. Log d'avertissement si sessionsByDay vide
```typescript
console.warn('[ATLANTICO_LIMITS] Empty sessionsByDay - possible issues:', {
  eventId,
  language: normalizedLang,
  month,
  rawStructure: {
    topLevelKeys,    // 10 premières clés
    hasDates,        // Existe "dates" ?
    hasLimit,        // Existe "limit" ?
    hasUsed,         // Existe "used" ?
    hasQuote,        // Existe "quote" ?
    datesType,       // Type de dates (array/object/etc.)
    limitType,       // Type de limit (array/object/etc.)
  },
})
```

#### D. Log d'erreur si fetch échoue
```typescript
console.error('[ATLANTICO_LIMITS] Fetch error:', {
  baseUrl,
  endpoint,
  fullUrl,
  eventId,
  language: normalizedLang,
  month,
  upstreamStatus,    // Status code si disponible
  error,             // Message d'erreur
  responsePreview,   // 200 premiers caractères si disponible
})
```

### 2. Capture du Status Code Upstream

**Avant:** Utilisait `fetchJson()` qui ne retourne pas le status code.

**Après:** Utilise `fetch()` directement pour capturer:
- Status code HTTP (`response.status`)
- Response text brut avant parsing JSON
- Gestion d'erreurs avec status code

**Code:**
```typescript
const response = await fetch(fullUrl, {
  method: 'GET',
  headers: {
    'Accept': '*/*',
    ...(process.env.ATLANTICO_TOKEN ? { 'Authorization': `Bearer ${process.env.ATLANTICO_TOKEN}` } : {}),
  },
  cache: 'no-store',
})

upstreamStatus = response.status
upstreamResponseText = await response.text()
```

### 3. Amélioration de la Normalisation des Sessions

**Problème identifié:** Les sessions peuvent être dans plusieurs formats:
1. Top-level: `raw[YYYYMMDD]`
2. Nested: `raw.sessions[YYYYMMDD]`
3. Nested: `raw.sessionsByDate[YYYYMMDD]`

**Solution:** Vérification de tous les formats possibles avec normalisation des clés.

**Normalisation:**
- Clés upstream: `YYYYMMDD` (ex: `20260115`)
- Clés normalisées: `YYYY-MM-DD` (ex: `2026-01-15`)
- Conversion via `toYMD(date)` après parsing avec `parseYYYYMMDD(dateKey)`

**Formats supportés:**
1. **Format 1a:** Top-level object avec clés YYYYMMDD
   ```json
   {
     "20260115": { "sessions": [...] },
     "20260116": { "limit": 10, "used": 2 }
   }
   ```

2. **Format 1b:** Nested `raw.sessions[YYYYMMDD]`
   ```json
   {
     "sessions": {
       "20260115": [...],
       "20260116": {...}
     }
   }
   ```

3. **Format 1c:** Nested `raw.sessionsByDate[YYYYMMDD]`
   ```json
   {
     "sessionsByDate": {
       "20260115": [...],
       "20260116": {...}
     }
   }
   ```

4. **Format 2:** Array de dates avec limit/used arrays
   ```json
   {
     "dates": ["20260115", "20260116"],
     "limit": [10, 20],
     "used": [2, 5]
   }
   ```

### 4. Protection contre Perte de Sessions

**Avant:** Si une clé n'était pas au format exact attendu, les sessions étaient perdues.

**Après:**
- Filtre strict: `/^\d{8}$/.test(key)` pour matcher YYYYMMDD
- Conversion systématique: `toYMD(date)` pour normaliser en YYYY-MM-DD
- Merge si sessions existent déjà pour une date (évite écrasement)

---

## DIAGNOSTIC ATTENDU

### Scénario 1: Env Incorrect
**Symptômes:**
- `upstreamStatus` = 401, 403, ou 404
- `responsePreview` contient erreur d'authentification
- `rawStructure` vide ou null

**Action:** Vérifier `ATLANTICO_ENV`, `ATLANTICO_TOKEN`, `ATLANTICO_BASE_URL`

### Scénario 2: Parsing Incorrect
**Symptômes:**
- `upstreamStatus` = 200
- `responsePreview` contient des données
- `structure.hasSessions` = true OU `sessionKeys.length > 0`
- MAIS `extracted.sessionsByDayKeys` = 0

**Action:** Vérifier le format exact des sessions dans `responsePreview` et ajuster `extractSessions()`

### Scénario 3: Zéro Sessions Réel
**Symptômes:**
- `upstreamStatus` = 200
- `responsePreview` contient `{"quote": 0, "dates": []}` ou similaire
- `structure.hasSessions` = false
- `sessionKeys.length` = 0
- `extracted.sessionsByDayKeys` = 0

**Action:** L'événement n'a vraiment pas de disponibilité pour ce mois. Vérifier avec un autre mois ou un autre eventId.

---

## EXEMPLE DE LOGS ATTENDUS

### Cas Normal (Sessions Présentes)
```
[ATLANTICO_LIMITS] Request: {
  baseUrl: 'https://api.atlanticoexcursiones.com',
  endpoint: '/loadLimits/184/ENG/2026-01-01',
  fullUrl: 'https://api.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  language: 'ENG',
  month: '2026-01-01'
}

[ATLANTICO_LIMITS] Response analysis: {
  baseUrl: 'https://api.atlanticoexcursiones.com',
  endpoint: '/loadLimits/184/ENG/2026-01-01',
  fullUrl: 'https://api.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  language: 'ENG',
  month: '2026-01-01',
  upstreamStatus: 200,
  responsePreview: '{"quote":100,"dates":{"date":["20260115","20260116"],"limit":[10,20],"used":[2,5]},"sessions":{"20260115":[{"time":"09:00","available":8,"precio":50}]}}',
  structure: {
    hasSessions: true,
    hasSessionsByDay: false,
    hasSessionsByDate: false,
    rawKeys: ['quote', 'dates', 'sessions'],
    sessionKeys: ['20260115', '20260116']
  },
  extracted: {
    sessionsByDayKeys: 2,
    sessionsByDaySample: ['2026-01-15', '2026-01-16'],
    datesCount: 2
  }
}
```

### Cas Problématique (Sessions Vides)
```
[ATLANTICO_LIMITS] Request: {
  baseUrl: 'https://api.atlanticoexcursiones.com',
  endpoint: '/loadLimits/184/ENG/2026-01-01',
  fullUrl: 'https://api.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  language: 'ENG',
  month: '2026-01-01'
}

[ATLANTICO_LIMITS] Response analysis: {
  baseUrl: 'https://api.atlanticoexcursiones.com',
  endpoint: '/loadLimits/184/ENG/2026-01-01',
  fullUrl: 'https://api.atlanticoexcursiones.com/loadLimits/184/ENG/2026-01-01',
  eventId: '184',
  language: 'ENG',
  month: '2026-01-01',
  upstreamStatus: 200,
  responsePreview: '{"quote":0,"dates":{"date":[],"limit":[],"used":[]}}',
  structure: {
    hasSessions: false,
    hasSessionsByDay: false,
    hasSessionsByDate: false,
    rawKeys: ['quote', 'dates'],
    sessionKeys: []
  },
  extracted: {
    sessionsByDayKeys: 0,
    sessionsByDaySample: [],
    datesCount: 0
  }
}

[ATLANTICO_LIMITS] Empty sessionsByDay - possible issues: {
  eventId: '184',
  language: 'ENG',
  month: '2026-01-01',
  rawStructure: {
    topLevelKeys: ['quote', 'dates'],
    hasDates: true,
    hasLimit: false,
    hasUsed: false,
    hasQuote: true,
    datesType: 'object',
    limitType: 'undefined'
  }
}
```

---

## PATCH MINIMAL SI PARSING INCORRECT

Si les logs montrent que `structure.hasSessions = true` mais `extracted.sessionsByDayKeys = 0`, alors le parsing est incorrect.

**Action:** Examiner `responsePreview` pour identifier le format exact et ajuster `extractSessions()` en conséquence.

**Exemple de patch:**
```typescript
// Si les sessions sont dans raw.sessions mais avec un format différent
if (raw.sessions && typeof raw.sessions === 'object') {
  // Ajouter logique de parsing spécifique
  // ...
}
```

---

## TEST RECOMMANDÉ

1. **Ouvrir `/en/catalog/506`**
2. **Sélectionner une option** (eventId, ex: `184`)
3. **Ouvrir la console serveur** (pas client)
4. **Chercher les logs:**
   - `[ATLANTICO_LIMITS] Request:`
   - `[ATLANTICO_LIMITS] Response analysis:`
   - `[ATLANTICO_LIMITS] Empty sessionsByDay` (si vide)
5. **Analyser:**
   - `upstreamStatus` = 200 ? (sinon: env incorrect)
   - `structure.hasSessions` = true ? (si oui mais `sessionsByDayKeys = 0`: parsing incorrect)
   - `sessionKeys.length` > 0 ? (si oui mais `sessionsByDayKeys = 0`: parsing incorrect)
   - `responsePreview` contient des données ? (si non: zéro sessions réel)

---

**Fin du document**





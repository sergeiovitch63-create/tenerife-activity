# Reconnexion du Calendrier Atlantico - Source Unique loadLimits

**Date:** 2026-01-XX  
**Objectif:** Reconnecter le calendrier Atlantico proprement après la désactivation (dummy), en se basant UNIQUEMENT sur loadLimits.

---

## FICHIERS MODIFIÉS

### 1. **Routes API (2 fichiers)**

#### `src/app/api/atlantico/limits/route.ts`
- ✅ Réactivé: Appel upstream `loadLimits/{eventId}/{lang}/{monthStart}` via `normalizeLimits()`
- ✅ Format normalisé unique:
  ```typescript
  {
    ok: true,
    quote: number | null,
    monthStart: "YYYY-MM-01",
    sessionsByDay: {
      "YYYY-MM-DD": [
        { time: "HH:mm", available: number, sessionId?: string, raw?: any }
      ]
    },
    availableDates: ["YYYY-MM-DD", ...]
  }
  ```
- ✅ Filtrage: Supprime times invalides ("-" et ""), garde "00:00" si upstream le fournit
- ✅ Conversion: YYYYMMDD → YYYY-MM-DD pour les clés
- ✅ Logs DEV server-side uniquement

#### `src/app/api/atlantico/calendar/route.ts`
- ✅ **1 source unique:** Proxy vers `/api/atlantico/limits` (plus de logique dupliquée)
- ✅ Retourne format compatible: `{ ok, eventId, lang, month, dates, sessionsByDate }`
- ✅ Conversion: `sessionsByDay` → `sessionsByDate` pour backward compatibility

### 2. **Composants UI (3 fichiers)**

#### `src/components/catalog/BookingWidget.tsx`
- ✅ Réactivé: Fetch `/api/atlantico/limits` quand `selectedEventId` ou `currentMonth` change
- ✅ States: `sessionsByDay`, `availableDates`, `selectedTime`, `loadingCalendar`, `calendarError`
- ✅ Calendrier: Seuls les jours dans `availableDates` sont cliquables
- ✅ Time picker: Affiche `allowedTimes` si `sessionsByDay[selectedDate]` existe
- ✅ Auto-select: Premier time disponible si non choisi
- ✅ `sesTime`: Utilise `selectedTime` (ou `'00:00'` si pas de sessions)

#### `src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx`
- ✅ Réactivé: Fetch `/api/atlantico/limits` quand `selectedEventId` ou `currentMonth` change
- ✅ States: `sessionsByDay`, `availableDates`, `selectedTime`, `loadingCalendar`
- ✅ Calendrier: Seuls les jours dans `availableDates` sont cliquables
- ✅ Time selector: Affiche `allowedTimes` si `sessionsByDay[selectedDate]` existe
- ✅ Auto-select: Premier time disponible si non choisi
- ✅ `sesTime`: Utilise `selectedTime` (ou `'00:00'` si pas de sessions)

#### `src/components/booking/CalendarWidget.tsx`
- ✅ Réactivé: Fetch `/api/atlantico/limits` quand `currentMonth` change
- ✅ States: `sessionsByDay`, `availableDates`, `loading`, `error`, `selectedDaySessions`
- ✅ Calendrier: Seuls les jours dans `availableDates` avec sessions disponibles sont cliquables
- ✅ Sessions display: Affiche sessions disponibles pour jour sélectionné

---

## EXEMPLE DE RÉPONSE NORMALISÉE

### Format `/api/atlantico/limits`

```json
{
  "ok": true,
  "quote": 50,
  "monthStart": "2026-01-01",
  "sessionsByDay": {
    "2026-01-15": [
      {
        "time": "09:00",
        "available": 25,
        "sessionId": "12345"
      },
      {
        "time": "14:00",
        "available": 30,
        "sessionId": "12346"
      }
    ],
    "2026-01-16": [
      {
        "time": "09:00",
        "available": 20,
        "sessionId": "12347"
      }
    ]
  },
  "availableDates": ["2026-01-15", "2026-01-16"]
}
```

### Format `/api/atlantico/calendar` (proxy)

```json
{
  "ok": true,
  "eventId": "184",
  "lang": "ENG",
  "month": "2026-01-01",
  "dates": ["2026-01-15", "2026-01-16"],
  "sessionsByDate": {
    "2026-01-15": [
      { "time": "09:00", "available": 25, "sessionId": "12345" },
      { "time": "14:00", "available": 30, "sessionId": "12346" }
    ],
    "2026-01-16": [
      { "time": "09:00", "available": 20, "sessionId": "12347" }
    ]
  }
}
```

---

## EXPLICATION: 1 SEULE SOURCE DE VÉRITÉ = loadLimits

### Architecture

```
loadLimits/{Code}/{Language}/{Date} (Atlantico API)
         ↓
normalizeLimits() (src/lib/atlantico/normalizeLimits.ts)
         ↓
/api/atlantico/limits (endpoint principal)
         ↓
/api/atlantico/calendar (proxy vers limits)
         ↓
UI Components (BookingWidget, ActivityDetailClient, CalendarWidget)
```

### Avantages

1. **Source unique:** Tous les endpoints utilisent `normalizeLimits()` → même logique de parsing
2. **Format cohérent:** `sessionsByDay` toujours en `YYYY-MM-DD` → pas de confusion
3. **Maintenance:** Un seul endroit à modifier si structure upstream change
4. **Validation:** Checkout utilise déjà `loadLimits` via `/api/atlantico/revalidate` → compatible

### Validation Checkout

- `/api/atlantico/revalidate` utilise déjà `loadLimits()` pour valider dates/times
- Compatible avec notre format normalisé (utilise `sessionsByDate[YYYYMMDD]` et `sessionsByDay[YYYY-MM-DD]`)
- Pas de modification nécessaire: la validation fonctionne déjà correctement

---

## CRITÈRES DE SUCCÈS

### ✅ Sur `/en/catalog/506` avec eventId=184:

1. **Calendrier:**
   - Seuls les jours dans `availableDates` sont cliquables
   - Les autres jours sont désactivés (gris)

2. **Time picker:**
   - Apparaît après sélection d'une date disponible
   - Affiche `allowedTimes` depuis `sessionsByDay[date]`
   - Auto-sélection du premier time si non choisi

3. **Checkout:**
   - Plus d'erreur `date_not_available` quand on vient du calendrier
   - Validation utilise `loadLimits` → compatible avec notre format

4. **Build:**
   - TypeScript compile sans erreurs
   - Aucun autre écran cassé

---

## NOTES

- **`normalizeLimits.ts`** est la fonction partagée (source unique)
- **`/api/atlantico/calendar`** est maintenant un simple proxy vers `/api/atlantico/limits`
- **Checkout validation** utilise déjà `loadLimits` → pas de modification nécessaire
- **Filtrage times:** Supprime "-" et "" mais garde "00:00" si upstream le fournit

---

**Fin du document**





# Corrections Intégration Atlantico Confirm

**Date:** 2026-01-XX  
**Objectif:** Rendre l'Event confirmation Atlantico FIABLE via POST /api/atlantico/booking/confirm

---

## FICHIERS MODIFIÉS

### UI Components

1. **`src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx`**
   - ✅ Ajout state `selectedTime` pour stocker le time sélectionné
   - ✅ Ajout state `sessionsByDay` pour stocker les sessions par jour
   - ✅ Modification fetch calendar: utilise `/api/atlantico/limits` au lieu de `/api/atlantico/calendar` pour obtenir les sessions
   - ✅ Auto-sélection du premier time disponible quand une date est sélectionnée
   - ✅ Ajout sélecteur de time dans l'UI (affiché si sessions disponibles)
   - ✅ Remplacement `'00:00'` hardcodé par `selectedTime` dans `handleBooking`
   - ✅ Migration vers `/api/atlantico/booking/confirm` (JSON au lieu de form-urlencoded)

2. **`src/components/booking/AtlanticoBookingWidget.tsx`**
   - ✅ Ajout state `selectedTime`
   - ✅ Auto-sélection du premier time disponible quand date change
   - ✅ Remplacement `'00:00'` hardcodé par extraction depuis `sessionsForDate`
   - ✅ Validation: refuse booking si sessions disponibles mais aucun time sélectionné
   - ✅ Ajout sélecteur de time dans l'UI (affiché si sessions disponibles)

### API Endpoint

3. **`src/app/api/atlantico/booking/confirm/route.ts`**
   - ✅ **Validation userId (URGENT):** Vérifie `ATLANTICO_USER_ID` env var, retourne 400 si manquant/vide/"0"/non-numérique
   - ✅ **Validation tourDate (IMPORTANT):** Appelle `loadLimits` et vérifie que la date est disponible
   - ✅ **Validation sesTime (CRITIQUE):** Vérifie que `sesTime` existe dans les sessions disponibles pour la date
   - ✅ **Validation pax (IMPORTANT):** Vérifie que `adults + childs + infants <= available` pour la session
   - ✅ Gestion erreurs upstream avec codes appropriés (400, 409, 502)
   - ✅ Utilise `serverUserId` depuis env (ignore userId du body client)

---

## NOUVELLE SOURCE DE VÉRITÉ

### Flux de données

```
loadLimits API
  ↓
sessionsByDay[date] = [{ time: "09:00", available: 10 }, ...]
  ↓
UI: CalendarWidget / ActivityDetailClient
  ↓
User sélectionne date → sessions affichées
  ↓
User sélectionne time → selectedTime stocké
  ↓
POST /api/atlantico/booking/confirm
  ↓
Validation:
  1. userId (env ATLANTICO_USER_ID)
  2. tourDate (loadLimits pour vérifier disponibilité)
  3. sesTime (dans sessions[date][].time)
  4. pax (<= session.available)
  ↓
POST Atlantico /confirm/
  ↓
{ ok: true, reference }
```

### Règles de validation

1. **sesTime:**
   - Si sessions disponibles → DOIT être dans la liste des `sessions[date][].time`
   - Si aucune session → autorise `'00:00'` uniquement
   - Filtre automatique: ignore `'-'` et `'00:00'` si ce sont des placeholders

2. **tourDate:**
   - DOIT être dans `loadLimits.dates.date[]` OU avoir au moins 1 session avec `available > 0`
   - Format: `YYYY-MM-DD`

3. **pax:**
   - `adults + childs + infants` DOIT être `> 0`
   - Si `available` existe → DOIT être `<= available`
   - Si `available` absent → warning log mais continue (fallback)

4. **userId:**
   - DOIT être défini dans `ATLANTICO_USER_ID`
   - DOIT être numérique et non vide
   - Ignore `userId` du body client (utilise toujours serveur)

---

## CODES D'ERREUR

| Code | Status | Reason | Description |
|------|--------|--------|-------------|
| `MISSING_USER_ID` | 400 | userId manquant | `ATLANTICO_USER_ID` non défini/vide/"0"/non-numérique |
| `DATE_NOT_AVAILABLE` | 409 | Date invalide | `tourDate` pas dans loadLimits ou aucune session disponible |
| `INVALID_TIME` | 409 | Time invalide | `sesTime` pas dans la liste des sessions disponibles |
| `NOT_ENOUGH_AVAILABILITY` | 409 | Capacité insuffisante | `paxTotal > available` pour la session |
| `INVALID_PAX` | 400 | Nombre invalide | `adults + childs + infants <= 0` |
| `UPSTREAM_ERROR` | 502 | Erreur Atlantico | Erreur lors de l'appel à `/confirm/` |

---

## TESTS RECOMMANDÉS

### Scénarios de test

1. **Date dispo + time valide + pax <= available**
   - ✅ Doit retourner `{ ok: true, reference }`

2. **Date non dispo**
   - ✅ Doit retourner `409 { ok: false, reason: "DATE_NOT_AVAILABLE" }`

3. **Time invalide**
   - ✅ Doit retourner `409 { ok: false, reason: "INVALID_TIME", raw: { allowedTimes: [...] } }`

4. **userId manquant**
   - ✅ Doit retourner `400 { ok: false, reason: "MISSING_USER_ID" }`

5. **pax > available**
   - ✅ Doit retourner `409 { ok: false, reason: "NOT_ENOUGH_AVAILABILITY", raw: { available, paxTotal } }`

### Test manuel rapide

```bash
# 1. Tester avec eventId=184, lang=ENG, month=2026-01-01
curl "http://localhost:3000/api/atlantico/limits?eventId=184&lang=ENG&month=2026-01-01"

# 2. Tester confirm avec données valides
curl -X POST "http://localhost:3000/api/atlantico/booking/confirm" \
  -H "Content-Type: application/json" \
  -d '{
    "t_id": "184",
    "t_group": "506",
    "language": "ENG",
    "tourDate": "2026-01-15",
    "sesTime": "09:00",
    "adults": 2,
    "childs": 0,
    "infants": 0,
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+34123456789"
  }'

# 3. Tester avec time invalide
curl -X POST "http://localhost:3000/api/atlantico/booking/confirm" \
  -H "Content-Type: application/json" \
  -d '{
    "t_id": "184",
    "t_group": "506",
    "language": "ENG",
    "tourDate": "2026-01-15",
    "sesTime": "99:99",
    ...
  }'
```

---

## VARIABLES D'ENVIRONNEMENT

### Requis

- `ATLANTICO_USER_ID` - **REQUIS** pour confirm (doit être numérique, non vide, non "0")

### Optionnel

- `ATLANTICO_ENV` - test/prod (défaut: prod)
- `ATLANTICO_BASE_URL` - override base URL
- `ATLANTICO_TOKEN` - Bearer token si requis

---

## COMPATIBILITÉ

- ✅ Compatible avec endpoints existants
- ✅ Pas de breaking changes pour les autres composants
- ✅ Endpoint legacy `/api/atlantico/confirm` toujours disponible
- ✅ Migration progressive possible (nouveau endpoint recommandé)

---

## NOTES

- **Logs:** Tous les logs sont server-side uniquement (pas de `console.log` côté client)
- **Fallback:** Si validation `loadLimits` échoue, on autorise quand même (fallback) mais log warning
- **Performance:** Validation `loadLimits` ajoute 1 appel API supplémentaire avant confirm (acceptable pour fiabilité)

---

**Fin du document**





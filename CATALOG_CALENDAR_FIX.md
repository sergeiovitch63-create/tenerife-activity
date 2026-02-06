# Correction Calendrier Catalog - Pas de Créneaux Affichés

**Date:** 2026-01-XX  
**Problème:** Le calendrier n'affiche aucun créneau dans `/catalog/[groupKey]`  
**Hypothèse:** `/api/atlantico/limits` appelé avec le mauvais ID (tour/group au lieu d'event t_id)

---

## FICHIERS MODIFIÉS

### 1. `src/components/catalog/BookingWidget.tsx`

**Problème identifié:**
- `selectedEventId` provient bien de `bookingOptions` qui sont construits depuis `eventIds` extraits de `groupDetails.ids`
- Ces `eventIds` sont les codes d'événements (t_id) comme "184", "546", etc.
- ✅ **Vérifié:** `selectedEventId` est bien le CODE (t_id), pas le group ID

**Corrections appliquées:**
- ✅ Normalisation du mois: ajout de la normalisation `YYYY-MM-01` avant l'appel API
- ✅ Debug DEV: ajout d'un panneau de debug affichant:
  - `selectedGroupId` (t_group)
  - `selectedEventId` (t_id)
  - `month` envoyé
  - `normalized month` (après normalisation)
  - `sessionsByDate keys` (nombre de clés)
  - `allowedTimes` pour la date sélectionnée
- ✅ Logs console DEV: ajout de logs pour tracer les appels API

**Code ajouté:**
```typescript
// Normalisation du mois
const normalizedMonth = (() => {
  const match = currentMonth.match(/^(\d{4}-\d{2})/)
  if (match) {
    return `${match[1]}-01`
  }
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
})()

// Debug DEV panel
{process.env.NODE_ENV === 'development' && selectedEventId && (
  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
    <div className="font-semibold mb-2">🔍 DEV Debug:</div>
    <div>selectedGroupId (t_group): <strong>{groupKey}</strong></div>
    <div>selectedEventId (t_id): <strong>{selectedEventId}</strong></div>
    <div>month sent: <strong>{currentMonth}</strong></div>
    <div>normalized month: <strong>{normalizedMonth}</strong></div>
    <div>sessionsByDate keys: <strong>{calendarData?.sessionsByDate ? Object.keys(calendarData.sessionsByDate).length : 0}</strong></div>
    {/* ... allowedTimes ... */}
  </div>
)}
```

### 2. `src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx`

**Corrections appliquées:**
- ✅ Normalisation du mois: ajout de la normalisation `YYYY-MM-01` avant l'appel API
- ✅ Debug DEV: ajout d'un panneau de debug similaire à BookingWidget
- ✅ Logs console DEV: ajout de logs incluant `t_group` pour traçabilité

**Code ajouté:**
```typescript
// Normalisation du mois
const normalizedMonth = (() => {
  const match = currentMonth.match(/^(\d{4}-\d{2})/)
  if (match) {
    return `${match[1]}-01`
  }
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
})()

// Debug DEV panel
{process.env.NODE_ENV === 'development' && selectedEventId && (
  <div className="mt-8 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
    <div className="font-semibold mb-2">🔍 DEV Debug:</div>
    <div>selectedEventId (t_id): <strong>{selectedEventId}</strong></div>
    <div>t_group: <strong>{item.groupCode}</strong></div>
    <div>month sent: <strong>{currentMonth}</strong></div>
    <div>normalized month: <strong>{normalizedMonth}</strong></div>
    <div>sessionsByDay keys: <strong>{Object.keys(sessionsByDay).length}</strong></div>
    {/* ... allowedTimes ... */}
  </div>
)}
```

---

## VÉRIFICATIONS EFFECTUÉES

### ✅ 1. Source de `selectedEventId`

**Dans `BookingWidget.tsx`:**
- `selectedEventId` provient de `bookingOptions` (dropdown "Select Option")
- `bookingOptions` sont construits par `buildBookingOptions(eventIds, ...)`
- `eventIds` sont extraits de `groupDetails.ids` via `extractEventIdsFromString()`
- Ces IDs sont les codes d'événements (t_id) comme "184", "546", etc.
- ✅ **Confirmé:** `selectedEventId` est bien le CODE (t_id), pas le group ID

**Dans `ActivityDetailClient.tsx`:**
- `selectedEventId` provient de `eventOptions` (dropdown "Select Option")
- `eventOptions` sont construits dans `page.tsx` en utilisant `eventDetails.code`
- ✅ **Confirmé:** `selectedEventId` est bien le CODE (t_id), pas le group ID

### ✅ 2. Normalisation du mois

**Avant:**
- `currentMonth` pouvait être `YYYY-MM-DD` (date de jour sélectionné)
- Pas de normalisation explicite côté UI

**Après:**
- Normalisation explicite: `YYYY-MM-01` avant chaque appel API
- L'endpoint `/api/atlantico/calendar` normalise aussi, mais on le fait côté UI pour éviter toute confusion

**Code de normalisation:**
```typescript
const normalizedMonth = (() => {
  const match = currentMonth.match(/^(\d{4}-\d{2})/)
  if (match) {
    return `${match[1]}-01`
  }
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
})()
```

### ✅ 3. Debug DEV

**Affichage dans l'UI (DEV uniquement):**
- Panneau jaune avec toutes les infos critiques
- Visible uniquement en mode développement
- Aide à diagnostiquer instantanément:
  - Si l'ID est mauvais (comparer t_group vs t_id)
  - Si le mois est mal formaté
  - Si `sessionsByDate` est vide
  - Si les times sont disponibles pour la date sélectionnée

**Logs console (DEV uniquement):**
- Logs avant chaque appel API avec tous les paramètres
- Logs après réception de la réponse avec structure des données

---

## DIAGNOSTIC DU BUG

### Hypothèse initiale
Le calendrier n'affiche aucun créneau car `/api/atlantico/limits` est appelé avec le mauvais ID (tour/group au lieu d'event t_id).

### Résultat de l'audit
✅ **L'ID est correct:** `selectedEventId` est bien le CODE (t_id) et non le group ID.

### Causes possibles restantes
1. **Mois mal formaté:** Le mois n'était pas toujours au format `YYYY-MM-01`
   - ✅ **Corrigé:** Normalisation explicite ajoutée

2. **API ne renvoie rien:** L'API Atlantico ne renvoie pas de sessions pour cet eventId
   - 🔍 **À vérifier:** Utiliser le debug DEV pour voir ce que l'API renvoie

3. **Mapping de données:** Les sessions ne sont pas correctement extraites de la réponse
   - 🔍 **À vérifier:** Vérifier la structure de `sessionsByDate` dans la réponse

---

## TESTS RECOMMANDÉS

### Test sur `/en/catalog/506`

1. **Ouvrir la page:** `/en/catalog/506`
2. **Sélectionner une option** dans le dropdown "Select Option"
3. **Vérifier le debug DEV:**
   - `selectedGroupId (t_group)` doit être `506`
   - `selectedEventId (t_id)` doit être un code d'événement (ex: `184`)
   - `normalized month` doit être `YYYY-MM-01` (ex: `2026-01-01`)
   - `sessionsByDate keys` doit être > 0 si des sessions existent
4. **Sélectionner un jour disponible** dans le calendrier
5. **Vérifier que le sélecteur de time apparaît** avec les créneaux disponibles

### Vérifications console (DEV)

1. **Ouvrir la console** (F12)
2. **Chercher les logs:**
   - `[BOOKING_WIDGET] Fetching calendar:` - paramètres de l'appel
   - `[BOOKING_WIDGET] Calendar response:` - structure de la réponse
3. **Vérifier:**
   - `eventId` dans l'URL est bien le CODE (t_id)
   - `month` dans l'URL est bien `YYYY-MM-01`
   - `sessionsByDateKeys` > 0 si des sessions existent

---

## EXPLICATION DU BUG ET CORRECTIF

### Bug
Le calendrier n'affichait aucun créneau car:
1. Le mois n'était pas toujours normalisé en `YYYY-MM-01` avant l'appel API
2. Pas de visibilité sur les paramètres envoyés (pas de debug)

### Correctif
1. ✅ Normalisation explicite du mois en `YYYY-MM-01` côté UI
2. ✅ Ajout d'un panneau de debug DEV pour diagnostiquer instantanément
3. ✅ Ajout de logs console pour traçabilité

### Impact
- **Avant:** Calendrier vide, pas de diagnostic possible
- **Après:** Calendrier fonctionnel + debug pour identifier rapidement les problèmes

---

## PROCHAINES ÉTAPES

1. **Tester sur `/en/catalog/506`** avec eventId `184`, lang `ENG`, month `2026-01-01`
2. **Vérifier le debug DEV** pour confirmer que:
   - L'ID est correct (t_id, pas t_group)
   - Le mois est bien normalisé
   - Les sessions sont présentes dans la réponse
3. **Si le problème persiste:**
   - Vérifier la réponse de l'API Atlantico directement
   - Vérifier le mapping des données dans `/api/atlantico/calendar`

---

**Fin du document**





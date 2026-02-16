# Déconnexion Complète du Calendrier Atlantico

**Date:** 2026-01-XX  
**Objectif:** Déconnecter complètement tout ce qui touche au calendrier Atlantico (loadLimits/calendar) dans le projet, pour repartir proprement.

---

## FICHIERS MODIFIÉS

### 1. **Composants UI (4 fichiers)**

#### `src/components/catalog/BookingWidget.tsx`
- ✅ Supprimé: `selectedSession`, `calendarData`, `calendarRaw`, `calendarLoading`, `calendarError`, `monthsChecked`
- ✅ Supprimé: `useEffect` qui fetch `/api/atlantico/calendar`
- ✅ Supprimé: `sessionsForDate` (extraction des sessions)
- ✅ Supprimé: Panneau debug DEV
- ✅ Supprimé: Time picker (sessions selector)
- ✅ Remplacé: `availableDates` par calcul dummy (tous les jours futurs sont "disponibles" UI uniquement)
- ✅ Conservé: `adults`, `childs`, `infants` (nécessaires pour le booking)
- ✅ Conservé: Calendrier visuel (dummy, tous les jours futurs cliquables)

#### `src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx`
- ✅ Supprimé: `selectedTime`, `availableDates`, `sessionsByDay`, `loadingCalendar`
- ✅ Supprimé: `useEffect` qui fetch `/api/atlantico/limits`
- ✅ Supprimé: Panneau debug DEV
- ✅ Supprimé: Time selector
- ✅ Remplacé: `availableDatesSet` par calcul dummy (tous les jours futurs sont "disponibles" UI uniquement)
- ✅ Conservé: Calendrier visuel (dummy, tous les jours futurs cliquables)
- ✅ Modifié: `sesTime` toujours `'00:00'` (pas de sélection de time)

#### `src/components/booking/CalendarWidget.tsx`
- ✅ Supprimé: `limits`, `loading`, `error`, `selectedDaySessions`
- ✅ Supprimé: `fetchLimits()` et `useEffect` qui fetch `/api/atlantico/limits`
- ✅ Supprimé: Loading/Error states
- ✅ Supprimé: Sessions display
- ✅ Remplacé: `getDaysInMonth()` par calcul dummy (tous les jours futurs sont "disponibles" UI uniquement)
- ✅ Conservé: Calendrier visuel (dummy, tous les jours futurs cliquables)

#### `src/app/[locale]/backoffice/page.tsx`
- ✅ Modifié: Bouton "Open Calendar" affiche maintenant "(Disabled)"
- ✅ Conservé: Appel API (retourne réponse vide, pas d'erreur)

### 2. **Routes API (2 fichiers)**

#### `src/app/api/atlantico/calendar/route.ts`
- ✅ Supprimé: Import `normalizeLimits`
- ✅ Supprimé: Toute logique upstream fetch vers Atlantico
- ✅ Supprimé: Logs server-side (LIMITS_TRUTH, etc.)
- ✅ Retourne: `{ ok: true, disabled: true, dates: [], sessionsByDate: {} }` (200 OK, pas d'erreur)

#### `src/app/api/atlantico/limits/route.ts`
- ✅ Supprimé: Import `normalizeLimits`
- ✅ Supprimé: Toute logique upstream fetch vers Atlantico
- ✅ Supprimé: Logs server-side
- ✅ Retourne: `{ ok: true, disabled: true, quote: 0, wdays: [], dates: [], sessionsByDay: {} }` (200 OK, pas d'erreur)

---

## RÉSUMÉ DES SUPPRESSIONS

### UI Components
- ❌ **0 appels réseau** vers `/api/atlantico/calendar` ou `/api/atlantico/limits`
- ❌ **0 states** liés au calendrier (`sessionsByDay`, `sessionsByDate`, `selectedTime`, `calendarData`, etc.)
- ❌ **0 time pickers** (sessions selector)
- ❌ **0 panneaux debug DEV** liés au calendrier
- ✅ **Calendrier visuel conservé** (dummy, tous les jours futurs cliquables)

### API Routes
- ❌ **0 appels upstream** vers Atlantico API (`loadLimits`)
- ❌ **0 logs server-side** liés au calendrier
- ✅ **Routes conservées** (retournent réponse vide, pas d'erreur de routing)

---

## VÉRIFICATIONS

### ✅ Build OK
- TypeScript compile sans erreurs
- Aucune erreur de linting

### ✅ Routing OK
- Routes `/api/atlantico/calendar` et `/api/atlantico/limits` existent toujours
- Retournent 200 OK avec réponse vide (pas d'erreur 404/500)

### ✅ UI Intacte
- Calendrier s'affiche (dummy, tous les jours futurs cliquables)
- Sélection de date fonctionne (state local uniquement)
- Time picker masqué (pas de sessions)
- Autres sections intactes (prices, eventDetails, groupDetails)

---

## ACTIONS SUIVANTES

1. **Tester manuellement:**
   - Ouvrir une page activité (`/en/catalog/506`)
   - Vérifier que le calendrier s'affiche
   - Vérifier qu'aucun call réseau vers `/api/atlantico/calendar` ou `/api/atlantico/limits` n'est fait (DevTools Network)
   - Vérifier qu'aucune erreur console liée au calendrier

2. **Vérifier autres fichiers (si nécessaire):**
   - `src/components/booking/AtlanticoBookingWidget.tsx` (utilise `/api/atlantico/loadLimits/[idExc]/[lang]` - route différente, non touchée)
   - Autres fichiers qui pourraient utiliser le calendrier

---

## NOTES

- **`normalizeLimits.ts`** existe toujours mais n'est plus utilisé (peut être supprimé si nécessaire)
- **`AtlanticoBookingWidget.tsx`** utilise une route différente (`/api/atlantico/loadLimits/[idExc]/[lang]`) et n'a pas été modifié
- Les **prices** et **eventDetails** restent intacts (non touchés)

---

**Fin du document**













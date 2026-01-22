# AUDIT INTÉGRATION ATLANTICO - CONFIRMATION BOOKING

**Date:** 2026-01-XX  
**Auditeur:** Senior Next.js Engineer  
**Objectif:** Préparer une confirmation de booking fiable

---

## ÉTAPE 1 — INVENTAIRE

### 1.1 Endpoints API Atlantico (`src/app/api/atlantico/**`)

#### Endpoints de Booking

| Route | Méthode | Paramètres | Format Réponse | Status |
|-------|---------|------------|----------------|--------|
| `/api/atlantico/booking/confirm` | POST | JSON body: `{ userId, t_id, t_group, language, tourDate, sesTime, adults, childs?, infants?, name, email, phone, hotel?, room?, mpoint?, mtime?, notes? }` | `{ ok: boolean, reference?: string, reason?: string, raw?: any }` | ✅ NOUVEAU |
| `/api/atlantico/booking/payment` | POST | JSON body: même que confirm | `{ ok: boolean, redirectUrl?: string, reason?: string, raw?: any }` | ✅ NOUVEAU |
| `/api/atlantico/confirm` | POST | Form-urlencoded ou JSON | `{ success: boolean, bookingReference?: string, error?: string }` | ✅ EXISTANT |
| `/api/atlantico/payment` | POST | JSON body | `{ success: boolean, redirectUrl?: string, error?: string }` | ✅ EXISTANT |

#### Endpoints de Données

| Route | Méthode | Paramètres | Format Réponse |
|-------|---------|------------|----------------|
| `/api/atlantico/limits` | GET | `?eventId=&lang=&month=YYYY-MM-01` | `{ quote, wdays, dates, sessionsByDay: Record<string, Session[]> }` |
| `/api/atlantico/prices` | GET | `?eventId=&date=YYYY-MM-DD&lang=&office?&pProd?` | `{ type: 'per_person'\|'per_day'\|'unknown', adult?, child?, infant?, tiers?, raw? }` |
| `/api/atlantico/event-details` | GET | `?eventId=&lang=` | `{ id, code, name, days, times, pProd, route, icons, desc }` |
| `/api/atlantico/calendar` | GET | `?eventId=&lang=&month=YYYY-MM-01` | `{ ok: boolean, dates: string[], sessionsByDate?: Record<string, Session[]> }` |
| `/api/atlantico/revalidate` | POST | JSON body | Validation de disponibilité avant booking |

#### Autres Endpoints

- `/api/atlantico/availability/[eventCode]/[lang]` - GET
- `/api/atlantico/loadLimits/[idExc]/[lang]` - GET
- `/api/atlantico/loadLimits/[idExc]/[lang]/[date]` - GET
- `/api/atlantico/prices/[eventId]` - GET
- `/api/atlantico/event/[eventCode]/[lang]` - GET
- `/api/atlantico/group/[groupId]/[lang]` - GET
- `/api/atlantico/group-details/[code]/[lang]` - GET
- `/api/atlantico/catalog` - GET
- `/api/atlantico/catalog/[lang]` - GET
- `/api/atlantico/cancel` - POST
- `/api/atlantico/cancelBooking/[bookingCode]` - POST
- `/api/atlantico/health` - GET
- `/api/atlantico/ip` - GET
- `/api/atlantico/sync` - GET
- `/api/atlantico/backoffice` - GET
- `/api/atlantico/tours/[lang]` - GET
- `/api/atlantico/tours-enriched/[lang]` - GET
- `/api/atlantico/tours-pricing/[lang]` - GET
- Plusieurs endpoints debug

### 1.2 Client HTTP Atlantico

**Fichier:** `src/lib/atlantico/client.ts`

- **Base URL:**
  - Test: `https://testapi.atlanticoexcursiones.com` (si `ATLANTICO_ENV=test`)
  - Prod: `https://api.atlanticoexcursiones.com` (défaut)
  - Configurable via `ATLANTICO_BASE_URL` (priorité)

- **Fonctions:**
  - `getBaseUrl()`: Sélection test/prod selon `ATLANTICO_ENV`
  - `fetchText(path, options)`: Fetch avec timeout (10s défaut), gestion erreurs
  - `fetchJson(path, options)`: Parse JSON avec fallback
  - `atlanticoGet(path, params?)`: Helper GET avec query params

- **Gestion erreurs:**
  - Timeout: 10s par défaut (configurable via `ATLANTICO_TIMEOUT_MS`)
  - Pas de retry automatique dans `client.ts`
  - Logs serveur uniquement

**Fichier:** `src/lib/atlantico/fetch.ts` (ancien client)

- Retry avec backoff (3 tentatives)
- Timeout: 10s
- Gestion erreurs retryables (502/503/504, ECONNRESET, ETIMEDOUT)

**Fichier:** `src/lib/atlantico/post.ts`

- `atlanticoPost(endpoint, data, options)`: POST avec form-urlencoded
- Retry: 2 tentatives
- Timeout: configurable

### 1.3 Composants UI Booking

| Composant | Fichier | Fonction |
|-----------|---------|----------|
| **CalendarWidget** | `src/components/booking/CalendarWidget.tsx` | Calendrier mensuel, sélection date + session |
| **AtlanticoBookingWidget** | `src/components/booking/AtlanticoBookingWidget.tsx` | Widget booking complet (calendrier + formulaire + paiement) |
| **ActivityDetailClient** | `src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx` | Page activité avec booking intégré |
| **BookingWidget** | `src/components/catalog/BookingWidget.tsx` | Widget booking pour catalog |
| **ActivityBookingPanel** | `src/components/activities/ActivityBookingPanel.tsx` | Panel booking activités |
| **CheckoutClient** | `src/app/[locale]/checkout/CheckoutClient.tsx` | Page checkout |
| **CheckoutPage** | `src/app/[locale]/checkout/page.tsx` | Page checkout (alternative) |

### 1.4 Variables d'Environnement

| Variable | Usage | Source | Requis |
|----------|-------|--------|--------|
| `ATLANTICO_ENV` | test/prod | `client.ts` | Non (défaut: prod) |
| `ATLANTICO_BASE_URL` | Override base URL | `config.ts` | Non (défaut: prod URL) |
| `ATLANTICO_TOKEN` | Bearer token | `client.ts`, `config.ts` | Non |
| `ATLANTICO_TIMEOUT_MS` | Timeout requests | `config.ts` | Non (défaut: 10000) |
| `ATLANTICO_REVALIDATE_SECONDS` | Cache revalidation | `config.ts` | Non (défaut: 300) |
| `ATLANTICO_USER_ID` | userId pour confirm/payment | `payment/route.ts`, `booking/confirm/route.ts` | ✅ **REQUIS** |
| `ATLANTICO_OFFICE_ID` | Office code pour loadPrices | `prices/route.ts` | Non |
| `ATLANTICO_OFFICE` | Alias pour office | Divers | Non |
| `ATLANTICO_COLLABORATOR` | Collaborator code | Divers | Non |
| `ATLANTICO_DEBUG_ENABLED` | Debug admin page | `admin/atlantico-debug/page.tsx` | Non |
| `ATLANTICO_LANGUAGE_DEFAULT` | Langue par défaut | Divers | Non (défaut: ENG) |

---

## ÉTAPE 2 — SOURCE DE VÉRITÉ (Champs confirm/)

### Tableau de Traçage

| Champ | Source | Moment Fixation | Peut Changer ? | Fiabilité |
|-------|--------|-----------------|----------------|-----------|
| **userId** | `process.env.ATLANTICO_USER_ID` (serveur) | Au moment de l'appel API | ❌ Non | ⚠️ **RISQUE** - Peut être manquant ou "0" |
| **t_id** | `eventDetails.code` (depuis `groupDetails.ids`) | Sélection option dropdown | ⚠️ Oui (si user change option) | ✅ **OK** - Corrigé récemment |
| **t_group** | `item.groupCode` (depuis catalog) | Page load | ❌ Non | ✅ **OK** |
| **language** | `mapLocaleToAtlanticoLang(locale)` | Page load | ❌ Non | ✅ **OK** - Mapping corrigé |
| **tourDate** | Sélection calendrier (`CalendarWidget`) | Clic utilisateur | ⚠️ Oui (si user change date) | ⚠️ **RISQUE** - Pas validé contre loadLimits avant confirm |
| **sesTime** | `loadLimits.sessionsByDay[date][].time` | Sélection session utilisateur | ⚠️ Oui (si user change session) | ⚠️ **RISQUE** - Pas toujours extrait de loadLimits |
| **adults** | Formulaire utilisateur | Saisie utilisateur | ⚠️ Oui | ⚠️ **RISQUE** - Pas validé contre availability |
| **childs** | Formulaire utilisateur | Saisie utilisateur | ⚠️ Oui | ⚠️ **RISQUE** - Pas validé |
| **infants** | Formulaire utilisateur | Saisie utilisateur | ⚠️ Oui | ⚠️ **RISQUE** - Pas validé |
| **name** | Formulaire utilisateur | Saisie utilisateur | ⚠️ Oui | ✅ **OK** |
| **email** | Formulaire utilisateur | Saisie utilisateur | ⚠️ Oui | ✅ **OK** |
| **phone** | Formulaire utilisateur | Saisie utilisateur | ⚠️ Oui | ✅ **OK** |
| **hotel** | Formulaire utilisateur (optionnel) | Saisie utilisateur | ⚠️ Oui | ✅ **OK** |
| **room** | Formulaire utilisateur (optionnel) | Saisie utilisateur | ⚠️ Oui | ✅ **OK** |
| **mpoint** | Formulaire utilisateur (optionnel) | Saisie utilisateur | ⚠️ Oui | ✅ **OK** |
| **mtime** | Formulaire utilisateur (optionnel) | Saisie utilisateur | ⚠️ Oui | ✅ **OK** |

### Détails par Champ

#### userId
- **Source actuelle:** `process.env.ATLANTICO_USER_ID` (serveur uniquement)
- **Problèmes:**
  - Dans `AtlanticoBookingWidget.tsx`: fallback à `'0'` si non défini
  - Dans `ActivityDetailClient.tsx`: **MANQUANT** - pas de userId dans le payload
  - Validation dans `/api/atlantico/payment/route.ts` mais pas dans `/api/atlantico/booking/confirm/route.ts`
- **Risque:** ⚠️ **ÉLEVÉ** - Confirm peut échouer si userId manquant

#### t_id (Event Code)
- **Source actuelle:** 
  - `eventDetails.code` (depuis `groupDetails.ids` parsé)
  - Corrigé dans `src/app/[locale]/activity/[slug]/page.tsx` (ligne 161-162)
- **Problèmes:** Aucun (corrigé récemment)
- **Risque:** ✅ **FAIBLE**

#### tourDate
- **Source actuelle:** 
  - `CalendarWidget`: sélection utilisateur
  - `ActivityDetailClient`: `selectedDate` state
- **Problèmes:**
  - Pas de validation contre `loadLimits.dates` avant confirm
  - Date peut être sélectionnée puis devenir indisponible
- **Risque:** ⚠️ **MOYEN** - Date peut être invalide au moment du confirm

#### sesTime
- **Source actuelle:**
  - **Problème majeur:** Dans `ActivityDetailClient.tsx` ligne 312: **hardcodé à `'00:00'`**
  - Dans `AtlanticoBookingWidget.tsx` ligne 1871: **hardcodé à `'00:00'`** pour activités day-based
  - Dans `CalendarWidget.tsx`: extrait de `sessionsByDay[date][].time` mais pas toujours utilisé
- **Problèmes:**
  - ⚠️ **CRITIQUE:** `sesTime` n'est PAS extrait de `loadLimits.sessions` dans la plupart des cas
  - Fallback à `'00:00'` systématique
  - Pas de validation que `sesTime` existe dans les sessions disponibles
- **Risque:** ⚠️ **ÉLEVÉ** - `sesTime` peut être invalide

#### adults/childs/infants
- **Source actuelle:** Formulaire utilisateur
- **Problèmes:**
  - Pas de validation contre `loadLimits.sessions[date][time].available`
  - Total peut dépasser la capacité disponible
- **Risque:** ⚠️ **MOYEN** - Peut dépasser la capacité

---

## ÉTAPE 3 — VÉRIFICATIONS CRITIQUES

### 3.1 sesTime provient-il STRICTEMENT de loadLimits.sessions ?

❌ **NON**

**Preuve:**
- `ActivityDetailClient.tsx` ligne 312: `formData.append('sesTime', '00:00')` - **hardcodé**
- `AtlanticoBookingWidget.tsx` ligne 1871: `const sesTime = '00:00'` - **hardcodé**
- `CalendarWidget.tsx` extrait bien les sessions mais `sesTime` n'est pas toujours propagé au formulaire

**Exception:** `AtlanticoBookingWidget.tsx` a du code pour extraire `sesTime` des sessions (ligne 1194-1275) mais il n'est pas utilisé dans tous les cas.

### 3.2 tourDate est-il validé contre loadLimits ?

❌ **NON**

**Preuve:**
- Aucune validation dans `ActivityDetailClient.tsx` avant l'appel confirm
- Aucune validation dans `AtlanticoBookingWidget.tsx` avant payment
- `/api/atlantico/revalidate` existe mais n'est pas appelé systématiquement

**Exception:** `/api/atlantico/payment/route.ts` appelle `revalidateBeforePayment()` (ligne 324) mais `/api/atlantico/booking/confirm/route.ts` ne le fait pas.

### 3.3 Nombre de personnes validé contre availability ?

❌ **NON**

**Preuve:**
- Pas de vérification que `adults + childs + infants <= available` dans les composants UI
- Pas de validation dans `/api/atlantico/booking/confirm/route.ts`
- `/api/atlantico/payment/route.ts` a `checkSessionAvailability()` mais ne valide pas le nombre total

### 3.4 Existe-t-il déjà un endpoint POST de confirmation ?

✅ **OUI** - **2 endpoints:**

1. `/api/atlantico/booking/confirm` (NOUVEAU - créé récemment)
   - Accepte JSON body
   - Utilise `fetchText()` du nouveau client
   - Validation format date/time
   - Extraction référence

2. `/api/atlantico/confirm` (EXISTANT - legacy)
   - Accepte form-urlencoded ou JSON
   - Utilise `atlanticoPost()` de l'ancien client
   - Plus de validation
   - Utilisé par `ActivityDetailClient.tsx`

**Problème:** Double implémentation, pas de cohérence.

---

## ÉTAPE 4 — DIAGNOSTIC

### 4.1 Tableau Champ → Source → Fiabilité

| Champ | Source | Fiabilité | Action Requise |
|-------|--------|-----------|----------------|
| userId | `ATLANTICO_USER_ID` env | ⚠️ **RISQUE** | Ajouter validation dans `/api/atlantico/booking/confirm` |
| t_id | `eventDetails.code` | ✅ **OK** | Aucune |
| t_group | `item.groupCode` | ✅ **OK** | Aucune |
| language | `mapLocaleToAtlanticoLang()` | ✅ **OK** | Aucune |
| tourDate | Sélection calendrier | ⚠️ **RISQUE** | Valider contre `loadLimits` avant confirm |
| sesTime | **Hardcodé `'00:00'`** | ⚠️ **CRITIQUE** | Extraire de `loadLimits.sessions` |
| adults | Formulaire | ⚠️ **RISQUE** | Valider contre `available` |
| childs | Formulaire | ⚠️ **RISQUE** | Valider contre `available` |
| infants | Formulaire | ⚠️ **RISQUE** | Valider contre `available` |
| name | Formulaire | ✅ **OK** | Aucune |
| email | Formulaire | ✅ **OK** | Aucune |
| phone | Formulaire | ✅ **OK** | Aucune |
| hotel | Formulaire (opt) | ✅ **OK** | Aucune |
| room | Formulaire (opt) | ✅ **OK** | Aucune |
| mpoint | Formulaire (opt) | ✅ **OK** | Aucune |
| mtime | Formulaire (opt) | ✅ **OK** | Aucune |

### 4.2 Fichiers Critiques

**Endpoints API:**
- `src/app/api/atlantico/booking/confirm/route.ts` ⚠️ **CRITIQUE**
- `src/app/api/atlantico/confirm/route.ts` (legacy)
- `src/app/api/atlantico/revalidate/route.ts` (validation)

**Composants UI:**
- `src/app/[locale]/activity/[slug]/ActivityDetailClient.tsx` ⚠️ **CRITIQUE**
- `src/components/booking/AtlanticoBookingWidget.tsx` ⚠️ **CRITIQUE**
- `src/components/booking/CalendarWidget.tsx`

**Client API:**
- `src/lib/atlantico/client.ts`
- `src/lib/atlantico/post.ts`

**Configuration:**
- `src/lib/atlantico/config.ts`
- Variables d'environnement

### 4.3 Actions Minimales Nécessaires

#### 🔴 CRITIQUE (Bloquant)

1. **Extraire `sesTime` de `loadLimits.sessions`**
   - Fichier: `ActivityDetailClient.tsx`, `AtlanticoBookingWidget.tsx`
   - Action: Remplacer `'00:00'` hardcodé par extraction depuis `sessionsByDay[date][selectedSession].time`
   - Stocker `sessionId`, `TipoReservaId`, `rcId` si disponibles

2. **Valider `userId` dans `/api/atlantico/booking/confirm`**
   - Fichier: `src/app/api/atlantico/booking/confirm/route.ts`
   - Action: Ajouter validation comme dans `payment/route.ts` (ligne 278-287)

3. **Valider `tourDate` contre `loadLimits` avant confirm**
   - Fichier: `src/app/api/atlantico/booking/confirm/route.ts`
   - Action: Appeler `checkSessionAvailability()` ou équivalent avant confirm

#### 🟡 IMPORTANT (Recommandé)

4. **Valider nombre de personnes contre `available`**
   - Fichier: `src/app/api/atlantico/booking/confirm/route.ts`
   - Action: Vérifier `adults + childs + infants <= session.available`

5. **Unifier les endpoints confirm**
   - Fichier: Tous les composants UI
   - Action: Migrer vers `/api/atlantico/booking/confirm` et déprécier `/api/atlantico/confirm`

6. **Ajouter revalidation dans confirm (comme payment)**
   - Fichier: `src/app/api/atlantico/booking/confirm/route.ts`
   - Action: Appeler `revalidateBeforePayment()` ou équivalent

#### 🟢 OPTIONNEL (Amélioration)

7. **Propager `sessionId`, `TipoReservaId`, `rcId` si disponibles**
   - Fichier: Composants UI + endpoints
   - Action: Stocker et envoyer ces champs si présents dans `loadLimits`

8. **Améliorer gestion erreurs**
   - Fichier: Tous les endpoints
   - Action: Messages d'erreur plus explicites

---

## RÉSUMÉ EXÉCUTIF

### ✅ OK (Déjà Conforme)
- `t_id`, `t_group`, `language` → Sources fiables
- Champs formulaire (name, email, phone, etc.) → OK
- Endpoints existent et fonctionnent

### ⚠️ RISQUE (Mismatch Possible)
- `tourDate` → Pas validé avant confirm
- `adults/childs/infants` → Pas validé contre capacity
- `userId` → Peut être manquant

### 🔴 MANQUANT (Critique)
- `sesTime` → **Hardcodé `'00:00'` au lieu d'extraire de `loadLimits.sessions`**
- Validation `tourDate` → Pas de vérification avant confirm
- Validation `userId` → Manquante dans `/api/atlantico/booking/confirm`

### Actions Prioritaires
1. **URGENT:** Extraire `sesTime` de `loadLimits.sessions` (remplacer `'00:00'` hardcodé)
2. **URGENT:** Valider `userId` dans endpoint confirm
3. **IMPORTANT:** Valider `tourDate` contre `loadLimits` avant confirm
4. **IMPORTANT:** Valider nombre de personnes contre `available`

---

**Fin du rapport d'audit**


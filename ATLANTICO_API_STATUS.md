# État de l'Intégration API Atlantico

**Date:** 2026-02-14  
**Objectif:** Documenter l'état actuel de l'intégration et identifier ce qui manque

---

## 📋 Endpoints Implémentés

### Endpoints GET (Données)

| Endpoint Atlantico | Route Next.js | Status | Fichier |
|-------------------|---------------|--------|---------|
| `/clasificationList/{lang}` | `GET /api/atlantico/classifications?lang=` | ✅ | `classifications/route.ts` |
| `/groupsList/{lang}/{page}` | `GET /api/atlantico/groups?lang=&page=` | ✅ | `groups/route.ts` |
| `/groupsList/{lang}/{page}/{classificationCode}` | `GET /api/atlantico/groups?lang=&page=&classificationId=` | ✅ | `groups/route.ts` |
| `/groupDetails/{groupId}/{lang}` | `GET /api/atlantico/group/[groupId]/[lang]` | ✅ | `group/[groupId]/[lang]/route.ts` |
| `/groupDetails/{groupId}/{lang}` | `GET /api/atlantico/group-details/[code]/[lang]` | ✅ | `group-details/[code]/[lang]/route.ts` |
| `/eventDetails/{eventCode}/{lang}` | `GET /api/atlantico/event/[eventCode]/[lang]` | ✅ | `event/[eventCode]/[lang]/route.ts` |
| `/eventDetails/{eventCode}/{lang}` | `GET /api/atlantico/event-details?eventId=&lang=` | ✅ | `event-details/route.ts` |
| `/loadPrices/{eventCode}/{date}` | `GET /api/atlantico/prices/[eventCode]?date=` | ✅ | `prices/[eventCode]/route.ts` |
| `/loadPrices/{eventCode}/{date}/{office}` | `GET /api/atlantico/prices/[eventCode]?date=&office=` | ✅ | `prices/[eventCode]/route.ts` |
| `/loadLimits/{eventCode}/{lang}/{month}` | `GET /api/atlantico/limits?eventId=&lang=&month=` | ✅ | `limits/route.ts` |
| `/loadLimits/{eventCode}/{lang}/{month}` | `GET /api/atlantico/availability/[eventCode]/[lang]?month=` | ✅ | `availability/[eventCode]/[lang]/route.ts` |
| `/loadLimits/{eventCode}/{lang}/{month}` | `GET /api/atlantico/loadLimits/[idExc]/[lang]?month=` | ✅ | `loadLimits/[idExc]/[lang]/route.ts` |

### Endpoints POST (Booking)

| Endpoint Atlantico | Route Next.js | Status | Fichier |
|-------------------|---------------|--------|---------|
| `/payment/` | `POST /api/atlantico/booking/payment` | ✅ | `booking/payment/route.ts` |
| `/cancelBooking/{BookingCode}` | `POST /api/atlantico/cancel` | ✅ | `cancel/route.ts` |
| `/cancelBooking/{BookingCode}/{Note}` | `POST /api/atlantico/cancelBooking/[bookingCode]` | ✅ | `cancelBooking/[bookingCode]/route.ts` |
| `/booking/{bookingCode}` (probable) | `GET /api/atlantico/booking/[bookingCode]` | ✅ **NOUVEAU** | `booking/[bookingCode]/route.ts` |

### Endpoints Utilitaires

| Route Next.js | Status | Fichier |
|---------------|--------|---------|
| `GET /api/atlantico/health` | ✅ | `health/route.ts` |
| `GET /api/atlantico/ip` | ✅ | `ip/route.ts` |
| `GET /api/atlantico/sync` | ✅ | `sync/route.ts` |
| `GET /api/atlantico/backoffice` | ✅ | `backoffice/route.ts` |
| `POST /api/atlantico/revalidate` | ✅ | `revalidate/route.ts` |
| `GET /api/atlantico/calendar` | ✅ | `calendar/route.ts` |

---

## ❌ Endpoints Probablement Manquants

### Booking Management

| Endpoint Probable | Description | Priorité | Raison |
|------------------|-------------|----------|---------|
| `GET /booking/{bookingCode}` | Récupérer les détails d'une réservation | ✅ **IMPLÉMENTÉ** | Endpoint créé avec fallback sur plusieurs variantes possibles |
| `GET /bookings` | Lister les réservations (si supporté) | 🟡 **MOYENNE** | Utile pour un backoffice, mais peut-être pas nécessaire |
| `POST /booking/{bookingCode}/modify` | Modifier une réservation | 🟡 **MOYENNE** | Utile mais peut-être pas supporté par Atlantico |

### Autres Endpoints Potentiels

| Endpoint Probable | Description | Priorité | Raison |
|------------------|-------------|----------|---------|
| `GET /offices` | Lister les offices disponibles | 🟢 **BASSE** | Peut être utile pour filtrer par office |
| `GET /meetingPoints/{eventCode}` | Points de rencontre pour un event | 🟢 **BASSE** | Peut être déjà dans eventDetails |

---

## 📝 Notes Importantes

### Endpoints Supprimés Récemment

- ❌ `POST /api/atlantico/booking/confirm` - **SUPPRIMÉ** (remplacé par `/payment/`)
- ❌ `POST /api/atlantico/confirm` - **SUPPRIMÉ** (remplacé par `/payment/`)

**Raison:** Migration vers un flow exclusif avec `/payment/` qui redirige vers la payment gateway.

### Endpoints Legacy (À Déprécier)

- ⚠️ `GET /api/atlantico/tours/[lang]` - Legacy
- ⚠️ `GET /api/atlantico/tours-enriched/[lang]` - Legacy
- ⚠️ `GET /api/atlantico/tours-pricing/[lang]` - Legacy

**Recommandation:** Migrer vers `/api/catalog/full` qui est le système unifié.

---

## 🎯 Actions Recommandées

### Priorité Haute

1. ✅ **Implémenter `GET /api/atlantico/booking/[bookingCode]`** - **TERMINÉ**
   - Permet de vérifier le statut d'une réservation
   - Utile pour afficher les détails après paiement
   - Standard dans les APIs de booking
   - **Implémentation:** Essaie plusieurs variantes d'endpoints possibles avec fallback

### Priorité Moyenne

2. **Vérifier le PDF Atlantico pour endpoints manquants**
   - Documenter tous les endpoints disponibles
   - Identifier ceux qui ne sont pas encore implémentés

3. **Nettoyer les endpoints legacy**
   - Migrer les usages vers `/api/catalog/full`
   - Supprimer les endpoints legacy

### Priorité Basse

4. **Améliorer la documentation**
   - Ajouter des exemples d'utilisation
   - Documenter les formats de réponse

---

## 📚 Références

- Documentation interne: `docs/atlantico-api-diagnostic.md`
- Audit booking: `ATLANTICO_BOOKING_AUDIT.md`
- Audit général: `AUDIT_ATLANTICO.md`


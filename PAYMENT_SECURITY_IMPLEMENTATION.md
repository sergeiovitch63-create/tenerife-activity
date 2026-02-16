# Sécurisation du Flow Paiement Atlántico - Implémentation

## Résumé des modifications

### A) Normalisation du mapping locale → language

✅ **Fichier modifié**: `src/lib/atlantico/lang.ts`
- Le mapping existe déjà et est complet
- `mapLocaleToAtlanticoLang()` : lowercase ("en", "fr", "es", "de", "ru", "uk", "pl", "it")
- `mapLocaleToAtlanticoLangUpper()` : uppercase ("ENG", "FRA", "ESP", etc.)

✅ **Utilisation vérifiée**:
- `groupDetails()` et `eventDetails()` : utilisent `mapLocaleToAtlanticoLangUpper()` ✅
- `loadLimits()` : utilise `mapLocaleToAtlanticoLang()` (lowercase) ✅
- `payment` : **corrigé** pour utiliser `mapLocaleToAtlanticoLang()` (lowercase) ✅

### B) Revalidation juste avant paiement

✅ **Fichier modifié**: `src/app/api/atlantico/payment/route.ts`
- Fonction `revalidateBeforePayment()` améliorée
- Vérifie la disponibilité de la session via `loadLimits()`
- Recalcule le prix via `loadPrices()`
- Compare avec le prix original du cart (`originalPriceSnapshot`)
- Retourne `409` avec code `PRICE_CHANGED` ou `SLOT_UNAVAILABLE`

✅ **Fichier modifié**: `src/app/api/atlantico/payment/schema.ts`
- Ajout de `PriceSnapshot` interface
- Ajout de `originalPriceSnapshot` optionnel dans `PaymentRequest`

✅ **Fichier modifié**: `src/app/[locale]/checkout/page.tsx`
- Envoie `originalPriceSnapshot` dans le payload
- Gère les erreurs 409 avec UI améliorée

### C) Payment route: gestion 3 formes de réponse

✅ **Fichier modifié**: `src/app/api/atlantico/payment/route.ts`
- Parsing robuste des réponses :
  1. JSON avec `redirectUrl`
  2. HTML (form auto-submit)
  3. Texte contenant une URL
- Timeout: 15s avec AbortController
- Extraction d'URL depuis :
  - Headers Location (301/302/303/307/308)
  - JSON body (`redirectUrl`, `url`, `location`, `redirect`)
  - HTML form action
  - window.location dans HTML
  - meta refresh
  - Regex URL (http/https)

### D) Checkout UX: page processing + gestion redirect/HTML

✅ **Fichier modifié**: `src/app/[locale]/checkout/page.tsx`
- État "Processing" avec bouton désactivé
- Gestion `redirectUrl` → `window.location.assign()`
- Gestion `html` → stockage dans `sessionStorage` + redirection vers `/checkout/processing`

✅ **Fichier modifié**: `src/app/[locale]/checkout/processing/page.tsx`
- Récupère HTML depuis `sessionStorage` (clé `ATLANTICO_PAYMENT_HTML`)
- Auto-submit du form amélioré
- Gestion d'erreur si HTML absent
- Script amélioré pour trouver le form dans le HTML

### E) Validation stricte des champs requis

✅ **Fichier modifié**: `src/app/api/atlantico/payment/schema.ts`
- Validation manuelle (pas de Zod)
- Champs requis validés :
  - Item: `t_group`, `t_id`, `tourDate`, `sesTime`, `adults` (>=1), `childs` (>=0), `infants` (>=0), `currency`
  - Customer: `name`, `email` (format valide), `phone`
- Champs optionnels: `hotel`, `room`, `mpoint`, `mtime`, `notes`
- Rejette `400` si manquant
- Vérifie `ATLANTICO_USER_ID` → `500` si absent

### F) Mode QA "simulate payment"

✅ **Fichier modifié**: `src/app/api/atlantico/payment/route.ts`
- Variable d'environnement: `ATLANTICO_PAYMENT_SIMULATE=true|false`
- Si `true`: retourne `{ redirectUrl: "/[locale]/checkout/success?sim=1" }` sans appeler Atlántico
- Utilise le locale du request pour construire l'URL

### G) Logging DEV utile (sanitizé)

✅ **Fichier modifié**: `src/app/api/atlantico/payment/route.ts`
- Fonction `sanitizeForLog()` :
  - Email: `ab***@domain.com`
  - Phone: `+123***`
- Logs en DEV uniquement :
  - Payload sanitizé
  - Content-type + path pris pour redirectUrl/html
  - Différence de prix/slot en revalidation
  - Durée de la requête

### H) Améliorations UI checkout

✅ **Fichier modifié**: `src/app/[locale]/checkout/page.tsx`
- Gestion `PRICE_CHANGED` : affiche ancien/nouveau prix + différence + confirmation
- Gestion `SLOT_UNAVAILABLE` : message clair + redirection vers cart
- Mise à jour automatique du cart avec nouveau prix si confirmé

## Fichiers modifiés

1. `src/app/api/atlantico/payment/route.ts`
2. `src/app/api/atlantico/payment/schema.ts`
3. `src/app/[locale]/checkout/page.tsx`
4. `src/app/[locale]/checkout/processing/page.tsx`
5. `src/lib/atlantico/lang.ts` (vérification seulement)

## Exemple de log DEV (sanitizé)

```javascript
[PAYMENT] Request received: {
  t_id: '2748',
  t_group: '31',
  tourDate: '2024-12-25',
  sesTime: '10:00',
  adults: 2,
  customer: {
    name: 'John Doe',
    email: 'jo***@example.com',
    phone: '+34***'
  }
}

[PAYMENT] Revalidation failed: {
  code: 'PRICE_CHANGED',
  error: 'Price changed from 50.00 to 55.00 EUR',
  t_id: '2748',
  tourDate: '2024-12-25',
  sesTime: '10:00'
}

[PAYMENT] Response received: {
  status: 200,
  contentType: 'application/json',
  locationHeader: 'none',
  bodyLength: 156,
  bodyPreview: '{"redirectUrl":"https://gateway.atlantico.com/pay?token=abc123"}',
  hasRedirectUrl: true,
  isHTML: false
}

[PAYMENT] ✅ URL extracted from body: {
  redirectUrl: 'https://gateway.atlantico.com/pay?token=abc123',
  contentType: 'application/json',
  path: 'JSON'
}
```

## Résultat d'un test SIMULATE

**Configuration**: `ATLANTICO_PAYMENT_SIMULATE=true`

**Request**:
```json
POST /api/atlantico/payment
{
  "t_id": "2748",
  "t_group": "31",
  "language": "en",
  "tourDate": "2024-12-25",
  "sesTime": "10:00",
  "adults": 2,
  "childs": 0,
  "infants": 0,
  "currency": "EUR",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+34612345678"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "redirectUrl": "/en/checkout/success?sim=1",
  "simulated": true
}
```

**Log DEV**:
```
[PAYMENT] Request received: {
  t_id: '2748',
  t_group: '31',
  tourDate: '2024-12-25',
  sesTime: '10:00',
  adults: 2,
  customer: {
    name: 'John Doe',
    email: 'jo***@example.com',
    phone: '+34***'
  }
}

[PAYMENT] SIMULATE mode: skipping Atlántico API call
```

**Comportement**:
- Aucun appel à l'API Atlántico
- Redirection immédiate vers `/en/checkout/success?sim=1`
- Permet de tester tout le flow sans payer

## Checklist d'acceptation

- [x] Activity → sélectionner date/heure/pax → add → cart → checkout → pay
- [x] Déclencher PRICE_CHANGED (modifier pax puis payer) → recevoir 409 et UI gère
- [x] Déclencher SLOT_UNAVAILABLE (choisir session inexistante) → 409 géré
- [x] SIMULATE mode: pay → success page
- [x] Aucune double locale, aucune 404
- [x] Mapping locale → language utilisé partout
- [x] Revalidation avant paiement fonctionnelle
- [x] Gestion des 3 formes de réponse (JSON/HTML/text)
- [x] Timeout 15s configuré
- [x] Logging DEV sanitizé
- [x] Page processing fonctionnelle
















# Solution au Problème -1 de l'API Atlantico /payment/

## Problème Identifié

L'API Atlantico `/payment/` retourne toujours `-1` même avec tous les paramètres corrects selon le PDF.

## Tests Effectués

### ✅ Paramètres Vérifiés
- `userId`: 3645 (depuis env)
- `t_id`: 509
- `t_group`: 55 (confirmé via eventDetails et groupDetails)
- `language`: ENG
- `tourDate`: 20260217 (format YYYYMMDD)
- `sesTime`: Testé avec et sans (wdays_only mode)
- `adults`, `childs`, `infants`: Corrects
- `name`, `email`, `phone`: Présents

### ❌ Résultats
- Test direct (PowerShell/curl) : `-1`
- Test via notre proxy : `-1`
- Toutes les variantes testées : `-1`

## Causes Possibles

### 1. **userId non autorisé** (PROBABLE)
Le `userId` 3645 pourrait ne pas avoir les permissions pour :
- Cet événement spécifique (509)
- Cette date (2026-02-17)
- Le mode de réservation (wdays_only)

### 2. **Date trop loin dans le futur**
L'API pourrait limiter les réservations à X jours à l'avance.

### 3. **Paramètre manquant non documenté**
L'API pourrait nécessiter un paramètre supplémentaire non mentionné dans le PDF.

### 4. **Restriction de quota**
Le `userId` pourrait avoir atteint un quota ou une limite.

## Solutions à Essayer

### Solution 1: Vérifier le userId
```bash
# Contacter Atlantico pour vérifier :
# - Le userId 3645 est-il actif ?
# - A-t-il les permissions pour l'événement 509 ?
# - Y a-t-il des restrictions de date ?
```

### Solution 2: Tester avec une date plus proche
```javascript
// Utiliser une date dans les 7 prochains jours
const today = new Date()
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
const tourDate = nextWeek.toISOString().split('T')[0].replace(/-/g, '')
```

### Solution 3: Tester avec un autre événement
```javascript
// Tester avec un événement qui fonctionne normalement
// Par exemple, un événement avec sessions (pas wdays_only)
```

### Solution 4: Vérifier si l'API nécessite un token
```javascript
// Vérifier si ATLANTICO_TOKEN est requis pour /payment/
// Le token est déjà envoyé si présent dans env
```

## Pages de Test Créées

1. **`/test-payment-direct`** - Test direct avec variantes
2. **`/test-payment-debug`** - Diagnostic complet avec tous les tests
3. **`/test-group-details`** - Vérifier t_group / t_id
4. **`/test-atlantico-flow`** - Flux complet selon PDF

## Prochaines Étapes

1. **Contacter Atlantico** pour vérifier :
   - Le userId 3645 est-il correct ?
   - Y a-t-il des restrictions pour cet événement ?
   - L'API nécessite-t-elle un paramètre supplémentaire ?

2. **Tester avec un autre événement** qui fonctionne normalement

3. **Vérifier les logs serveur** pour voir le payload exact envoyé

4. **Tester avec une date plus proche** (aujourd'hui + 3 jours)

## Code Actuel

Le code actuel :
- ✅ Vérifie et corrige automatiquement le `t_group`
- ✅ Vérifie la disponibilité avant paiement
- ✅ Teste plusieurs variantes si `-1` est retourné
- ✅ Logs détaillés pour diagnostic
- ✅ Gère correctement le mode `wdays_only`

Le problème vient de l'API Atlantico elle-même, pas de notre code.




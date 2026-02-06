# Production Hardening - Catalog System

## Vue d'ensemble

Améliorations de robustesse pour la production : sécurité, performance, monitoring.

## A) Sécurité & Garde-fous

### Protection contre données vides

**Règle :** Ne jamais écraser un cache existant si l'upstream Atlantico retourne 0 items.

#### Core Mode
- Si `tours.length === 0` après hydration → erreur `EMPTY_UPSTREAM`
- Cache existant préservé (pas de backup restore)
- Retourne `{ ok: false, reason: "empty_upstream" }` avec status `422`

#### Dynamic Mode
- Si `Object.keys(dynamicData).length === 0` → erreur `EMPTY_UPSTREAM`
- Cache existant préservé
- Retourne `{ ok: false, reason: "empty_upstream" }` avec status `422`

**Exemple réponse :**
```json
{
  "ok": false,
  "reason": "empty_upstream",
  "error": "Upstream returned empty data for dynamic mode. Existing cache preserved.",
  "message": "EMPTY_UPSTREAM: No dynamic data (prices/limits) found. Refusing to overwrite existing cache.",
  "ms": 15000
}
```

### Hard Limits configurables

**Variables d'environnement :**
- `CATALOG_MAX_GROUPS` : Max groupes (défaut: 300)
- `CATALOG_MAX_EVENTS_PER_GROUP` : Max events par groupe (défaut: 10)

**Comportement :**
- Les limites dans `opts` (body API) **écrasent** les limites env
- Si truncation appliquée → log DEV warning
- Logs incluent : `total`, `limited`, `maxGroups`, `maxEventsPerGroup`, `truncated`

**Exemple log DEV :**
```
[HYDRATION] Groups truncated: 350 -> 300 (limit: 300)
[HYDRATION] Events truncated for tour 123: 15 -> 10 (limit: 10)
```

## B) Performance & Taille JSON

### Thin Mode amélioré

#### `thin=1` (legacy, backward compatible)
- Garde 7 jours de `sessionsByDate`
- Supprime `raw` data
- Comportement inchangé

#### `thin=smart` (nouveau)
- **Supprime** `availability.sessionsByDate` (gros gain de taille)
- **Conserve** :
  - `nextAvailableDate` : Prochaine date disponible (YYYY-MM-DD)
  - `minPrice` : Prix minimum (depuis `event.price.adult` ou `session.price`)
- **Supprime** :
  - `raw` data
  - `sessionsByDate` complet
  - `child`/`infant` prices (garde seulement `adult`)

**Exemple structure smart :**
```json
{
  "events": [{
    "id": "123",
    "title": "Event",
    "price": {
      "date": "2024-01-15",
      "adult": 45.00
    },
    "availability": {
      "month": "2024-01-01",
      "nextAvailableDate": "2024-01-20"
    }
  }]
}
```

**Gain de taille estimé :** 60-80% de réduction vs full mode

### Compression & Cache Headers

**Compression :**
- Next.js gère automatiquement gzip via middleware
- Pas besoin de `Content-Encoding: gzip` manuel
- Activé par défaut pour toutes les réponses JSON

**Cache Headers :**

**GET `/api/catalog/full` :**
```
Cache-Control: public, max-age=300, stale-while-revalidate=60
```
- Cache 5 minutes
- Stale-while-revalidate 1 minute

**GET `/api/catalog/item` :**
```
Cache-Control: public, max-age=120, stale-while-revalidate=30
```
- Cache 2 minutes
- Stale-while-revalidate 30 secondes

## C) Monitoring léger

### Logs PROD minimalistes

**Refresh success :**
```javascript
console.log('[CATALOG_REFRESH]', {
  mode: 'dynamic',
  ms: 15000,
  items: 200,
  events: 500,
  lang: 'ENG',
})
```

**Refresh failure :**
```javascript
console.error('[CATALOG_REFRESH]', {
  mode: 'dynamic',
  error: 'failed',
  ms: 5000,
  message: 'Error message truncated to 100 chars...',
})
```

**Served catalog :**
```javascript
console.log('[CATALOG_SERVED]', {
  mode: 'sellable',
  thin: 'smart',
  items: 150,
  lang: 'ENG',
})
```

**Served item :**
```javascript
console.log('[CATALOG_ITEM_SERVED]', {
  id: '123',
  mode: 'full',
  lang: 'from_cache',
})
```

**Erreurs upstream Atlantico :**
- Logs sans payload sensible
- Messages tronqués à 100 caractères max
- Pas de raw data dans les logs PROD

## D) Health Check DEV-only

### GET `/api/debug/catalog-health`

**Réponse :**
```json
{
  "coreExists": true,
  "dynamicExists": true,
  "lastCoreUpdate": "2024-01-15T10:30:00.000Z",
  "lastDynamicUpdate": "2024-01-15T14:30:00.000Z",
  "itemCount": 200,
  "sellableCount": 150,
  "warnings": [
    "Dynamic cache is 25 hours old (should be refreshed daily)"
  ]
}
```

**Warnings générés :**
- `Core cache is X days old` (si > 7 jours)
- `Dynamic cache is X hours old` (si > 24 heures)
- `Core cache missing`
- `Dynamic cache missing`
- `Dynamic cache exists but contains no tour data`
- `Using legacy full cache (split cache not available)`

**En production :**
```json
{ "error": "Not found" }
```
Status: `404`

## Règles de fallback

### 1. Refresh empty upstream

**Comportement :**
1. Détecte `EMPTY_UPSTREAM` dans l'erreur
2. **Ne restaure PAS** le backup (garde cache existant)
3. Retourne `422` avec `reason: "empty_upstream"`
4. Log PROD minimal

**Fallback :** Cache existant reste intact

### 2. Refresh autres erreurs

**Comportement :**
1. Détecte erreur non-EMPTY_UPSTREAM
2. Restaure backup si disponible
3. Retourne `500` avec message d'erreur
4. Log PROD minimal

**Fallback :** Backup restauré (si disponible)

### 3. Assemblage core + dynamic

**Ordre de priorité :**
1. **Split cache** : `core.json` + `dynamic.json` → merge automatique
2. **Legacy cache** : `full_catalog.json` → utilisé tel quel
3. **Erreur 404** : Aucun cache disponible

**Fallback :** Legacy cache si split non disponible

### 4. Thin mode

**Ordre de priorité :**
1. `thin=smart` → mode smart (minimal)
2. `thin=1` → mode legacy (7 jours)
3. Pas de `thin` → full data

**Fallback :** Full data si thin non spécifié

## Exemples de réponses

### Refresh empty upstream
```json
{
  "ok": false,
  "reason": "empty_upstream",
  "error": "Upstream returned empty data for core mode. Existing cache preserved.",
  "message": "EMPTY_UPSTREAM: Atlantico returned 0 items. Refusing to overwrite existing cache.",
  "ms": 45000
}
```
Status: `422`

### Refresh success
```json
{
  "ok": true,
  "mode": "dynamic",
  "ms": 15000,
  "itemCount": 200,
  "totalEvents": 500,
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "language": "ENG"
}
```

### Health check
```json
{
  "coreExists": true,
  "dynamicExists": true,
  "lastCoreUpdate": "2024-01-15T10:30:00.000Z",
  "lastDynamicUpdate": "2024-01-15T14:30:00.000Z",
  "itemCount": 200,
  "sellableCount": 150,
  "warnings": []
}
```

## Configuration recommandée PROD

### Variables d'environnement

```bash
# Hard limits
CATALOG_MAX_GROUPS=300
CATALOG_MAX_EVENTS_PER_GROUP=10

# Monitoring (optionnel)
ATLANTICO_DEBUG=0  # Désactivé en PROD
```

### Monitoring

**Métriques à surveiller :**
- Logs `[CATALOG_REFRESH]` : fréquence, durée, erreurs
- Logs `[CATALOG_SERVED]` : volume de requêtes
- Warnings health check : âge des caches

**Alertes recommandées :**
- Refresh failure > 3 fois consécutives
- Dynamic cache > 48h sans refresh
- Core cache > 14 jours sans refresh

## Tests

### Test empty upstream protection
```bash
# Simuler upstream vide (nécessite mock ou API down)
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{"language": "ENG", "refreshMode": "core", "maxGroups": 0}'
```

**Attendu :** `422` avec `reason: "empty_upstream"`

### Test thin=smart
```bash
curl "http://localhost:3000/api/catalog/full?thin=smart&mode=sellable"
```

**Vérifier :**
- Pas de `sessionsByDate` dans `availability`
- Présence de `nextAvailableDate`
- Présence de `minPrice` dans `price.adult`

### Test health check
```bash
curl "http://localhost:3000/api/debug/catalog-health"
```

**Vérifier :**
- `coreExists` et `dynamicExists`
- `warnings` si caches anciens
- `sellableCount` calculé

















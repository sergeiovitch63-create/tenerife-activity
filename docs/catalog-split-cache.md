# Split Cache System - Core + Dynamic

## Vue d'ensemble

Le système de cache est maintenant divisé en deux parties pour optimiser les coûts de refresh :

1. **Core** (`atlantico_catalog_core.json`) : Données stables (groups, groupDetails, eventDetails)
   - Changement rare (structure, titre, description, images)
   - Refresh coûteux mais peu fréquent

2. **Dynamic** (`atlantico_catalog_dynamic.json`) : Données changeantes (prices, limits)
   - Change fréquemment (disponibilité, prix)
   - Refresh rapide et ciblé

## Fichiers de cache

### Core
- `data/atlantico_catalog_core.json` - Données core
- `data/atlantico_catalog_core.meta.json` - Métadonnées
- `data/.refresh.core.lock` - Lock pour refresh core

### Dynamic
- `data/atlantico_catalog_dynamic.json` - Données dynamiques (prices/limits)
- `data/atlantico_catalog_dynamic.meta.json` - Métadonnées
- `data/.refresh.dynamic.lock` - Lock pour refresh dynamic

### Legacy (fallback)
- `data/atlantico_full_catalog.json` - Ancien cache complet (compatibilité)
- `data/atlantico_full_catalog.meta.json` - Métadonnées legacy
- `data/.refresh.lock` - Lock legacy

## Modes de hydration

### Mode `core`
Hydrate uniquement les données stables (pas de prices/limits).

### Mode `dynamic`
Hydrate uniquement les prices/limits depuis un core catalog existant.

### Mode `full`
Hydrate tout (comportement par défaut, backward compatible).

## APIs modifiées/créées

### POST `/api/catalog/refresh`

**Body JSON:**
```json
{
  "language": "ENG",
  "refreshMode": "core" | "dynamic" | "full",
  "classificationCode": "optional",
  "maxGroups": 10,
  "maxEventsPerGroup": 5,
  "priceDate": "20240101",
  "limitsMonth": "202401",
  "office": "optional",
  "includeRaw": true
}
```

**Exemple réponse (core):**
```json
{
  "ok": true,
  "mode": "core",
  "ms": 45000,
  "itemCount": 200,
  "totalEvents": 500,
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "language": "ENG"
}
```

**Exemple réponse (dynamic):**
```json
{
  "ok": true,
  "mode": "dynamic",
  "ms": 15000,
  "itemCount": 200,
  "totalEvents": 500,
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "language": "ENG"
}
```

### GET `/api/catalog/full`

Assemble automatiquement core + dynamic (ou fallback legacy).

**Query params:**
- `mode`: `full` | `sellable` (filtre qualité)
- `merged`: `0` | `1` (merge curation)
- `thin`: `0` | `1` (mode allégé)
- `includeRaw`: `0` | `1`

**Fonctionnement:**
1. Lit `core.json` + `dynamic.json`
2. Merge par `tourId` → `eventId`
3. Si pas trouvé, fallback sur `full_catalog.json` (legacy)

### GET `/api/catalog/item`

Assemble automatiquement core + dynamic pour un item.

**Query params:**
- `id`: Tour ID
- `slug`: Tour slug (alternative)
- `mode`: `full` | `sellable`
- `merged`: `0` | `1`
- `includeRaw`: `0` | `1`

### POST `/api/catalog/refresh-item` (nouveau)

Refresh dynamic pour un seul tour.

**Body JSON:**
```json
{
  "id": "123",
  "slug": "whale-watching-tour",
  "lang": "ENG",
  "refreshMode": "dynamic",
  "priceDate": "20240101",
  "limitsMonth": "202401",
  "office": "optional",
  "includeRaw": true
}
```

**Exemple réponse:**
```json
{
  "ok": true,
  "tourId": "123",
  "tourSlug": "whale-watching-tour",
  "ms": 2000,
  "eventCount": 3,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Tests curl

### 1. Refresh Core
```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{
    "language": "ENG",
    "refreshMode": "core",
    "includeRaw": true
  }'
```

### 2. Refresh Dynamic
```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{
    "language": "ENG",
    "refreshMode": "dynamic",
    "priceDate": "20240115",
    "limitsMonth": "202401",
    "includeRaw": false
  }'
```

### 3. Refresh Full (legacy, backward compatible)
```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{
    "language": "ENG",
    "refreshMode": "full",
    "priceDate": "20240115",
    "limitsMonth": "202401",
    "includeRaw": true
  }'
```

### 4. Refresh Item Dynamic
```bash
curl -X POST "http://localhost:3000/api/catalog/refresh-item" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{
    "id": "123",
    "lang": "ENG",
    "refreshMode": "dynamic",
    "priceDate": "20240115",
    "limitsMonth": "202401"
  }'
```

### 5. Full Assembled (GET)
```bash
# Assemble core + dynamic automatiquement
curl "http://localhost:3000/api/catalog/full?merged=1&mode=sellable"

# Avec thin mode
curl "http://localhost:3000/api/catalog/full?thin=1"
```

### 6. Item Assembled
```bash
# Assemble core + dynamic pour un item
curl "http://localhost:3000/api/catalog/item?id=123&merged=1"
```

## Migration backward compatible

Le système est **backward compatible** :

1. Si `core.json` + `dynamic.json` existent → utilise split cache
2. Si seul `full_catalog.json` existe → utilise legacy cache
3. Si aucun cache → erreur (demande refresh)

**Migration automatique:**
- Premier refresh avec `refreshMode=full` → crée legacy cache
- Refresh avec `refreshMode=core` → crée core cache
- Refresh avec `refreshMode=dynamic` → crée dynamic cache
- APIs assemblent automatiquement core + dynamic si disponibles

## Workflow recommandé

### Setup initial
```bash
# 1. Build core (structure stable)
curl -X POST .../refresh -d '{"language": "ENG", "refreshMode": "core"}'

# 2. Build dynamic (prix/dispo actuels)
curl -X POST .../refresh -d '{"language": "ENG", "refreshMode": "dynamic", "priceDate": "20240115", "limitsMonth": "202401"}'
```

### Refresh quotidien
```bash
# Refresh seulement dynamic (rapide, peu coûteux)
curl -X POST .../refresh -d '{"language": "ENG", "refreshMode": "dynamic", "priceDate": "20240116", "limitsMonth": "202401"}'
```

### Refresh par item (traitement en temps réel)
```bash
# Refresh dynamic pour un tour spécifique (très rapide)
curl -X POST .../refresh-item -d '{"id": "123", "lang": "ENG", "refreshMode": "dynamic"}'
```

### Refresh core (rare, si structure change)
```bash
# Rebuild core si nécessaire (structure, nouveaux tours, etc.)
curl -X POST .../refresh -d '{"language": "ENG", "refreshMode": "core"}'

# Puis rebuild dynamic
curl -X POST .../refresh -d '{"language": "ENG", "refreshMode": "dynamic", ...}'
```

## Bénéfices

1. **Coût réduit** : Refresh dynamic uniquement (rapide, moins d'appels API)
2. **Données fraîches** : Prix/dispo mis à jour fréquemment sans rebuild complet
3. **Performance** : Refresh par item pour mise à jour temps réel
4. **Backward compatible** : Ancien cache fonctionne toujours
5. **Locks séparés** : Core et dynamic peuvent être refresh en parallèle (avec précaution)

## Locks

- `core.lock` : Lock séparé pour refresh core
- `dynamic.lock` : Lock séparé pour refresh dynamic
- `full.lock` : Lock legacy (pour backward compatibility)

**Note:** Les locks sont indépendants. Il est recommandé de ne pas refresh core et dynamic en même temps pour éviter des incohérences temporaires.

















# Admin UI - Split Cache System

## Vue d'ensemble

L'interface admin a été mise à jour pour supporter le système de cache split (core/dynamic/full).

## Modifications UI

### Section Catalogue

#### Statuts affichés

1. **Core Status** (gauche)
   - Updated: Date de dernière mise à jour
   - Items: Nombre de tours
   - Events: Nombre d'événements
   - Lang: Code langue

2. **Dynamic Status** (droite)
   - Updated: Date de dernière mise à jour
   - Tours: Nombre de tours avec données dynamiques
   - Events: Nombre d'événements avec prix/dispo
   - Lang: Code langue

#### Boutons de refresh

Trois boutons séparés :

1. **Rebuild Core** (bleu)
   - Refresh mode: `core`
   - Pas de `priceDate`/`limitsMonth`

2. **Rebuild Dynamic** (vert)
   - Refresh mode: `dynamic`
   - Inclut `priceDate` (aujourd'hui) et `limitsMonth` (mois courant)

3. **Rebuild Full** (ocean)
   - Refresh mode: `full`
   - Inclut `priceDate` et `limitsMonth`

#### Auto-refresh DEV

Deux toggles DEV-only :

1. **Auto-refresh Full (DEV, 30min)**
   - Interval: 30 minutes
   - Déclenche `refreshMode: 'full'`

2. **Auto-refresh Dynamic (DEV, 12h)**
   - Interval: 12 heures (43200000 ms)
   - Déclenche `refreshMode: 'dynamic'`
   - Affiche "Next refresh at: ..." (calcul côté client)

#### État de refresh

- **Pendant refresh** :
  - Boutons désactivés
  - Message "Refreshing {mode} cache..."
  - Loader visible

- **Après succès** :
  - Message vert avec stats (items, events, durée)
  - Disparaît après 5 secondes

- **Erreur 409 (refresh_in_progress)** :
  - Message rouge non-bloquant
  - Disparaît après 5 secondes
  - Ne bloque pas l'UI

- **Autres erreurs** :
  - Message rouge avec détails
  - Disparaît après 5 secondes

## API Status étendue

### GET `/api/catalog/status?mode=core|dynamic|full`

**Query params :**
- `mode`: `core` | `dynamic` | `full` (default: `full`)

**Réponse (core) :**
```json
{
  "exists": true,
  "mode": "core",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "language": "ENG",
  "itemCount": 200,
  "totalEvents": 500,
  "lastRefreshMs": 45000
}
```

**Réponse (dynamic) :**
```json
{
  "exists": true,
  "mode": "dynamic",
  "updatedAt": "2024-01-15T14:30:00.000Z",
  "language": "ENG",
  "itemCount": 200,
  "totalEvents": 500,
  "lastRefreshMs": 15000
}
```

**Réponse (missing) :**
```json
{
  "exists": false,
  "mode": "dynamic",
  "message": "dynamic cache missing"
}
```

## Payloads envoyés

### Rebuild Core
```json
{
  "language": "ENG",
  "refreshMode": "core"
}
```

### Rebuild Dynamic
```json
{
  "language": "ENG",
  "refreshMode": "dynamic",
  "priceDate": "20240115",
  "limitsMonth": "202401"
}
```

### Rebuild Full
```json
{
  "language": "ENG",
  "refreshMode": "full",
  "priceDate": "20240115",
  "limitsMonth": "202401"
}
```

## Tests curl

### 1. Status Core
```bash
curl "http://localhost:3000/api/catalog/status?mode=core"
```

### 2. Status Dynamic
```bash
curl "http://localhost:3000/api/catalog/status?mode=dynamic"
```

### 3. Status Full (legacy)
```bash
curl "http://localhost:3000/api/catalog/status?mode=full"
```

## Scénario de test complet

### 1. Refresh Core
```bash
curl -X POST "http://localhost:3000/api/catalog/refresh" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{
    "language": "ENG",
    "refreshMode": "core"
  }'
```

**Vérification :**
```bash
curl "http://localhost:3000/api/catalog/status?mode=core"
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
    "limitsMonth": "202401"
  }'
```

**Vérification :**
```bash
curl "http://localhost:3000/api/catalog/status?mode=dynamic"
```

### 3. GET Full (assemblé)
```bash
curl "http://localhost:3000/api/catalog/full?merged=1"
```

**Vérification :**
- La réponse doit contenir les items avec prix/dispo fusionnés
- `itemCount` doit correspondre au core
- Chaque item doit avoir des `events` avec `price` et `availability`

## Comportement UX

### Pendant refresh

1. Tous les boutons sont désactivés
2. Message bleu : "Refreshing {mode} cache..."
3. Le bouton actif affiche "Rebuilding {mode}..."

### Après succès

1. Message vert avec stats :
   - `{mode} cache refreshed successfully!`
   - `{itemCount} items, {totalEvents} events, {duration}s`
2. Statuts core/dynamic rechargés automatiquement
3. Message disparaît après 5 secondes

### Erreur 409 (non-bloquant)

1. Message rouge : "Refresh already in progress: {reason}"
2. Disparaît après 5 secondes
3. L'UI reste utilisable

### Autres erreurs

1. Message rouge avec détails de l'erreur
2. Disparaît après 5 secondes

## Fichiers modifiés

1. `src/app/[locale]/admin/page.tsx`
   - États pour `coreStatus`, `dynamicStatus`, `refreshState`
   - Fonctions `loadCoreStatus()`, `loadDynamicStatus()`
   - `handleRefreshCatalog(mode)` refactorisé
   - UI avec 2 statuts et 3 boutons
   - Toggles auto-refresh (30min et 12h)

2. `src/app/api/catalog/status/route.ts`
   - Support de `mode=core|dynamic|full`
   - Fichiers meta séparés selon le mode
   - Parsing adapté pour dynamic (structure différente)

## Notes importantes

1. **DEV-only toggles** : Restent DEV-only (vérifiés côté client)
2. **Password** : Transmis via header `x-admin-password` uniquement
3. **Locks séparés** : Core et dynamic peuvent être refresh en parallèle (avec précaution)
4. **Backward compatible** : Si aucun split cache, fallback sur legacy full cache














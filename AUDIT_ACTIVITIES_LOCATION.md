# AUDIT — OÙ SONT LES ACTIVITÉS ATLÁNTICO ?

**Date:** $(date)
**Objectif:** Diagnostic factuel de la localisation des activités après sync

---

## 1. TRACE DU PIPELINE syncCatalog()

### Structure retournée par `syncCatalog()`

**Fichier:** `src/lib/atlantico/sync-catalog.ts`

**Retour exact:**
```typescript
{
  success: boolean
  items: NormalizedCatalogItem[]  // Array d'items normalisés
  error?: string
  stats?: {
    classifications: number
    groups: number
    events: number
  }
}
```

**FACTUEL:**
- ❌ **PAS de `cards`** — Le code retourne `items`, pas `cards`
- ❌ **PAS de `detailsBySlug`** — Le code ne crée pas de Map par slug
- ✅ **Retourne `items`** — Array de `NormalizedCatalogItem[]`
- ✅ **Retourne `stats`** — Object avec `classifications`, `groups`, `events`

**Logs ajoutés:**
- Nombre de classifications (ligne 174)
- Nombre de groups (ligne 207)
- Nombre de events (ligne 251)
- Structure finale: `Object.keys(result)`, `items.length`, `stats.keys` (lignes 285-292)

**Chaque item contient:**
```typescript
{
  id: string           // eventCode || groupCode
  slug: string         // eventCode || groupCode (même valeur que id)
  groupCode: string    // Code du group
  eventCode?: string   // Code de l'event (si disponible)
  title: string
  description?: string
  price?: number
  image?: string
  _raw: { group?, event? }
}
```

---

## 2. VÉRIFICATION DU CACHE

### Où est stocké le cache

**Fichier:** `src/lib/atlantico/sync-cache.ts`

**FACTUEL:**
- ✅ **Type:** Mémoire (Map en JavaScript)
- ✅ **Variable:** `const cache = new Map<string, CachedSyncData>()`
- ✅ **Clé exacte:** `lang` (ex: `"ENG"`, `"ESP"`)
- ✅ **TTL:** 6 heures (21600000 ms)

**Structure du cache:**
```typescript
Map<string, CachedSyncData>
  - Clé: "ENG" | "ESP" | "FRA" | etc.
  - Valeur: {
      items: unknown[],
      stats?: { classifications, groups, events },
      timestamp: number,
      lang: string
    }
```

**Fonctions:**
- `getCachedSync(lang)` — Lit depuis la Map avec clé `lang`
- `setCachedSync(lang, items, stats)` — Écrit dans la Map avec clé `lang`

**Logs ajoutés:**
- Cache hit/miss avec clé exacte (lignes 24-37)
- Contenu du cache avant retour (itemsCount, stats) (lignes 38-44)
- Cache set avec clé et taille (lignes 50-66)

**FACTUEL:**
- Le cache est en **mémoire uniquement** (pas de fichier, pas de DB)
- La clé est **exactement** `lang` (ex: `"ENG"`)
- Le cache est **perdu au redémarrage du serveur**

---

## 3. VÉRIFICATION DE LA PAGE /[locale]/activities

### Fonction appelée pour récupérer les activités

**Fichier:** `src/app/[locale]/activities/page.tsx`

**FACTUEL:**
- ✅ **Fonction:** `fetch()` vers `/api/atlantico/sync?lang=${lang}`
- ✅ **Route API:** `src/app/api/atlantico/sync/route.ts`
- ✅ **Timeout:** 6 secondes avec `AbortController`

**Flux exact:**
1. Page appelle `fetch('/api/atlantico/sync?lang=ENG')`
2. Route API vérifie `getCachedSync(lang)` (ligne 50)
3. Si cache hit → retourne immédiatement `cached.items`
4. Si cache miss → retourne HTTP 202 avec `warming: true` et lance sync en background
5. Page reçoit `data.items` et les affiche

**Ce qui est rendu quand `items.length === 0`:**
```tsx
<div className="text-center py-12">
  <p className="text-glass-500 text-lg">No activities found.</p>
</div>
```

**Logs ajoutés:**
- URL fetchée (ligne 123)
- Réponse reçue avec structure (lignes 139-150)
- Items chargés avec premier item (lignes 152-161)
- État final (lignes 165-172)

**FACTUEL:**
- La page **lit bien le cache** via la route API
- Si cache miss, la page reçoit `items: []` et affiche "No activities found."
- **Aucun filtre** n'est appliqué (pas de vibe, category, locale filter)

---

## 4. VÉRIFICATION DU MAPPING UI

### Correspondance card ↔ group

**Fichier:** `src/app/[locale]/activities/page.tsx`

**FACTUEL:**
- ✅ Chaque `item` dans `items` est un `NormalizedCatalogItem`
- ✅ Le slug utilisé est `item.slug` (ligne 66: `href={`/activity/${item.slug}`}`)
- ✅ Le slug vient de `eventCode || groupCode` (sync-catalog.ts ligne 336)
- ✅ **Aucun filtre** n'est appliqué dans cette page

**Mapping exact:**
```tsx
{items.map((item) => (
  <ActivityCard key={item.id} item={item} />
))}
```

**FACTUEL:**
- Chaque card correspond à un **item normalisé** (qui peut venir d'un group seul ou group+event)
- Le slug existe dans `item.slug` (pas besoin de `detailsBySlug` car tout est dans `items`)
- **Aucun filtre** ne supprime les activités

---

## 5. CONCLUSION OBLIGATOIRE

### Diagnostic factuel basé sur le code

**Les activités sont récupérées mais peuvent ne pas s'afficher car :**

1. **Cache vide au premier démarrage**
   - Si le serveur vient d'être démarré, le cache est vide
   - La route API retourne HTTP 202 avec `warming: true` et `items: []`
   - La page affiche "No activities found." car `items.length === 0`

2. **Sync en background non terminé**
   - Si cache miss, le sync démarre en background (ligne 79-104 de sync/route.ts)
   - La page reçoit immédiatement `items: []` avant que le sync ne termine
   - L'utilisateur doit attendre que le background sync termine et recharger la page

3. **Timeout de 20s dans syncCatalog()**
   - Si l'API Atlántico est lente, le sync peut timeout après 20s
   - Le cache ne sera jamais rempli si le sync échoue
   - La page continuera d'afficher "No activities found."

4. **Pas de persistence du cache**
   - Le cache est en mémoire uniquement
   - Au redémarrage du serveur, le cache est perdu
   - Il faut relancer un sync complet pour remplir le cache

**Pour vérifier:**
1. Vérifier les logs console (dev mode) pour voir:
   - `[SYNC] Starting sync:` — Le sync démarre-t-il ?
   - `[SYNC] Sync completed:` — Le sync termine-t-il avec `itemsCount > 0` ?
   - `[CACHE] setCachedSync called:` — Le cache est-il rempli ?
   - `[ActivitiesPage] Items loaded:` — La page reçoit-elle les items ?

2. Appeler directement `/api/atlantico/sync?lang=ENG&full=1` pour forcer un sync complet

3. Vérifier que `ATLANTICO_BASE_URL` est configuré correctement

---

**RÉSUMÉ:**
- ✅ Les activités sont stockées dans `items: NormalizedCatalogItem[]`
- ✅ Le cache est en mémoire avec clé `lang` (ex: "ENG")
- ✅ La page lit le cache via `/api/atlantico/sync?lang=ENG`
- ✅ Si `items.length === 0`, la page affiche "No activities found."
- ⚠️ **Problème probable:** Cache vide au premier démarrage ou sync en background non terminé















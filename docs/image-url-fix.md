# Fix Image URLs (NXDOMAIN) - Instructions

## Problème

Les URLs d'images retournent NXDOMAIN (domaine inexistant) :
- `https://static.atlantico-excursiones.com/...` → NXDOMAIN
- `https://api.atlantico-excursiones.com/...` → NXDOMAIN (peut-être)

## Solution

### Étape 1: Découvrir la bonne base URL

L'endpoint `/api/debug/image-host` teste automatiquement plusieurs patterns d'URL et trouve celle qui fonctionne.

```bash
# En développement
curl http://localhost:3000/api/debug/image-host
```

**Réponse attendue :**
```json
{
  "filename": "garachico-san-miguel1.jpg",
  "extractedRawCandidates": ["garachico-san-miguel1.jpg"],
  "baseUrl": "https://api.atlanticoexcursiones.com",
  "imagesBaseUrl": null,
  "urlCandidates": [
    {
      "url": "https://api.atlanticoexcursiones.com/images/garachico-san-miguel1.jpg",
      "ok": true,
      "status": 200
    },
    {
      "url": "https://static.atlantico-excursiones.com/images/garachico-san-miguel1.jpg",
      "ok": false,
      "status": 0,
      "error": "NXDOMAIN"
    }
  ],
  "bestUrl": "https://api.atlanticoexcursiones.com/images/garachico-san-miguel1.jpg",
  "inferredImagesBaseUrl": "https://api.atlanticoexcursiones.com/images",
  "recommendationEnvLine": "ATLANTICO_IMAGES_BASE_URL=https://api.atlanticoexcursiones.com/images",
  "hasFullUrlInRaw": false
}
```

### Étape 2: Mettre à jour .env.local

Copier la ligne `recommendationEnvLine` dans `.env.local` :

```bash
# Ajouter ou modifier cette ligne
ATLANTICO_IMAGES_BASE_URL=https://api.atlanticoexcursiones.com/images
```

**Important :** Utiliser la valeur exacte de `recommendationEnvLine` retournée par l'endpoint.

### Étape 3: Redémarrer le serveur

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
npm run dev
```

### Étape 4: Vérifier

**Test 1: Image sample**
```bash
curl http://localhost:3000/api/debug/image-sample
```

**Vérifier :** `tourImage` doit être une URL qui s'ouvre dans le navigateur (pas NXDOMAIN).

**Test 2: Page activities**
```
http://localhost:3000/en/activities
```

**Vérifier :** Les images doivent se charger (plus de "No photo" si URLs valides).

**Test 3: URL image directement**
Ouvrir `tourImage` dans un nouvel onglet → doit retourner 200 (image visible).

## Patterns testés par l'endpoint

L'endpoint `/api/debug/image-host` teste automatiquement :

1. `ATLANTICO_IMAGES_BASE_URL + '/' + filename`
2. `ATLANTICO_BASE_URL + '/images/' + filename`
3. `ATLANTICO_BASE_URL + '/public/images/' + filename`
4. `ATLANTICO_BASE_URL + '/static/images/' + filename`
5. `ATLANTICO_BASE_URL + '/' + filename`
6. URL complète si trouvée dans raw data (source of truth)

Le premier qui retourne 200 est utilisé comme `bestUrl`.

## Détails techniques

### Extraction des candidats

L'endpoint scanne :
- `groupDetails.image`, `img`, `photo`, `picture`
- `groupDetails.images[]`, `photos[]`, `gallery[]`, `media[]`
- `event.image`, `event.raw.image`, `event.images[]` (si disponibles)

### Test des URLs

- Méthode : HEAD request (fallback GET si HEAD non autorisé)
- Timeout : 2 secondes
- User-Agent : `Mozilla/5.0 (compatible; Next.js Image Diagnostic)`

### Source of truth

Si une URL complète (`http://` ou `https://`) est trouvée dans les données raw :
- Elle est utilisée directement comme `sourceOfTruth`
- `inferredImagesBaseUrl` est déduit de cette URL
- Les autres patterns ne sont pas testés

## Résolution de problèmes

### Aucune URL ne fonctionne (tous `ok: false`)

**Causes possibles :**
1. Problème réseau (firewall, proxy)
2. `ATLANTICO_BASE_URL` incorrect
3. Images non disponibles sur le serveur Atlantico

**Actions :**
- Vérifier `ATLANTICO_BASE_URL` dans `.env.local`
- Tester l'API Atlantico : `curl http://localhost:3000/api/atlantico/health`
- Vérifier la connectivité réseau

### `recommendationEnvLine` vide

**Cause :** Aucune URL testée ne retourne 200.

**Actions :**
- Vérifier les logs de l'endpoint pour les erreurs détaillées
- Contacter le support Atlantico pour confirmer l'URL des images

## Fichiers modifiés

1. `src/app/api/debug/image-host/route.ts` - Endpoint de diagnostic amélioré
2. `src/lib/atlantico/client.ts` - `getImagesBaseUrl()` avec commentaires améliorés
3. `docs/env.md` - Documentation `ATLANTICO_IMAGES_BASE_URL` mise à jour
4. `docs/image-url-fix.md` - Ce fichier (instructions complètes)

## Changements de code

**`src/app/api/debug/image-host/route.ts` :**
- Scan amélioré : événements inclus
- Détection d'URL complète : source of truth
- Plus de patterns : `/public/images/`, `/static/images/`
- Fallback GET : si HEAD non autorisé
- Réponse enrichie : `inferredImagesBaseUrl`, `recommendationEnvLine`, `sourceOfTruth`

**`src/lib/atlantico/client.ts` :**
- Commentaires améliorés dans `getImagesBaseUrl()`
- Fallback à `ATLANTICO_BASE_URL/images` si `ATLANTICO_IMAGES_BASE_URL` non défini

## Résultat attendu

- ✅ `/api/debug/image-host` retourne `bestUrl` avec `ok: true, status: 200`
- ✅ `/api/debug/image-sample` retourne `tourImage` qui s'ouvre dans le navigateur
- ✅ `/en/activities` affiche les images (plus de NXDOMAIN)
- ✅ URLs d'images fonctionnelles dans toute l'application

















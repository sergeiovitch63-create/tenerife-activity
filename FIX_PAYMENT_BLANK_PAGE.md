# Fix: Page Payment Blanche - Solution

## Problème Identifié

Les logs montrent que l'application essaie de se connecter à `46.224.147.162:8080` qui est une **adresse IP avec port**, ce qui cause des erreurs `ECONNREFUSED` (connexion refusée).

```
Error: connect ECONNREFUSED 46.224.147.162:8080
```

## Cause

Le fichier `.env.local` contient probablement :
```
ATLANTICO_BASE_URL=http://46.224.147.162:8080
```

**Les adresses IP:port ne fonctionnent pas** car :
1. Le serveur Atlantico n'accepte pas les connexions directes depuis des IPs non whitelistées
2. Les domaines officiels (`api.atlanticoexcursiones.com`) sont les seuls points d'accès valides

## Solution

### Option 1: Utiliser ATLANTICO_ENV (Recommandé)

Dans votre fichier `.env.local`, **supprimez ou commentez** `ATLANTICO_BASE_URL` et utilisez `ATLANTICO_ENV` :

```env
# Supprimez ou commentez cette ligne :
# ATLANTICO_BASE_URL=http://46.224.147.162:8080

# Utilisez ATLANTICO_ENV à la place :
ATLANTICO_ENV=test
# ou
ATLANTICO_ENV=prod
```

**Pour l'environnement de test :**
```env
ATLANTICO_ENV=test
ATLANTICO_USER_ID=votre_user_id
ATLANTICO_TOKEN=votre_token
```

**Pour l'environnement de production :**
```env
ATLANTICO_ENV=prod
ATLANTICO_USER_ID=votre_user_id
ATLANTICO_TOKEN=votre_token
```

### Option 2: Utiliser un domaine valide

Si vous devez absolument utiliser `ATLANTICO_BASE_URL`, utilisez un **domaine valide** :

```env
ATLANTICO_BASE_URL=https://api.atlanticoexcursiones.com
# ou pour le test
ATLANTICO_BASE_URL=https://testapi.atlanticoexcursiones.com
```

**⚠️ IMPORTANT : Ne jamais utiliser d'adresse IP:port !**

## Corrections Apportées au Code

Le code a été modifié pour :
1. **Rejeter automatiquement les IP:port** dans `getBaseUrl()` et `getAtlanticoConfig()`
2. **Utiliser automatiquement les domaines officiels** si une IP:port est détectée
3. **Afficher des logs d'avertissement** pour identifier le problème
4. **Retourner une erreur claire** si une IP:port est utilisée dans le payment endpoint

## Vérification

Après avoir modifié `.env.local`, **redémarrez le serveur Next.js** :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez :
npm run dev
```

Vous devriez voir dans les logs :
```
[ATLANTICO_BASE_URL] Using test environment: https://testapi.atlanticoexcursiones.com
# ou
[ATLANTICO_BASE_URL] IP address rejected, using production: https://api.atlanticoexcursiones.com
```

## Test

1. Accédez à : `http://localhost:3000/api/atlantico/booking/payment/test`
2. Remplissez le formulaire
3. Cliquez sur "Submit Payment"
4. Le formulaire GetNet devrait maintenant s'afficher au lieu d'une page blanche

## Si le problème persiste

Vérifiez les logs du serveur pour voir :
- Quelle URL est utilisée (`[ATL_PAYMENT] Using base URL: ...`)
- Si des erreurs de connexion persistent
- Si tous les paramètres requis sont présents

Les logs devraient maintenant montrer :
```
[ATL_PAYMENT] Using base URL: https://api.atlanticoexcursiones.com
[ATL_PAYMENT_PROXY] Request received: { ... }
[ATL_PAYMENT_UPSTREAM_RESPONSE] { ... }
```

Au lieu de :
```
Error: connect ECONNREFUSED 46.224.147.162:8080
```






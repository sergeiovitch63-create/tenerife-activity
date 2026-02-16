# Guide de Debug - Payment Endpoint

## Problème
Page blanche lors de l'accès à `/api/atlantico/booking/payment`

## Corrections Apportées

### 1. Logs Améliorés
- **Tous les logs sont maintenant visibles** (même en production pour le debug critique)
- Logs détaillés de la requête et de la réponse
- Preview du body (1000 premiers caractères)
- Tous les en-têtes HTTP

### 2. Format de Date Corrigé
- **Conversion automatique** de `YYYY-MM-DD` vers `YYYYMMDD` (format attendu par Atlantico selon PDF)
- Log de la conversion pour vérification

### 3. Gestion de `sesTime`
- Envoi de `sesTime` même si c'est `"00:00"` (selon PDF section 2.7)
- Pour les réservations non on-request, envoi de `"00:00"` si `sesTime` n'est pas fourni

### 4. Détection HTML Améliorée
- **Toute réponse 200 avec contenu est traitée comme HTML potentiel**
- Détection large : `<html`, `<form`, `getnet`, `payment`, `gateway`, `card`, ou tout tag HTML
- Suppression des en-têtes de sécurité qui pourraient bloquer GetNet

### 5. Page de Test
- **Nouvelle route de test** : `/api/atlantico/booking/payment/test`
- Formulaire HTML pour tester l'endpoint directement
- Ouvre dans un nouvel onglet pour voir la réponse

## Comment Tester

### Option 1: Page de Test
1. Accédez à : `http://localhost:3000/api/atlantico/booking/payment/test`
2. Remplissez le formulaire avec des données de test
3. Cliquez sur "Submit Payment"
4. Vérifiez la nouvelle fenêtre/onglet pour voir la réponse

### Option 2: Depuis le Checkout
1. Allez sur la page checkout avec un item dans le panier
2. Remplissez le formulaire client
3. Cliquez sur "Pay"
4. Vérifiez les logs serveur dans le terminal

## Vérification des Logs Serveur

Dans le terminal où Next.js tourne, vous devriez voir :

```
[ATL_PAYMENT_PROXY] Request received: { ... }
[ATL_PAYMENT_UPSTREAM_REQUEST] { ... }
[ATL_PAYMENT_UPSTREAM_RESPONSE] { ... }
[ATL_PAYMENT_HTML_RESPONSE] { ... }
```

### Ce qu'il faut vérifier dans les logs :

1. **Requête envoyée** :
   - `baseUrl` : Doit pointer vers l'API Atlantico
   - `fullUrl` : URL complète avec `/payment/`
   - `payloadRedacted` : Vérifier que tous les paramètres sont présents
   - `tourDateFormatted` : Doit être en format `YYYYMMDD`

2. **Réponse reçue** :
   - `status` : Doit être 200 (ou 301/302 pour redirection)
   - `bodyLength` : Doit être > 0
   - `bodyPreview` : Doit contenir du HTML (commence par `<html` ou `<form`)
   - `contentType` : Doit contenir `text/html`

3. **Si la réponse est vide** :
   - Vérifier `ATLANTICO_USER_ID` dans les variables d'environnement
   - Vérifier `ATLANTICO_BASE_URL` ou `ATLANTICO_ENV`
   - Vérifier la connexion réseau à l'API Atlantico

## Problèmes Possibles et Solutions

### Problème 1: Réponse Vide
**Symptôme** : `bodyLength: 0` dans les logs
**Solutions** :
- Vérifier `ATLANTICO_USER_ID` est configuré
- Vérifier `ATLANTICO_BASE_URL` pointe vers la bonne URL
- Vérifier la connexion réseau

### Problème 2: Réponse "-1"
**Symptôme** : `bodyPreview: "-1"` dans les logs
**Solutions** :
- Vérifier que tous les paramètres requis sont présents
- Vérifier le format de `tourDate` (doit être `YYYYMMDD`)
- Vérifier que `sesTime` est valide ou `"00:00"`

### Problème 3: Réponse HTML mais Page Blanche
**Symptôme** : `bodyPreview` contient du HTML mais la page est blanche
**Solutions** :
- Vérifier les en-têtes de sécurité (CSP, X-Frame-Options)
- Vérifier que `Content-Type` est `text/html; charset=utf-8`
- Vérifier la console du navigateur pour les erreurs JavaScript

### Problème 4: Redirection
**Symptôme** : `status: 301` ou `302` dans les logs
**Solutions** :
- La redirection devrait être automatique
- Vérifier que `location` est présente dans les logs
- Le navigateur devrait suivre la redirection automatiquement

## Paramètres Requis selon PDF Section 2.7

- ✅ `userId` (depuis env `ATLANTICO_USER_ID`)
- ✅ `t_id` (Event ID)
- ✅ `t_group` (Group ID)
- ✅ `language` (CAS/ENG/FRA/RUS/ALE/ITA)
- ✅ `tourDate` (format `YYYYMMDD` - conversion automatique)
- ✅ `sesTime` (format `HH:mm` ou `"00:00"` si pas de session)
- ✅ `adults` (>= 1)
- ✅ `childs` (>= 0)
- ✅ `infants` (>= 0)
- ✅ `name`
- ✅ `email`
- ✅ `phone`
- ⚪ `hotel` (optionnel)
- ⚪ `room` (optionnel)
- ⚪ `mpoint` (optionnel)
- ⚪ `mtime` (optionnel)
- ⚪ `notes` (optionnel)

## Prochaines Étapes

1. **Tester avec la page de test** : `/api/atlantico/booking/payment/test`
2. **Vérifier les logs serveur** pour voir exactement ce qui se passe
3. **Partager les logs** si le problème persiste pour diagnostic approfondi






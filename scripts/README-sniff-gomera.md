# Sniff Atlantico Gomera VIP Tour API

Ce script utilise Playwright pour identifier l'endpoint exact et les paramètres utilisés par le site Atlantico pour récupérer les disponibilités du Gomera VIP Tour.

## Installation

Les dépendances sont déjà installées. Si besoin :

```bash
pnpm install
npx playwright install chromium
```

## Utilisation

```bash
npm run sniff:gomera
# ou
pnpm sniff:gomera
# ou directement
tsx scripts/sniff-atlantico-gomera.ts
```

## Ce que fait le script

1. **Ouvre Chromium headless** et navigue vers la page Gomera VIP Tour
2. **Écoute toutes les requêtes réseau** (XHR/fetch uniquement)
3. **Filtre les requêtes pertinentes** contenant : `limit`, `calendar`, `dispon`, `availability`, `hora`, `date`, `book`, `reserve`, `load`, `excursion`, `grupo`, `event`
4. **Simule les interactions utilisateur** :
   - Sélection de la zone "Sur" (South)
   - Sélection de la langue "English" si disponible
   - Ouverture du date picker
   - Sélection d'une date disponible
   - Ouverture du sélecteur d'horaires
5. **Log toutes les requêtes pertinentes** avec :
   - Méthode HTTP
   - URL complète
   - Headers (cookies/auth masqués)
   - POST data si présent
6. **Sauvegarde un debug HTML** (`debug-gomera.html`) si aucune requête n'est trouvée

## Output attendu

Le script affiche dans la console :
- Liste des endpoints API détectés
- Paramètres exacts (query params, POST data)
- Headers utilisés

Exemple :
```
🔍 RELEVANT API ENDPOINTS:

1. GET https://www.atlanticoexcursiones.com/api/loadLimits/511/ES/2024-01-01
   Headers: { "Content-Type": "application/json", ... }
```

## Fichiers générés

- `debug-gomera.html` : HTML du bloc "Gestiona tu reserva" si aucune requête n'est trouvée

## Notes

- Le script fonctionne en mode headless (pas de fenêtre visible)
- Compatible Windows + Node 18+
- Les cookies et tokens d'authentification sont masqués dans les logs
- Timeout de 30 secondes pour le chargement de la page























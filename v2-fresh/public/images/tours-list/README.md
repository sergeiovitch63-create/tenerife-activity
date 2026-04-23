# Images pour les cartes Tours List

**Source unique** pour les images des cartes sur la page tours-list.

## Structure

Un dossier par tour (code du tour) :

```
public/images/tours-list/
  ├── 303/
  │   └── cover.jpg    ← image de la carte pour le tour 303
  ├── 340/
  │   └── cover.jpg
  ├── 403/
  │   └── cover.jpg
  └── 508/
      └── cover.jpg
```

## Convention

- **Dossier** : nom du code du tour (ex. `303`, `508`, `340`)
- **Fichier** : `cover.jpg`, `cover.png` ou `cover.webp`

L’app tente dans l’ordre : `cover.jpg` → `cover.png` → `cover.webp`

## Comment ajouter des images

1. Créer le dossier `public/images/tours-list/{code}/` (ex. `340`)
2. Y placer une image nommée `cover.jpg`, `cover.png` ou `cover.webp`

Si le fichier n’existe pas, la carte affichera "No image".

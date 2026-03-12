# AUDIT DES VIBES - Page d'accueil

## 📊 LISTE DES 14 VIBES (Ordre d'affichage)

| # | ID | Slug | Title EN | Title ES | Title FR | Description EN | Tagline EN | Thumbnail | Video |
|---|----|------|----------|----------|----------|-----------------|------------|-----------|-------|
| 1 | `1` | `vip-tours` | VIP Tours | Tours VIP | Tours VIP | Exclusive premium tours | Exclusive access to Tenerife's most coveted experiences | `/videos/thumbnails/VIP-Tours.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Vip-Tours.mp4` |
| 2 | `2` | `theme-parks` | Theme Parks | Parques temáticos | Parcs à thème | Family fun and entertainment | Unforgettable family adventures await | `/videos/thumbnails/vibe-theme-parks.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Vibe-Theme-Parks.mp4` |
| 3 | `3` | `tickets-attractions` | Tickets & Attractions | Entradas y atracciones | Billets et attractions | Skip-the-line tickets and attractions | Skip the queues, maximize your time | `/videos/thumbnails/tickets-attractions.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Tickets-Attractions.mp4` |
| 4 | `4` | `bus-excursions` | Bus Excursions | Excursiones en autobús | Excursions en bus | Guided bus tours around the island | Discover the island in comfort and style | `/videos/thumbnails/bus-excursions.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Bus-Excursions.mp4` |
| 5 | `5` | `boat-trips-cruises` | Boat Trips & Cruises | Viajes en barco y cruceros | Voyages en bateau et croisières | Ocean adventures and cruises | Set sail for unforgettable ocean moments | `/videos/thumbnails/boat-trips-cruises.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Boat-Trips-Cruises.mp4` |
| 6 | `6` | `shows-entertainment` | Shows & Entertainment | Espectáculos y entretenimiento | Spectacles et divertissements | Live shows and evening entertainment | Evenings filled with world-class performances | `/videos/thumbnails/shows-entertainment.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Shows-Entertainment.mp4` |
| 7 | `7` | `water-sports` | Water Sports | Deportes acuáticos | Sports nautiques | Aquatic activities and water fun | Dive into thrilling aquatic adventures | `/videos/thumbnails/water-sports.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Water-Sports.mp4` |
| 8 | `8` | `cable-car-observatory` | Cable Car & Observatory | Teleférico y observatorio | Téléphérique et observatoire | Mountain views and stargazing | Reach new heights and gaze at the stars | `/videos/thumbnails/cable-car-observatory.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Cable-Car-Observatory.mp4` |
| 9 | `9` | `diving-fishing` | Diving & Fishing | Buceo y pesca | Plongée et pêche | Underwater adventures and fishing trips | Explore the depths or cast your line | `/videos/thumbnails/diving-fishing.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Diving-Fishing.mp4` |
| 10 | `10` | `adventure-nature` | Adventure & Nature | Aventura y naturaleza | Aventure et nature | Outdoor adventures and nature experiences | Connect with Tenerife's wild side | `/videos/thumbnails/adventure-nature.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Adventure-Nature.mp4` |
| 11 | `11` | `gastronomy-tastings` | Gastronomy & Tastings | Gastronomía y degustaciones | Gastronomie et dégustations | Culinary experiences and tastings | Savor the authentic flavors of the Canaries | `/videos/thumbnails/gastronomy-tastings.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Gastronomy-Tastings.mp4` |
| 12 | `12` | `car-rental` | Car Rental | Alquiler de coche | Location de voiture | Vehicle rental services | Freedom to explore at your own pace | `/videos/thumbnails/car-rental.png` | `/videos/car-rental.mp4` |
| 13 | `13` | `bike-rental` | Bike Rental | Alquiler de bicicleta | Location de vélo | Bicycle rental services | Pedal through scenic routes | `/videos/thumbnails/bike-rental.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Bike-Rental.mp4` |
| 14 | `14` | `transfers-transport` | Transfers & Transport | Traslados y transporte privado | Transferts et transport privé | Airport transfers and transport services | Seamless journeys from start to finish | `/videos/thumbnails/transfers-transport.png` | `https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Transfers-Transport.mp4` |

---

## 📍 SOURCE DE VÉRITÉ

### Fichier principal : `src/data/mock/mock-vibe.repository.ts`

**Ligne 5-118** : Définition du tableau `MOCK_VIBES` avec les 14 vibes dans l'ordre verrouillé.

```typescript
const MOCK_VIBES: Vibe[] = [
  {
    id: '1',
    slug: 'vip-tours',
    title: 'VIP Tours',
    description: 'Exclusive premium tours',
    tagline: 'Exclusive access to Tenerife\'s most coveted experiences',
    order: 1,
  },
  // ... 13 autres vibes
]
```

**Classe Repository** : `MockVibeRepository` (lignes 120-136)
- `findAll()` : Retourne toutes les vibes dans l'ordre
- `findBySlug(slug)` : Trouve une vibe par slug
- `findById(id)` : Trouve une vibe par ID

### Structure de données : `src/core/entities/vibe.ts`

```typescript
export interface Vibe {
  id: string
  slug: string
  title: string
  description?: string
  tagline?: string
  imageUrl?: string
  order: number
}
```

### Utilisation sur la Home : `src/app/[locale]/page.tsx`

**Ligne 40** : Récupération des vibes
```typescript
const vibes = await vibeRepository.findAll()
```

**Ligne 126** : Affichage via le composant
```typescript
<VibesList vibes={vibes} />
```

### Configuration du Repository : `src/config/repositories.ts`

**Ligne 9** : Instance utilisée partout dans l'app
```typescript
export const vibeRepository: VibeRepository = new MockVibeRepository()
```

---

## 🌐 TRADUCTIONS

### Fichiers de traduction

Les traductions sont définies dans :
- `messages/en.json` (lignes 163-222)
- `messages/es.json` (lignes 163-222)
- `messages/fr.json` (lignes 162-214)
- `messages/de.json`, `messages/it.json`, `messages/pl.json`, `messages/ru.json` (à vérifier)

### Clés de traduction

Format : `vibes.{camelCase}` où `camelCase` est converti depuis le slug kebab-case.

**Mapping** : `src/ui/components/vibe/vibe-translations.ts`
- Fonction `vibeSlugToTranslationKey()` : Convertit `'vip-tours'` → `'vipTours'`
- Fonction `getTranslatedVibeTitle()` : Récupère le titre traduit avec fallback

### Exemple de traduction

```json
{
  "vibes": {
    "vipTours": "VIP Tours",           // EN
    "vipTours": "Tours VIP",           // ES/FR
    "items": {
      "vipTours": {
        "description": "Exclusive premium tours"  // EN
      }
    }
  }
}
```

---

## 🎬 MÉDIAS (Vidéos & Thumbnails)

### Thumbnails : `src/data/vibeThumbnails.ts`

**Lignes 5-20** : Mapping des slugs vers les chemins de thumbnails
```typescript
export const vibeThumbnails: Record<string, string> = {
  'vip-tours': '/videos/thumbnails/VIP-Tours.png',
  'theme-parks': '/videos/thumbnails/vibe-theme-parks.png',
  // ... tous les 14 vibes ont un thumbnail
}
```

### Vidéos : `src/ui/components/vibe/VibeRow.tsx`

**Lignes 17-32** : Mapping des slugs vers les fichiers vidéo
```typescript
const VIBE_VIDEO_MAP: Record<string, string> = {
  'vip-tours': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Vip-Tours.mp4',
  'theme-parks': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Vibe-Theme-Parks.mp4',
  // ... tous les 14 vibes ont une vidéo
}
```

**Note** : Tous les 14 vibes ont à la fois un thumbnail ET une vidéo définis.

---

## 🔗 COMPOSANTS UI

### `src/ui/components/vibe/VibesList.client.tsx`
- Composant client qui affiche la liste des vibes
- Utilise `VibeRow` pour chaque vibe
- Rendering progressif (visibleCount)

### `src/ui/components/vibe/VibeRow.tsx`
- Composant pour une ligne de vibe
- Gère la vidéo (playback automatique au hover)
- Affiche le thumbnail en fallback
- Utilise les traductions via `vibeSlugToTranslationKey()`

### `src/ui/components/vibe/VibeCard.client.tsx`
- Version "card" alternative (non utilisée sur la home actuellement)

---

## 📋 RÈGLES DE MAPPING

### Mapping Mood → Vibes : `src/lib/recommendations/mapping.ts`

**Lignes 18-25** : Mapping des moods vers des slugs de vibes
```typescript
const MOOD_TO_VIBES: Record<Mood, string[]> = {
  relax: ['vip-tours', 'cable-car-observatory', 'boat-trips-cruises'],
  adventure: ['adventure-nature', 'water-sports', 'diving-fishing'],
  romantic: ['vip-tours', 'boat-trips-cruises', 'shows-entertainment'],
  family: ['theme-parks', 'tickets-attractions', 'bus-excursions'],
  culture: ['tickets-attractions', 'bus-excursions', 'gastronomy-tastings'],
  ocean: ['boat-trips-cruises', 'water-sports', 'diving-fishing'],
}
```

### Mapping Time → Vibes : `src/lib/recommendations/mapping.ts`

**Lignes 31-37** : Mapping du temps disponible vers des vibes
```typescript
const TIME_TO_VIBES: Record<TimeAvailable, string[]> = {
  '2-3hours': ['tickets-attractions', 'cable-car-observatory', 'gastronomy-tastings'],
  halfday: ['vip-tours', 'bus-excursions', 'water-sports'],
  fullday: ['theme-parks', 'boat-trips-cruises', 'adventure-nature'],
  evening: ['shows-entertainment', 'gastronomy-tastings'],
  multiday: ['car-rental', 'bike-rental'],
}
```

### Mapping Group → Vibes : `src/lib/recommendations/mapping.ts`

**Lignes 43-49** : Mapping du type de groupe vers des vibes
```typescript
const GROUP_TO_VIBES: Record<GroupType, string[]> = {
  couple: ['vip-tours', 'boat-trips-cruises', 'shows-entertainment', 'gastronomy-tastings'],
  family: ['theme-parks', 'tickets-attractions', 'bus-excursions', 'water-sports'],
  friends: ['adventure-nature', 'water-sports', 'boat-trips-cruises', 'shows-entertainment'],
  solo: ['tickets-attractions', 'bus-excursions', 'cable-car-observatory', 'gastronomy-tastings'],
  seniors: ['bus-excursions', 'vip-tours', 'tickets-attractions', 'shows-entertainment'],
}
```

---

## ✅ VÉRIFICATION

### Nombre total : **14 vibes** ✓

Confirmé dans `src/data/mock/mock-vibe.repository.ts` :
- Le tableau `MOCK_VIBES` contient exactement 14 éléments
- Chaque vibe a un `order` unique de 1 à 14
- Chaque vibe a un `id` unique de '1' à '14'
- Chaque vibe a un `slug` unique

### Cohérence des données

✅ **Tous les slugs ont** :
- Un thumbnail défini dans `vibeThumbnails.ts`
- Une vidéo définie dans `VIBE_VIDEO_MAP`
- Des traductions EN/ES/FR dans `messages/*.json`
- Un mapping dans les règles de recommandation (si applicable)

---

## 📝 NOTES

### Points d'attention

1. **Repository Mock** : Actuellement, les vibes sont en dur dans un repository mock. Pour une intégration future avec une API, il faudra créer un `AtlanticoVibeRepository` similaire à `AtlanticoExperienceRepository`.

2. **Ordre verrouillé** : Le commentaire dans le code indique "Locked order as per requirements" - l'ordre ne doit pas être modifié sans validation.

3. **Traductions manquantes** : Vérifier que toutes les langues (de, it, pl, ru) ont les traductions complètes des 14 vibes.

4. **Médias** : Tous les fichiers vidéo et thumbnails doivent exister dans `/public/videos/` et `/public/videos/thumbnails/`.

5. **Mapping Atlantico** : Actuellement, toutes les expériences Atlantico sont assignées à `vibeId: '1'` par défaut (voir `src/data/atlantico/atlantico-experience.repository.ts` ligne 132). Un mapping réel entre les activités Atlantico et les vibes devra être implémenté.

---

## 📂 FICHIERS CLÉS

| Fichier | Rôle | Lignes pertinentes |
|---------|------|-------------------|
| `src/data/mock/mock-vibe.repository.ts` | **Source de vérité** | 5-118 (MOCK_VIBES) |
| `src/core/entities/vibe.ts` | Interface TypeScript | 1-9 |
| `src/config/repositories.ts` | Configuration repository | 9 |
| `src/app/[locale]/page.tsx` | Page d'accueil | 40, 126 |
| `src/ui/components/vibe/VibesList.client.tsx` | Composant liste | Tout |
| `src/ui/components/vibe/VibeRow.tsx` | Composant ligne | 17-32 (vidéos) |
| `src/data/vibeThumbnails.ts` | Mapping thumbnails | 5-20 |
| `src/ui/components/vibe/vibe-translations.ts` | Helpers traductions | Tout |
| `messages/en.json` | Traductions EN | 163-222 |
| `messages/es.json` | Traductions ES | 163-222 |
| `messages/fr.json` | Traductions FR | 162-214 |

---

**Date de l'audit** : 2025-01-27  
**Nombre de vibes** : 14 ✓  
**Source unique** : `src/data/mock/mock-vibe.repository.ts`


























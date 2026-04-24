import {
  Bus, Landmark, Languages, Mountain, MountainSnow, Eye, Wine,
  Utensils, UtensilsCrossed, Coffee, ShoppingBag, Car, Trees,
  Umbrella, Ship, Anchor, Fish, Home, Camera, Music, Cookie,
  Users, Sparkles, MapPin, Plane, Bike, Star, Heart, Tag,
  type LucideIcon,
} from 'lucide-react'

/**
 * Normalize raw Atlantico icon filename:
 *  "0_hicon-drinks" → "drinks"
 *  "free_bus.png"    → "free_bus"
 *  "Mirador.PNG"     → "mirador"
 */
export function normalizeIcon(raw: string): string {
  return raw
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[_-]hicon[_-]/, '')
    .replace(/^hicon[_-]/, '')
    .toLowerCase()
    .trim()
}

/** Map of normalized icon names to Lucide components */
const ICON_MAP: Record<string, LucideIcon> = {
  // Transport
  free_bus: Bus, bus: Bus, transfer: Car, pickup: Car, hotel_pickup: Car,
  boat: Ship, cableway: MountainSnow, plane: Plane, bike: Bike,
  // Landscape & sights
  paisaje: Mountain, mirador: Eye, nature: Trees, beach: Umbrella,
  history: Landmark, viewpoint: Eye, landscape: Mountain,
  // Food & drink
  eat: Utensils, lunch: Utensils, dinner: UtensilsCrossed,
  breakfast: Coffee, drinks: Wine, wine: Wine, snacks: Cookie, food: Utensils,
  // People / experience
  interprete: Languages, guide: Users, kids: Users, family: Users,
  // Activities
  diving: Anchor, fishing: Fish, shopping: ShoppingBag,
  photos: Camera, music: Music,
  // Generic
  default: Sparkles,
}

/** Return a Lucide icon component for a raw Atlantico icon filename */
export function iconFor(raw: string): LucideIcon {
  return ICON_MAP[normalizeIcon(raw)] ?? ICON_MAP.default
}

type LabelMap = Record<string, string>

const LABELS_FR: LabelMap = {
  free_bus: 'Bus inclus', bus: 'Bus', transfer: 'Transfert', pickup: 'Prise en charge',
  hotel_pickup: 'Prise en charge hôtel', boat: 'Bateau', cableway: 'Téléphérique', plane: 'Vol', bike: 'Vélo',
  paisaje: 'Paysages', mirador: 'Points de vue', nature: 'Nature', beach: 'Plage',
  history: 'Historique', viewpoint: 'Panorama', landscape: 'Paysage',
  eat: 'Repas', lunch: 'Déjeuner', dinner: 'Dîner', breakfast: 'Petit déjeuner',
  drinks: 'Boissons', wine: 'Dégustation vin', snacks: 'Snacks', food: 'Repas',
  interprete: 'Guide bilingue', guide: 'Guide', kids: 'Enfants', family: 'Famille',
  diving: 'Plongée', fishing: 'Pêche', shopping: 'Shopping',
  photos: 'Photos', music: 'Musique',
}
const LABELS_EN: LabelMap = {
  free_bus: 'Free bus', bus: 'Bus', transfer: 'Transfer', pickup: 'Pickup',
  hotel_pickup: 'Hotel pickup', boat: 'Boat', cableway: 'Cable car', plane: 'Flight', bike: 'Bike',
  paisaje: 'Scenery', mirador: 'Viewpoints', nature: 'Nature', beach: 'Beach',
  history: 'History', viewpoint: 'Viewpoint', landscape: 'Landscape',
  eat: 'Meals', lunch: 'Lunch', dinner: 'Dinner', breakfast: 'Breakfast',
  drinks: 'Drinks', wine: 'Wine tasting', snacks: 'Snacks', food: 'Food',
  interprete: 'Bilingual guide', guide: 'Guide', kids: 'Kids', family: 'Family',
  diving: 'Diving', fishing: 'Fishing', shopping: 'Shopping',
  photos: 'Photos', music: 'Music',
}
const LABELS_ES: LabelMap = {
  free_bus: 'Autobús incluido', bus: 'Autobús', transfer: 'Transfer', pickup: 'Recogida',
  hotel_pickup: 'Recogida en hotel', boat: 'Barco', cableway: 'Teleférico', plane: 'Vuelo', bike: 'Bici',
  paisaje: 'Paisajes', mirador: 'Miradores', nature: 'Naturaleza', beach: 'Playa',
  history: 'Historia', viewpoint: 'Panorámica', landscape: 'Paisaje',
  eat: 'Comidas', lunch: 'Almuerzo', dinner: 'Cena', breakfast: 'Desayuno',
  drinks: 'Bebidas', wine: 'Cata de vinos', snacks: 'Snacks', food: 'Comida',
  interprete: 'Guía bilingüe', guide: 'Guía', kids: 'Niños', family: 'Familia',
  diving: 'Buceo', fishing: 'Pesca', shopping: 'Compras',
  photos: 'Fotos', music: 'Música',
}
const LABELS_DE: LabelMap = {
  free_bus: 'Bus inkl.', bus: 'Bus', transfer: 'Transfer', pickup: 'Abholung',
  hotel_pickup: 'Hotel-Abholung', boat: 'Boot', cableway: 'Seilbahn', plane: 'Flug', bike: 'Fahrrad',
  paisaje: 'Landschaften', mirador: 'Aussichtspunkte', nature: 'Natur', beach: 'Strand',
  history: 'Geschichte', viewpoint: 'Panorama', landscape: 'Landschaft',
  eat: 'Mahlzeiten', lunch: 'Mittagessen', dinner: 'Abendessen', breakfast: 'Frühstück',
  drinks: 'Getränke', wine: 'Weinprobe', snacks: 'Snacks', food: 'Essen',
  interprete: 'Zweisprachiger Guide', guide: 'Guide', kids: 'Kinder', family: 'Familie',
  diving: 'Tauchen', fishing: 'Angeln', shopping: 'Shopping',
  photos: 'Fotos', music: 'Musik',
}
const LABELS_IT: LabelMap = {
  free_bus: 'Autobus incluso', bus: 'Autobus', transfer: 'Transfer', pickup: 'Ritiro',
  hotel_pickup: 'Ritiro in hotel', boat: 'Barca', cableway: 'Funivia', plane: 'Volo', bike: 'Bici',
  paisaje: 'Paesaggi', mirador: 'Punti panoramici', nature: 'Natura', beach: 'Spiaggia',
  history: 'Storia', viewpoint: 'Panorama', landscape: 'Paesaggio',
  eat: 'Pasti', lunch: 'Pranzo', dinner: 'Cena', breakfast: 'Colazione',
  drinks: 'Bevande', wine: 'Degustazione vini', snacks: 'Snack', food: 'Cibo',
  interprete: 'Guida bilingue', guide: 'Guida', kids: 'Bambini', family: 'Famiglia',
  diving: 'Immersioni', fishing: 'Pesca', shopping: 'Shopping',
  photos: 'Foto', music: 'Musica',
}
const LABELS_RU: LabelMap = {
  free_bus: 'Автобус включён', bus: 'Автобус', transfer: 'Трансфер', pickup: 'Трансфер',
  hotel_pickup: 'Из отеля', boat: 'Лодка', cableway: 'Канатная дорога', plane: 'Полёт', bike: 'Вело',
  paisaje: 'Пейзажи', mirador: 'Смотровые', nature: 'Природа', beach: 'Пляж',
  history: 'История', viewpoint: 'Панорама', landscape: 'Ландшафт',
  eat: 'Питание', lunch: 'Обед', dinner: 'Ужин', breakfast: 'Завтрак',
  drinks: 'Напитки', wine: 'Дегустация', snacks: 'Закуски', food: 'Еда',
  interprete: 'Гид переводчик', guide: 'Гид', kids: 'Дети', family: 'Семья',
  diving: 'Дайвинг', fishing: 'Рыбалка', shopping: 'Шопинг',
  photos: 'Фото', music: 'Музыка',
}

const LABEL_MAPS: Record<string, LabelMap> = {
  fr: LABELS_FR, en: LABELS_EN, es: LABELS_ES,
  de: LABELS_DE, it: LABELS_IT, ru: LABELS_RU,
}

export function iconLabel(raw: string, locale: string = 'fr'): string {
  const key = normalizeIcon(raw)
  const map = LABEL_MAPS[locale] ?? LABEL_MAPS.fr
  return map[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

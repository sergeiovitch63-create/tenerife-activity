/**
 * Visual theme layer on top of Atlantico categories.
 *
 * Single-brand design: every category shares the same turquoise surface
 * (applied as a duotone overlay on the photo). Only icon + image change
 * per category. A gold accent is reserved for hover/featured states —
 * never as a per-category color.
 *
 * Images are ported from the v1 `public/videos/thumbnails/` set and live
 * in `public/images/categories/`. When `image` is null, the card falls
 * back to the decorative wave SVG backdrop.
 *
 * Keyed by Atlantico classification `id` (stable across languages).
 */
export type CategoryTheme = {
  icon: string // lucide-react icon name
  image: string | null // filename under /images/categories/, or null
  order: number
}

export const categoryThemes: Record<string, CategoryTheme> = {
  '1265045392': { icon: 'Ship',            image: 'boat-trips-cruises.png',   order: 1 },  // Boat Trips
  '1312487407': { icon: 'Mountain',        image: 'adventure-nature.png',     order: 2 },  // Adventure & Nature
  '1265046317': { icon: 'Waves',           image: 'water-sports.png',         order: 3 },  // Water Sports
  '1265045344': { icon: 'FerrisWheel',     image: 'vibe-theme-parks.png',     order: 4 },  // Theme parks
  '1426163087': { icon: 'MountainSnow',    image: 'cable-car-observatory.png',order: 5 },  // Cable car & Observatory
  '1265045434': { icon: 'Fish',            image: 'diving-fishing.png',       order: 6 },  // Diving & Fishing
  '1265045414': { icon: 'Theater',         image: 'shows-entertainment.png',  order: 7 },  // Shows
  '1750147182': { icon: 'Crown',           image: 'VIP-Tours.png',            order: 8 },  // VIP Experiences
  '1457430923': { icon: 'CarFront',        image: 'car-rental.png',           order: 9 },  // Car & Moto Rent
  '1403121758': { icon: 'Bike',            image: 'bike-rental.png',          order: 10 }, // Bike
  '1717760499': { icon: 'UtensilsCrossed', image: 'gastronomy-tastings.png',  order: 11 }, // Gastronomy
  '1312481776': { icon: 'Bus',             image: 'bus-excursions.png',       order: 12 }, // Coach Tours
  '1445940121': { icon: 'Ticket',          image: 'tickets-attractions.png',  order: 13 }, // Tickets
  '1394099409': { icon: 'Plane',           image: 'transfers-transport.png',  order: 14 }, // Airport transfers
  '1529399015': { icon: 'Accessibility',   image: null,                       order: 15 }, // Disabled Services — no v1 photo
}

export const fallbackTheme: CategoryTheme = {
  icon: 'Sparkles',
  image: null,
  order: 99,
}

export function themeFor(id: string): CategoryTheme {
  return categoryThemes[id] ?? fallbackTheme
}

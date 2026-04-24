/**
 * Visual theme layer on top of Atlantico categories.
 *
 * Single-brand design: every category shares the same turquoise surface.
 * Only the icon changes per category. A gold accent is reserved for
 * hover / featured states — never as a per-category color.
 *
 * Keyed by Atlantico classification `id` (stable across languages).
 */
export type CategoryTheme = {
  icon: string // lucide-react icon name
  order: number
}

export const categoryThemes: Record<string, CategoryTheme> = {
  '1265045392': { icon: 'Ship',            order: 1 },  // Boat Trips
  '1312487407': { icon: 'Mountain',        order: 2 },  // Adventure & Nature
  '1265046317': { icon: 'Waves',           order: 3 },  // Water Sports
  '1265045344': { icon: 'FerrisWheel',     order: 4 },  // Theme parks
  '1426163087': { icon: 'MountainSnow',    order: 5 },  // Cable car & Observatory
  '1265045434': { icon: 'Fish',            order: 6 },  // Diving & Fishing
  '1265045414': { icon: 'Theater',         order: 7 },  // Shows
  '1750147182': { icon: 'Crown',           order: 8 },  // VIP Experiences
  '1457430923': { icon: 'CarFront',        order: 9 },  // Car & Moto Rent
  '1403121758': { icon: 'Bike',            order: 10 }, // Bike
  '1717760499': { icon: 'UtensilsCrossed', order: 11 }, // Gastronomy
  '1312481776': { icon: 'Bus',             order: 12 }, // Coach Tours
  '1445940121': { icon: 'Ticket',          order: 13 }, // Tickets
  '1394099409': { icon: 'Plane',           order: 14 }, // Airport transfers
  '1529399015': { icon: 'Accessibility',   order: 15 }, // Disabled Services
}

export const fallbackTheme: CategoryTheme = {
  icon: 'Sparkles',
  order: 99,
}

export function themeFor(id: string): CategoryTheme {
  return categoryThemes[id] ?? fallbackTheme
}

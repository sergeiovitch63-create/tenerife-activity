/**
 * Visual theme layer on top of Atlantico categories.
 * Keyed by Atlantico classification `id` (stable across languages).
 */
export type CategoryTheme = {
  icon: string       // lucide-react icon name
  gradient: [string, string]
  order: number
}

export const categoryThemes: Record<string, CategoryTheme> = {
  '1265045392': { icon: 'Ship',           gradient: ['#06B6D4', '#0E7490'], order: 1 }, // Boat Trips
  '1312487407': { icon: 'Mountain',       gradient: ['#F97316', '#9A3412'], order: 2 }, // Adventure & Nature
  '1265046317': { icon: 'Waves',          gradient: ['#22D3EE', '#0891B2'], order: 3 }, // Water Sports
  '1265045344': { icon: 'FerrisWheel',    gradient: ['#A78BFA', '#6D28D9'], order: 4 }, // Theme parks
  '1426163087': { icon: 'MountainSnow',   gradient: ['#64748B', '#1E293B'], order: 5 }, // Cable car & Observatory
  '1265045434': { icon: 'Fish',           gradient: ['#0EA5E9', '#0C4A6E'], order: 6 }, // Diving & Fishing
  '1265045414': { icon: 'Theater',        gradient: ['#EC4899', '#831843'], order: 7 }, // Shows
  '1750147182': { icon: 'Crown',          gradient: ['#EAB308', '#713F12'], order: 8 }, // VIP Experiences
  '1457430923': { icon: 'CarFront',       gradient: ['#475569', '#0F172A'], order: 9 }, // Car & Moto Rent
  '1403121758': { icon: 'Bike',           gradient: ['#84CC16', '#3F6212'], order: 10 }, // Bike
  '1717760499': { icon: 'UtensilsCrossed',gradient: ['#E11D48', '#7F1D1D'], order: 11 }, // Gastronomy
  '1312481776': { icon: 'Bus',            gradient: ['#0891B2', '#164E63'], order: 12 }, // Coach Tours
  '1445940121': { icon: 'Ticket',         gradient: ['#F43F5E', '#9F1239'], order: 13 }, // Tickets
  '1394099409': { icon: 'Plane',          gradient: ['#3B82F6', '#1E3A8A'], order: 14 }, // Airport transfers
  '1529399015': { icon: 'Accessibility',  gradient: ['#14B8A6', '#115E59'], order: 15 }, // Disabled Services
}

export const fallbackTheme: CategoryTheme = {
  icon: 'Sparkles',
  gradient: ['#64748B', '#334155'],
  order: 99,
}

export function themeFor(id: string): CategoryTheme {
  return categoryThemes[id] ?? fallbackTheme
}

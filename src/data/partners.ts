/**
 * Partner Data Structure
 * 
 * Partners are trusted companies or organizations that collaborate with Tenerife Activity.
 * This data is used to display partner logos in the "Our Partners" section.
 */

export interface Partner {
  name: string
  src: string
  href: string
  alt?: string
}

/**
 * Partner Logos
 * 
 * Add or update partner entries here. Logo files should be placed in /public/partners/
 * following the naming convention: partner-{name}.svg (or .png)
 */
export const partners: Partner[] = [
  {
    name: 'Partner 1',
    src: '/partners/partner-1.svg',
    href: '#',
    alt: 'Partner 1 Logo',
  },
  {
    name: 'Partner 2',
    src: '/partners/partner-2.svg',
    href: '#',
    alt: 'Partner 2 Logo',
  },
  {
    name: 'Partner 3',
    src: '/partners/partner-3.svg',
    href: '#',
    alt: 'Partner 3 Logo',
  },
  {
    name: 'Partner 4',
    src: '/partners/partner-4.svg',
    href: '#',
    alt: 'Partner 4 Logo',
  },
]

/**
 * Get all partners
 */
export function getAllPartners(): Partner[] {
  return partners
}


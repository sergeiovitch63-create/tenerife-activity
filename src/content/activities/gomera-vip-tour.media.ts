/**
 * Media + header config for Gomera VIP Tour activity.
 *
 * Scope: ONLY this activity.
 *
 * Uses the same structure and pattern as Astronomic Tour VIP.
 */

export interface GomeraVipTourMediaImage {
  url: string
  alt?: string
}

export interface GomeraVipTourMediaConfig {
  /**
   * Main hero image shown at the top of the page.
   */
  heroImage: GomeraVipTourMediaImage

  /**
   * Additional gallery images used in the hero mosaic / gallery section.
   * The hero image will always be used as the first image, followed by this array.
   */
  gallery: GomeraVipTourMediaImage[]

  /**
   * Card listing metadata (for VIP Tours list page)
   */
  card: {
    /**
     * Cover image for the card in listing page
     */
    coverImage: string

    /**
     * Fixed "from" price to display on card (VIP base price, not extra person)
     */
    fromPrice: number

    /**
     * Label for "from" price (i18n handled by component)
     */
    fromLabel: string

    /**
     * Card facts/info rows to display under title
     */
    facts: Array<{
      icon: string
      label: string
      value: string
    }>
  }
}

/**
 * Media configuration for Gomera VIP Tour.
 * Uses the same pattern as Astronomic Tour VIP.
 */
export const gomeraVipTourMedia: GomeraVipTourMediaConfig = {
  heroImage: {
    url: '/content/activities/gomera-vip-tour-1.png',
    alt: 'Gomera VIP Tour - hero view',
  },
  gallery: [
    {
      url: '/content/activities/gomera-vip-tour-1.png',
      alt: 'Gomera VIP Tour - image 1',
    },
    {
      url: '/content/activities/gomera-vip-tour-2.png',
      alt: 'Gomera VIP Tour - image 2',
    },
    {
      url: '/content/activities/gomera-vip-tour-3.png',
      alt: 'Gomera VIP Tour - image 3',
    },
    {
      url: '/content/activities/gomera-vip-tour-4.png',
      alt: 'Gomera VIP Tour - image 4',
    },
  ],
  card: {
    coverImage: '/content/activities/gomera-vip-tour-1.png',
    fromPrice: 0, // Will be calculated from tour data if not set
    fromLabel: 'Desde', // Will be translated by component based on locale
    facts: [
      {
        icon: '👥',
        label: 'Small group',
        value: 'Yes',
      },
      {
        icon: '🚌',
        label: 'Pickup service',
        value: 'Yes',
      },
      {
        icon: '⏱',
        label: 'Duration',
        value: 'Full day',
      },
    ],
  },
}


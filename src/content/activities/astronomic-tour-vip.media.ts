/**
 * Media + header config for Astronomic Tour VIP activity.
 *
 * Scope: ONLY this activity.
 *
 * Replace the TODO_* placeholders with final CDN image URLs and alt texts.
 */

export interface AstronomicTourVipMediaImage {
  url: string
  alt?: string
}

export interface AstronomicTourVipMediaConfig {
  /**
   * Main hero image shown at the top of the page.
   */
  heroImage: AstronomicTourVipMediaImage

  /**
   * Additional gallery images used in the hero mosaic / gallery section.
   * The hero image will always be used as the first image, followed by this array.
   */
  gallery: AstronomicTourVipMediaImage[]

  /**
   * Static header price badge (shown near the activity title).
   * Example: "From €1055"
   */
  headerPriceBadge: string

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
 * Editable media configuration for Astronomic Tour VIP.
 *
 * HOW TO USE:
 * - Replace `TODO_ADD_HERO_IMAGE_URL` with the final hero image URL.
 * - Replace each `TODO_ADD_GALLERY_IMAGE_URL_X` with gallery image URLs.
 * - (Optional) Update each `alt` text for better SEO.
 */
export const astronomicTourVipMedia: AstronomicTourVipMediaConfig = {
  heroImage: {
    url: '/content/activities/astronomic-tour-1.png',
    alt: 'Astronomic Tour VIP - hero view of the night sky over Teide',
  },
  gallery: [
    {
      url: '/content/activities/astronomic-tour-1.png',
      alt: 'Astronomic Tour VIP - telescope under the stars',
    },
    {
      url: '/content/activities/astronomic-tour-2.png',
      alt: 'Astronomic Tour VIP - stargazing experience in Tenerife',
    },
    {
      url: '/content/activities/astronomic-tour-3.png',
      alt: 'Astronomic Tour VIP - night landscape and Milky Way',
    },
    {
      url: '/content/activities/astronomic-tour-4.png',
      alt: 'Astronomic Tour VIP - astronomy guide with telescope',
    },
    {
      url: '/content/activities/astronomic-tour-5.png',
      alt: 'Astronomic Tour VIP - VIP group watching the stars',
    },
  ],
  headerPriceBadge: 'From €1055',
  card: {
    coverImage: '/content/activities/astronomic-tour-1.png',
    fromPrice: 1055,
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
        value: '8 hrs',
      },
    ],
  },
}



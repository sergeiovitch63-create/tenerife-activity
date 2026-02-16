/**
 * Image extraction utilities for Atlantico API responses
 * 
 * This file re-exports client-safe functions for backward compatibility.
 * 
 * For client components: import from here or directly from './images.client'
 * For server components: import from './images.server' to access server-only functions like getLocalAtlanticoImageUrl()
 * 
 * @deprecated Consider importing directly from './images.client' or './images.server' for clarity
 */

// Re-export all client-safe functions
export {
  getAtlanticoImageBaseUrl,
  buildAtlanticoImageUrlFromFilename,
  extractImageUrls,
  extractCoverImage,
} from './images.client'

/**
 * VIP Tours Local Images Utility (Client-Safe)
 * 
 * Manages local images for all VIP Tours activities (classification 308)
 * Images are stored in public/images/events/{groupCode}/
 * 
 * This file is client-safe (no Node.js modules)
 */

/**
 * List of VIP Tours group codes (classification 308)
 */
export const VIP_TOURS_GROUP_CODES = [
  '303', // VIP Ascent to the Peak on foot
  '403', // La Gomera Vip
  '479', // Tenerife VIP Tour
  '480', // Teide VIP Tour
  '508', // Masca + Teide VIP
  '509', // La Laguna + Anaga VIP
  '510', // Vuelta a La Isla VIP
  '511', // Gomera VIP Tour
  '513', // Teide Tour VIP
  '515', // Teide de Noche VIP
  '516', // Astronomic Tour VIP
]

/**
 * Check if a group code is a VIP Tour
 */
export function isVipTourGroup(groupCode: string | number | null | undefined): boolean {
  if (!groupCode) return false
  return VIP_TOURS_GROUP_CODES.includes(String(groupCode))
}

/**
 * Get local images for a VIP Tour group (client-side via API)
 * Returns array of local image URLs (e.g., ['/images/events/303/A.webp', ...])
 */
export async function getVipTourLocalImages(groupCode: string | number): Promise<string[]> {
  const code = String(groupCode)
  if (!isVipTourGroup(code)) {
    return []
  }

  try {
    // Fetch from API to get list of available images
    const response = await fetch(`/api/atlantico/vip-tour-images/${code}`)
    if (response.ok) {
      const data = await response.json()
      if (data.images && Array.isArray(data.images)) {
        return data.images
      }
    }
  } catch {
    // Fallback: return common image paths
  }

  // Fallback: return common image filenames
  const commonNames = ['A.webp', 'A.jpg', '1.jpg', '1.webp', 'cover.jpg', 'cover.webp', 'B.jpg', 'C.jpg']
  return commonNames.map(name => `/images/events/${code}/${name}`)
}

/**
 * Get first local image for a VIP Tour group (for cards/thumbnails)
 * Synchronous version for client-side
 */
export function getVipTourCoverImageSync(groupCode: string | number): string | null {
  const code = String(groupCode)
  if (!isVipTourGroup(code)) {
    return null
  }
  
  // Return first common image path - existence will be checked by the image component
  return `/images/events/${code}/A.webp`
}

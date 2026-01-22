# Vibe Assignment System

This directory contains the automatic vibe assignment system for Atlantico experiences.

## Overview

Experiences from the Atlantico API are automatically assigned to one of the 14 vibes based on:
1. **Classification code mapping** (if available)
2. **Keyword matching** in title/description
3. **Default fallback** to vibeId "1" (VIP Tours)

## Files

- `atlantico-vibe-map.ts` - Mapping table: Atlantico classification codes → Vibe IDs
- `assignVibe.ts` - Main assignment function with keyword fallback logic

## Vibe IDs (from MOCK_VIBES order)

| ID | Slug | Title |
|----|------|-------|
| 1 | vip-tours | VIP Tours |
| 2 | theme-parks | Theme Parks |
| 3 | tickets-attractions | Tickets & Attractions |
| 4 | bus-excursions | Bus Excursions |
| 5 | boat-trips-cruises | Boat Trips & Cruises |
| 6 | shows-entertainment | Shows & Entertainment |
| 7 | water-sports | Water Sports |
| 8 | cable-car-observatory | Cable Car & Observatory |
| 9 | diving-fishing | Diving & Fishing |
| 10 | adventure-nature | Adventure & Nature |
| 11 | gastronomy-tastings | Gastronomy & Tastings |
| 12 | car-rental | Car Rental |
| 13 | bike-rental | Bike Rental |
| 14 | transfers-transport | Transfers & Transport |

## How to Update the Mapping

### Step 1: Fetch Classifications

Fetch the Atlantico catalog to see available classifications:

```bash
curl "http://localhost:3000/api/atlantico/catalog?lang=ENG"
```

Look for the `classifications` array in the response.

### Step 2: Map Classifications to Vibes

For each classification, determine the best matching vibe:

1. Open `src/lib/vibes/atlantico-vibe-map.ts`
2. Add entries to `ATLANTICO_CLASS_TO_VIBE`:
   ```typescript
   export const ATLANTICO_CLASS_TO_VIBE: Record<string, string> = {
     "VIP": "1",
     "THEME_PARK": "2",
     "TICKET": "3",
     // ... etc
   }
   ```

### Step 3: Update Keywords (Optional)

If keyword matching needs adjustment, edit `src/lib/vibes/assignVibe.ts`:

```typescript
const VIBE_KEYWORDS: Record<string, string[]> = {
  '1': ['vip', 'premium', 'exclusive', ...],
  '2': ['theme park', 'siam park', ...],
  // ... etc
}
```

## Debugging

In development mode, the catalog endpoint logs vibe assignment statistics:

```
[CATALOG_VIBE_MAPPING] {
  total: 262,
  distribution: { '1': 45, '2': 30, '3': 25, ... },
  methods: {
    classification: '50 (19.1%)',
    keywords: '180 (68.7%)',
    default: '32 (12.2%)',
  }
}
```

This shows:
- Total experiences
- Distribution across vibe IDs
- Which assignment method was used (classification/keywords/default)

## Testing

To test the assignment:

1. Start the dev server: `pnpm dev`
2. Visit `/en/catalog` (or any catalog page)
3. Check the console for `[CATALOG_VIBE_MAPPING]` logs
4. Verify experiences are distributed across multiple vibes (not all "1")

## Notes

- The mapping table is case-insensitive (normalized to uppercase)
- Keyword matching is case-insensitive
- Keywords are checked in order (1-14), first match wins
- If no classification or keyword match, defaults to vibeId "1"















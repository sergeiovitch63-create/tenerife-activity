# Atlantico Pricing Debug Implementation - Summary

## Files Changed

### 1. `src/app/api/atlantico/availability/[eventCode]/[lang]/route.ts`
**Changes:**
- Added support for both `?date=` and `?month=` query parameters
- Added `normalizeToMonthStart()` function to normalize any date format to YYYY-MM-01
- Returns `usedMonth` and `ok` fields in response
- Prefers `month` param, falls back to `date` param, then defaults to current month

**Key Lines:**
- Lines 22-58: Added normalization function and parameter handling
- Lines 89-97: Enhanced response to include metadata

### 2. `src/app/api/atlantico/debug-pricing/[groupCode]/[lang]/route.ts` (NEW FILE)
**Purpose:** Deterministic pricing debug endpoint
**Features:**
- Extracts event codes from group details
- Tests first 3 eventCodes only (concurrency limit: 3)
- For each eventCode:
  - Fetches availability and extracts nextDate
  - Fetches prices for nextDate
  - Extracts minPrice from prices
  - Returns status (ok/empty/error) for each step
  - Returns keys present in responses (first 10 keys)
- Returns cheapest option overall
- Collects all errors

**Key Lines:**
- Lines 1-250: Complete implementation

### 3. `scripts/smoke-atlantico.mjs`
**Changes:**
- Added `getGroupCodesFromToursEnriched()` function
- Added `testDebugPricing()` function
- Enhanced main() to:
  1. Test basic endpoints (health, group, event, catalog)
  2. Fetch tours-enriched and extract first 5 groupCodes
  3. Test debug-pricing for each groupCode
  4. Display results in table format

**Key Lines:**
- Lines 97-115: GroupCode extraction
- Lines 117-140: Debug pricing test
- Lines 142-200: Enhanced main with table display

### 4. `src/lib/atlantico/price-normalize.ts`
**Changes:**
- Enhanced `normalizePriceFromRaw()` to check additional fields:
  - Added: `amount`, `tariff`, `ADULT`, `adult`, `CHILD`, `child`, `TOTAL`, `total`
  - Added string parsing for numeric string values

**Key Lines:**
- Lines 16-35: Enhanced field checking with string parsing

### 5. `src/lib/atlantico/prices.ts`
**Changes:**
- Enhanced `parseLoadPricesResponse()` to check additional fields:
  - Added: `ADULT`, `CHILD`, `TOTAL` (uppercase)
  - Added: `price`, `amount`, `tariff` (generic)
  - Added string parsing for `adult` and `child` fields

**Key Lines:**
- Lines 55-95: Enhanced object parsing with more fields

### 6. `src/app/api/atlantico/prices/[eventCode]/route.ts`
**Changes:**
- Added support for `ATLANTICO_OFFICE` environment variable
- Falls back to env var if `office` query param not provided

**Key Lines:**
- Line 30: Added env var fallback

### 7. `src/lib/atlantico/pricing.ts`
**Changes:**
- Added support for `ATLANTICO_OFFICE` environment variable in `getPriceForDate()`
- Falls back to env var if `office` parameter not provided

**Key Lines:**
- Lines 127-143: Added env var support

## Example Debug-Pricing URLs

### Format:
```
GET /api/atlantico/debug-pricing/{groupCode}/{lang}
```

### Example URLs (replace with real groupCodes from your catalog):
1. `http://localhost:3000/api/atlantico/debug-pricing/TOUR001/ENG`
2. `http://localhost:3000/api/atlantico/debug-pricing/TOUR002/ENG`
3. `http://localhost:3000/api/atlantico/debug-pricing/TOUR003/ESP`

### Example Response Structure:
```json
{
  "groupCode": "TOUR001",
  "lang": "ENG",
  "eventCodes": ["1317", "1318", "1319"],
  "eventDetails": [
    {
      "eventCode": "1317",
      "nextDate": "2024-12-15",
      "availabilityStatus": "ok",
      "pricesStatus": "ok",
      "extractedMinPrice": 45.00,
      "availabilityKeys": ["dates", "limit", "used"],
      "pricesKeys": ["adult", "child", "infant"],
      "errors": []
    },
    {
      "eventCode": "1318",
      "nextDate": null,
      "availabilityStatus": "empty",
      "pricesStatus": "error",
      "extractedMinPrice": null,
      "availabilityKeys": [],
      "pricesKeys": [],
      "errors": ["No available dates found in limits"]
    }
  ],
  "cheapestOption": {
    "eventCode": "1317",
    "nextDate": "2024-12-15",
    "minPrice": 45.00
  },
  "errors": [],
  "durationMs": 1234,
  "ok": true
}
```

## Pricing Debugging Guide

### If pricing is missing, check:

1. **Availability Issues:**
   - Check `availabilityStatus` in debug-pricing response
   - If `"empty"`: No available dates found in loadLimits
   - If `"error"`: HTTP error or network issue
   - Check `availabilityKeys` to see what fields are present

2. **Price Parsing Issues:**
   - Check `pricesStatus` in debug-pricing response
   - If `"empty"`: Response received but no valid prices found
   - If `"error"`: HTTP error or network issue
   - Check `pricesKeys` to see what fields are present
   - Check `extractedMinPrice` - if null, parsing failed

3. **Auth/Office Issues:**
   - If all prices return 401/403: Check `ATLANTICO_TOKEN`
   - If prices return empty but availability works: May need `ATLANTICO_OFFICE`
   - Check errors array in debug-pricing response

4. **Common Scenarios:**
   - **Availability empty**: Event has no available dates in current/next month
   - **Prices empty**: Price response format not recognized (check `pricesKeys`)
   - **Prices error**: Office required but not provided, or auth issue

## Environment Variables

### Required:
- `ATLANTICO_BASE_URL` - Base URL for Atlantico API

### Optional:
- `ATLANTICO_TIMEOUT_MS` - Request timeout (default: 10000ms)
- `ATLANTICO_REVALIDATE_SECONDS` - Cache revalidation (default: 300s)
- `ATLANTICO_TOKEN` - API authentication token (if required)
- `ATLANTICO_OFFICE` - Office code for price requests (if required)
- `ATLANTICO_GROUP_IDS` - Comma-separated list of allowed group IDs

## Testing

### Run Smoke Test:
```bash
pnpm smoke:atlantico
```

### Manual Testing:
1. Start dev server: `pnpm dev`
2. Visit: `http://localhost:3000/en/catalog`
3. Get a groupCode from the catalog
4. Test debug-pricing: `http://localhost:3000/api/atlantico/debug-pricing/{groupCode}/ENG`
5. Check response for pricing issues

## Next Steps

1. Run smoke test to verify all endpoints work
2. Test debug-pricing with real groupCodes from your catalog
3. Analyze responses to identify pricing issues:
   - If `availabilityStatus: "empty"` → No dates available
   - If `pricesStatus: "empty"` → Price parsing issue (check `pricesKeys`)
   - If `pricesStatus: "error"` → May need office or auth
4. Adjust price parsing if needed based on actual API response formats
























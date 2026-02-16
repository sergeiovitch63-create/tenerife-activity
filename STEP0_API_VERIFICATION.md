# STEP 0 - API Verification Results

## Environment Variables Behavior

### fetchAtlantico() Behavior:
- **ATLANTICO_TOKEN**: Optional - if undefined, no Authorization header is sent (line 31-33 in fetch.ts)
- **ATLANTICO_OFFICE**: Currently NOT used anywhere in the codebase - needs to be added

### Current Endpoint Behavior:

1. **/api/atlantico/availability/[eventCode]/[lang]**
   - Currently expects: `?date=YYYY-MM-01`
   - Does NOT accept `?month=` parameter
   - Defaults to current month if date not provided

2. **/api/atlantico/prices/[eventCode]**
   - Accepts: `?date=YYYY-MM-DD` and `?office=` (optional)
   - Defaults to today if date not provided
   - Office parameter is passed through but not from env

3. **Price Parsing:**
   - `parseLoadPricesResponse()` handles: string pipe-separated, object with adult/child/infant, array formats
   - `normalizePriceFromRaw()` checks: priceA, priceS, priceC, price, priceV
   - **MISSING**: ADULT, CHILD, TOTAL, tariff, amount fields (need to add)

## Next Steps:
- Fix availability to accept both `date` and `month` params
- Add ATLANTICO_OFFICE support
- Enhance price parsing to check more fields
- Create debug-pricing endpoint
- Update smoke test


























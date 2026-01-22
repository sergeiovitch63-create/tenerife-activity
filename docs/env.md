# Environment Variables

This document describes all environment variables used in the Tenerife Activity project.

## Atlantico API Configuration

The Atlantico API integration requires the following environment variables:

### `ATLANTICO_BASE_URL` (Required)

**Type**: String (URL)  
**Example**: `https://api.tenerife-activity.com`

Base URL for the Atlantico API proxy server. This should point to your proxy endpoint that forwards requests to Atlantico's API.

**Note**: The proxy must have a static IP address that has been whitelisted with Atlantico. See `docs/atlantico-ip.md` for more details.

---

### `ATLANTICO_TIMEOUT_MS` (Optional)

**Type**: Number (milliseconds)  
**Default**: `10000` (10 seconds)

Maximum time to wait for an API response before timing out. If a request takes longer than this value, it will be aborted and an error will be returned.

**Recommendation**: Keep this at 10 seconds unless you have specific requirements. Longer timeouts can lead to poor user experience.

---

### `ATLANTICO_REVALIDATE_SECONDS` (Optional)

**Type**: Number (seconds)  
**Default**: `300` (5 minutes)

Cache revalidation time for Next.js API route responses. This controls how long Next.js will cache API responses before re-fetching from the Atlantico API.

**How it works**:
- Next.js will cache the response for this duration
- After the time expires, the next request will trigger a background revalidation
- Users will see cached data while fresh data is fetched in the background

**Recommendation**: 
- For frequently changing data: `60` (1 minute)
- For stable data: `300` (5 minutes) or `600` (10 minutes)
- For rarely changing data: `3600` (1 hour)

---

### `ATLANTICO_TOKEN` (Optional)

**Type**: String  
**Default**: Not used

API authentication token if required by the Atlantico API. This will be sent as a Bearer token in the `Authorization` header.

**Security**: Never commit this value to version control. Always use `.env.local` for local development and your deployment platform's environment variable settings for production.

---

### `ATLANTICO_IMAGES_BASE_URL` (Optional)

**Type**: String (URL)  
**Default**: Falls back to `ATLANTICO_BASE_URL/images` if not set

Base URL for Atlantico image assets. This is used by `buildAtlanticoImageUrl()` to construct full image URLs from filenames.

**⚠️ IMPORTANT**: The default value may not resolve (NXDOMAIN). Use `/api/debug/image-host` (DEV-only) to discover the correct base URL automatically.

**Discovery Instructions**:
1. Start dev server: `npm run dev`
2. Run diagnostic: `curl http://localhost:3000/api/debug/image-host`
3. Check the `recommendationEnvLine` in the response (or use `inferredImagesBaseUrl`)
4. Add to `.env.local`:
   ```bash
   ATLANTICO_IMAGES_BASE_URL=<value_from_recommendationEnvLine>
   ```
5. Restart dev server for changes to take effect

**Example Response**:
```json
{
  "filename": "garachico-san-miguel1.jpg",
  "extractedRawCandidates": ["garachico-san-miguel1.jpg", "..."],
  "bestUrl": "https://api.atlanticoexcursiones.com/images/garachico-san-miguel1.jpg",
  "inferredImagesBaseUrl": "https://api.atlanticoexcursiones.com/images",
  "recommendationEnvLine": "ATLANTICO_IMAGES_BASE_URL=https://api.atlanticoexcursiones.com/images",
  "hasFullUrlInRaw": false,
  "urlCandidates": [
    {
      "url": "https://api.atlanticoexcursiones.com/images/garachico-san-miguel1.jpg",
      "ok": true,
      "status": 200
    }
  ]
}
```

**Fallback behavior**: If `ATLANTICO_IMAGES_BASE_URL` is not set or empty, the system will fall back to `ATLANTICO_BASE_URL/images` (which may not work - use the discovery endpoint to find the correct value).

See `docs/image-url-fix.md` for complete troubleshooting instructions.

---

### `ATLANTICO_USER_ID` (Required for Payment)

**Type**: String  
**Default**: Not set (payment will fail if not provided)

User ID required for payment processing via Atlántico API `/payment/` endpoint. This is a mandatory parameter according to the Atlántico API documentation.

**Security**: Never commit this value to version control. Always use `.env.local` for local development and your deployment platform's environment variable settings for production.

**Example**: `ATLANTICO_USER_ID=12345`

---

### `ATLANTICO_OFFICE` (Optional)

**Type**: String  
**Default**: Empty string (not sent to API)

Office code for price loading via `loadPrices` endpoint. Some activities may require an office code to get accurate pricing.

**Example**: `ATLANTICO_OFFICE=OFFICE01`

---

### `ATLANTICO_DEFAULT_LANG` (Optional)

**Type**: String  
**Default**: `ENG`

Default language code to use when locale mapping fails or is not available. Should be a 3-letter uppercase code (ENG, ESP, DEU, FRA, etc.).

**Example**: `ATLANTICO_DEFAULT_LANG=ENG`

---

### `ATLANTICO_PAYMENT_SIMULATE` (Optional)

**Type**: Boolean (string: "true" or "false")  
**Default**: `false`

Enable simulation mode for payment testing. When set to `true`, the payment route will skip the actual Atlántico API call and return a simulated success response redirecting to the success page.

**Use cases**:
- QA testing without making real payments
- Development environment testing
- Integration testing

**Example**: `ATLANTICO_PAYMENT_SIMULATE=true`

**⚠️ IMPORTANT**: Never enable this in production. Always set to `false` or omit in production environments.

---

## Setup Instructions

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required values in `.env.local`

3. For production deployments, set these variables in your hosting platform's environment settings (Vercel, Railway, etc.)

4. Restart your development server after adding/changing environment variables:
   ```bash
   pnpm dev
   ```

---

## Validation

The application will validate the configuration when API routes are called. If `ATLANTICO_BASE_URL` is missing, you'll receive a clear error message indicating which variable needs to be set.


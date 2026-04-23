/**
 * Redsys form parser.
 *
 * Atlantico's /payment/ endpoint returns an HTML auto-submit form targeting
 * https://sis.redsys.es/sis/realizarPago with three hidden fields:
 *   - Ds_SignatureVersion
 *   - Ds_MerchantParameters (base64(JSON) with order + amount + etc.)
 *   - Ds_Signature
 *
 * This module extracts those values so we can record affiliate conversions
 * with the real booking reference (Redsys order) BEFORE piping the HTML
 * to the browser.
 *
 * All functions are defensive: any parse failure returns null — the payment
 * flow must never be blocked by a tracking issue.
 */

export interface RedsysMerchantParameters {
  DS_MERCHANT_AMOUNT?: string
  DS_MERCHANT_ORDER?: string
  DS_MERCHANT_MERCHANTCODE?: string
  DS_MERCHANT_CURRENCY?: string
  DS_MERCHANT_TRANSACTIONTYPE?: string
  DS_MERCHANT_TERMINAL?: string
  Ds_Merchant_ProductDescription?: string | null
  Ds_Merchant_MerchantData?: unknown
  DS_MERCHANT_MERCHANTURL?: string
  DS_MERCHANT_URLOK?: string
  DS_MERCHANT_URLKO?: string
  [key: string]: unknown
}

export interface ExtractedBookingData {
  /** Redsys order number (DS_MERCHANT_ORDER) — used as booking reference. */
  order: string
  /** Amount in euros (DS_MERCHANT_AMOUNT in cents, divided by 100). */
  amount: number | null
  /** Activity description (Ds_Merchant_ProductDescription), null if absent. */
  productDescription: string | null
  /** Raw decoded parameters, for logging / debugging. */
  raw: RedsysMerchantParameters
}

/**
 * Parse the hidden form fields from an HTML auto-submit page.
 * Returns an object of fieldName → value.
 */
export function parseRedsysFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!html || typeof html !== 'string') return fields

  const re = /<input[^>]*\bname=["']([^"']+)["'][^>]*\bvalue=["']([^"']*)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    fields[m[1]] = m[2]
  }
  return fields
}

/**
 * Decode the base64(JSON) content of Ds_MerchantParameters.
 * Returns null on any parse failure.
 */
export function decodeMerchantParameters(value: string | null | undefined): RedsysMerchantParameters | null {
  if (!value) return null
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8')
    const json = JSON.parse(decoded)
    if (json && typeof json === 'object') return json as RedsysMerchantParameters
    return null
  } catch {
    return null
  }
}

/**
 * End-to-end: from an HTML payment response, extract the booking data we need
 * for affiliate tracking (order ref, amount in euros, activity name).
 * Returns null if the response doesn't look like a Redsys form, or if any
 * required field is missing.
 */
export function extractBookingDataFromHtml(html: string): ExtractedBookingData | null {
  const fields = parseRedsysFormFields(html)
  const merchantParams = decodeMerchantParameters(fields['Ds_MerchantParameters'])
  if (!merchantParams) return null

  const order = typeof merchantParams.DS_MERCHANT_ORDER === 'string'
    ? merchantParams.DS_MERCHANT_ORDER.trim()
    : ''
  if (!order) return null

  const amountStr = typeof merchantParams.DS_MERCHANT_AMOUNT === 'string'
    ? merchantParams.DS_MERCHANT_AMOUNT
    : null
  const amountCents = amountStr != null && /^\d+$/.test(amountStr) ? parseInt(amountStr, 10) : null
  const amount = amountCents != null ? Math.round(amountCents) / 100 : null

  const productDescription = typeof merchantParams.Ds_Merchant_ProductDescription === 'string'
    ? merchantParams.Ds_Merchant_ProductDescription
    : null

  return {
    order,
    amount,
    productDescription,
    raw: merchantParams,
  }
}

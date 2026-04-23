/**
 * Smoke-test the Redsys parser against a real HTML sample captured from
 * https://api.tenerife-activity.com/payment/ during the Phase 2 investigation.
 *
 *   npx tsx scripts/test-redsys-parser.ts
 */

import { extractBookingDataFromHtml, parseRedsysFormFields, decodeMerchantParameters } from '../src/lib/affiliate/redsys'

const SAMPLE_HTML = `<html><head><title>Comercio Simulador</title></head>
<body bgcolor=white>
<form name="frm" action="https://sis.redsys.es/sis/realizarPago" method="POST">
<input type="hidden" name="Ds_SignatureVersion" value="HMAC_SHA256_V1"/>
<input type="hidden" name="Ds_MerchantParameters" value="eyJEU19NRVJDSEFOVF9BTU9VTlQiOiI5MDAwIiwiRFNfTUVSQ0hBTlRfT1JERVIiOiIxNzc2ODY0NjgzIiwiRFNfTUVSQ0hBTlRfTUVSQ0hBTlRDT0RFIjoiMDQ1NTY4MDc4IiwiRFNfTUVSQ0hBTlRfQ1VSUkVOQ1kiOiI5NzgiLCJEU19NRVJDSEFOVF9UUkFOU0FDVElPTlRZUEUiOiIwIiwiRFNfTUVSQ0hBTlRfVEVSTUlOQUwiOiIwMDEiLCJEc19NZXJjaGFudF9Qcm9kdWN0RGVzY3JpcHRpb24iOiJGcmVlYmlyZCAtIDMgSHJzLiIsIkRzX01lcmNoYW50X01lcmNoYW50RGF0YSI6bnVsbCwiRFNfTUVSQ0hBTlRfTUVSQ0hBTlRVUkwiOiJodHRwczpcL1wvYXBwLmF0bGFudGljb2V4Y3Vyc2lvbmVzLmNvbVwvY29uZmlybS5waHAiLCJEU19NRVJDSEFOVF9VUkxPSyI6Imh0dHBzOlwvXC9hcHAuYXRsYW50aWNvZXhjdXJzaW9uZXMuY29tXC9wcmludF90ZXJtaWNhLnBocD90b3RlbT0iLCJEU19NRVJDSEFOVF9VUkxLTyI6Imh0dHBzOlwvXC9hcHAuYXRsYW50aWNvZXhjdXJzaW9uZXMuY29tXC9jYW5jZWxhci5waHAifQ=="/>
<input type="hidden" name="Ds_Signature" value="qNusDqVB3KvL+A+PACulU7FwjDvC4o/8L0axRvngRsQ="/>
</form></body>
<script language=JavaScript>
	document.forms[0].submit();
</script>
</html>`

function assertEq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    console.error(`❌ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    process.exit(1)
  }
  console.log(`✅ ${label}: ${JSON.stringify(actual)}`)
}

console.log('--- parseRedsysFormFields ---')
const fields = parseRedsysFormFields(SAMPLE_HTML)
console.log(fields)
assertEq(fields['Ds_SignatureVersion'], 'HMAC_SHA256_V1', 'Ds_SignatureVersion')
assertEq(typeof fields['Ds_MerchantParameters'], 'string', 'Ds_MerchantParameters present')
assertEq(typeof fields['Ds_Signature'], 'string', 'Ds_Signature present')

console.log('\n--- decodeMerchantParameters ---')
const decoded = decodeMerchantParameters(fields['Ds_MerchantParameters'])
console.log(decoded)
assertEq(decoded?.DS_MERCHANT_ORDER, '1776864683', 'order')
assertEq(decoded?.DS_MERCHANT_AMOUNT, '9000', 'amount (cents, string)')

console.log('\n--- extractBookingDataFromHtml ---')
const booking = extractBookingDataFromHtml(SAMPLE_HTML)
console.log(booking)
assertEq(booking?.order, '1776864683', 'booking.order')
assertEq(booking?.amount, 90, 'booking.amount (euros)')
assertEq(booking?.productDescription, 'Freebird - 3 Hrs.', 'booking.productDescription')

console.log('\n--- edge cases ---')
assertEq(extractBookingDataFromHtml(''), null, 'empty html → null')
assertEq(extractBookingDataFromHtml('<html>junk</html>'), null, 'junk html → null')
assertEq(extractBookingDataFromHtml('-1'), null, 'error body → null')
assertEq(decodeMerchantParameters(null), null, 'null input → null')
assertEq(decodeMerchantParameters('not-base64!!!'), null, 'bad base64 → null')

console.log('\n✅ All parser checks passed.')

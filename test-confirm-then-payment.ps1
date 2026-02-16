# Test: Essayer /confirm/ puis /payment/ selon le PDF

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test: /confirm/ puis /payment/" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://api.atlanticoexcursiones.com"
$userId = "3645"
$tId = "509"
$tGroup = "55"
$language = "ENG"
$tourDate = "20260217"
$adults = "1"
$childs = "0"
$infants = "0"
$name = "Test User"
$email = "test@example.com"
$phone = "+1234567890"

Write-Host "Test 1: POST /confirm/ (sans sesTime)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$confirmBody = @{
    userId = $userId
    t_id = $tId
    t_group = $tGroup
    language = $language
    tourDate = $tourDate
    adults = $adults
    childs = $childs
    infants = $infants
    name = $name
    email = $email
    phone = $phone
}

try {
    $confirmResponse = Invoke-WebRequest -Uri "$baseUrl/confirm/" -Method POST -Body $confirmBody -ContentType "application/x-www-form-urlencoded; charset=utf-8" -UseBasicParsing
    Write-Host "Status: $($confirmResponse.StatusCode)" -ForegroundColor Green
    Write-Host "Content-Type: $($confirmResponse.Headers['Content-Type'])" -ForegroundColor Green
    Write-Host "Body (first 500 chars):" -ForegroundColor Green
    Write-Host $confirmResponse.Content.Substring(0, [Math]::Min(500, $confirmResponse.Content.Length))
    
    # Si /confirm/ retourne une référence, utiliser cette référence pour /payment/
    if ($confirmResponse.Content -match '^[A-Z0-9-]{3,50}$') {
        $reference = $confirmResponse.Content.Trim()
        Write-Host ""
        Write-Host "✅ Référence obtenue: $reference" -ForegroundColor Green
        Write-Host "Test 2: POST /payment/ avec référence" -ForegroundColor Yellow
        Write-Host "----------------------------------------" -ForegroundColor Yellow
        
        $paymentBody = $confirmBody.Clone()
        $paymentBody['reference'] = $reference
        
        try {
            $paymentResponse = Invoke-WebRequest -Uri "$baseUrl/payment/" -Method POST -Body $paymentBody -ContentType "application/x-www-form-urlencoded; charset=utf-8" -UseBasicParsing
            Write-Host "Status: $($paymentResponse.StatusCode)" -ForegroundColor Green
            Write-Host "Content-Type: $($paymentResponse.Headers['Content-Type'])" -ForegroundColor Green
            Write-Host "Body (first 500 chars):" -ForegroundColor Green
            Write-Host $paymentResponse.Content.Substring(0, [Math]::Min(500, $paymentResponse.Content.Length))
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test 3: POST /payment/ avec tous les paramètres possibles" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Essayer avec des paramètres supplémentaires qui pourraient être requis
$paymentBodyFull = @{
    userId = $userId
    t_id = $tId
    t_group = $tGroup
    language = $language
    tourDate = $tourDate
    sesTime = "00:00"
    adults = $adults
    childs = $childs
    infants = $infants
    name = $name
    email = $email
    phone = $phone
    # Paramètres optionnels qui pourraient être requis
    hotel = ""
    room = ""
    mpoint = ""
    mtime = ""
    notes = ""
}

try {
    $paymentResponse2 = Invoke-WebRequest -Uri "$baseUrl/payment/" -Method POST -Body $paymentBodyFull -ContentType "application/x-www-form-urlencoded; charset=utf-8" -UseBasicParsing
    Write-Host "Status: $($paymentResponse2.StatusCode)" -ForegroundColor Green
    Write-Host "Content-Type: $($paymentResponse2.Headers['Content-Type'])" -ForegroundColor Green
    Write-Host "Body (first 500 chars):" -ForegroundColor Green
    Write-Host $paymentResponse2.Content.Substring(0, [Math]::Min(500, $paymentResponse2.Content.Length))
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Tests terminés" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan




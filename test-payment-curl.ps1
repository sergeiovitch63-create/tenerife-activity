# Script PowerShell pour tester directement l'API Atlantico /payment/

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test direct API Atlantico /payment/" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "https://api.atlanticoexcursiones.com"
$userId = "3645"
$tId = "509"
$tGroup = "55"
$language = "ENG"
# Calculer le prochain mardi (selon wdays: [0, 2, 0, 4, 0, 6, 0] = Mardi, Jeudi, Samedi)
$today = Get-Date
$nextTuesday = $today
while ($nextTuesday.DayOfWeek -ne 'Tuesday') {
    $nextTuesday = $nextTuesday.AddDays(1)
}
$tourDate = $nextTuesday.ToString("yyyyMMdd")
Write-Host "Date utilisée (prochain mardi): $tourDate" -ForegroundColor Cyan
Write-Host ""
$adults = "1"
$childs = "0"
$infants = "0"
$name = "Test User"
$email = "test@example.com"
$phone = "+1234567890"

Write-Host "Test 1: Sans sesTime (wdays_only mode)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$body1 = @{
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
    $response1 = Invoke-WebRequest -Uri "$baseUrl/payment/" -Method POST -Body $body1 -ContentType "application/x-www-form-urlencoded; charset=utf-8" -UseBasicParsing
    Write-Host "Status: $($response1.StatusCode)" -ForegroundColor Green
    Write-Host "Content-Type: $($response1.Headers['Content-Type'])" -ForegroundColor Green
    Write-Host "Body (first 500 chars):" -ForegroundColor Green
    Write-Host $response1.Content.Substring(0, [Math]::Min(500, $response1.Content.Length))
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test 2: Avec sesTime=00:00" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$body2 = $body1.Clone()
$body2['sesTime'] = "00:00"

try {
    $response2 = Invoke-WebRequest -Uri "$baseUrl/payment/" -Method POST -Body $body2 -ContentType "application/x-www-form-urlencoded; charset=utf-8" -UseBasicParsing
    Write-Host "Status: $($response2.StatusCode)" -ForegroundColor Green
    Write-Host "Content-Type: $($response2.Headers['Content-Type'])" -ForegroundColor Green
    Write-Host "Body (first 500 chars):" -ForegroundColor Green
    Write-Host $response2.Content.Substring(0, [Math]::Min(500, $response2.Content.Length))
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test 3: Avec date au format YYYY-MM-DD" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$body3 = $body1.Clone()
$body3['tourDate'] = "2026-02-17"

try {
    $response3 = Invoke-WebRequest -Uri "$baseUrl/payment/" -Method POST -Body $body3 -ContentType "application/x-www-form-urlencoded; charset=utf-8" -UseBasicParsing
    Write-Host "Status: $($response3.StatusCode)" -ForegroundColor Green
    Write-Host "Content-Type: $($response3.Headers['Content-Type'])" -ForegroundColor Green
    Write-Host "Body (first 500 chars):" -ForegroundColor Green
    Write-Host $response3.Content.Substring(0, [Math]::Min(500, $response3.Content.Length))
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test 4: Vérifier eventDetails pour obtenir le bon t_group" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

try {
    $eventResponse = Invoke-WebRequest -Uri "$baseUrl/eventDetails/$tId/$language" -Method GET -UseBasicParsing
    $eventData = $eventResponse.Content | ConvertFrom-Json
    Write-Host "EventDetails récupéré:" -ForegroundColor Green
    Write-Host "  group: $($eventData.group)" -ForegroundColor Green
    Write-Host "  groups: $($eventData.groups)" -ForegroundColor Green
    Write-Host "  groupId: $($eventData.groupId)" -ForegroundColor Green
    Write-Host "  t_group: $($eventData.t_group)" -ForegroundColor Green
    
    # Essayer avec le t_group depuis eventDetails
    $correctTGroup = $eventData.group -or $eventData.groups -or $eventData.groupId -or $eventData.t_group
    if ($correctTGroup -and $correctTGroup -ne $tGroup) {
        Write-Host ""
        Write-Host "Test 5: Avec t_group corrigé depuis eventDetails: $correctTGroup" -ForegroundColor Yellow
        Write-Host "----------------------------------------" -ForegroundColor Yellow
        
        $body5 = $body1.Clone()
        $body5['t_group'] = $correctTGroup
        
        try {
            $response5 = Invoke-WebRequest -Uri "$baseUrl/payment/" -Method POST -Body $body5 -ContentType "application/x-www-form-urlencoded; charset=utf-8" -UseBasicParsing
            Write-Host "Status: $($response5.StatusCode)" -ForegroundColor Green
            Write-Host "Content-Type: $($response5.Headers['Content-Type'])" -ForegroundColor Green
            Write-Host "Body (first 500 chars):" -ForegroundColor Green
            Write-Host $response5.Content.Substring(0, [Math]::Min(500, $response5.Content.Length))
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response: $responseBody" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "Error fetching eventDetails: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 6: Vérifier groupDetails pour confirmer t_id dans le groupe" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

try {
    $groupResponse = Invoke-WebRequest -Uri "$baseUrl/groupDetails/$tGroup/$language" -Method GET -UseBasicParsing
    $groupData = $groupResponse.Content | ConvertFrom-Json
    Write-Host "GroupDetails récupéré:" -ForegroundColor Green
    Write-Host "  ids: $($groupData.ids)" -ForegroundColor Green
    
    $ids = $groupData.ids
    if ($ids) {
        $idsArray = if ($ids -is [array]) { $ids } else { $ids.ToString().Split(',') }
        $containsTId = $idsArray -contains $tId
        Write-Host "  Contient t_id $tId : $containsTId" -ForegroundColor $(if ($containsTId) { "Green" } else { "Red" })
        
        if (-not $containsTId) {
            Write-Host "  ⚠️ t_id $tId n'est PAS dans ce groupe!" -ForegroundColor Red
            Write-Host "  IDs disponibles: $($idsArray -join ', ')" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Error fetching groupDetails: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 7: Vérifier la disponibilité de la date" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

try {
    $monthStart = "2026-02-01"
    $limitsResponse = Invoke-WebRequest -Uri "$baseUrl/loadLimits/$tId/$($language.ToLower())/$monthStart" -Method GET -UseBasicParsing
    $limitsData = $limitsResponse.Content | ConvertFrom-Json
    Write-Host "Limits récupéré:" -ForegroundColor Green
    Write-Host "  dates.date: $($limitsData.dates.date -join ', ')" -ForegroundColor Green
    Write-Host "  availableDates: $($limitsData.availableDates -join ', ')" -ForegroundColor Green
    
    $dateInList = $limitsData.dates.date -contains $tourDate -or $limitsData.availableDates -contains $tourDate -or $limitsData.availableDates -contains "2026-02-17"
    Write-Host "  Date $tourDate disponible: $dateInList" -ForegroundColor $(if ($dateInList) { "Green" } else { "Red" })
} catch {
    Write-Host "Error fetching limits: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Tests terminés" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Si tous les tests retournent -1, le problème pourrait être:" -ForegroundColor Yellow
Write-Host "   1. userId 3645 n'est pas autorisé ou n'a pas les permissions" -ForegroundColor Yellow
Write-Host "   2. La date n'est pas vraiment disponible (même si dans availableDates)" -ForegroundColor Yellow
Write-Host "   3. L'événement nécessite une réservation préalable ou confirmation" -ForegroundColor Yellow
Write-Host "   4. Problème de quota ou limite pour ce userId" -ForegroundColor Yellow
Write-Host "   5. L'API nécessite un paramètre supplémentaire non documenté" -ForegroundColor Yellow


$uri = "https://fsgxoaocntphqnrzuhqe.supabase.co/functions/v1/park-stats/103b494e-fc3c-40c9-a71a-1cf5d9ad09f4?season=1"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZ3hvYW9jbnRwaHFucnp1aHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMjEzMjgsImV4cCI6MjA4MTU5NzMyOH0.iw45a-XL3KdRKHoW0VZNHNuFACdq0RXWt9YK0HWgaB4"

$headers = @{
    "Authorization" = "Bearer $anonKey"
    "apikey" = $anonKey
}

Write-Host "Testing Edge Function..." -ForegroundColor Cyan
Write-Host "UUID: 103b494e-fc3c-40c9-a71a-1cf5d9ad09f4 (Tymandu)`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "`nPlayer Stats:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
    Write-Host "`n=== Calculated Averages ===" -ForegroundColor Cyan
    $ppg = $response.points / [Math]::Max($response.games_played, 1)
    $apg = $response.assists / [Math]::Max($response.games_played, 1)
    $rpg = $response.rebounds / [Math]::Max($response.games_played, 1)
    $winPct = ($response.wins / [Math]::Max($response.games_played, 1)) * 100
    
    Write-Host "PPG: $([Math]::Round($ppg, 1))"
    Write-Host "APG: $([Math]::Round($apg, 1))"
    Write-Host "RPG: $([Math]::Round($rpg, 1))"
    Write-Host "Win%: $([Math]::Round($winPct, 1))%"
    Write-Host "Record: $($response.wins)-$($response.losses)" -ForegroundColor Yellow
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails -ForegroundColor Red
    }
}

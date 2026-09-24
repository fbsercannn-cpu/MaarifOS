# activate-hosts.ps1 — MaarifOS 0.70.0
# Bu script Windows hosts dosyasına maarifos.com ve maarifos.net yönlendirmelerini ekler.

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$marker = "# MaarifOS Live Domain Mapping"
$entries = @"

$marker
185.199.108.153 maarifos.com
185.199.108.153 www.maarifos.com
185.199.108.153 maarifos.net
185.199.108.153 www.maarifos.net
"@

try {
    $current = Get-Content $hostsPath -Raw -ErrorAction Stop
    if ($current -notmatch [regex]::Escape($marker)) {
        Add-Content -Path $hostsPath -Value $entries -Encoding utf8 -ErrorAction Stop
        Write-Host "✓ Hosts dosyasına maarifos.com ve maarifos.net kayıtları eklendi." -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Hosts dosyasında maarifos.com kayıtları zaten mevcut." -ForegroundColor Cyan
    }
    Clear-DnsClientCache
    ipconfig /flushdns
    Write-Host "✅ DNS önbelleği temizlendi. Tarayıcınızda www.maarifos.com hemen açılacaktır!" -ForegroundColor Green
} catch {
    Write-Error "Yönetici yetkisi gerekiyor: $_"
    exit 1
}

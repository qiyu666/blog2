$baseUrl = "https://viarotel.eu.org"
$basePath = "C:\Users\qiyu\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a641c34aeff9643835af5d6\viarotel-docs"

$visited = @{}
$queue = New-Object System.Collections.Queue

function Add-Url($url) {
    $url = $url -replace '#.*$', ''
    $url = $url -replace '\?.*$', ''
    if ($url -eq "" -or $url -eq "/") { return }
    if ($visited.ContainsKey($url)) { return }
    if ($url -match "^(/assets/|/images/|/vp-|/zhHans/)") {
        $visited[$url] = $false
        $queue.Enqueue($url)
    }
}

function Get-LocalPath($relativeUrl) {
    $path = $relativeUrl -replace '^/', ''
    $fullPath = Join-Path $basePath $path

    if ($relativeUrl -match '\.(css|js|html|htm|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|webp|bmp)$') {
        return $fullPath
    }
    if ($relativeUrl.EndsWith("/")) {
        return Join-Path $fullPath "index.html"
    }
    return $fullPath + ".html"
}

function Download-Resource($relativeUrl) {
    if ($visited[$relativeUrl] -eq $true) { return }
    $visited[$relativeUrl] = $true

    $fullUrl = $baseUrl + $relativeUrl
    $localPath = Get-LocalPath $relativeUrl
    $dir = Split-Path $localPath -Parent

    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    try {
        $response = Invoke-WebRequest -Uri $fullUrl -UseBasicParsing -TimeoutSec 30 -MaximumRedirection 5
        $content = $response.Content
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)

        [System.IO.File]::WriteAllBytes($localPath, $bytes)
        $size = [math]::Round($bytes.Length / 1024, 1)
        Write-Output "  OK $relativeUrl ($size KB)"

        if ($relativeUrl -match '\.(html|htm)$' -or $relativeUrl -match '/$' -or $relativeUrl -match '^/zhHans/') {
            Extract-FromHtml $content
        }
        if ($relativeUrl -match '\.css$') {
            Extract-FromCss $content
        }
        if ($relativeUrl -match '\.js$') {
            Extract-FromJs $content
        }
    } catch {
        Write-Output "  FAIL $relativeUrl - $($_.Exception.Message)"
    }
}

function Extract-FromHtml($html) {
    $rx1 = 'href="(/[^"]+)"'
    $rx2 = 'src="(/[^"]+)"'
    foreach ($rx in @($rx1, $rx2)) {
        [regex]::Matches($html, $rx) | ForEach-Object {
            Add-Url $_.Groups[1].Value
        }
    }
}

function Extract-FromCss($css) {
    $rx = "url\(['""]" + '(/[^' + "'" + '"' + ']+)' + "['""]\)"
    [regex]::Matches($css, $rx) | ForEach-Object {
        Add-Url $_.Groups[1].Value
    }
}

function Extract-FromJs($js) {
    $rx1 = '["' + "'" + '](/assets/[^' + "'" + '"' + ']+\.(?:js|css|woff2|png|jpg|svg))["' + "'" + ']'
    $rx2 = '["' + "'" + '](/images/[^' + "'" + '"' + ']+)["' + "'" + ']'

    foreach ($rx in @($rx1, $rx2)) {
        [regex]::Matches($js, $rx) | ForEach-Object {
            Add-Url $_.Groups[1].Value
        }
    }
}

Write-Output "=== Crawling $baseUrl/zhHans/ ==="
Write-Output "Output: $basePath"
Write-Output ""

Add-Url "/zhHans/"
Add-Url "/zhHans/guide"
Add-Url "/zhHans/guide/started"
Add-Url "/zhHans/guide/milestones"
Add-Url "/zhHans/guide/window-arrangement"
Add-Url "/zhHans/help"
Add-Url "/zhHans/help/escrcpy"
Add-Url "/zhHans/help/scrcpy"
Add-Url "/zhHans/reference"
Add-Url "/zhHans/reference/scrcpy"
Add-Url "/zhHans/reference/gnirehtet"
Add-Url "/zhHans/changelog"
Add-Url "/zhHans/contact"
Add-Url "/zhHans/donate"

$count = 0
while ($queue.Count -gt 0) {
    $url = $queue.Dequeue()
    $count++
    Write-Output "[$count / $($queue.Count + $count)] $url"
    Download-Resource $url
}

Write-Output ""
Write-Output "=== Done ==="
Write-Output "Total downloaded: $count files"
$totalSize = (Get-ChildItem -Path $basePath -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Output "Total size: $([math]::Round($totalSize / 1024 / 1024, 2)) MB"
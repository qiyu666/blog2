param(
    [int]$StartIndex = 0
)

$ErrorActionPreference = "Stop"

$repoOwner = "qiyu666"
$repoName = "blog2"
$branch = "main"
$commitMessage = "feat: initial commit - full blog project"

$rootDir = $PSScriptRoot
$filesJson = Get-Content -Path (Join-Path $rootDir "_files.json") -Raw
$allFiles = $filesJson | ConvertFrom-Json

$blobsFile = Join-Path $rootDir "_blobs.json"
$blobMap = @{}

if (Test-Path $blobsFile) {
    $blobMap = Get-Content $blobsFile -Raw | ConvertFrom-Json -AsHashtable
    Write-Host "Resuming from saved blobs: $($blobMap.Count) already created`n"
}

$headers = @{
    "Authorization" = "token $env:GH_TOKEN"
    "User-Agent" = "blog-uploader"
    "Accept" = "application/vnd.github.v3+json"
}

function New-Blob {
    param([string]$Content)
    
    $body = @{
        content = $Content
        encoding = "base64"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/git/blobs" `
        -Headers $headers -Method Post -Body $body
    
    return $response.sha
}

function New-Tree {
    param($TreeEntries)
    
    $body = @{
        tree = $TreeEntries
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/git/trees" `
        -Headers $headers -Method Post -Body $body
    
    return $response.sha
}

function New-Commit {
    param([string]$Message, [string]$TreeSha, [string]$ParentSha = $null)
    
    $body = @{
        message = $Message
        tree = $TreeSha
    }
    
    if ($ParentSha) {
        $body.parents = @($ParentSha)
    }
    
    $bodyJson = $body | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/git/commits" `
        -Headers $headers -Method Post -Body $bodyJson
    
    return $response.sha
}

function Update-Ref {
    param([string]$CommitSha)
    
    $body = @{
        sha = $CommitSha
        force = $true
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/git/refs/heads/$branch" `
        -Headers $headers -Method Patch -Body $body | Out-Null
}

Write-Host "Creating clean commit with $($allFiles.Count) files...`n"

Write-Host "Step 1: Creating blobs..."
$treeEntries = @()

for ($i = $StartIndex; $i -lt $allFiles.Count; $i++) {
    $filePath = $allFiles[$i]
    Write-Host "  [$($i + 1)/$($allFiles.Count)] $filePath ... " -NoNewline
    
    if ($blobMap.ContainsKey($filePath)) {
        $treeEntries += @{
            path = $filePath
            mode = "100644"
            type = "blob"
            sha = $blobMap[$filePath]
        }
        Write-Host "✓ (cached)"
        continue
    }
    
    try {
        $fullPath = Join-Path $rootDir $filePath
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $content = [System.Convert]::ToBase64String($bytes)
        
        $sha = New-Blob -Content $content
        $blobMap[$filePath] = $sha
        
        $treeEntries += @{
            path = $filePath
            mode = "100644"
            type = "blob"
            sha = $sha
        }
        
        $blobMap | ConvertTo-Json -Depth 10 | Set-Content $blobsFile
        Write-Host "✓"
    }
    catch {
        Write-Host "✗"
        Write-Host "    Error: $_"
        $blobMap | ConvertTo-Json -Depth 10 | Set-Content $blobsFile
        Write-Host "`nProgress saved. $($blobMap.Count)/$($allFiles.Count) blobs created."
        Write-Host "Run again with -StartIndex $i to continue."
        exit 1
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host "`nStep 2: Creating tree..."
$treeSha = New-Tree -TreeEntries $treeEntries
Write-Host "  Tree SHA: $treeSha"

Write-Host "`nStep 3: Creating commit..."
$commitSha = New-Commit -Message $commitMessage -TreeSha $treeSha
Write-Host "  Commit SHA: $commitSha"

Write-Host "`nStep 4: Updating branch..."
Update-Ref -CommitSha $commitSha
Write-Host "  Branch $branch updated"

if (Test-Path $blobsFile) {
    Remove-Item $blobsFile -Force
}

Write-Host "`n========================================"
Write-Host "✓ Clean commit created successfully!"
Write-Host "========================================"
Write-Host "Repository: https://github.com/$repoOwner/$repoName"
Write-Host "Branch: $branch"
Write-Host "Total files: $($allFiles.Count)"
Write-Host "Commit message: $commitMessage"

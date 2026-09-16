[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Release-ComObject {
    param([object]$Value)
    if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
    }
}

function Assert-Deadline {
    if ([DateTime]::UtcNow -ge $script:deadlineUtc) {
        throw 'Word sayfa render işlemi 80 saniyelik iç zaman sınırını aştı.'
    }
}

function Update-AllWordFields {
    param([Parameter(Mandatory = $true)][object]$Document)

    $updatedFieldCount = 0
    $storyRanges = $null
    try {
        $storyRanges = $Document.StoryRanges
        foreach ($storyRoot in @($storyRanges)) {
            $storyRange = $storyRoot
            while ($null -ne $storyRange) {
                $nextStoryRange = $null
                $fields = $null
                try {
                    $fields = $storyRange.Fields
                    $updatedFieldCount += [int]$fields.Count
                    if ($fields.Count -gt 0) { [void]$fields.Update() }
                    $nextStoryRange = $storyRange.NextStoryRange
                }
                finally {
                    Release-ComObject $fields
                    Release-ComObject $storyRange
                }
                $storyRange = $nextStoryRange
            }
        }
    }
    finally {
        Release-ComObject $storyRanges
    }

    # Word sometimes omits unlinked header/footer stories from StoryRanges.
    foreach ($section in @($Document.Sections)) {
        foreach ($header in @($section.Headers)) {
            $fields = $null
            try {
                if ($header.Exists) {
                    $fields = $header.Range.Fields
                    $updatedFieldCount += [int]$fields.Count
                    if ($fields.Count -gt 0) { [void]$fields.Update() }
                }
            }
            finally {
                Release-ComObject $fields
                Release-ComObject $header
            }
        }
        foreach ($footer in @($section.Footers)) {
            $fields = $null
            try {
                if ($footer.Exists) {
                    $fields = $footer.Range.Fields
                    $updatedFieldCount += [int]$fields.Count
                    if ($fields.Count -gt 0) { [void]$fields.Update() }
                }
            }
            finally {
                Release-ComObject $fields
                Release-ComObject $footer
            }
        }
        Release-ComObject $section
    }

    return $updatedFieldCount
}

function Get-RangeFontSample {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][object]$Range,
        [string]$Source
    )

    $font = $null
    $listFormat = $null
    try {
        $font = $Range.Font
        $listFormat = $Range.ListFormat
        $text = ([string]$Range.Text -replace '[\r\x07]+$', '').Trim()
        if ($text.Length -gt 160) { $text = $text.Substring(0, 160) }
        return [ordered]@{
            label = $Label
            source = $Source
            text = $text
            page = [int]$Range.Information(3)
            bold = [int]$font.Bold
            fontName = [string]$font.Name
            fontSize = [single]$font.Size
            listType = [int]$listFormat.ListType
            listString = [string]$listFormat.ListString
        }
    }
    finally {
        Release-ComObject $listFormat
        Release-ComObject $font
    }
}

function Get-DocumentFontSamples {
    param(
        [Parameter(Mandatory = $true)][object]$Document,
        [string[]]$SentinelNames
    )

    $samples = @()
    $paragraphs = $null
    try {
        $paragraphs = $Document.Paragraphs
        if ($paragraphs.Count -ge 3) {
            $paragraph = $null
            $range = $null
            try {
                $paragraph = $paragraphs.Item(3)
                $range = $paragraph.Range
                $samples += Get-RangeFontSample -Label 'paragraph-3' -Source 'Document.Paragraphs.Item(3).Range' -Range $range
            }
            finally {
                Release-ComObject $range
                Release-ComObject $paragraph
            }
        }

        for ($index = 1; $index -le $paragraphs.Count; $index++) {
            $paragraph = $null
            $range = $null
            $listFormat = $null
            try {
                $paragraph = $paragraphs.Item($index)
                $range = $paragraph.Range
                $listFormat = $range.ListFormat
                if ([int]$listFormat.ListType -ne 0) {
                    $samples += Get-RangeFontSample -Label 'first-list-item' -Source "Document.Paragraphs.Item($index).Range" -Range $range
                    break
                }
            }
            finally {
                Release-ComObject $listFormat
                Release-ComObject $range
                Release-ComObject $paragraph
            }
        }
    }
    finally {
        Release-ComObject $paragraphs
    }

    $preferredSentinels = @($SentinelNames | Where-Object { $_ -eq 'SENTINEL_KEEP_BODY' })
    if ($preferredSentinels.Count -gt 0) {
        $preferredSentinel = $preferredSentinels[0]
    }
    elseif ($SentinelNames.Count -gt 0) {
        $preferredSentinel = $SentinelNames[0]
    }
    else {
        $preferredSentinel = $null
    }
    if (-not [string]::IsNullOrWhiteSpace($preferredSentinel)) {
        $range = $null
        $find = $null
        try {
            $range = $Document.Content.Duplicate
            $find = $range.Find
            $find.ClearFormatting()
            $find.Text = $preferredSentinel
            if ([bool]$find.Execute()) {
                $samples += Get-RangeFontSample -Label 'sentinel-body' -Source $preferredSentinel -Range $range
            }
        }
        finally {
            Release-ComObject $find
            Release-ComObject $range
        }
    }

    return @($samples)
}

function Get-FooterFieldResults {
    param([Parameter(Mandatory = $true)][object]$Document)

    $results = @()
    $sectionIndex = 0
    foreach ($section in @($Document.Sections)) {
        $sectionIndex++
        $footerIndex = 0
        foreach ($footer in @($section.Footers)) {
            $footerIndex++
            $fields = $null
            try {
                if ($footer.Exists) {
                    $fields = $footer.Range.Fields
                    for ($fieldIndex = 1; $fieldIndex -le $fields.Count; $fieldIndex++) {
                        $field = $null
                        $codeRange = $null
                        $resultRange = $null
                        try {
                            $field = $fields.Item($fieldIndex)
                            $codeRange = $field.Code
                            $resultRange = $field.Result
                            $results += [ordered]@{
                                section = $sectionIndex
                                footer = $footerIndex
                                field = $fieldIndex
                                type = [int]$field.Type
                                code = ([string]$codeRange.Text).Trim()
                                result = (([string]$resultRange.Text -replace '[\r\x07]+$', '')).Trim()
                            }
                        }
                        finally {
                            Release-ComObject $resultRange
                            Release-ComObject $codeRange
                            Release-ComObject $field
                        }
                    }
                }
            }
            finally {
                Release-ComObject $fields
                Release-ComObject $footer
            }
        }
        Release-ComObject $section
    }
    return @($results)
}

function Save-EmfPageAsPng {
    param(
        [Parameter(Mandatory = $true)]
        [byte[]]$EmfBytes,

        [Parameter(Mandatory = $true)]
        [string]$PngPath
    )

    if ($EmfBytes.Length -eq 0) {
        throw 'Word boş EnhMetaFileBits döndürdü.'
    }

    $stream = $null
    $metafile = $null
    $bitmap = $null
    $graphics = $null
    try {
        $stream = [IO.MemoryStream]::new($EmfBytes, $false)
        $metafile = [Drawing.Imaging.Metafile]::new($stream)
        $scale = 2400.0 / [Math]::Max($metafile.Width, $metafile.Height)
        $width = [Math]::Max(1, [int][Math]::Round($metafile.Width * $scale))
        $height = [Math]::Max(1, [int][Math]::Round($metafile.Height * $scale))
        try {
            $bitmap = [Drawing.Bitmap]::new(
                $width,
                $height,
                [Drawing.Imaging.PixelFormat]::Format32bppArgb
            )
        }
        catch {
            throw "EMF bitmap oluşturulamadı (EMF=$($metafile.Width)x$($metafile.Height), PNG=${width}x${height}, bayt=$($EmfBytes.Length)): $($_.Exception.Message)"
        }
        $bitmap.SetResolution(192.0, 192.0)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([Drawing.Color]::White)
        $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($metafile, 0, 0, $width, $height)
        $bitmap.Save($PngPath, [Drawing.Imaging.ImageFormat]::Png)
        return [ordered]@{ width = $width; height = $height }
    }
    finally {
        if ($null -ne $graphics) { $graphics.Dispose() }
        if ($null -ne $bitmap) { $bitmap.Dispose() }
        if ($null -ne $metafile) { $metafile.Dispose() }
        if ($null -ne $stream) { $stream.Dispose() }
    }
}

$inputFile = (Resolve-Path -LiteralPath $InputPath -ErrorAction Stop).ProviderPath
if ([IO.Path]::GetExtension($inputFile) -ne '.docx') {
    throw 'InputPath bir .docx dosyasını göstermelidir.'
}

$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
[void][IO.Directory]::CreateDirectory($outputRoot)
$stem = [IO.Path]::GetFileNameWithoutExtension($inputFile)
$receiptPath = Join-Path $outputRoot ($stem + '-word-pages.json')
$pidPath = Join-Path $outputRoot ($stem + '-word-pages.pid')
$script:deadlineUtc = [DateTime]::UtcNow.AddSeconds(80)

$result = [ordered]@{
    schemaVersion = 1
    version = $null
    inputPath = $inputFile
    inputBytes = [long](Get-Item -LiteralPath $inputFile).Length
    outputDirectory = $outputRoot
    startedAt = [DateTime]::UtcNow.ToString('o')
    finishedAt = $null
    wordPid = $null
    pidFile = [IO.Path]::GetFileName($pidPath)
    readOnly = $null
    pages = 0
    warmupPages = 0
    paginationCounts = @()
    fieldUpdatePasses = @()
    sentinelPages = [ordered]@{}
    boldValueMeaning = [ordered]@{ '-1' = 'true'; '0' = 'false'; '9999999' = 'mixed' }
    fontSamples = @()
    footerFields = @()
    renderedFiles = @()
    bytes = [long]0
    errors = @()
}

function Write-Receipt {
    $json = $result | ConvertTo-Json -Depth 10
    $tempPath = $receiptPath + '.' + $PID + '.tmp'
    $retryDelays = @(50, 100, 200)
    for ($attempt = 0; $attempt -le $retryDelays.Count; $attempt++) {
        try {
            [IO.File]::WriteAllText($tempPath, $json, [Text.UTF8Encoding]::new($true))
            if ([IO.File]::Exists($receiptPath)) {
                [IO.File]::Replace($tempPath, $receiptPath, [NullString]::Value, $true)
            }
            else {
                [IO.File]::Move($tempPath, $receiptPath)
            }
            return
        }
        catch {
            if ($attempt -ge $retryDelays.Count) { throw }
            Start-Sleep -Milliseconds $retryDelays[$attempt]
        }
        finally {
            if ([IO.File]::Exists($tempPath)) {
                [IO.File]::Delete($tempPath)
            }
        }
    }
}

$existingWordPids = @(
    Get-Process -Name WINWORD -ErrorAction SilentlyContinue |
        ForEach-Object { [int]$_.Id }
)
$word = $null
$document = $null
$window = $null
$view = $null
$panes = $null
$pane = $null
$pages = $null
$ownedWordPid = $null
$ownedWordStartTimeUtc = $null
$ownsWordProcess = $false
$wordStartedByScript = $false

try {
    Assert-Deadline
    $word = New-Object -ComObject Word.Application
    $wordStartedByScript = $true
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.Options.SaveNormalPrompt = $false
    $word.Options.Pagination = $true

    $newWordProcesses = @()
    for ($attempt = 0; $attempt -lt 20 -and $newWordProcesses.Count -eq 0; $attempt++) {
        $newWordProcesses = @(
            Get-Process -Name WINWORD -ErrorAction SilentlyContinue |
                Where-Object { $_.Id -notin $existingWordPids } |
                Sort-Object StartTime -Descending
        )
        if ($newWordProcesses.Count -eq 0) {
            Start-Sleep -Milliseconds 100
        }
    }
    if ($newWordProcesses.Count -ne 1) {
        throw 'Yeni ve bağımsız WINWORD süreci doğrulanamadı; mevcut Office süreçlerine dokunulmadı.'
    }

    $ownedProcess = $newWordProcesses[0]
    $ownedWordPid = [int]$ownedProcess.Id
    $ownedWordStartTimeUtc = $ownedProcess.StartTime.ToUniversalTime()
    $ownsWordProcess = $true
    [string]$ownedWordPid | Set-Content -LiteralPath $pidPath -Encoding ascii
    $result.wordPid = $ownedWordPid
    $result.version = [string]$word.Version
    Write-Receipt

    Assert-Deadline
    $document = $word.Documents.Open($inputFile, $false, $true, $false)
    $result.readOnly = [bool]$document.ReadOnly

    $window = $document.ActiveWindow
    $view = $window.View
    $view.Type = 3
    $view.SeekView = 0

    # Pagination must settle before NUMPAGES is updated. A second identical
    # page count proves that updating fields did not move content again.
    [void]$document.Repaginate()
    $result.paginationCounts += [int]$document.ComputeStatistics(2)
    $result.fieldUpdatePasses += Update-AllWordFields -Document $document
    [void]$document.Repaginate()
    $result.paginationCounts += [int]$document.ComputeStatistics(2)
    if ($result.paginationCounts[-1] -ne $result.paginationCounts[-2]) {
        throw "Alan güncellemesinden sonra sayfa sayısı sabitlenmedi: $($result.paginationCounts -join ', ')"
    }

    # Pages.Item(...).EnhMetaFileBits lazily materializes Word's page cache.
    # Warm every page once, then refresh NUMPAGES and repaginate before keeping
    # any PNG; otherwise early pages can retain an intermediate total.
    $warmPanes = $null
    $warmPane = $null
    $warmPages = $null
    try {
        $warmPanes = $document.ActiveWindow.Panes
        $warmPane = $warmPanes.Item(1)
        $warmPages = $warmPane.Pages
        for ($warmPageNumber = 1; $warmPageNumber -le $warmPages.Count; $warmPageNumber++) {
            Assert-Deadline
            $warmPage = $null
            try {
                $warmPage = $warmPages.Item($warmPageNumber)
                [byte[]]$warmBytes = $warmPage.EnhMetaFileBits
                if ($warmBytes.Length -eq 0) { throw "Word sayfa $warmPageNumber için boş önizleme döndürdü." }
                $result.warmupPages++
            }
            finally {
                Release-ComObject $warmPage
            }
        }
    }
    finally {
        Release-ComObject $warmPages
        Release-ComObject $warmPane
        Release-ComObject $warmPanes
    }
    $result.fieldUpdatePasses += Update-AllWordFields -Document $document
    [void]$document.Repaginate()
    $result.paginationCounts += [int]$document.ComputeStatistics(2)
    if ($result.paginationCounts[-1] -ne $result.paginationCounts[-2]) {
        throw "Sayfa önbelleği ısıtıldıktan sonra sayfa sayısı sabitlenmedi: $($result.paginationCounts -join ', ')"
    }
    try { [void]$word.ScreenRefresh() } catch {}

    $contentText = [string]$document.Content.Text
    $sentinelNames = @(
        [regex]::Matches(
            $contentText,
            '(?:SENTINEL_[^\s\x07\r\n]+|WORD_LAYOUT_SON|EK18_[^\s\x07\r\n]+)'
        ) |
            ForEach-Object { $_.Value.TrimEnd('.', ',', ';', ':', ')', ']') } |
            Sort-Object -Unique
    )
    foreach ($sentinel in $sentinelNames) {
        Assert-Deadline
        $range = $null
        $find = $null
        try {
            $range = $document.Content.Duplicate
            $find = $range.Find
            $find.ClearFormatting()
            $find.Text = $sentinel
            $found = [bool]$find.Execute()
            $result.sentinelPages[$sentinel] = if ($found) {
                [int]$range.Information(3)
            }
            else {
                $null
            }
        }
        finally {
            Release-ComObject $find
            Release-ComObject $range
        }
    }

    $result.fontSamples = @(Get-DocumentFontSamples -Document $document -SentinelNames $sentinelNames)
    $result.footerFields = @(Get-FooterFieldResults -Document $document)

    $panes = $document.ActiveWindow.Panes
    $pane = $panes.Item(1)
    $pages = $pane.Pages
    $computedPageCount = [int]$document.ComputeStatistics(2)
    $pageCount = [int]$pages.Count
    if ($computedPageCount -ne $pageCount) {
        $result.errors += [ordered]@{
            stage = 'page-count'
            message = "ComputeStatistics=$computedPageCount, ActiveWindow.Pages=$pageCount"
        }
    }
    $result.pages = $pageCount

    for ($pageNumber = 1; $pageNumber -le $pageCount; $pageNumber++) {
        Assert-Deadline
        $page = $null
        try {
            $page = $pages.Item($pageNumber)
            [byte[]]$emfBytes = $page.EnhMetaFileBits
            $pngName = '{0}-page-{1:D3}.png' -f $stem, $pageNumber
            $pngPath = Join-Path $outputRoot $pngName
            $dimensions = Save-EmfPageAsPng -EmfBytes $emfBytes -PngPath $pngPath
            $pngBytes = [long](Get-Item -LiteralPath $pngPath).Length
            $sentinelsOnPage = @(
                $result.sentinelPages.Keys |
                    Where-Object { $result.sentinelPages[$_] -eq $pageNumber }
            )
            $reasons = @('all')
            if ($pageNumber -eq 1) { $reasons += 'first' }
            if ($pageNumber -eq $pageCount) { $reasons += 'last' }
            if ($sentinelsOnPage.Count -gt 0) { $reasons += 'sentinel' }
            $result.renderedFiles += [ordered]@{
                page = $pageNumber
                file = $pngName
                bytes = $pngBytes
                width = $dimensions.width
                height = $dimensions.height
                reasons = $reasons
                sentinels = $sentinelsOnPage
            }
            $result.bytes += $pngBytes
        }
        catch {
            $result.errors += [ordered]@{
                stage = 'render-page'
                page = $pageNumber
                message = $_.Exception.Message
            }
        }
        finally {
            Release-ComObject $page
        }
    }
}
catch {
    $result.errors += [ordered]@{
        stage = 'fatal'
        message = $_.Exception.Message
    }
}
finally {
    Release-ComObject $pages
    Release-ComObject $pane
    Release-ComObject $panes
    Release-ComObject $view
    Release-ComObject $window

    if ($null -ne $document) {
        try { $document.Close($false) }
        catch {
            $result.errors += [ordered]@{ stage = 'document-close'; message = $_.Exception.Message }
        }
        Release-ComObject $document
    }
    if ($null -ne $word) {
        if ($wordStartedByScript) {
            try { $word.Quit() }
            catch {
                $result.errors += [ordered]@{ stage = 'word-quit'; message = $_.Exception.Message }
            }
        }
        Release-ComObject $word
    }

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()

    if ($ownsWordProcess -and $null -ne $ownedWordPid) {
        $remainingProcess = Get-Process -Id $ownedWordPid -ErrorAction SilentlyContinue
        if ($null -ne $remainingProcess) {
            try { Wait-Process -Id $ownedWordPid -Timeout 5 -ErrorAction Stop }
            catch {}
            $remainingProcess = Get-Process -Id $ownedWordPid -ErrorAction SilentlyContinue
        }
        if ($null -ne $remainingProcess) {
            $sameProcess = $null -ne $ownedWordStartTimeUtc -and
                $remainingProcess.StartTime.ToUniversalTime() -eq $ownedWordStartTimeUtc
            if ($sameProcess) {
                Stop-Process -Id $ownedWordPid -Force -ErrorAction SilentlyContinue
                $result.forcedWordTermination = $true
            }
            else {
                $result.errors += [ordered]@{
                    stage = 'process-cleanup'
                    message = 'WINWORD PID yeniden kullanıldığı için süreç sonlandırılmadı.'
                }
            }
        }
    }

    $result.finishedAt = [DateTime]::UtcNow.ToString('o')
    Write-Receipt
}

$result | ConvertTo-Json -Depth 10
if ($result.errors.Count -gt 0 -or $result.renderedFiles.Count -ne $result.pages) {
    exit 1
}

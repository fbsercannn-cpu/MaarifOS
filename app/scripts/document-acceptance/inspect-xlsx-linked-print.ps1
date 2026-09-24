[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$directory = [IO.Path]::GetFullPath($OutputDirectory)
$excel = $null
$book = $null
$checks = [ordered]@{}
function Assert-Check([string]$Name, [bool]$Condition) {
    $checks[$Name] = $Condition
    if (-not $Condition) { throw "Excel doğrulaması başarısız: $Name" }
}
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.EnableEvents = $false
    $excel.AutomationSecurity = 3
    $book = $excel.Workbooks.Open((Join-Path $directory 'growth-linked.xlsx'), 0, $false)
    $source = $book.Worksheets.Item('Aktarılabilir veri')
    $print = $book.Worksheets.Item('Baskı çizelgesi')
    $excel.CalculateFullRebuild()
    Assert-Check 'printOpensFirst' ($book.ActiveSheet.Name -eq 'Baskı çizelgesi')
    Assert-Check 'initialHeight' ([Math]::Abs([double]$print.Range('D5').Value2 - 111.1) -lt 0.000001)
    Assert-Check 'initialWeight' ([Math]::Abs([double]$print.Range('F5').Value2 - 18.765) -lt 0.000001)
    Assert-Check 'headersRepeat' ($print.PageSetup.PrintTitleRows -eq '$1:$4')
    Assert-Check 'safeVerticalPagination' ($print.PageSetup.FitToPagesWide -eq 1 -and $print.PageSetup.FitToPagesTall -eq $false)
    Assert-Check 'printHeaderFrozen' ($book.Windows.Item(1).FreezePanes -and $book.Windows.Item(1).SplitRow -eq 4)
    Assert-Check 'sourceFilter' ([bool]$source.AutoFilterMode)
    $sourceRange = $source.Range('A2:O3')
    $original = $sourceRange.Value2
    $source.Range('H2').Value2 = 1234.0
    $source.Range('J2').Value2 = [double]$source.Range('J2').Value2 + 1
    $source.Range('C2').Value2 = 'Kurgu Ad Güncellemesi'
    $excel.CalculateFullRebuild()
    Assert-Check 'sourceValueFlowsToPrint' ([Math]::Abs([double]$print.Range('D5').Value2 - 123.4) -lt 0.000001)
    Assert-Check 'sourceDateFlowsToPrint' ([double]$print.Range('E5').Value2 -eq [double]$source.Range('J2').Value2)
    Assert-Check 'sourceNameFlowsToPrint' ($print.Range('B5').Value2 -ceq 'Kurgu Ad Güncellemesi')
    $sourceRange.Sort($source.Range('A2'), 2) | Out-Null
    $excel.CalculateFullRebuild()
    Assert-Check 'sortKeepsMeasurementIdentity' ([Math]::Abs([double]$print.Range('D5').Value2 - 123.4) -lt 0.000001)
    Assert-Check 'sortKeepsWeightIdentity' ([Math]::Abs([double]$print.Range('F5').Value2 - 18.765) -lt 0.000001)
    $duplicateId = [string]$source.Range('A3').Value2
    $idCell = $source.Range('A2')
    $idCell.Formula = "'$duplicateId"
    $excel.CalculateFullRebuild()
    Assert-Check 'duplicateIdIsVisibleError' ([bool]$excel.WorksheetFunction.IsNA($print.Range('D5')))
    $sourceRange.Formula = $original
    $source.Range('A2').Value2 = 'KurguMissingId'
    $excel.CalculateFullRebuild()
    Assert-Check 'missingIdIsVisibleError' ([bool]$excel.WorksheetFunction.IsNA($print.Range('D5')))
    $sourceRange.Formula = $original
    $source.Range('H2').ClearContents() | Out-Null
    $excel.CalculateFullRebuild()
    Assert-Check 'blankStaysBlank' ([string]$print.Range('D5').Text -eq '')
    $source.Range('H2').Value2 = 0.0
    $excel.CalculateFullRebuild()
    Assert-Check 'zeroStaysZero' ([double]$print.Range('D5').Value2 -eq 0)
    $sourceRange.Formula = $original
    $excel.CalculateFullRebuild()
    Assert-Check 'restoredHeight' ([Math]::Abs([double]$print.Range('D5').Value2 - 111.1) -lt 0.000001)
    $print.ExportAsFixedFormat(0, (Join-Path $directory 'growth-linked-native.pdf'), 0, $true, $false)
    $book.Close($false)
    $book = $excel.Workbooks.Open((Join-Path $directory 'roster-linked.xlsx'), 0, $false)
    $print = $book.Worksheets.Item('Kısa iletişim baskısı')
    $excel.CalculateFullRebuild()
    Assert-Check 'rosterCompactStillActive' ($book.ActiveSheet.Name -eq 'Kısa iletişim baskısı')
    Assert-Check 'rosterCompactStillFormulaLinked' ([bool]$print.Range('C6').HasFormula)
    Assert-Check 'rosterHeadersRepeat' ($print.PageSetup.PrintTitleRows -eq '$1:$5')
    $print.ExportAsFixedFormat(0, (Join-Path $directory 'roster-linked-native.pdf'), 0, $true, $false)
    $book.Close($false)
    $book = $null
    [ordered]@{ passed = $true; checks = $checks } | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $directory 'native-linked-print.json') -Encoding utf8
    $checks | ConvertTo-Json -Compress
} catch {
    Write-Output $_.ScriptStackTrace
    throw
} finally {
    if ($book) { $book.Close($false) }
    if ($excel) { $excel.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

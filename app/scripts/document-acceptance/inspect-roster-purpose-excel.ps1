[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$directory = [IO.Path]::GetFullPath($OutputDirectory)
$excel = $null
$book = $null
$checks = [ordered]@{}
function Assert-Check([string]$Name, [bool]$Condition) {
    $checks[$Name] = $Condition
    if (-not $Condition) { throw "Excel validation failed: $Name" }
}
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.EnableEvents = $false
    $excel.AutomationSecurity = 3
    foreach ($layout in @('daily-classroom', 'contact-blocks', 'detailed-roster')) {
        $book = $excel.Workbooks.Open((Join-Path $directory "$layout.xlsx"), 0, $false)
        $source = $book.Worksheets.Item(1)
        $print = $book.Worksheets.Item(2)
        $excel.CalculateFullRebuild()
        Assert-Check "$layout-opens-print" ($book.ActiveSheet.Index -eq 2)
        Assert-Check "$layout-print-width" ($print.PageSetup.FitToPagesWide -eq 1 -and $print.PageSetup.FitToPagesTall -eq $false)
        Assert-Check "$layout-freeze" ($book.Windows.Item(1).FreezePanes)
        $target = if ($layout -eq 'daily-classroom') { $print.Range('C6') } else { $print.Range('A5') }
        $initialName = [string]$target.Value2
        Assert-Check "$layout-initial-link" ($initialName.Contains('Kurgu'))
        $nameCell = $source.Rows.Item(7).Find('Adı soyadı')
        if ($null -eq $nameCell) { $nameCell = $source.Rows.Item(7).Find('Ad soyad') }
        if ($null -eq $nameCell) {
            for ($c = 1; $c -le $source.UsedRange.Columns.Count; $c++) {
                if ([string]$source.Cells.Item(8, $c).Value2 -ceq $initialName) { $nameCell = $source.Cells.Item(7, $c); break }
            }
        }
        $sourceRange = $source.Range($source.Cells.Item(8, 1), $source.Cells.Item($source.UsedRange.Rows.Count, $source.UsedRange.Columns.Count))
        $original = $sourceRange.Value2
        $source.Cells.Item(8, $nameCell.Column).Value2 = 'Kurgu updated linked name'
        $excel.CalculateFullRebuild()
        Assert-Check "$layout-edit-flows" (([string]$target.Value2).Contains('Kurgu updated linked name'))
        $sourceRange.Sort($source.Cells.Item(8, $source.UsedRange.Columns.Count), 2) | Out-Null
        $excel.CalculateFullRebuild()
        Assert-Check "$layout-sort-keeps-id" (([string]$target.Value2).Contains('Kurgu updated linked name'))
        $sourceRange.Formula = $original
        $source.Cells.Item(8, $source.UsedRange.Columns.Count).Value2 = 'MissingSyntheticId'
        $excel.CalculateFullRebuild()
        Assert-Check "$layout-missing-key-visible" ([bool]$excel.WorksheetFunction.IsNA($target))
        $sourceRange.Formula = $original
        $excel.CalculateFullRebuild()
        Assert-Check "$layout-restored" ($target.Value2 -ceq $initialName)
        $print.ExportAsFixedFormat(0, (Join-Path $directory "$layout-native.pdf"))
        $book.Close($false)
        $book = $null
    }
    $checks | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $directory 'native-excel-checks.json') -Encoding UTF8
    $checks | ConvertTo-Json
}
catch { Write-Output $_.ScriptStackTrace; throw }
finally {
    if ($null -ne $book) { $book.Close($false) }
    if ($null -ne $excel) { $excel.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) }
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}

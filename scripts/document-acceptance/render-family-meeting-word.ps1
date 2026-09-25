$ErrorActionPreference = 'Stop'
$directory = (Resolve-Path 'output/family-meeting-form-qa').Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($stem in @('veli-gorusmesi-hazirlik', 'veli-gorusmesi-sonuc')) {
    $document = $word.Documents.Open((Join-Path $directory ($stem + '.docx')), $false, $true, $false)
    try {
      $document.Repaginate()
      $document.Fields.Update() | Out-Null
      $document.ExportAsFixedFormat((Join-Path $directory ($stem + '-word.pdf')), 17)
      [pscustomobject]@{File=$stem; Pages=$document.ComputeStatistics(2); Tables=$document.Tables.Count} | ConvertTo-Json -Compress
    } finally { $document.Close(0); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) }
  }
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }

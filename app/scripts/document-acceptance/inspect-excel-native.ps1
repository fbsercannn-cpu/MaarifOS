[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$OutputDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($outputPath) | Out-Null
$jsonPath = Join-Path $outputPath 'native-excel.json'
$pidPath = Join-Path $outputPath 'native-excel.pid'
[IO.File]::WriteAllText($pidPath, '', $utf8WithoutBom)

function Release-ComObject {
    param([AllowNull()][object]$Value)
    if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
        try {
            [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
        } catch {
            # Cleanup continues so the receipt can still be written.
        }
    }
}

function Convert-JsonValue {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value) { return $null }
    if ($Value -is [DateTime]) { return $Value.ToString('o') }
    return $Value
}

function Get-ComTypeName {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value) { return $null }
    return $Value.GetType().FullName
}

function Test-NumericValue {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value -or $Value -is [bool]) { return $false }
    return $Value -is [byte] -or
        $Value -is [sbyte] -or
        $Value -is [int16] -or
        $Value -is [uint16] -or
        $Value -is [int32] -or
        $Value -is [uint32] -or
        $Value -is [int64] -or
        $Value -is [uint64] -or
        $Value -is [single] -or
        $Value -is [double] -or
        $Value -is [decimal]
}

function Normalize-PrintReference {
    param([AllowNull()][object]$Value)
    $normalized = ([string]$Value).Trim().Replace("'", '').Replace(' ', '')
    $separator = $normalized.LastIndexOf('!')
    if ($separator -ge 0) { $normalized = $normalized.Substring($separator + 1) }
    return $normalized.ToUpperInvariant()
}

function Get-CellRecord {
    param(
        [Parameter(Mandatory = $true)]$Sheet,
        [Parameter(Mandatory = $true)][string]$Address
    )
    $cell = $null
    try {
        $cell = $Sheet.Range($Address)
        $value = $cell.Value()
        $value2 = $cell.Value2
        return [ordered]@{
            address = $Address
            value = Convert-JsonValue $value
            valueComType = Get-ComTypeName $value
            value2 = Convert-JsonValue $value2
            value2ComType = Get-ComTypeName $value2
            text = [string]$cell.Text
            numberFormat = [string]$cell.NumberFormat
        }
    } finally {
        Release-ComObject $cell
    }
}

function Get-BlankBorderRecord {
    param(
        [Parameter(Mandatory = $true)]$Sheet,
        [Parameter(Mandatory = $true)][string]$Address
    )
    $cell = $null
    $borders = $null
    $border = $null
    try {
        $cell = $Sheet.Range($Address)
        $borders = $cell.Borders
        $lineStyles = [ordered]@{}
        foreach ($edge in @(7, 8, 9, 10)) {
            $border = $borders.Item($edge)
            $lineStyles[[string]$edge] = [int]$border.LineStyle
            Release-ComObject $border
            $border = $null
        }
        return [ordered]@{
            address = $Address
            value2 = Convert-JsonValue $cell.Value2
            text = [string]$cell.Text
            lineStyles = $lineStyles
            blank = ($null -eq $cell.Value2 -or [string]::IsNullOrEmpty([string]$cell.Value2)) -and
                [string]::IsNullOrEmpty([string]$cell.Text)
            allEdgesVisible = @($lineStyles.Values | Where-Object { [int]$_ -eq -4142 }).Count -eq 0
        }
    } finally {
        Release-ComObject $border
        Release-ComObject $borders
        Release-ComObject $cell
    }
}

function Add-ReceiptError {
    param(
        [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Receipt,
        [Parameter(Mandatory = $true)][string]$Stage,
        [Parameter(Mandatory = $true)][string]$Message,
        [AllowNull()][string]$FileName
    )
    $entry = [ordered]@{ stage = $Stage; message = $Message }
    if (-not [string]::IsNullOrWhiteSpace($FileName)) { $entry.fileName = $FileName }
    $Receipt.errors += $entry
}

function Assert-CellSamples {
    param(
        [Parameter(Mandatory = $true)][string]$Kind,
        [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Samples
    )
    if ($Kind -eq 'class-types') {
        return [ordered]@{
            sequenceIsNumeric = (Test-NumericValue $Samples.A8.value2) -and ([double]$Samples.A8.value2 -eq 1)
            schoolNumberIsText = $Samples.B8.value2 -is [string] -and $Samples.B8.value2 -ceq '000012'
            birthDateIsExcelDate = (Test-NumericValue $Samples.D8.value2) -and
                $Samples.D8.valueComType -ceq 'System.DateTime' -and
                ([double]$Samples.D8.value2 -eq ([DateTime]::new(2020, 9, 10)).ToOADate()) -and
                $Samples.D8.text -eq '10.09.2020'
            enrollmentYearIsNumeric = (Test-NumericValue $Samples.E8.value2) -and ([double]$Samples.E8.value2 -eq 2025)
            missingBirthDateIsText = $Samples.D9.value2 -is [string] -and $Samples.D9.value2 -ceq [string][char]0x2014
            missingEnrollmentYearIsText = $Samples.E9.value2 -is [string] -and $Samples.E9.value2 -ceq [string][char]0x2014
        }
    }
    if ($Kind -eq 'growth') {
        return [ordered]@{
            measurementIsNumeric = Test-NumericValue $Samples.H2.value2
            measuredOnIsExcelDate = (Test-NumericValue $Samples.J2.value2) -and
                $Samples.J2.valueComType -ceq 'System.DateTime' -and
                ([double]$Samples.J2.value2 -eq ([DateTime]::new(2026, 9, 8)).ToOADate()) -and
                $Samples.J2.text -eq '08.09.2026'
        }
    }
    return [ordered]@{}
}

function All-ChecksPassed {
    param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Checks)
    foreach ($key in $Checks.Keys) {
        if ($Checks[$key] -ne $true) { return $false }
    }
    return $true
}

$targets = @(
    [ordered]@{
        fileName = 'class-roster-full.xlsx'
        printSheet = 'Sınıf listesi'
        sampleSheet = $null
        sampleAddresses = @()
        sampleKind = 'none'
        expectedOrientation = 2
        expectedOrientationName = 'landscape'
        expectedFitToPagesWide = 4
        expectedTitleRows = '$1:$7'
        expectedTitleColumns = '$A:$C'
    },
    [ordered]@{
        fileName = 'class-roster-types.xlsx'
        printSheet = 'Sınıf listesi'
        sampleSheet = 'Sınıf listesi'
        sampleAddresses = @('A8', 'B8', 'D8', 'E8', 'D9', 'E9')
        sampleKind = 'class-types'
        expectedOrientation = 1
        expectedOrientationName = 'portrait'
        expectedFitToPagesWide = 1
        expectedTitleRows = '$1:$7'
        expectedTitleColumns = $null
    },
    [ordered]@{
        fileName = 'class-roster-compact-25.xlsx'
        printSheet = 'Kısa iletişim baskısı'
        sampleSheet = $null
        sampleAddresses = @()
        sampleKind = 'none'
        expectedOrientation = 2
        expectedOrientationName = 'landscape'
        expectedFitToPagesWide = 1
        expectedTitleRows = '$1:$5'
        expectedTitleColumns = $null
        expectedActiveSheet = 'Kısa iletişim baskısı'
    },
    [ordered]@{
        fileName = 'growth-class-40.xlsx'
        printSheet = 'Baskı çizelgesi'
        sampleSheet = 'Aktarılabilir veri'
        sampleAddresses = @('H2', 'J2')
        sampleKind = 'growth'
        expectedOrientation = 2
        expectedOrientationName = 'landscape'
        expectedFitToPagesWide = 1
        expectedTitleRows = '$1:$4'
        expectedTitleColumns = '$A:$B'
        blankMeasurementAddresses = @('D9', 'E9', 'F9', 'G9')
    },
    [ordered]@{
        fileName = 'growth-individual.xlsx'
        printSheet = 'Baskı çizelgesi'
        sampleSheet = 'Aktarılabilir veri'
        sampleAddresses = @('H2', 'J2')
        sampleKind = 'growth'
        expectedOrientation = 2
        expectedOrientationName = 'landscape'
        expectedFitToPagesWide = 1
        expectedTitleRows = '$1:$4'
        expectedTitleColumns = '$A:$B'
        blankMeasurementAddresses = @('D6', 'E6', 'F6', 'G6')
    },
    [ordered]@{
        fileName = 'growth-class-september.xlsx'
        printSheet = 'Baskı çizelgesi'
        sampleSheet = 'Aktarılabilir veri'
        sampleAddresses = @('H2', 'J2')
        sampleKind = 'growth'
        expectedOrientation = 2
        expectedOrientationName = 'landscape'
        expectedFitToPagesWide = 1
        expectedTitleRows = '$1:$4'
        expectedTitleColumns = '$A:$B'
        blankMeasurementAddresses = @('D6', 'E6', 'F6', 'G6')
    }
)

$receipt = [ordered]@{
    schemaVersion = 1
    startedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    syntheticOnly = $true
    outputDirectory = $outputPath
    excel = [ordered]@{
        processId = $null
        version = $null
        processExitedAfterQuit = $null
    }
    expectedFiles = @($targets | ForEach-Object { $_.fileName })
    workbooks = @()
    observations = [ordered]@{}
    errors = @()
    finishedAtUtc = $null
    passed = $false
}

$excel = $null
$excelProcess = $null
$excelProcessId = $null
$fatalFailure = $false
$cleanupPassed = $true

try {
    if (-not ('MaarifNativeWindowProcess' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class MaarifNativeWindowProcess
{
    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr windowHandle, out uint processId);
}
'@
    }

    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false
    $excel.EnableEvents = $false
    $excel.ScreenUpdating = $false

    $nativeProcessId = [uint32]0
    $windowHandle = [IntPtr]([int64]$excel.Hwnd)
    $windowThreadId = [MaarifNativeWindowProcess]::GetWindowThreadProcessId($windowHandle, [ref]$nativeProcessId)
    if ($windowHandle -eq [IntPtr]::Zero -or $windowThreadId -eq 0 -or $nativeProcessId -eq 0) {
        throw 'Oluşturulan Excel örneğinin süreç kimliği pencere tanıtıcısından doğrulanamadı.'
    }
    $excelProcessId = [int]$nativeProcessId
    $excelProcess = [Diagnostics.Process]::GetProcessById($excelProcessId)
    $receipt.excel.processId = $excelProcessId
    $receipt.excel.version = [string]$excel.Version
    [IO.File]::WriteAllText($pidPath, "$excelProcessId`n", $utf8WithoutBom)

    foreach ($target in $targets) {
        $inputPath = Join-Path $outputPath $target.fileName
        $record = [ordered]@{
            fileName = $target.fileName
            inputPath = $inputPath
            readOnly = $false
            activeSheetOnOpen = $null
            sheetCount = $null
            printSheets = @()
            samples = [ordered]@{}
            sampleChecks = [ordered]@{}
            blankMeasurementCells = [ordered]@{}
            blankMeasurementChecks = [ordered]@{}
            passed = $false
        }
        $workbook = $null
        $worksheets = $null
        $printSheet = $null
        $sampleSheet = $null
        $pageSetup = $null
        $workbooks = $null
        $activeSheet = $null
        try {
            if (-not [IO.File]::Exists($inputPath)) {
                throw "Beklenen Excel dosyası bulunamadı: $($target.fileName)"
            }

            $workbooks = $excel.Workbooks
            $workbook = $workbooks.Open($inputPath, 0, $true)
            Release-ComObject $workbooks
            $workbooks = $null

            $record.readOnly = [bool]$workbook.ReadOnly
            $activeSheet = $workbook.ActiveSheet
            $record.activeSheetOnOpen = [string]$activeSheet.Name
            Release-ComObject $activeSheet
            $activeSheet = $null
            $worksheets = $workbook.Worksheets
            $record.sheetCount = [int]$worksheets.Count
            $printSheet = $worksheets.Item([string]$target.printSheet)
            $printSheet.Activate()
            $pageSetup = $printSheet.PageSetup

            $paperSize = [int]$pageSetup.PaperSize
            $orientation = [int]$pageSetup.Orientation
            $zoom = $pageSetup.Zoom
            $fitToPagesWide = $pageSetup.FitToPagesWide
            $fitToPagesTall = $pageSetup.FitToPagesTall
            $printArea = [string]$pageSetup.PrintArea
            $printTitleRows = [string]$pageSetup.PrintTitleRows
            $printTitleColumns = [string]$pageSetup.PrintTitleColumns
            $expectedFitToPagesTall = if ($target.Contains('expectedFitToPagesTall')) {
                [int]$target.expectedFitToPagesTall
            } else { 0 }

            $printChecks = [ordered]@{
                workbookReadOnly = $record.readOnly
                paperSizeA4 = $paperSize -eq 9
                orientationMatches = $orientation -eq [int]$target.expectedOrientation
                zoomDisabled = $zoom -is [bool] -and $zoom -eq $false
                fitToPagesWideMatches = (Test-NumericValue $fitToPagesWide) -and
                    ([int]$fitToPagesWide -eq [int]$target.expectedFitToPagesWide)
                fitToPagesTallMatches = if ($expectedFitToPagesTall -eq 0) {
                    ($fitToPagesTall -is [bool] -and $fitToPagesTall -eq $false) -or
                        ((Test-NumericValue $fitToPagesTall) -and ([int]$fitToPagesTall -eq 0))
                } else {
                    (Test-NumericValue $fitToPagesTall) -and
                        ([int]$fitToPagesTall -eq $expectedFitToPagesTall)
                }
                printAreaPresent = -not [string]::IsNullOrWhiteSpace($printArea)
                printTitleRowsMatch = (Normalize-PrintReference $printTitleRows) -ceq
                    (Normalize-PrintReference $target.expectedTitleRows)
                printTitleColumnsMatch = $null -eq $target.expectedTitleColumns -or
                    (Normalize-PrintReference $printTitleColumns) -ceq
                    (Normalize-PrintReference $target.expectedTitleColumns)
            }
            if ($target.Contains('expectedActiveSheet')) {
                $printChecks.activeSheetOnOpenMatches = $record.activeSheetOnOpen -ceq [string]$target.expectedActiveSheet
            }

            $pdfName = '{0}-native.pdf' -f [IO.Path]::GetFileNameWithoutExtension($target.fileName)
            $pdfPath = Join-Path $outputPath $pdfName
            $printSheet.ExportAsFixedFormat(0, $pdfPath, 0, $true, $false)
            $pdfExists = [IO.File]::Exists($pdfPath)
            $pdfBytes = if ($pdfExists) { [long](Get-Item -LiteralPath $pdfPath).Length } else { 0L }
            $printChecks.pdfCreatedWithContent = $pdfExists -and $pdfBytes -gt 0

            $record.printSheets += [ordered]@{
                name = [string]$printSheet.Name
                expectedOrientation = [string]$target.expectedOrientationName
                paperSize = $paperSize
                orientation = $orientation
                expectedFitToPagesWide = [int]$target.expectedFitToPagesWide
                expectedFitToPagesTall = $expectedFitToPagesTall
                zoom = Convert-JsonValue $zoom
                zoomComType = Get-ComTypeName $zoom
                fitToPagesWide = Convert-JsonValue $fitToPagesWide
                fitToPagesWideComType = Get-ComTypeName $fitToPagesWide
                fitToPagesTall = Convert-JsonValue $fitToPagesTall
                fitToPagesTallComType = Get-ComTypeName $fitToPagesTall
                printArea = $printArea
                printTitleRows = $printTitleRows
                printTitleColumns = $printTitleColumns
                checks = $printChecks
                pdf = [ordered]@{
                    fileName = $pdfName
                    path = $pdfPath
                    bytes = $pdfBytes
                }
                passed = All-ChecksPassed $printChecks
            }

            if ($target.Contains('blankMeasurementAddresses')) {
                foreach ($address in $target.blankMeasurementAddresses) {
                    $blankRecord = Get-BlankBorderRecord -Sheet $printSheet -Address ([string]$address)
                    $record.blankMeasurementCells[[string]$address] = $blankRecord
                    $record.blankMeasurementChecks["$address-blank"] = $blankRecord.blank -eq $true
                    $record.blankMeasurementChecks["$address-bordered"] = $blankRecord.allEdgesVisible -eq $true
                }
            }

            if ($null -ne $target.sampleSheet) {
                if ([string]$target.sampleSheet -ceq [string]$target.printSheet) {
                    $sampleSheet = $printSheet
                } else {
                    $sampleSheet = $worksheets.Item([string]$target.sampleSheet)
                }
                foreach ($address in $target.sampleAddresses) {
                    $record.samples[$address] = Get-CellRecord -Sheet $sampleSheet -Address $address
                }
                $record.sampleChecks = Assert-CellSamples -Kind ([string]$target.sampleKind) -Samples $record.samples
            }

            $printPassed = $record.printSheets.Count -eq 1 -and $record.printSheets[0].passed -eq $true
            $samplesPassed = All-ChecksPassed $record.sampleChecks
            $blankMeasurementCellsPassed = All-ChecksPassed $record.blankMeasurementChecks
            $record.passed = $printPassed -and $samplesPassed -and $blankMeasurementCellsPassed
            if (-not $record.passed) {
                Add-ReceiptError -Receipt $receipt -Stage 'workbook-validation' -FileName $target.fileName -Message 'Native Excel baskı veya hücre türü kontrollerinden en az biri başarısız.'
            }
        } catch {
            $record.passed = $false
            Add-ReceiptError -Receipt $receipt -Stage 'workbook-inspection' -FileName $target.fileName -Message $_.Exception.Message
        } finally {
            Release-ComObject $pageSetup
            Release-ComObject $activeSheet
            if ($null -ne $sampleSheet -and -not [object]::ReferenceEquals($sampleSheet, $printSheet)) {
                Release-ComObject $sampleSheet
            }
            Release-ComObject $printSheet
            Release-ComObject $worksheets
            Release-ComObject $workbooks
            if ($null -ne $workbook) {
                try { $workbook.Close($false) } catch {
                    Add-ReceiptError -Receipt $receipt -Stage 'workbook-close' -FileName $target.fileName -Message $_.Exception.Message
                    $record.passed = $false
                }
                Release-ComObject $workbook
            }
            $receipt.workbooks += $record
        }
    }

    # The compact print sheet is a live view of the preserved selected data.
    # Exercise the link in a disposable copy with real Excel calculation and
    # keep both the recalculated workbook and its fixed-format print as evidence.
    $probeInput = Join-Path $outputPath 'class-roster-compact-25.xlsx'
    $probeCopy = Join-Path $outputPath 'class-roster-compact-edit-probe.xlsx'
    $probeWorkbook = $null
    $probeWorkbooks = $null
    $probeWorksheets = $null
    $probeDataSheet = $null
    $probePrintSheet = $null
    $probeSourceCell = $null
    $probePrintCell = $null
    $probeFormulaLikeSourceCell = $null
    $probeFormulaLikePrintCell = $null
    $probeOtherSourceCell = $null
    $probeOtherPrintCell = $null
    $probeFormulaLikeHyperlinks = $null
    $probePageSetup = $null
    try {
        [IO.File]::Copy($probeInput, $probeCopy, $true)
        $probeWorkbooks = $excel.Workbooks
        $probeWorkbook = $probeWorkbooks.Open($probeCopy, 0, $false)
        Release-ComObject $probeWorkbooks
        $probeWorkbooks = $null
        $probeWorksheets = $probeWorkbook.Worksheets
        $probeDataSheet = $probeWorksheets.Item('Sınıf listesi')
        $probePrintSheet = $probeWorksheets.Item('Kısa iletişim baskısı')
        $probeSourceCell = $probeDataSheet.Range('H8')
        $probePrintCell = $probePrintSheet.Range('D6')
        $probeFormulaLikeSourceCell = $probeDataSheet.Range('H13')
        $probeFormulaLikePrintCell = $probePrintSheet.Range('D8')
        $probeOtherSourceCell = $probeDataSheet.Range('N11')
        $probeOtherPrintCell = $probePrintSheet.Range('F6')
        $probeFormulaLikeHyperlinks = $probeFormulaLikePrintCell.Hyperlinks
        $probePageSetup = $probePrintSheet.PageSetup

        $expectedInitial = 'Kurgu Anne 1 Çınaroğlu · 0532 000 00 01'
        $expectedNameOnly = 'Kurgu Anne 1 Çınaroğlu'
        $expectedEditedPhone = '0532 111 22 33'
        $expectedEdited = "$expectedNameOnly · $expectedEditedPhone"
        $expectedZero = "$expectedNameOnly · 0"
        $formulaLikeText = '=HYPERLINK("https://example.invalid","Kurgu")'
        $expectedFormulaLike = "Kurgu Anne 3 Çınaroğlu · $formulaLikeText"
        $expectedOtherPhone = '0532 777 66 55'
        $before = [string]$probePrintCell.Value2

        $probeSourceCell.Value2 = $expectedEditedPhone
        $excel.CalculateFullRebuild()
        $afterEdit = [string]$probePrintCell.Value2

        $probeSourceCell.ClearContents() | Out-Null
        $excel.CalculateFullRebuild()
        $afterClear = [string]$probePrintCell.Value2

        $probeSourceCell.Value2 = 0
        $excel.CalculateFullRebuild()
        $afterZero = [string]$probePrintCell.Value2

        $probeSourceCell.Value2 = $expectedEditedPhone
        $probeOtherSourceCell.Value2 = $expectedOtherPhone
        $excel.CalculateFullRebuild()
        $afterRestore = [string]$probePrintCell.Value2
        $afterOtherEdit = [string]$probeOtherPrintCell.Value2
        $sourceAfter = [string]$probeSourceCell.Value2
        $otherSourceAfter = [string]$probeOtherSourceCell.Value2
        $formulaLikeSourceValue = [string]$probeFormulaLikeSourceCell.Value2
        $formulaLikePrintValue = [string]$probeFormulaLikePrintCell.Value2
        $formulaLikeSourceHasFormula = [bool]$probeFormulaLikeSourceCell.HasFormula
        $formulaLikePrintHasFormula = [bool]$probeFormulaLikePrintCell.HasFormula
        $formulaLikePrintHyperlinkCount = [int]$probeFormulaLikeHyperlinks.Count
        $motherFormula = try { [string]$probePrintCell.Formula } catch { '' }
        if ([string]::IsNullOrWhiteSpace($motherFormula)) {
            $motherFormula = try { [string]$probePrintCell.Formula2 } catch { '' }
        }
        $otherFormula = try { [string]$probeOtherPrintCell.Formula } catch { '' }
        if ([string]::IsNullOrWhiteSpace($otherFormula)) {
            $otherFormula = try { [string]$probeOtherPrintCell.Formula2 } catch { '' }
        }
        $probePdfName = 'class-roster-compact-edit-probe-native.pdf'
        $probePdfPath = Join-Path $outputPath $probePdfName
        $probePrintSheet.ExportAsFixedFormat(0, $probePdfPath, 0, $true, $false)
        $probeWorkbook.Save()

        $otherFormulaReferencesAllFourRows = $true
        foreach ($rowNumber in @(8, 9, 10, 11)) {
            foreach ($columnName in @('M', 'N', 'O')) {
                if (-not $otherFormula.Contains("'Sınıf listesi'!`$$columnName`$$rowNumber")) {
                    $otherFormulaReferencesAllFourRows = $false
                }
            }
        }
        $probeChecks = [ordered]@{
            initialCachedValueExact = $before -ceq $expectedInitial
            sourceEditStoredExact = $sourceAfter -ceq $expectedEditedPhone
            editPropagatedExact = $afterEdit -ceq $expectedEdited
            blankSourcePropagatedWithoutSyntheticMeasurement = $afterClear -ceq $expectedNameOnly
            numericZeroPreserved = $afterZero -ceq $expectedZero
            restoredEditPropagatedExact = $afterRestore -ceq $expectedEdited
            formulaLikeSourceStoredAsText = -not $formulaLikeSourceHasFormula -and $formulaLikeSourceValue -ceq $formulaLikeText
            formulaLikePrintRemainsFormula = $formulaLikePrintHasFormula
            formulaLikeTextPropagatedExact = $formulaLikePrintValue -ceq $expectedFormulaLike
            formulaLikeTextCreatedNoHyperlink = $formulaLikePrintHyperlinkCount -eq 0
            motherFormulaReferencesSelectedSource = $motherFormula.Contains("'Sınıf listesi'!`$H`$8")
            otherFormulaReferencesAllFourRows = $otherFormulaReferencesAllFourRows
            multipleOtherContactEditStoredExact = $otherSourceAfter -ceq $expectedOtherPhone
            multipleOtherContactEditPropagated = $afterOtherEdit.Contains($expectedOtherPhone)
            printAreaExact = (Normalize-PrintReference ([string]$probePageSetup.PrintArea)) -ceq '$A$1:$G$32'
            printTitleRowsExact = (Normalize-PrintReference ([string]$probePageSetup.PrintTitleRows)) -ceq '$1:$5'
            fitToPagesWideOne = (Test-NumericValue $probePageSetup.FitToPagesWide) -and ([int]$probePageSetup.FitToPagesWide -eq 1)
            fitToPagesTallAutomatic = ($probePageSetup.FitToPagesTall -is [bool] -and $probePageSetup.FitToPagesTall -eq $false) -or
                ((Test-NumericValue $probePageSetup.FitToPagesTall) -and ([int]$probePageSetup.FitToPagesTall -eq 0))
            nativePdfCreatedWithContent = [IO.File]::Exists($probePdfPath) -and ([long](Get-Item -LiteralPath $probePdfPath).Length -gt 0)
        }
        $receipt.observations.compactDataEditPropagation = [ordered]@{
            executed = $true
            sourceAddress = 'Sınıf listesi!H8'
            printAddress = 'Kısa iletişim baskısı!D6'
            before = $before
            afterEdit = $afterEdit
            afterClear = $afterClear
            afterZero = $afterZero
            afterRestore = $afterRestore
            otherSourceAddress = 'Sınıf listesi!N11'
            otherPrintAddress = 'Kısa iletişim baskısı!F6'
            formulaLikeSourceAddress = 'Sınıf listesi!H13'
            formulaLikePrintAddress = 'Kısa iletişim baskısı!D8'
            formulaLikeSourceValue = $formulaLikeSourceValue
            formulaLikePrintValue = $formulaLikePrintValue
            formulaLikePrintHyperlinkCount = $formulaLikePrintHyperlinkCount
            motherFormula = $motherFormula
            otherFormula = $otherFormula
            nativePdf = [ordered]@{
                fileName = $probePdfName
                path = $probePdfPath
                bytes = if ([IO.File]::Exists($probePdfPath)) { [long](Get-Item -LiteralPath $probePdfPath).Length } else { 0L }
            }
            checks = $probeChecks
            passed = All-ChecksPassed $probeChecks
        }
        if (-not $receipt.observations.compactDataEditPropagation.passed) {
            $failedProbeChecks = @($probeChecks.Keys | Where-Object { $probeChecks[$_] -ne $true }) -join ', '
            throw "Kompakt canlı bağlantı kabulünde başarısız kontroller: $failedProbeChecks"
        }
    } catch {
        Add-ReceiptError -Receipt $receipt -Stage 'compact-edit-propagation' -FileName 'class-roster-compact-25.xlsx' -Message $_.Exception.Message
    } finally {
        Release-ComObject $probePageSetup
        Release-ComObject $probeFormulaLikeHyperlinks
        Release-ComObject $probeOtherPrintCell
        Release-ComObject $probeOtherSourceCell
        Release-ComObject $probeFormulaLikePrintCell
        Release-ComObject $probeFormulaLikeSourceCell
        Release-ComObject $probePrintCell
        Release-ComObject $probeSourceCell
        Release-ComObject $probePrintSheet
        Release-ComObject $probeDataSheet
        Release-ComObject $probeWorksheets
        Release-ComObject $probeWorkbooks
        if ($null -ne $probeWorkbook) {
            try { $probeWorkbook.Close($true) } catch {
                Add-ReceiptError -Receipt $receipt -Stage 'compact-edit-probe-close' -FileName 'class-roster-compact-25.xlsx' -Message $_.Exception.Message
            }
            Release-ComObject $probeWorkbook
        }
    }
} catch {
    $fatalFailure = $true
    Add-ReceiptError -Receipt $receipt -Stage 'excel-startup' -FileName $null -Message $_.Exception.Message
} finally {
    if ($null -ne $excel) {
        try { $excel.Quit() } catch {
            $cleanupPassed = $false
            Add-ReceiptError -Receipt $receipt -Stage 'excel-quit' -FileName $null -Message $_.Exception.Message
        }
        Release-ComObject $excel
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()

    if ($null -ne $excelProcess) {
        try {
            $receipt.excel.processExitedAfterQuit = [bool]$excelProcess.WaitForExit(10000)
            if (-not $receipt.excel.processExitedAfterQuit) {
                $cleanupPassed = $false
                Add-ReceiptError -Receipt $receipt -Stage 'excel-process-exit' -FileName $null -Message "Excel süreci Quit sonrasında kapanmadı: $excelProcessId"
            }
        } catch {
            $cleanupPassed = $false
            Add-ReceiptError -Receipt $receipt -Stage 'excel-process-exit' -FileName $null -Message $_.Exception.Message
        } finally {
            $excelProcess.Dispose()
        }
    }

    $receipt.finishedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    $compactPropagationPassed = $receipt.observations.Contains('compactDataEditPropagation') -and
        $receipt.observations.compactDataEditPropagation.passed -eq $true
    $receipt.passed = -not $fatalFailure -and
        $cleanupPassed -and
        $receipt.workbooks.Count -eq $targets.Count -and
        (@($receipt.workbooks | Where-Object { $_.passed -ne $true }).Count -eq 0) -and
        $compactPropagationPassed -and
        $receipt.errors.Count -eq 0
    [IO.File]::WriteAllText($jsonPath, (($receipt | ConvertTo-Json -Depth 14) + "`n"), $utf8WithoutBom)
}

if ($receipt.passed) {
    [Console]::Out.WriteLine("Excel native kabulü BAŞARILI: $jsonPath")
    exit 0
}

[Console]::Error.WriteLine("Excel native kabulü BAŞARISIZ: $jsonPath")
exit 1

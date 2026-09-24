# inspect-chrome.ps1
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
$children = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition
)

foreach ($child in $children) {
    $name = $child.Current.Name
    if ($name -match "maarifos|Chrome|GoDaddy") {
        Write-Host "FOUND WINDOW: $name ($($child.Current.ClassName))"
    }
}

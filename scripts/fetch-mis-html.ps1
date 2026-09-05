param(
    [Parameter(Mandatory = $true)][string]$FromDate,
    [Parameter(Mandatory = $true)][string]$ToDate,
    [Parameter(Mandatory = $true)][string]$OutDir
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$BaseUrl = "https://mis.cept.gov.in/CBS/CBSReports.aspx"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Get-FieldValue {
    param([string]$Html, [string]$Name)
    $pattern = '<input[^>]+name="' + [regex]::Escape($Name) + '"[^>]*value="([^"]*)"'
    $m = [regex]::Match($Html, $pattern)
    if ($m.Success) { return [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) }
    return ""
}

function New-Form {
    param([string]$Html)
    return @{
        "__EVENTTARGET" = ""
        "__EVENTARGUMENT" = ""
        "__LASTFOCUS" = ""
        "__VIEWSTATE" = Get-FieldValue $Html "__VIEWSTATE"
        "__VIEWSTATEGENERATOR" = Get-FieldValue $Html "__VIEWSTATEGENERATOR"
        "__EVENTVALIDATION" = Get-FieldValue $Html "__EVENTVALIDATION"
        "ctl00`$ContentPlaceHolder1`$CircleDropDown" = "Select Circle"
        "ctl00`$ContentPlaceHolder1`$RegionDropDown" = "Select Region"
        "ctl00`$ContentPlaceHolder1`$DivisionDropDown" = "Select Division"
        "ctl00`$ContentPlaceHolder1`$SubDivisionDropDown" = "Select SubDivision"
        "ctl00`$ContentPlaceHolder1`$startDate" = $FromDate
        "ctl00`$ContentPlaceHolder1`$endDate" = $ToDate
    }
}

function Invoke-Post {
    param($Session, [hashtable]$Form)
    return Invoke-WebRequest -Uri $BaseUrl -Method Post -WebSession $Session -Body $Form -ContentType "application/x-www-form-urlencoded" -UseBasicParsing
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$res = Invoke-WebRequest -Uri $BaseUrl -WebSession $session -UseBasicParsing
$html = $res.Content

$form = New-Form $html
$form["ctl00`$ContentPlaceHolder1`$CircleDropDown"] = "Madhya Pradesh Circle"
$form["__EVENTTARGET"] = "ctl00`$ContentPlaceHolder1`$CircleDropDown"
$res = Invoke-Post $session $form
$html = $res.Content

$form = New-Form $html
$form["ctl00`$ContentPlaceHolder1`$CircleDropDown"] = "Madhya Pradesh Circle"
$form["ctl00`$ContentPlaceHolder1`$RegionDropDown"] = "Indore Region"
$form["__EVENTTARGET"] = "ctl00`$ContentPlaceHolder1`$RegionDropDown"
$res = Invoke-Post $session $form
$html = $res.Content

$divisions = @(
    "Indore City Division",
    "Indore Moffusil Division",
    "Khandwa Division",
    "Mandsaur Division",
    "Ratlam Division",
    "Sehore Division",
    "Ujjain Division"
)

foreach ($division in $divisions) {
    $form = New-Form $html
    $form["ctl00`$ContentPlaceHolder1`$CircleDropDown"] = "Madhya Pradesh Circle"
    $form["ctl00`$ContentPlaceHolder1`$RegionDropDown"] = "Indore Region"
    $form["ctl00`$ContentPlaceHolder1`$DivisionDropDown"] = $division
    $form["__EVENTTARGET"] = "ctl00`$ContentPlaceHolder1`$DivisionDropDown"
    $resDiv = Invoke-Post $session $form
    $htmlDiv = $resDiv.Content

    $form = New-Form $htmlDiv
    $form["ctl00`$ContentPlaceHolder1`$CircleDropDown"] = "Madhya Pradesh Circle"
    $form["ctl00`$ContentPlaceHolder1`$RegionDropDown"] = "Indore Region"
    $form["ctl00`$ContentPlaceHolder1`$DivisionDropDown"] = $division
    $form["ctl00`$ContentPlaceHolder1`$startDate"] = $FromDate
    $form["ctl00`$ContentPlaceHolder1`$endDate"] = $ToDate
    $form["__EVENTTARGET"] = "ctl00`$ContentPlaceHolder1`$ctl00"
    $resReport = Invoke-Post $session $form
    $fileSafe = ($division -replace '[^A-Za-z0-9]+', '_').Trim('_')
    Set-Content -Path (Join-Path $OutDir "$fileSafe.html") -Value $resReport.Content -Encoding UTF8
}

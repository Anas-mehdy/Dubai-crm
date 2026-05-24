$word = New-Object -ComObject Word.Application
$word.Visible = $false

$basePath = "c:\Users\anasm\OneDrive\Desktop\claude\Dubai Realestate\dubai-crm\read this"

$files = @(
    @{ In = "$basePath\WhatsApp_Automation_A_Enterprise.docx"; Out = "$basePath\A_Enterprise.txt" },
    @{ In = "$basePath\WhatsApp_Automation_B_FastLaunch.docx"; Out = "$basePath\B_FastLaunch.txt" },
    @{ In = "$basePath\WhatsApp_Automation_C_Dubai_Premium.docx"; Out = "$basePath\C_Dubai_Premium.txt" }
)

foreach ($f in $files) {
    $doc = $word.Documents.Open($f.In)
    $doc.Content.Text | Out-File -Encoding utf8 $f.Out
    $doc.Close()
}

$word.Quit()
Write-Host "Done extracting all 3 files"

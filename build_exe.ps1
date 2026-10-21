Get-Process -Name QLTBIT_Server, QLTBIT_Setup, Cai_Dat_QLTBIT -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$ico = Join-Path $PSScriptRoot 'app.ico'

# 1. Compile QLTBIT_Server.exe (Server Launcher)
$csLauncher = Join-Path $PSScriptRoot 'QLTBIT_Community_Launcher.cs'
$outServerExe = Join-Path $PSScriptRoot 'QLTBIT_Server.exe'
& $csc /target:winexe /win32icon:$ico /out:$outServerExe /r:System.dll,System.Windows.Forms.dll,System.Drawing.dll,System.Core.dll $csLauncher

if (Test-Path $outServerExe) {
    Write-Host "✅ Bien dich QLTBIT_Server.exe thanh cong!" -ForegroundColor Green
}

# 2. Compile QLTBIT_Setup.exe (Unified One-Click Installer Wizard)
$csInstaller = Join-Path $PSScriptRoot 'QLTBIT_Installer.cs'
$outSetupExe = Join-Path $PSScriptRoot 'QLTBIT_Setup.exe'
$outVnExe = Join-Path $PSScriptRoot 'Cai_Dat_QLTBIT.exe'
& $csc /target:winexe /win32icon:$ico /out:$outSetupExe /r:System.dll,System.Windows.Forms.dll,System.Drawing.dll,System.Core.dll $csInstaller

if (Test-Path $outSetupExe) {
    Copy-Item -Path $outSetupExe -Destination $outVnExe -Force
    Write-Host "✅ Bien dich QLTBIT_Setup.exe & Cai_Dat_QLTBIT.exe thanh cong!" -ForegroundColor Green
}

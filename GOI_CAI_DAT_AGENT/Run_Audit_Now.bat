@echo off
setlocal EnableDelayedExpansion
title SIMPLY IT - KIEM KE MAY TRAM TUC THI
chcp 65001 >nul 2>&1
cd /d "%~dp0"

:: 1. Kiem tra va xac dinh file script agent.ps1
set "SCRIPT_PATH="
if exist "%~dp0agent.ps1" set "SCRIPT_PATH=%~dp0agent.ps1"
if not defined SCRIPT_PATH if exist "C:\ProgramData\SimplyIT\agent.ps1" set "SCRIPT_PATH=C:\ProgramData\SimplyIT\agent.ps1"
if not defined SCRIPT_PATH if exist "%~dp0..\..\public\scripts\get_system_info.ps1" set "SCRIPT_PATH=%~dp0..\..\public\scripts\get_system_info.ps1"

if defined SCRIPT_PATH goto :HAVE_SCRIPT

echo.
echo ==============================================================================
echo [X] LOI: Khong tim thay file script thu thap agent.ps1!
echo ==============================================================================
echo Vui long kiem tra file 'agent.ps1' phai nam cung thu muc voi 'Run_Audit_Now.bat'.
echo.
pause
exit /b 1

:HAVE_SCRIPT
:: 2. Doc dia chi may chu da luu truoc do
set "SERVER_URL="
if exist "C:\ProgramData\SimplyIT\server_url.txt" (
    for /f "usebackq delims=" %%i in ("C:\ProgramData\SimplyIT\server_url.txt") do (
        if not "%%i"=="" set "SERVER_URL=%%i"
    )
)

if defined SERVER_URL goto :READY_SCAN

set "DEFAULT_SERVER=http://192.168.1.100:3000"
echo.
echo Nhap dia chi May Chu SIMPLY IT.
echo Vi du: http://192.168.1.9:3000 hoac https://it.mycompany.com:3443
set "SERVER_INPUT="
set /p "SERVER_INPUT=Dia chi May Chu [Mac dinh: !DEFAULT_SERVER!]: "
if "!SERVER_INPUT!"=="" set "SERVER_INPUT=!DEFAULT_SERVER!"
set "SERVER_URL=!SERVER_INPUT!"

:READY_SCAN
set "SERVER_URL=!SERVER_URL: =!"

:: Tu dong them http:// neu chua co
if not "!SERVER_URL:~0,7!"=="http://" if not "!SERVER_URL:~0,8!"=="https://" (
    set "SERVER_URL=http://!SERVER_URL!"
)

:: Tu dong them cong :3000 neu chua co dau hai cham
echo !SERVER_URL:~8! | findstr ":" >nul 2>&1
if !errorlevel! neq 0 (
    set "SERVER_URL=!SERVER_URL!:3000"
)

echo.
echo ==============================================================================
echo       SIMPLY IT - KIEM KE THONG SO MAY TRAM VA GUI VE MAY CHU
echo ==============================================================================
echo [*] Script  : !SCRIPT_PATH!
echo [*] May chu : !SERVER_URL!
echo.
echo [*] Dang quet phan cung, phan mem va kiem tra thay doi linh kien...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "!SCRIPT_PATH!" -ServerUrl "!SERVER_URL!" -Mode Inventory

echo.
echo ==============================================================================
echo [HOAN TAT] Qua trinh kiem ke va gui du lieu ve May Chu da ket thuc!
echo ==============================================================================
echo.
pause
exit /b 0

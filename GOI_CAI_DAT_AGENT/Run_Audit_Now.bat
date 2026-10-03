@echo off
title SIMPLY IT - KIEM KE MAY TRAM TUC THI
cd /d "%~dp0"

:: 1. Kiem tra va xac dinh file script agent.ps1
set "SCRIPT_PATH="
if exist "%~dp0agent.ps1" set "SCRIPT_PATH=%~dp0agent.ps1"
if not defined SCRIPT_PATH if exist "C:\ProgramData\SimplyIT\agent.ps1" set "SCRIPT_PATH=C:\ProgramData\SimplyIT\agent.ps1"
if not defined SCRIPT_PATH if exist "%~dp0..\..\public\scripts\get_system_info.ps1" set "SCRIPT_PATH=%~dp0..\..\public\scripts\get_system_info.ps1"

if not defined SCRIPT_PATH (
    echo [X] LOI: Khong tim thay file script thu thap agent.ps1!
    echo Vui long kiem tra file agent.ps1 phai nam cung thu muc voi Run_Audit_Now.bat.
    echo.
    pause
    exit /b 1
)

:: 2. Doc dia chi may chu da luu truoc do
set "SERVER_URL="
if exist "C:\ProgramData\SimplyIT\server_url.txt" (
    for /f "usebackq delims=" %%i in ("C:\ProgramData\SimplyIT\server_url.txt") do set "SERVER_URL=%%i"
)

if not defined SERVER_URL (
    set "DEFAULT_SERVER=http://192.168.1.100:3001"
    echo.
    echo Nhap dia chi May Chu SIMPLY IT (Vi du: http://192.168.1.9:3001)
    set /p "SERVER_INPUT=Dia chi May Chu [Mac dinh: %DEFAULT_SERVER%]: "
    if not defined SERVER_INPUT set "SERVER_INPUT=http://192.168.1.100:3001"
    set "SERVER_URL=%SERVER_INPUT%"
)

set "SERVER_URL=%SERVER_URL: =%"

echo.
echo ==============================================================================
echo       SIMPLY IT - KIEM KE THONG SO MAY TRAM VA GUI VE MAY CHU
echo ==============================================================================
echo [*] Script  : %SCRIPT_PATH%
echo [*] May chu : %SERVER_URL%
echo.
echo [*] Dang quet phan cung, phan mem va kiem tra thay doi linh kien...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%" -ServerUrl "%SERVER_URL%" -Mode Inventory

echo.
echo ==============================================================================
echo [HOAN TAT] Qua trinh kiem ke va gui du lieu ve May Chu da ket thuc!
echo ==============================================================================
echo.
pause

@echo off
title SIMPLY IT - CAI DAT AGENT GIAM SAT MAY TRAM
cd /d "%~dp0"

:: 1. Tu dong xin quyen Quan tri vien (Auto-Elevate Administrator)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Dang yeu cau quyen Quan tri vien (Administrator)...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cls
echo ==============================================================================
echo    SIMPLY IT - CAI DAT AGENT GIAM SAT MAY TRAM (MULTI-VLAN)
echo ==============================================================================
echo.
echo Agent se chay ngam dinh ky 15 phut de:
echo   - Tu dong kiem ke phan cung (CPU, RAM, O cung, Mainboard, GPU)
echo   - Tu dong kiem ke danh sach phan mem da cai dat tren may
echo   - Canh bao tuc thi khi co ai thao RAM, doi o cung, cai phan mem la
echo.
echo ==============================================================================

:: 2. Doc cau hinh cu neu co
set "DEFAULT_SERVER=http://192.168.1.100:3001"
if exist "C:\ProgramData\SimplyIT\server_url.txt" (
    for /f "usebackq delims=" %%i in ("C:\ProgramData\SimplyIT\server_url.txt") do set "DEFAULT_SERVER=%%i"
)

echo.
echo Nhap dia chi IP va Cong cua May Chu SIMPLY IT.
echo Vi du: http://192.168.1.9:3001 hoac https://it.mycompany.com:3443
echo (Neu chi nhap IP vi du 192.168.1.9, he thong se tu them http:// va :3001)
echo.
set /p "SERVER_INPUT=>> Dia chi May Chu [Mac dinh: %DEFAULT_SERVER%]: "
if not defined SERVER_INPUT set "SERVER_INPUT=%DEFAULT_SERVER%"

:: Loai bo khoang trang thua neu co
set "SERVER_URL=%SERVER_INPUT: =%"

:: Tu dong them http:// neu nguoi dung quen
if "%SERVER_URL:~0,7%" neq "http://" if "%SERVER_URL:~0,8%" neq "https://" (
    set "SERVER_URL=http://%SERVER_URL%"
)

:: Tu dong them cong :3001 neu chua co dau hai cham chi cong
set "CHECK_PORT=%SERVER_URL:~8%"
echo %CHECK_PORT% | findstr ":" >nul
if %errorlevel% neq 0 (
    set "SERVER_URL=%SERVER_URL%:3001"
)

echo.
echo [*] May Chu duoc ket noi: %SERVER_URL%

:: 3. Tao thu muc cai dat cho Agent
set "AGENT_DIR=C:\ProgramData\SimplyIT"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

:: Luu dia chi May Chu de Run_Audit_Now.bat va Agent su dung
echo %SERVER_URL%> "%AGENT_DIR%\server_url.txt"

:: 4. Sao chep file script agent.ps1 vao thu muc cai dat
echo [*] Dang sao chep script thu thap vao %AGENT_DIR%...
set "FOUND_SCRIPT=0"

if exist "%~dp0agent.ps1" (
    copy /Y "%~dp0agent.ps1" "%AGENT_DIR%\agent.ps1" >nul
    set "FOUND_SCRIPT=1"
) else if exist "%~dp0..\..\public\scripts\get_system_info.ps1" (
    copy /Y "%~dp0..\..\public\scripts\get_system_info.ps1" "%AGENT_DIR%\agent.ps1" >nul
    set "FOUND_SCRIPT=1"
)

if %FOUND_SCRIPT% neq 1 (
    echo [!] Khong tim thay file agent.ps1 noi bo, dang tai tu May Chu...
    powershell.exe -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%SERVER_URL%/api/scripts/agent' -OutFile '%AGENT_DIR%\agent.ps1' -TimeoutSec 15 } catch { Invoke-WebRequest -Uri '%SERVER_URL%/scripts/get_system_info.ps1' -OutFile '%AGENT_DIR%\agent.ps1' -TimeoutSec 15 }" >nul 2>&1
)

if not exist "%AGENT_DIR%\agent.ps1" (
    echo.
    echo [X] LOI: Khong tim thay file agent.ps1 va khong the tai tu May Chu!
    echo Vui long dam bao file 'agent.ps1' nam cung thu muc voi Install_Agent.bat.
    echo.
    pause
    exit /b 1
)

:: 5. Dang ky Scheduled Task chay ngam dinh ky 15 phut/lan
echo [*] Dang dang ky tac vu chay ngam (Task Scheduler: SimplyIT_Audit)...
schtasks /delete /tn "SimplyIT_Audit" /f >nul 2>&1

schtasks /create /tn "SimplyIT_Audit" ^
    /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%AGENT_DIR%\agent.ps1\" -ServerUrl \"%SERVER_URL%\" -Mode Inventory" ^
    /sc MINUTE /mo 15 ^
    /ru "SYSTEM" ^
    /rl HIGHEST /f >nul

if %errorLevel% equ 0 (
    echo.
    echo ==============================================================================
    echo [THANH CONG] DA CAI DAT AGENT GIAM SAT MAY TRAM HOAN TAT!
    echo ==============================================================================
    echo   - Ten tac vu : SimplyIT_Audit (Quyen SYSTEM chay ngam khong hien cua so)
    echo   - Dinh ky    : Tu dong quet va cap nhat moi 15 phut
    echo   - May chu    : %SERVER_URL%
    echo.
    echo [*] Dang kich hoat lan quet dau tien ve May Chu...
    schtasks /run /tn "SimplyIT_Audit" >nul 2>&1
    echo [OK] Da khoi dong lan quet dau tien thanh cong!
) else (
    echo.
    echo [X] LOI: Khong the dang ky Scheduled Task. Vui long kiem tra quyen Administrator!
)

echo.
pause

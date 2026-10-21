@echo off
setlocal EnableDelayedExpansion
title QLTBIT - CAI DAT AGENT GIAM SAT MAY TRAM
chcp 65001 >nul 2>&1
cd /d "%~dp0"

:: ==============================================================================
:: 1. KIEM TRA QUYEN ADMINISTRATOR VA TU DONG NANG QUYEN (AUTO-ELEVATE)
:: ==============================================================================
net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_AS_ADMIN

echo ==============================================================================
echo [*] Dang yeu cau quyen Quan tri vien...
echo ==============================================================================

:: Goi PowerShell de khoi chay lai file bat nay duoi quyen Administrator
:: Dung /k de cua so cmd luon duoc giu mo, khong bao gio bi tat ngum
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b

:: Neu khong the tu dong nang quyen, huong dan nguoi dung
cls
echo ==============================================================================
echo [CANH BAO] FILE CAN CHAY VOI QUYEN ADMINISTRATOR!
echo ==============================================================================
echo.
echo Vui long thuc hien:
echo   1. Dong cua so nay lai.
echo   2. Nhap CHUOT PHAI vao file 'Install_Agent.bat'
echo   3. Chon 'Run as administrator'.
echo.
echo ==============================================================================
pause
exit /b 1

:RUN_AS_ADMIN
cls
echo ==============================================================================
echo    QLTBIT - CAI DAT AGENT GIAM SAT MAY TRAM (MULTI-VLAN)
echo ==============================================================================
echo.
echo Agent se tu dong chay ngam dinh ky 15 phut de:
echo   - Tu dong kiem ke phan cung: CPU, RAM, O cung, Mainboard, Man hinh
echo   - Tu dong thu thap danh sach phan mem da cai dat tren may tram
echo   - Tu dong phat hien va canh bao thay doi phan cung hoac cai phan mem la
echo   - Chay ngam duoi quyen SYSTEM, khong hien cua so lam phien nguoi dung
echo.
echo ==============================================================================

:: ==============================================================================
:: 2. XAC DINH DIA CHI MAY CHU QLTBIT
:: ==============================================================================
set "DEFAULT_SERVER=http://192.168.1.100:3000"
if exist "C:\ProgramData\QLTBIT\server_url.txt" (
    for /f "usebackq delims=" %%i in ("C:\ProgramData\QLTBIT\server_url.txt") do (
        if not "%%i"=="" set "DEFAULT_SERVER=%%i"
    )
)

echo.
echo Nhap dia chi IP va Cong cua May Chu QLTBIT.
echo Vi du:
echo   - http://192.168.1.9:3000
echo   - 192.168.1.9
echo   - https://it.mycompany.com:3443
echo.

set "SERVER_INPUT="
set /p "SERVER_INPUT=>> Dia chi May Chu [Mac dinh: !DEFAULT_SERVER!]: "
if "!SERVER_INPUT!"=="" set "SERVER_INPUT=!DEFAULT_SERVER!"

:: Loai bo khoang trang thua
set "SERVER_URL=!SERVER_INPUT: =!"

:: Tu dong them http:// neu nguoi dung quen
if not "!SERVER_URL:~0,7!"=="http://" if not "!SERVER_URL:~0,8!"=="https://" (
    set "SERVER_URL=http://!SERVER_URL!"
)

:: Tu dong them cong :3000 neu chua co dau hai cham chi cong
echo !SERVER_URL:~8! | findstr ":" >nul 2>&1
if !errorlevel! neq 0 (
    set "SERVER_URL=!SERVER_URL!:3000"
)

echo.
echo [*] Dia chi May Chu duoc ket noi: !SERVER_URL!

:: ==============================================================================
:: 3. TAO THU MUC CAI DAT CHO AGENT
:: ==============================================================================
set "AGENT_DIR=C:\ProgramData\QLTBIT"
if not exist "!AGENT_DIR!" mkdir "!AGENT_DIR!" >nul 2>&1

:: Luu dia chi May Chu de Run_Audit_Now.bat va Agent su dung
echo !SERVER_URL!> "!AGENT_DIR!\server_url.txt"

:: ==============================================================================
:: 4. SAO CHEP FILE SCRIPT AGENT.PS1 VAO THU MUC CAI DAT
:: ==============================================================================
echo [*] Dang sao chep script thu thap vao !AGENT_DIR!...
set "FOUND_SCRIPT=0"

if exist "%~dp0agent.ps1" (
    copy /Y "%~dp0agent.ps1" "!AGENT_DIR!\agent.ps1" >nul
    set "FOUND_SCRIPT=1"
)
if !FOUND_SCRIPT! equ 0 if exist "%~dp0..\..\public\scripts\get_system_info.ps1" (
    copy /Y "%~dp0..\..\public\scripts\get_system_info.ps1" "!AGENT_DIR!\agent.ps1" >nul
    set "FOUND_SCRIPT=1"
)

if !FOUND_SCRIPT! equ 0 (
    echo [!] Khong tim thay file agent.ps1 cuc bo, dang tai tu May Chu...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '!SERVER_URL!/api/scripts/agent' -OutFile '!AGENT_DIR!\agent.ps1' -TimeoutSec 15 } catch { Invoke-WebRequest -Uri '!SERVER_URL!/scripts/get_system_info.ps1' -OutFile '!AGENT_DIR!\agent.ps1' -TimeoutSec 15 }" >nul 2>&1
)

if not exist "!AGENT_DIR!\agent.ps1" goto :ERROR_NO_SCRIPT

:: ==============================================================================
:: 5. DANG KY SCHEDULED TASK CHAY NGAM DINH KY 15 PHUT/LAN
:: ==============================================================================
echo [*] Dang dang ky tac vu chay ngam: Task Scheduler QLTBIT_Audit...
schtasks /delete /tn "QLTBIT_Audit" /f >nul 2>&1

schtasks /create /tn "QLTBIT_Audit" ^
    /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"!AGENT_DIR!\agent.ps1\" -ServerUrl \"!SERVER_URL!\" -Mode Inventory" ^
    /sc MINUTE /mo 15 ^
    /ru "SYSTEM" ^
    /rl HIGHEST /f >nul 2>&1

if !errorlevel! equ 0 goto :SUCCESS_INSTALL

:: Thu lai voi tai khoan nguoi dung hien tai neu quyen SYSTEM bi han che
echo [!] Thu dang ky tac vu duoi quyen User Administrator...
schtasks /create /tn "QLTBIT_Audit" ^
    /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"!AGENT_DIR!\agent.ps1\" -ServerUrl \"!SERVER_URL!\" -Mode Inventory" ^
    /sc MINUTE /mo 15 ^
    /rl HIGHEST /f >nul 2>&1

if !errorlevel! equ 0 goto :SUCCESS_INSTALL

goto :ERROR_SCHTASKS

:SUCCESS_INSTALL
echo.
echo ==============================================================================
echo [THANH CONG] DA CAI DAT AGENT GIAM SAT MAY TRAM HOAN TAT!
echo ==============================================================================
echo   - Ten tac vu : QLTBIT_Audit - Chay ngam tu dong, khong hien cua so
echo   - Dinh ky    : Tu dong quet va gui bao cao moi 15 phut
echo   - May chu    : !SERVER_URL!
echo   - Thu muc    : !AGENT_DIR!
echo.
echo [*] Dang kich hoat lan quet dau tien ve May Chu...
schtasks /run /tn "QLTBIT_Audit" >nul 2>&1
echo [OK] Da kich hoat tien trinh quet ngam thanh cong!
echo.
echo ==============================================================================
echo Ban co the chay file 'Run_Audit_Now.bat' bat cu luc nao de kiem tra ket qua.
echo ==============================================================================
echo.
pause
exit /b 0

:ERROR_NO_SCRIPT
echo.
echo ==============================================================================
echo [X] LOI: Khong tim thay file 'agent.ps1'!
echo ==============================================================================
echo Vui long kiem tra file 'agent.ps1' phai nam trong cung thu muc voi 'Install_Agent.bat'.
echo.
pause
exit /b 1

:ERROR_SCHTASKS
echo.
echo ==============================================================================
echo [X] LOI: Khong the dang ky Scheduled Task tren may nay!
echo ==============================================================================
echo Vui long dam bao ban da chay file voi quyen 'Run as administrator'.
echo.
pause
exit /b 1

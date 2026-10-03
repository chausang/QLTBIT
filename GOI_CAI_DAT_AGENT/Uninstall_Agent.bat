@echo off
setlocal EnableDelayedExpansion
title SIMPLY IT - GO BO AGENT KHOI MAY TRAM
chcp 65001 >nul 2>&1
cd /d "%~dp0"

:: Kiem tra quyen Administrator
net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_UNINSTALL

echo [*] Dang yeu cau quyen Quan tri vien...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b

cls
echo ==============================================================================
echo [CANH BAO] FILE CAN CHAY VOI QUYEN ADMINISTRATOR!
echo ==============================================================================
echo.
echo Vui long nhap CHUOT PHAI vao file nay va chon 'Run as administrator'.
echo.
pause
exit /b 1

:RUN_UNINSTALL
cls
echo ==============================================================================
echo       SIMPLY IT - GO BO AGENT GIAM SAT KHOI MAY TRAM
echo ==============================================================================
echo.
set "CONFIRM="
set /p "CONFIRM=Ban co chac chan muon go bo Agent khoi may nay? (y/N): "
if /i not "!CONFIRM!"=="y" (
    echo Da huy thao tac.
    pause
    exit /b 0
)

echo.
echo [*] Dang xoa tac vu ngam Task Scheduler: SimplyIT_Audit...
schtasks /delete /tn "SimplyIT_Audit" /f >nul 2>&1

echo [*] Dang xoa thu muc du lieu C:\ProgramData\SimplyIT...
if exist "C:\ProgramData\SimplyIT" rmdir /S /Q "C:\ProgramData\SimplyIT" >nul 2>&1

echo.
echo ==============================================================================
echo [OK] DA GO BO HOAN TOAN AGENT GIAM SAT SIMPLY IT KHOI MAY NAY!
echo ==============================================================================
echo.
pause
exit /b 0

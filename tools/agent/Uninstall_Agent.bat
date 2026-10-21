@echo off
title QLTBIT - GO BO AGENT KHOI MAY TRAM
cd /d "%~dp0"

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Dang yeu cau quyen Quan tri vien (Run as Administrator)...
    powershell.exe -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cls
echo ==============================================================================
echo       QLTBIT - GO BO AGENT GIAM SAT KHOI MAY TRAM
echo ==============================================================================
echo.
set /p "CONFIRM=Ban co chac chan muon go bo Agent khoi may nay? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Da huy thao tac.
    pause
    exit /b 0
)

echo.
echo [*] Dang xoa tac vu ngam Task Scheduler (QLTBIT_Audit)...
schtasks /delete /tn "QLTBIT_Audit" /f >nul 2>&1

echo [*] Dang xoa thu muc du lieu C:\ProgramData\QLTBIT...
rmdir /S /Q "C:\ProgramData\QLTBIT" >nul 2>&1

echo.
echo ==============================================================================
echo [OK] DA GO BO HOAN TOAN AGENT GIAM SAT QLTBIT KHOI MAY NAY!
echo ==============================================================================
echo.
pause

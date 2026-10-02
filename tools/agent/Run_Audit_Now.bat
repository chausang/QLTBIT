@echo off
chcp 65001 >nul
:: ==============================================================================
:: SIMPLY IT - RUN AUDIT ON DEMAND
:: ==============================================================================
echo [*] Đang thực thi kiểm kê phần cứng & phần mềm máy trạm ngay lập tức...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\public\scripts\get_system_info.ps1" -ServerUrl "http://localhost:3001" -Mode Inventory
echo.
pause

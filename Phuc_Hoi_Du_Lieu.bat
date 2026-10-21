@echo off
title QLTBIT - PHUC HOI TOAN BO DU LIEU HE THONG
chcp 65001 >nul
cd /d "%~dp0"
cls
echo ==============================================================================
echo       QLTBIT — PHUC HOI DU LIEU KHI CHUYEN MAY HOAC CAI LAI WINDOWS
echo ==============================================================================
echo.
python tools\backup_restore.py --restore

echo.
echo ==============================================================================
echo Hoàn tất thao tác phục hồi!
pause

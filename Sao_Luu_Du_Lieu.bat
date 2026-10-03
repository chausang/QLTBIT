@echo off
title SIMPLY IT - SAO LUU TOAN BO DU LIEU HE THONG
chcp 65001 >nul
cd /d "%~dp0"
cls
echo ==============================================================================
echo       SIMPLY IT — TRUNG TAM SAO LUU DU LIEU TOAN BO HE THONG (1-CLICK)
echo ==============================================================================
echo.
echo   [1] Sao lưu toàn bộ vào thư mục 'backups' của dự án (Mặc định)
echo   [2] Sao lưu nhanh trực tiếp vào ổ đĩa USB (Flash Drive cắm ngoài)
echo   [0] Thoát
echo.
set /p choice="👉 Nhập lựa chọn của bạn [1/2/0] (Mặc định: 1): "
if "%choice%"=="" set choice=1
if "%choice%"=="0" exit /b 0

if "%choice%"=="2" (
    python tools\backup_restore.py --usb
) else (
    python tools\backup_restore.py --backup
)

echo.
echo ==============================================================================
echo Hoàn tất thao tác sao lưu!
pause

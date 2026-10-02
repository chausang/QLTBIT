@echo off
chcp 65001 >nul
echo ========================================================
echo   SIMPLY IT - ĐỒNG BỘ MÃ NGUỒN LÊN 2 GITHUB REPOSITORIES
echo ========================================================
echo.

set GIT_EXE=d:\mingit\cmd\git.exe
if not exist "%GIT_EXE%" (
    set GIT_EXE=git.exe
)

echo [*] Kiểm tra trạng thái Git...
"%GIT_EXE%" status -s

echo.
echo [*] Đang đẩy mã nguồn lên Repository 1 (Simply-it-community)...
"%GIT_EXE%" push origin main

echo.
echo [*] Đang đẩy mã nguồn lên Repository 2 (Simply-IT)...
"%GIT_EXE%" push upstream main

echo.
echo [OK] Đã hoàn tất lệnh đồng bộ!
pause

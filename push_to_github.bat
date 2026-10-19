@echo off
chcp 65001 >nul
echo ========================================================
echo   QLTBIT - ĐỒNG BỘ MÃ NGUỒN LÊN GITHUB (chausang/QLTBIT)
echo ========================================================
echo.

set GIT_EXE=d:\mingit\cmd\git.exe
if not exist "%GIT_EXE%" (
    set GIT_EXE=git.exe
)

echo [*] Kiểm tra trạng thái Git...
"%GIT_EXE%" status -s

echo.
echo [*] Đang đẩy mã nguồn lên GitHub (origin main -> chausang/QLTBIT)...
"%GIT_EXE%" push origin main

echo.
echo [OK] Đã hoàn tất lệnh đồng bộ!
pause

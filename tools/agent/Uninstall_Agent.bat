@echo off
chcp 65001 >nul
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Vui lòng chạy với quyền Administrator!
    pause
    exit /b 1
)

echo [*] Đang gỡ bỏ Scheduled Task SimplyIT_Audit...
schtasks /delete /tn "SimplyIT_Audit" /f >nul 2>&1

echo [*] Dọn dẹp thư mục C:\ProgramData\SimplyIT...
rmdir /S /Q "C:\ProgramData\SimplyIT" >nul 2>&1

echo.
echo [OK] Đã gỡ bỏ Agent giám sát SIMPLY IT hoàn toàn khỏi máy trạm!
pause

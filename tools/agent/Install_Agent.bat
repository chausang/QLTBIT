@echo off
chcp 65001 >nul
:: ==============================================================================
:: SIMPLY IT - WORKSTATION AGENT INSTALLER (Multi-VLAN Compatible)
:: ==============================================================================
:: Chạy file này trên bất kỳ máy trạm Windows nào trong mạng LAN (kể cả khác VLAN)
:: để cài đặt dịch vụ tự động giám sát phần cứng, phần mềm và phát hiện thay đổi!
:: ==============================================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ==============================================================================
    echo [!] CẢNH BÁO: BẠN CẦN CHẠY VỚI QUYỀN QUẢN TRỊ VIÊN (RUN AS ADMINISTRATOR)
    echo Nhấp chuột phải vào file này ^> Chọn 'Run as administrator'
    echo ==============================================================================
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo    SIMPLY IT - CÀI ĐẶT AGENT GIÁM SÁT MÁY TRẠM (MULTI-VLAN)
echo ==============================================================================
echo.

set DEFAULT_SERVER=http://192.168.1.100:3001
set /p SERVER_URL="Nhập địa chỉ máy chủ SIMPLY IT [Mặc định: %DEFAULT_SERVER%]: "
if "%SERVER_URL%"=="" set SERVER_URL=%DEFAULT_SERVER%

echo [*] Cấu hình máy chủ: %SERVER_URL%

set AGENT_DIR=C:\ProgramData\SimplyIT
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

echo [*] Sao chép script thu thập thông tin...
copy /Y "%~dp0..\..\public\scripts\get_system_info.ps1" "%AGENT_DIR%\agent.ps1" >nul
if not exist "%AGENT_DIR%\agent.ps1" (
    echo [!] Không tìm thấy get_system_info.ps1 gốc, đang tải từ máy chủ...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SERVER_URL%/scripts/get_system_info.ps1' -OutFile '%AGENT_DIR%\agent.ps1'"
)

echo [*] Tạo tác vụ chạy ngầm định kỳ (Scheduled Task: SimplyIT_Audit)...
schtasks /delete /tn "SimplyIT_Audit" /f >nul 2>&1

schtasks /create /tn "SimplyIT_Audit" ^
    /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%AGENT_DIR%\agent.ps1\" -ServerUrl \"%SERVER_URL%\" -Mode Inventory" ^
    /sc MINUTE /mo 15 ^
    /ru "SYSTEM" ^
    /rl HIGHEST /f >nul

if %errorLevel% equ 0 (
    echo.
    echo [OK] Đã cài đặt Scheduled Task thành công!
    echo [*] Đang kích hoạt lần quét đầu tiên để gửi thông số về máy chủ...
    schtasks /run /tn "SimplyIT_Audit" >nul 2>&1
    echo.
    echo ==============================================================================
    echo [THANH CONG] Máy trạm đã được kết nối với hệ thống SIMPLY IT!
    echo - Định kỳ: Tự động quét và cập nhật mỗi 15 phút.
    echo - Cảnh báo: Tự động phát hiện khi tháo/lắp RAM, đổi ổ cứng, cài/gỡ phần mềm.
    echo ==============================================================================
) else (
    echo [X] Có lỗi khi tạo Scheduled Task. Vui lòng kiểm tra quyền Administrator!
)

echo.
pause

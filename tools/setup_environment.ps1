# ==============================================================================
# QLTBIT - CÔNG CỤ TỰ ĐỘNG KIỂM TRA & CÀI ĐẶT MÔI TRƯỜNG HỆ THỐNG
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "       QLTBIT — KIỂM TRA VÀ THIẾT LẬP MÔI TRƯỜNG CHẠY PHẦN MỀM" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiểm tra Python
Write-Host "[1/4] Kiểm tra Python..." -NoNewline
try {
    $pyVer = python --version 2>&1
    Write-Host " [OK] $pyVer" -ForegroundColor Green
} catch {
    Write-Host " [CẢNH BÁO] Chưa cài Python. Các công cụ scanner cần Python 3." -ForegroundColor Yellow
}

# 2. Kiểm tra Node.js
Write-Host "[2/4] Kiểm tra Node.js..." -NoNewline
$hasNode = $false
try {
    $nodeVer = node --version 2>&1
    if ($nodeVer -match "v\d+") {
        $hasNode = $true
        Write-Host " [OK] $nodeVer" -ForegroundColor Green
    } else {
        Write-Host " [CHƯA CÀI ĐẶT]" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [CHƯA CÀI ĐẶT]" -ForegroundColor Yellow
}

if (-not $hasNode) {
    Write-Host ""
    Write-Host ">>> Máy tính của bạn chưa có Node.js (cần thiết để chạy giao diện Web)." -ForegroundColor Yellow
    $ans = Read-Host "Bạn có muốn hệ thống tự động cài đặt Node.js LTS qua winget không? (y/n)"
    if ($ans.Trim().ToLower() -eq 'y') {
        Write-Host "Đang tải và cài đặt Node.js LTS..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        Write-Host "Sau khi cài xong, vui lòng khởi động lại cửa sổ dòng lệnh để nhận diện lệnh node!" -ForegroundColor Green
    } else {
        Write-Host "Bạn có thể tự tải file cài đặt Node.js tại: https://nodejs.org/" -ForegroundColor Cyan
    }
}

# 3. Kiểm tra Cơ sở dữ liệu PostgreSQL
Write-Host ""
Write-Host "[3/4] Kiểm tra kết nối PostgreSQL trên cổng 5432..." -NoNewline
$hasDb = $false
try {
    $tcp = Test-NetConnection -ComputerName "127.0.0.1" -Port 5432 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        $hasDb = $true
        Write-Host " [OK] Đã kết nối được cổng 5432!" -ForegroundColor Green
    } else {
        Write-Host " [CHƯA CÓ]" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [CHƯA CÓ]" -ForegroundColor Yellow
}

if (-not $hasDb) {
    Write-Host ">>> Chưa phát hiện máy chủ PostgreSQL đang chạy trên cổng 5432." -ForegroundColor Yellow
    Write-Host "    Gợi ý:" -ForegroundColor White
    Write-Host "    - Cách 1 (Khuyên dùng): Cài Docker Desktop và chạy lệnh: docker compose up -d" -ForegroundColor White
    Write-Host "    - Cách 2: Tải và cài đặt PostgreSQL 16 từ: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads" -ForegroundColor White
}

# 4. Kiểm tra mã nguồn và thư viện
Write-Host ""
Write-Host "[4/4] Kiểm tra thư mục dự án..."
$pkgPath = Join-Path $PSScriptRoot "..\package.json"
if (Test-Path $pkgPath) {
    Write-Host " [OK] Mã nguồn QLTBIT đã có đầy đủ tại D:\QLTBIT" -ForegroundColor Green
    
    $nodeModules = Join-Path $PSScriptRoot "..\node_modules"
    if (Test-Path $nodeModules) {
        Write-Host " [OK] Thư viện node_modules đã có sẵn." -ForegroundColor Green
    } else {
        Write-Host " [i] Chưa có thư viện node_modules." -ForegroundColor White
        if ($hasNode) {
            $ans = Read-Host "Bạn có muốn chạy 'npm install' và khởi tạo database ngay bây giờ không? (y/n)"
            if ($ans.Trim().ToLower() -eq 'y') {
                Set-Location (Join-Path $PSScriptRoot "..")
                npm install
                npx prisma db push
                npm run seed
            }
        }
    }
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "Hoàn tất kiểm tra môi trường!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan

@echo off
title SIMPLY IT - TRUNG TAM DIEU HANH QUAN TRI TAI SAN CNTT
cd /d "%~dp0"
python qltbit_manager.py
if %errorlevel% neq 0 (
    echo.
    echo Khong the khoi chay bang Python. Dang mo truc tiep SimplyIT_Server.exe...
    start SimplyIT_Server.exe
)
pause

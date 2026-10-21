#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
QLTBIT - TRUNG TÂM ĐIỀU HÀNH & QUẢN TRỊ TÀI SẢN CNTT (D:\QLTBIT)
==============================================================================
"""

import sys
import os
import subprocess
import shutil
import time
import webbrowser

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_banner():
    print("=" * 78)
    print("      HỆ THỐNG QUẢN TRỊ TÀI SẢN CNTT (ITSM) — QLTBIT COMMUNITY")
    print(f"      Thư mục dự án: {PROJECT_DIR}")
    print("=" * 78)
    print()

def start_server():
    print("\n[*] Đang khởi động Máy chủ QLTBIT Server...")
    exe_path = os.path.join(PROJECT_DIR, "QLTBIT_Server.exe")
    if os.path.exists(exe_path):
        subprocess.Popen([exe_path], cwd=PROJECT_DIR, shell=True)
        print("[OK] Đã bật QLTBIT_Server.exe ngầm dưới khay hệ thống (System Tray)!")
    else:
        print("[!] Không tìm thấy QLTBIT_Server.exe, đang biên dịch từ mã nguồn C#...")
        ps_script = os.path.join(PROJECT_DIR, "build_exe.ps1")
        subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", ps_script], cwd=PROJECT_DIR)
        if os.path.exists(exe_path):
            subprocess.Popen([exe_path], cwd=PROJECT_DIR, shell=True)
            print("[OK] Đã biên dịch và bật QLTBIT_Server.exe!")
    input("\nNhấn Enter để tiếp tục...")

def launch_gui_scanner():
    print("\n[*] Đang mở Giao diện Quét mạng Đa VLAN (GUI)...")
    gui_script = os.path.join(PROJECT_DIR, "tools", "vlan_scanner_gui.py")
    subprocess.Popen([sys.executable, gui_script], cwd=PROJECT_DIR)

def launch_cli_scanner():
    print("\n" + "=" * 78)
    print("   QUÉT MẠNG TỰ ĐỘNG ĐA VLAN (DÒNG LỆNH)")
    print("=" * 78)
    default_subnets = "192.168.1.0/24,192.168.10.0/24,192.168.50.0/24"
    val = input(f"Nhập các dải VLAN cần quét [Mặc định: {default_subnets}]: ").strip()
    subnets = val if val else default_subnets
    
    cli_script = os.path.join(PROJECT_DIR, "tools", "vlan_scanner.py")
    subprocess.run([sys.executable, cli_script, "--subnets", subnets, "--threads", "60"], cwd=PROJECT_DIR)
    input("\nNhấn Enter để tiếp tục...")

def build_agent_package():
    print("\n" + "=" * 78)
    print("   ĐÓNG GÓI BỘ CÀI ĐẶT AGENT CHO MÁY TRẠM KHÁCH (MULTI-VLAN)")
    print("=" * 78)
    out_dir = os.path.join(PROJECT_DIR, "GOI_CAI_DAT_AGENT")
    os.makedirs(out_dir, exist_ok=True)
    
    shutil.copy2(os.path.join(PROJECT_DIR, "public", "scripts", "get_system_info.ps1"), os.path.join(out_dir, "agent.ps1"))
    shutil.copy2(os.path.join(PROJECT_DIR, "tools", "agent", "Install_Agent.bat"), os.path.join(out_dir, "Install_Agent.bat"))
    shutil.copy2(os.path.join(PROJECT_DIR, "tools", "agent", "Uninstall_Agent.bat"), os.path.join(out_dir, "Uninstall_Agent.bat"))
    shutil.copy2(os.path.join(PROJECT_DIR, "tools", "agent", "Run_Audit_Now.bat"), os.path.join(out_dir, "Run_Audit_Now.bat"))

    readme_content = """HƯỚNG DẪN CÀI ĐẶT AGENT GIÁM SÁT MÁY TRẠM QLTBIT
1. Copy toàn bộ thư mục 'GOI_CAI_DAT_AGENT' sang máy trạm hoặc đưa lên mạng nội bộ.
2. Nhấp chuột phải vào file 'Install_Agent.bat' -> Chọn 'Run as administrator'.
3. Nhập địa chỉ IP của máy chủ QLTBIT (ví dụ: http://192.168.1.100:3001).
4. Hệ thống sẽ tự động đăng ký Scheduled Task chạy ngầm định kỳ 15 phút/lần.
5. Khi có bất kỳ thay đổi nào (tháo RAM, đổi ổ cứng, cài thêm/gỡ bỏ phần mềm), máy chủ sẽ nhận được cảnh báo ngay!
"""
    with open(os.path.join(out_dir, "HUONG_DAN_SU_DUNG.txt"), "w", encoding="utf-8") as f:
        f.write(readme_content)

    print(f"\n[OK] Đã đóng gói thành công gói cài đặt Agent tại:")
    print(f"     {out_dir}")
    print("\nBạn có thể copy thư mục này lên USB hoặc chia sẻ qua GPO / mạng nội bộ.")
    input("\nNhấn Enter để tiếp tục...")

def open_dashboard():
    print("\n[*] Đang mở trang quản trị QLTBIT trên trình duyệt...")
    webbrowser.open("http://localhost:3001")

def check_env():
    print("\n[*] Đang kiểm tra môi trường hệ thống...")
    setup_script = os.path.join(PROJECT_DIR, "tools", "setup_environment.ps1")
    subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", setup_script], cwd=PROJECT_DIR)
    input("\nNhấn Enter để tiếp tục...")

def launch_installer():
    print("\n[*] Đang mở Trình Cài Đặt Trọn Gói QLTBIT (Setup Wizard)...")
    installer_exe = os.path.join(PROJECT_DIR, "QLTBIT_Setup.exe")
    if os.path.exists(installer_exe):
        subprocess.Popen([installer_exe], cwd=PROJECT_DIR, shell=True)
        print("[OK] Đã mở giao diện Cài Đặt QLTBIT thành công!")
    else:
        check_env()

def open_word_guide():
    doc_path = os.path.join(PROJECT_DIR, "HUONG_DAN_SU_DUNG_VA_CAI_DAT_QLTBIT.docx")
    if os.path.exists(doc_path):
        print("\n[*] Đang mở Tài liệu Hướng dẫn Sử dụng (Word)...")
        if os.name == 'nt':
            os.startfile(doc_path)
    else:
        print("\n[!] Đang khởi tạo lại tài liệu Word...")
        gen_script = os.path.join(PROJECT_DIR, "scripts", "generate_docx_guide.py")
        if os.path.exists(gen_script):
            subprocess.run([sys.executable, gen_script], cwd=PROJECT_DIR)
            if os.path.exists(doc_path) and os.name == 'nt':
                os.startfile(doc_path)

def open_project_folder():
    if os.name == 'nt':
        os.startfile(PROJECT_DIR)

def launch_backup_restore():
    bk_script = os.path.join(PROJECT_DIR, "tools", "backup_restore.py")
    subprocess.run([sys.executable, bk_script], cwd=PROJECT_DIR)

def main_menu():
    while True:
        clear_screen()
        print_banner()
        print("  [1] 🚀 Khởi động Máy chủ QLTBIT (Chạy giao diện Server & Khay hệ thống)")
        print("  [2] 📡 Bật Công cụ Quét mạng Đa VLAN (Giao diện đồ họa GUI trực quan)")
        print("  [3] ⚡ Quét mạng Đa VLAN bằng Dòng lệnh (CLI Scanner siêu tốc)")
        print("  [4] 📦 Tạo Gói cài đặt Agent cho Máy trạm (Đóng gói gửi qua GPO / USB)")
        print("  [5] 🌐 Mở Trang Quản trị trên Trình duyệt (http://localhost:3001)")
        print("  [6] 🛠️  Mở Trình Cài Đặt Trọn Gói (QLTBIT_Setup.exe - Cài Server & Agent)")
        print("  [7] 📖 Mở Tài Liệu Hướng Dẫn Chi Tiết (File Word: Cài đặt & Sử dụng)")
        print("  [8] 💾 Sao Lưu & Phục Hồi Dữ Liệu (Backup/Restore chuyển máy, lỗi Win)")
        print("  [9] 📂 Mở Thư mục dự án trong Windows Explorer")
        print()
        print("  [0] ❌ Thoát")
        print()
        print("=" * 78)
        choice = input("👉 Chọn một chức năng [0-9]: ").strip()

        if choice == '1':
            start_server()
        elif choice == '2':
            launch_gui_scanner()
        elif choice == '3':
            launch_cli_scanner()
        elif choice == '4':
            build_agent_package()
        elif choice == '5':
            open_dashboard()
        elif choice == '6':
            launch_installer()
        elif choice == '7':
            open_word_guide()
        elif choice == '8':
            launch_backup_restore()
        elif choice == '9':
            open_project_folder()
        elif choice == '0':
            print("\nTạm biệt!")
            break
        else:
            print("[!] Lựa chọn không hợp lệ!")
            time.sleep(1)


if __name__ == "__main__":
    main_menu()

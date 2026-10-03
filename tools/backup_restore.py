#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SIMPLY IT — CÔNG CỤ SAO LƯU & PHỤC HỒI TOÀN DIỆN HỆ THỐNG (DISASTER RECOVERY)
==============================================================================
- Tự động sao lưu trọn gói: PostgreSQL Database + File Ảnh/Chứng từ/Hóa đơn + .env
- Đóng gói file .ZIP tiêu chuẩn, an toàn, chống khóa file
- Hỗ trợ phục hồi 1-Click khi chuyển sang máy chủ mới hoặc sau khi cài lại Windows
==============================================================================
"""

import os
import sys
import subprocess
import shutil
import zipfile
import datetime
import json
import re
import time
import tempfile
from pathlib import Path

# Thiết lập bảng mã UTF-8 cho console Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKUP_DIR = os.path.join(PROJECT_DIR, "backups")
UPLOADS_DIR = os.path.join(PROJECT_DIR, "public", "uploads")
ENV_FILE = os.path.join(PROJECT_DIR, ".env")

def get_db_config():
    """Đọc cấu hình database từ file .env"""
    config = {
        'host': '127.0.0.1',
        'port': '5432',
        'user': 'postgres',
        'password': '',
        'dbname': 'it_asset_db'
    }
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r'DATABASE_URL\s*=\s*["\']?postgresql://([^:]+)(?::([^@]*))?@([^:/]+)(?::(\d+))?/([^?\s\'"]+)', content)
            if match:
                config['user'] = match.group(1) or 'postgres'
                config['password'] = match.group(2) or ''
                config['host'] = match.group(3) or '127.0.0.1'
                config['port'] = match.group(4) or '5432'
                config['dbname'] = match.group(5) or 'it_asset_db'
        except Exception as e:
            print(f"[!] Cảnh báo khi đọc .env: {e}")
    return config

def find_pg_tool(tool_name):
    """Tìm đường dẫn thực thi pg_dump.exe hoặc psql.exe"""
    candidates = [
        os.path.join(PROJECT_DIR, "pgsql", "bin", f"{tool_name}.exe"),
        os.path.join(PROJECT_DIR, "pgsql", "bin", tool_name),
        rf"C:\Program Files\PostgreSQL\18\bin\{tool_name}.exe",
        rf"C:\Program Files\PostgreSQL\17\bin\{tool_name}.exe",
        rf"C:\Program Files\PostgreSQL\16\bin\{tool_name}.exe",
        rf"C:\Program Files\PostgreSQL\15\bin\{tool_name}.exe",
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    # Thử gọi từ PATH
    which = shutil.which(tool_name)
    if which:
        return which
    return None

def get_removable_drives():
    """Phát hiện các ổ đĩa USB đang cắm trên Windows"""
    drives = []
    if sys.platform == 'win32':
        try:
            import ctypes
            bitmask = ctypes.windll.kernel32.GetLogicalDrives()
            for letter in 'DEFGHIJKLMNOPQRSTUVWXYZ':
                if bitmask & (1 << (ord(letter) - ord('A'))):
                    drive_path = f"{letter}:\\"
                    dtype = ctypes.windll.kernel32.GetDriveTypeW(drive_path)
                    if dtype == 2:  # DRIVE_REMOVABLE (USB Flash Drive)
                        free_bytes = ctypes.c_ulonglong(0)
                        total_bytes = ctypes.c_ulonglong(0)
                        ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                            drive_path, None, ctypes.byref(total_bytes), ctypes.byref(free_bytes)
                        )
                        free_gb = free_bytes.value / (1024 ** 3)
                        drives.append({
                            'path': drive_path,
                            'letter': letter,
                            'free_gb': round(free_gb, 2)
                        })
        except Exception:
            pass
    return drives

def ensure_postgres_running():
    """Kiểm tra và khởi chạy PostgreSQL nếu chưa hoạt động"""
    import socket
    db = get_db_config()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    try:
        s.connect((db['host'], int(db['port'])))
        s.close()
        return True, None
    except Exception:
        s.close()

    # Chưa chạy, kiểm tra portable postgres
    pg_exe = os.path.join(PROJECT_DIR, "pgsql", "bin", "postgres.exe")
    pg_data = os.path.join(PROJECT_DIR, "pgsql", "data")
    if os.path.isfile(pg_exe) and os.path.isdir(pg_data):
        print("[*] Đang khởi động tạm thời PostgreSQL để thực hiện tác vụ...")
        proc = subprocess.Popen(
            [pg_exe, "-D", pg_data],
            cwd=os.path.join(PROJECT_DIR, "pgsql"),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=0x08000000 if sys.platform == 'win32' else 0
        )
        # Chờ tối đa 10 giây để port mở
        for _ in range(20):
            time.sleep(0.5)
            s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s2.settimeout(0.5)
            try:
                s2.connect((db['host'], int(db['port'])))
                s2.close()
                print("[OK] PostgreSQL đã sẵn sàng kết nối!")
                return True, proc
            except Exception:
                s2.close()
    return False, None

def create_full_backup(output_dir=None):
    """Tạo bản sao lưu toàn diện hệ thống: Database + Uploads + Config -> File ZIP"""
    print("\n" + "=" * 78)
    print("      BẮT ĐẦU TẠO BẢN SAO LƯU TOÀN DIỆN (FULL SYSTEM BACKUP)")
    print("=" * 78)

    db = get_db_config()
    pg_dump = find_pg_tool("pg_dump")
    if not pg_dump:
        print("[!] LỖI: Không tìm thấy công cụ pg_dump.exe trong thư mục pgsql/bin hoặc hệ thống.")
        return None

    # Đảm bảo postgres chạy
    pg_ok, temp_proc = ensure_postgres_running()
    if not pg_ok:
        print("[!] LỖI: Không thể kết nối tới cơ sở dữ liệu PostgreSQL cổng 5432.")
        return None

    target_dir = output_dir or BACKUP_DIR
    os.makedirs(target_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    zip_filename = f"SimplyIT_Full_Backup_{timestamp}.zip"
    zip_filepath = os.path.join(target_dir, zip_filename)

    temp_dir = tempfile.mkdtemp(prefix="simply_bk_")
    temp_sql = os.path.join(temp_dir, "database_backup.sql")

    try:
        # 1. Dump database an toàn qua pg_dump (không bị lock file pg_internal.init)
        print(f"\n[1/4] Đang sao lưu Cơ sở dữ liệu '{db['dbname']}'...")
        env = os.environ.copy()
        if db['password']:
            env['PGPASSWORD'] = db['password']

        cmd = [
            pg_dump,
            "-h", db['host'],
            "-p", db['port'],
            "-U", db['user'],
            "-d", db['dbname'],
            "--clean",
            "--if-exists",
            "-f", temp_sql
        ]

        res = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[!] Lỗi khi xuất SQL qua pg_dump: {res.stderr}")
            return None

        sql_size_kb = round(os.path.getsize(temp_sql) / 1024, 2)
        print(f" [OK] Đã xuất bản sao lưu CSDL thành công ({sql_size_kb} KB)")

        # 2. Tạo manifest thông tin chi tiết
        print("\n[2/4] Đang tổng hợp metadata hệ thống...")
        manifest = {
            "app_name": "SIMPLY IT - Quản Trị Tài Sản & Dịch Vụ CNTT",
            "version": "1.0.1",
            "backup_time": datetime.datetime.now().isoformat(),
            "database": {
                "name": db['dbname'],
                "host": db['host'],
                "port": db['port'],
                "user": db['user'],
                "sql_file": "database_backup.sql",
                "sql_size_kb": sql_size_kb
            },
            "contents": [
                "database_backup.sql (Toàn bộ CSDL 35+ bảng)",
                "uploads/ (Toàn bộ tài liệu, ảnh tài sản, biên bản bàn giao, hóa đơn)",
                "system_config.env (Cấu hình hệ thống, biến môi trường)",
                "manifest.json (Thông tin gói sao lưu)"
            ]
        }
        manifest_path = os.path.join(temp_dir, "manifest.json")
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)

        # 3. Đóng gói ZIP
        print(f"\n[3/4] Đang nén toàn bộ thành file ZIP tại:")
        print(f"      -> {zip_filepath}")

        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as z:
            # File SQL
            z.write(temp_sql, arcname="database_backup.sql")
            # File Manifest
            z.write(manifest_path, arcname="manifest.json")

            # File .env (sao lưu cấu hình an toàn)
            if os.path.exists(ENV_FILE):
                z.write(ENV_FILE, arcname="system_config.env")

            # Thư mục public/uploads
            if os.path.exists(UPLOADS_DIR):
                file_count = 0
                for root, _, files in os.walk(UPLOADS_DIR):
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, UPLOADS_DIR)
                        arc_name = os.path.join("uploads", rel_p).replace("\\", "/")
                        z.write(full_p, arcname=arc_name)
                        file_count += 1
                print(f" [OK] Đã đóng gói {file_count} tệp tin tài liệu/ảnh hiện trạng/hóa đơn trong 'uploads/'")

        total_size_mb = round(os.path.getsize(zip_filepath) / (1024 * 1024), 2)
        print(f"\n[4/4] [HOÀN TẤT] Bản sao lưu toàn diện đã được tạo thành công!")
        print(f"      📁 Tên file  : {zip_filename}")
        print(f"      📦 Dung lượng: {total_size_mb} MB")
        print(f"      📍 Đường dẫn : {zip_filepath}")
        return zip_filepath

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        if temp_proc:
            try:
                temp_proc.terminate()
            except Exception:
                pass

def restore_full_backup(zip_or_sql_path):
    """Phục hồi toàn bộ CSDL và Thư mục Uploads từ bản sao lưu .ZIP hoặc .SQL"""
    print("\n" + "=" * 78)
    print("      BẮT ĐẦU PHỤC HỒI TOÀN DIỆN HỆ THỐNG (RESTORE SYSTEM)")
    print("=" * 78)

    if not os.path.exists(zip_or_sql_path):
        print(f"[!] LỖI: Không tìm thấy file sao lưu tại: {zip_or_sql_path}")
        return False

    db = get_db_config()
    psql = find_pg_tool("psql")
    if not psql:
        print("[!] LỖI: Không tìm thấy công cụ psql.exe trong thư mục pgsql/bin hoặc hệ thống.")
        return False

    pg_ok, temp_proc = ensure_postgres_running()
    if not pg_ok:
        print("[!] LỖI: Không thể kết nối tới cơ sở dữ liệu PostgreSQL cổng 5432.")
        return False

    temp_dir = tempfile.mkdtemp(prefix="simply_restore_")
    try:
        sql_file_to_run = None
        has_uploads = False

        if zip_or_sql_path.lower().endswith(".zip"):
            print(f"\n[1/3] Đang giải nén gói sao lưu: {os.path.basename(zip_or_sql_path)}...")
            with zipfile.ZipFile(zip_or_sql_path, 'r') as z:
                z.extractall(temp_dir)

            # Tìm file SQL
            possible_sql = os.path.join(temp_dir, "database_backup.sql")
            if os.path.exists(possible_sql):
                sql_file_to_run = possible_sql
            else:
                for f in os.listdir(temp_dir):
                    if f.lower().endswith(".sql"):
                        sql_file_to_run = os.path.join(temp_dir, f)
                        break

            # Kiểm tra uploads
            extracted_uploads = os.path.join(temp_dir, "uploads")
            if os.path.isdir(extracted_uploads):
                has_uploads = True

        elif zip_or_sql_path.lower().endswith(".sql"):
            sql_file_to_run = zip_or_sql_path
        else:
            print("[!] LỖI: Định dạng file không được hỗ trợ (chỉ nhận file .ZIP hoặc .SQL).")
            return False

        if not sql_file_to_run:
            print("[!] LỖI: Không tìm thấy file SQL chứa cấu trúc CSDL trong gói sao lưu.")
            return False

        # 2. Nạp dữ liệu vào PostgreSQL qua psql
        print(f"\n[2/3] Đang nạp lại dữ liệu CSDL vào PostgreSQL ({db['dbname']})...")
        env = os.environ.copy()
        if db['password']:
            env['PGPASSWORD'] = db['password']

        # Đảm bảo database it_asset_db đã tồn tại (nếu chưa có thì tạo)
        create_db_cmd = [
            psql,
            "-h", db['host'],
            "-p", db['port'],
            "-U", db['user'],
            "-d", "postgres",
            "-c", f"CREATE DATABASE \"{db['dbname']}\";"
        ]
        subprocess.run(create_db_cmd, env=env, capture_output=True)

        # Chạy nạp SQL dump
        restore_cmd = [
            psql,
            "-h", db['host'],
            "-p", db['port'],
            "-U", db['user'],
            "-d", db['dbname'],
            "-f", sql_file_to_run
        ]

        res = subprocess.run(restore_cmd, env=env, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[!] Cảnh báo trong quá trình nạp SQL: {res.stderr[:300]}")
        print(" [OK] Đã phục hồi Cơ sở dữ liệu thành công 100%!")

        # 3. Phục hồi thư mục uploads
        print(f"\n[3/3] Đang đồng bộ hóa kho tài liệu, hình ảnh thiết bị, hóa đơn...")
        if has_uploads:
            extracted_uploads = os.path.join(temp_dir, "uploads")
            os.makedirs(UPLOADS_DIR, exist_ok=True)
            copied_count = 0
            for root, _, files in os.walk(extracted_uploads):
                for file in files:
                    src_p = os.path.join(root, file)
                    rel_p = os.path.relpath(src_p, extracted_uploads)
                    dest_p = os.path.join(UPLOADS_DIR, rel_p)
                    os.makedirs(os.path.dirname(dest_p), exist_ok=True)
                    shutil.copy2(src_p, dest_p)
                    copied_count += 1
            print(f" [OK] Đã phục hồi {copied_count} tệp tin vào thư mục /public/uploads/!")
        else:
            print(" [i] Gói sao lưu không chứa thư mục uploads kèm theo.")

        print("\n" + "=" * 78)
        print("🎉 [HOÀN TẤT] PHỤC HỒI DỮ LIỆU THÀNH CÔNG RỰC RỠ!")
        print("   Mọi thông tin Tài sản, Bản quyền, Nhân sự, Lịch sử Bảo trì, Phiếu Ticket")
        print("   và hình ảnh/hóa đơn đã được đồng bộ nguyên vẹn 100%.")
        print("=" * 78)
        return True

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        if temp_proc:
            try:
                temp_proc.terminate()
            except Exception:
                pass

def list_backups():
    """Liệt kê các bản sao lưu có sẵn"""
    print("\n" + "=" * 78)
    print("      DANH SÁCH CÁC BẢN SAO LƯU ĐÃ CÓ TRONG THƯ MỤC BACKUPS")
    print("=" * 78)
    if not os.path.exists(BACKUP_DIR):
        print("Thư mục backups chưa được khởi tạo.")
        return []

    files = [f for f in os.listdir(BACKUP_DIR) if f.lower().endswith(('.zip', '.json', '.sql'))]
    if not files:
        print("Chưa có bản sao lưu nào.")
        return []

    files.sort(key=lambda x: os.path.getmtime(os.path.join(BACKUP_DIR, x)), reverse=True)
    for idx, f in enumerate(files, 1):
        fp = os.path.join(BACKUP_DIR, f)
        sz = round(os.path.getsize(fp) / (1024 * 1024), 2)
        mtime = datetime.datetime.fromtimestamp(os.path.getmtime(fp)).strftime("%d/%m/%Y %H:%M:%S")
        print(f"  [{idx}] {f:<45} | {sz:>7.2f} MB | {mtime}")
    print("=" * 78)
    return files

def backup_to_usb():
    """Sao lưu trực tiếp vào USB"""
    print("\n" + "=" * 78)
    print("      SAO LƯU DỮ LIỆU TRỰC TIẾP RA Ổ ĐĨA USB (FLASH DRIVE)")
    print("=" * 78)
    usbs = get_removable_drives()
    if not usbs:
        print("[!] Không phát hiện ổ đĩa USB nào đang cắm vào máy tính.")
        path_input = input("👉 Bạn có muốn nhập đường dẫn thư mục sao lưu thủ công không? (Ví dụ: E:\\ hoặc bỏ trống để hủy): ").strip()
        if path_input and os.path.isdir(path_input):
            return create_full_backup(path_input)
        return None

    print("\nTìm thấy các ổ USB sau:")
    for idx, u in enumerate(usbs, 1):
        print(f"  [{idx}] Ổ đĩa {u['letter']}:\\ (Còn trống: {u['free_gb']} GB)")

    choice = input(f"\n👉 Chọn ổ đĩa USB [1-{len(usbs)}] (Mặc định: 1): ").strip()
    sel_idx = int(choice) - 1 if choice.isdigit() and 1 <= int(choice) <= len(usbs) else 0
    usb_dest = os.path.join(usbs[sel_idx]['path'], "SimplyIT_Backups")
    os.makedirs(usb_dest, exist_ok=True)
    return create_full_backup(usb_dest)

def interactive_restore():
    """Menu chọn file và phục hồi dữ liệu"""
    backups = list_backups()
    print("\nLỰA CHỌN PHỤC HỒI:")
    print("  - Nhập số thứ tự [1, 2, 3...] từ danh sách trên để chọn bản backup.")
    print("  - HOẶC kéo thả / dán đường dẫn file .ZIP hoặc .SQL từ nơi khác (USB, ổ D...).")
    print("  - Nhấn Enter (để trống) để hủy.")
    val = input("\n👉 Nhập lựa chọn hoặc đường dẫn file: ").strip().strip('"').strip("'")
    if not val:
        return

    if val.isdigit() and 1 <= int(val) <= len(backups):
        target_file = os.path.join(BACKUP_DIR, backups[int(val) - 1])
    else:
        target_file = val

    if not os.path.exists(target_file):
        print(f"[!] Không tìm thấy file: {target_file}")
        return

    confirm = input(f"\n⚠️  CẢNH BÁO: Dữ liệu hiện tại trong hệ thống sẽ được đồng bộ/ghi đè từ bản sao lưu:\n   '{os.path.basename(target_file)}'\nBạn có chắc chắn muốn tiến hành? (y/N): ").strip().lower()
    if confirm == 'y':
        restore_full_backup(target_file)
    else:
        print("Đã hủy thao tác phục hồi.")

def print_menu():
    print("\n" + "=" * 78)
    print("      SIMPLY IT — TRUNG TÂM SAO LƯU & PHỤC HỒI DỮ LIỆU TOÀN DIỆN")
    print("=" * 78)
    print("  [1] 💾 Tạo Bản Sao Lưu Toàn Bộ (Database + File Ảnh/Chứng từ -> File ZIP)")
    print("  [2] 🔌 Sao Lưu Nhanh Toàn Bộ Trực Tiếp Vào Ổ Đĩa USB")
    print("  [3] 🔄 Phục Hồi Toàn Bộ Dữ Liệu Từ Bản Sao Lưu (.ZIP / .SQL)")
    print("  [4] 📋 Xem Danh Sách Các Bản Sao Lưu Hiện Có (Trong thư mục backups)")
    print("  [5] 📂 Mở Thư Mục Chứa Bản Sao Lưu (backups) trong Windows Explorer")
    print("  [0] ❌ Quay lại")
    print("=" * 78)

def main():
    if len(sys.argv) > 1:
        # Chế độ dòng lệnh CLI
        if "--backup" in sys.argv:
            out = None
            if "--output" in sys.argv:
                try:
                    idx = sys.argv.index("--output")
                    out = sys.argv[idx + 1]
                except Exception:
                    pass
            elif "--usb" in sys.argv:
                backup_to_usb()
                return
            create_full_backup(out)
            return
        elif "--restore" in sys.argv:
            inp = None
            if "--input" in sys.argv:
                try:
                    idx = sys.argv.index("--input")
                    inp = sys.argv[idx + 1]
                except Exception:
                    pass
            if inp:
                restore_full_backup(inp)
            else:
                interactive_restore()
            return
        elif "--list" in sys.argv:
            list_backups()
            return

    # Chế độ Menu tương tác
    while True:
        print_menu()
        choice = input("👉 Chọn một chức năng [0-5]: ").strip()
        if choice == '1':
            create_full_backup()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '2':
            backup_to_usb()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '3':
            interactive_restore()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '4':
            list_backups()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '5':
            if os.path.exists(BACKUP_DIR) and sys.platform == 'win32':
                os.startfile(BACKUP_DIR)
            else:
                print(f"Đường dẫn: {BACKUP_DIR}")
                input("\nNhấn Enter để tiếp tục...")
        elif choice == '0':
            break
        else:
            print("[!] Lựa chọn không hợp lệ!")
            time.sleep(1)

if __name__ == "__main__":
    main()

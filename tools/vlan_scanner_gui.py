#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SIMPLY IT - Giao Diện Quét Mạng Tự Động Đa VLAN (GUI)
==============================================================================
Giao diện trực quan đồ họa (Tkinter) giúp Quản trị viên IT quét toàn bộ các dải
VLAN trong doanh nghiệp (VLAN Văn Phòng, Máy Chủ, Máy In, Camera IP, Nhà Máy...)
và đồng bộ trực tiếp lên hệ thống SIMPLY IT chỉ với 1 click!
==============================================================================
"""

import sys
import os
import threading
import json
import time
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

# Add current tools folder to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlan_scanner import scan_vlan_subnets, push_to_simply_it

class VlanScannerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("SIMPLY IT — Quét Mạng Tự Động Đa VLAN (Multi-VLAN Scanner)")
        self.root.geometry("980x640")
        self.root.minsize(850, 500)

        # Style configuration
        self.style = ttk.Style()
        self.style.theme_use("clam")
        
        # Color palette
        self.bg_color = "#f8fafc"
        self.primary_color = "#2563eb"
        self.text_dark = "#1e293b"
        self.root.configure(bg=self.bg_color)

        self.discovered_devices = []
        self.is_scanning = False

        self.setup_ui()

    def setup_ui(self):
        # Header banner
        header_frame = tk.Frame(self.root, bg="#1e293b", height=70)
        header_frame.pack(fill="x")

        title_lbl = tk.Label(
            header_frame,
            text="📡 SIMPLY IT — CÔNG CỤ QUÉT MẠNG ĐA VLAN & PHÁT HIỆN THIẾT BỊ",
            font=("Segoe UI", 12, "bold"),
            fg="#38bdf8",
            bg="#1e293b"
        )
        title_lbl.pack(anchor="w", padx=20, pady=(12, 2))

        sub_lbl = tk.Label(
            header_frame,
            text="Tự động nhận diện Máy trạm, Server, Máy in, Camera IP qua định tuyến Inter-VLAN và đồng bộ vào kho dữ liệu",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#1e293b"
        )
        sub_lbl.pack(anchor="w", padx=20, pady=(0, 10))

        # Config Panel
        cfg_frame = tk.LabelFrame(
            self.root,
            text=" Cấu hình dải mạng VLAN & Máy chủ ",
            font=("Segoe UI", 9, "bold"),
            fg="#334155",
            bg=self.bg_color,
            padx=15,
            pady=10
        )
        cfg_frame.pack(fill="x", padx=15, pady=10)

        # VLAN input
        tk.Label(cfg_frame, text="Dải VLAN Subnets (CIDR):", font=("Segoe UI", 9, "bold"), bg=self.bg_color).grid(row=0, column=0, sticky="w", pady=4)
        self.entry_subnets = ttk.Entry(cfg_frame, width=55, font=("Consolas", 10))
        self.entry_subnets.grid(row=0, column=1, sticky="w", padx=8, pady=4)
        self.entry_subnets.insert(0, "192.168.1.0/24, 192.168.10.0/24, 192.168.50.0/24")

        hint_lbl = tk.Label(cfg_frame, text="(Ngăn cách bằng dấu phẩy, ví dụ: 192.168.10.0/24, 192.168.20.0/24)", font=("Segoe UI", 8), fg="#64748b", bg=self.bg_color)
        hint_lbl.grid(row=0, column=2, sticky="w", padx=4)

        # Server URL input
        tk.Label(cfg_frame, text="Địa chỉ Máy chủ SIMPLY IT:", font=("Segoe UI", 9, "bold"), bg=self.bg_color).grid(row=1, column=0, sticky="w", pady=4)
        self.entry_server = ttk.Entry(cfg_frame, width=35, font=("Consolas", 10))
        self.entry_server.grid(row=1, column=1, sticky="w", padx=8, pady=4)
        self.entry_server.insert(0, "http://localhost:3001")

        # Action Buttons inside cfg_frame
        btn_box = tk.Frame(cfg_frame, bg=self.bg_color)
        btn_box.grid(row=1, column=2, sticky="e", padx=4)

        self.btn_scan = tk.Button(
            btn_box,
            text="🚀 Bắt Đầu Quét Mạng",
            font=("Segoe UI", 9, "bold"),
            bg="#2563eb",
            fg="white",
            padx=14,
            pady=4,
            relief="flat",
            cursor="hand2",
            command=self.start_scan_thread
        )
        self.btn_scan.pack(side="left", padx=4)

        self.btn_sync = tk.Button(
            btn_box,
            text="☁️ Đồng Bộ Vào Hệ Thống",
            font=("Segoe UI", 9, "bold"),
            bg="#059669",
            fg="white",
            padx=12,
            pady=4,
            relief="flat",
            cursor="hand2",
            state="disabled",
            command=self.sync_to_server
        )
        self.btn_sync.pack(side="left", padx=4)

        self.btn_export = tk.Button(
            btn_box,
            text="💾 Xuất File",
            font=("Segoe UI", 9),
            bg="#475569",
            fg="white",
            padx=10,
            pady=4,
            relief="flat",
            cursor="hand2",
            command=self.export_results
        )
        self.btn_export.pack(side="left", padx=4)

        # Progress bar & status
        prog_frame = tk.Frame(self.root, bg=self.bg_color)
        prog_frame.pack(fill="x", padx=15, pady=(0, 5))

        self.lbl_status = tk.Label(prog_frame, text="Sẵn sàng quét mạng VLAN...", font=("Segoe UI", 9), fg="#475569", bg=self.bg_color)
        self.lbl_status.pack(side="left")

        self.progress_bar = ttk.Progressbar(prog_frame, orient="horizontal", mode="determinate", length=300)
        self.progress_bar.pack(side="right")

        # Results Table (Treeview)
        table_frame = tk.Frame(self.root, bg=self.bg_color)
        table_frame.pack(fill="both", expand=True, padx=15, pady=(0, 15))

        columns = ("ip", "hostname", "device_type", "vendor", "mac", "ports")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="extended")
        
        self.tree.heading("ip", text="Địa Chỉ IP")
        self.tree.heading("hostname", text="Tên Thiết Bị (Hostname)")
        self.tree.heading("device_type", text="Loại Thiết Bị")
        self.tree.heading("vendor", text="Nhà Sản Xuất (Vendor)")
        self.tree.heading("mac", text="Địa Chỉ MAC")
        self.tree.heading("ports", text="Cổng Mở (Open Ports)")

        self.tree.column("ip", width=120, anchor="center")
        self.tree.column("hostname", width=180, anchor="w")
        self.tree.column("device_type", width=180, anchor="w")
        self.tree.column("vendor", width=140, anchor="w")
        self.tree.column("mac", width=140, anchor="center")
        self.tree.column("ports", width=120, anchor="center")

        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def update_progress(self, current, total):
        pct = int((current / max(1, total)) * 100)
        self.root.after(0, lambda: self.progress_bar.configure(value=pct))
        self.root.after(0, lambda: self.lbl_status.configure(text=f"Đang quét IP: {current}/{total} ({pct}%)..."))

    def start_scan_thread(self):
        if self.is_scanning:
            return
        
        subnets_raw = self.entry_subnets.get().strip()
        if not subnets_raw:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập ít nhất một dải mạng VLAN (ví dụ: 192.168.1.0/24)")
            return

        subnets = [s.strip() for s in subnets_raw.split(",") if s.strip()]
        
        # Clear table
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.discovered_devices = []

        self.is_scanning = True
        self.btn_scan.configure(state="disabled", text="⏳ Đang Quét...")
        self.btn_sync.configure(state="disabled")
        self.progress_bar.configure(value=0)

        t = threading.Thread(target=self._run_scan, args=(subnets,))
        t.daemon = True
        t.start()

    def _run_scan(self, subnets):
        t0 = time.time()
        try:
            results = scan_vlan_subnets(subnets, progress_callback=self.update_progress)
            self.discovered_devices = results
            elapsed = round(time.time() - t0, 1)

            def on_finish():
                for dev in results:
                    ports_str = ", ".join(map(str, dev["openPorts"])) if dev["openPorts"] else "ICMP"
                    self.tree.insert("", "end", values=(
                        dev["ipAddress"],
                        dev["hostname"] or "(Chưa đặt tên)",
                        dev["deviceType"],
                        dev["vendor"],
                        dev["macAddress"],
                        ports_str
                    ))
                self.lbl_status.configure(text=f"✅ Hoàn tất quét sau {elapsed}s! Tìm thấy {len(results)} thiết bị đang hoạt động.")
                self.progress_bar.configure(value=100)
                self.btn_scan.configure(state="normal", text="🚀 Bắt Đầu Quét Mạng")
                if results:
                    self.btn_sync.configure(state="normal")
                self.is_scanning = False

            self.root.after(0, on_finish)

        except Exception as e:
            def on_error():
                messagebox.showerror("Lỗi", f"Lỗi trong quá trình quét mạng: {str(e)}")
                self.btn_scan.configure(state="normal", text="🚀 Bắt Đầu Quét Mạng")
                self.is_scanning = False
            self.root.after(0, on_error)

    def sync_to_server(self):
        if not self.discovered_devices:
            messagebox.showinfo("Thông báo", "Chưa có thiết bị nào để đồng bộ!")
            return

        server_url = self.entry_server.get().strip() or "http://localhost:3001"
        self.btn_sync.configure(state="disabled", text="⏳ Đang Đồng Bộ...")

        def _do_sync():
            succ, fail = push_to_simply_it(self.discovered_devices, server_url)
            def on_sync_done():
                self.btn_sync.configure(state="normal", text="☁️ Đồng Bộ Vào Hệ Thống")
                if succ > 0:
                    messagebox.showinfo(
                        "Đồng Bộ Thành Công",
                        f"✅ Đã đồng bộ thành công {succ} thiết bị vào hệ thống SIMPLY IT!\n"
                        f"(Thất bại/Bỏ qua: {fail})\n\n"
                        f"Bạn có thể mở Dashboard tại {server_url} để xem ngay."
                    )
                else:
                    messagebox.showwarning(
                        "Chưa Thể Đồng Bộ",
                        f"⚠️ Không thể kết nối tới máy chủ SIMPLY IT tại {server_url}.\n\n"
                        f"Vui lòng đảm bảo Web Server SIMPLY IT đang được bật (qua file SimplyIT_Server.exe) rồi thử lại!"
                    )
            self.root.after(0, on_sync_done)

        t = threading.Thread(target=_do_sync)
        t.daemon = True
        t.start()

    def export_results(self):
        if not self.discovered_devices:
            messagebox.showinfo("Thông báo", "Chưa có dữ liệu thiết bị nào để xuất!")
            return

        filepath = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV File (Excel)", "*.csv"), ("JSON File", "*.json")]
        )
        if not filepath:
            return

        try:
            if filepath.endswith(".json"):
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(self.discovered_devices, f, ensure_ascii=False, indent=2)
            else:
                import csv
                with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
                    writer = csv.DictWriter(f, fieldnames=["ipAddress", "hostname", "deviceType", "vendor", "macAddress", "openPorts", "discoveredAt"])
                    writer.writeheader()
                    for d in self.discovered_devices:
                        row = dict(d)
                        row["openPorts"] = ",".join(map(str, row["openPorts"]))
                        writer.writerow(row)
            messagebox.showinfo("Thành Công", f"Đã xuất dữ liệu ra file:\n{filepath}")
        except Exception as ex:
            messagebox.showerror("Lỗi", f"Không thể lưu file: {str(ex)}")

def main():
    root = tk.Tk()
    app = VlanScannerApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()

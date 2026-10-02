#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SIMPLY IT - Multi-VLAN Active Network Scanner (CLI & Daemon Engine)
==============================================================================
Chương trình quét mạng tự động hỗ trợ môi trường mạng doanh nghiệp nhiều VLAN.
- Sử dụng chuẩn thư viện Python (không cần cài thêm pip packages).
- Quét đa luồng (Multi-threaded) siêu nhanh qua định tuyến Inter-VLAN.
- Tự động nhận diện loại thiết bị: Máy in (Printer), Camera IP, Máy tính Windows/Linux, Switch/Router.
- Tự động tra cứu Vendor qua MAC Address (OUI).
- Tự động đẩy dữ liệu thiết bị vào máy chủ SIMPLY IT (/api/v1/auto-scan/collect).
==============================================================================
"""

import sys
import os
import re
import socket
import ipaddress
import subprocess
import threading
import json
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib import request as urllib_request

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Common ports and service signatures
PORT_SIGNATURES = {
    9100: ("Printer", "RAW Print Port (HP/Canon/Brother/Ricoh)"),
    515:  ("Printer", "LPD/LPR Print Service"),
    631:  ("Printer", "IPP Print Service"),
    554:  ("Camera",  "RTSP Video Stream (Hikvision/Dahua/Axis/Tiandy)"),
    8000: ("Camera",  "DVR/NVR Media Server / Hikvision Port"),
    37777:("Camera",  "Dahua DVR/NVR Private Port"),
    3389: ("Computer", "Windows Remote Desktop (RDP)"),
    135:  ("Computer", "Microsoft RPC (Windows Workstation/Server)"),
    445:  ("Computer", "SMB File Sharing (Windows Workstation/Server)"),
    5985: ("Computer", "WinRM (Windows Remote Management)"),
    22:   ("Server/Switch", "SSH (Linux / Cisco / MikroTik / Juniper)"),
    23:   ("Server/Switch", "Telnet (Switch / Router Management)"),
    80:   ("Web/Device", "HTTP Web Management"),
    443:  ("Web/Device", "HTTPS Web Management"),
}

OUI_DATABASE = {
    "00:11:32": "Synology", "00:04:4B": "NVIDIA", "00:08:9B": "QNAP",
    "00:1E:67": "Intel", "00:50:56": "VMware", "00:0C:29": "VMware",
    "08:00:27": "VirtualBox", "00:15:5D": "Microsoft Hyper-V",
    "B8:27:EB": "Raspberry Pi", "DC:A6:32": "Raspberry Pi", "E4:5F:01": "Raspberry Pi",
    "00:1A:A0": "Dell", "00:14:22": "Dell", "18:03:73": "Dell", "F8:BC:12": "Dell",
    "00:1E:4F": "Dell", "34:E6:D7": "Dell", "74:86:7A": "Dell",
    "00:18:FE": "HP", "00:25:B3": "HP", "3C:D9:2B": "HP", "B4:99:BA": "HP",
    "00:1F:29": "HP", "68:B5:99": "HP", "FC:15:B4": "HP",
    "00:23:7D": "Lenovo", "00:26:18": "Lenovo", "54:EE:75": "Lenovo", "AC:74:B1": "Lenovo",
    "00:24:81": "Lenovo", "28:D2:44": "Lenovo", "80:FA:5B": "Lenovo",
    "00:1B:FC": "Asus", "04:D9:F5": "Asus", "10:7B:44": "Asus", "18:31:BF": "Asus",
    "00:1E:58": "D-Link", "14:D6:4D": "D-Link", "28:10:7B": "D-Link",
    "00:19:E0": "TP-Link", "50:C7:BF": "TP-Link", "AC:84:C6": "TP-Link", "E8:48:B8": "TP-Link",
    "00:0C:42": "MikroTik", "48:8F:5A": "MikroTik", "64:D1:54": "MikroTik", "CC:2D:E0": "MikroTik",
    "00:00:0C": "Cisco", "00:01:42": "Cisco", "00:06:52": "Cisco", "00:1D:A1": "Cisco",
    "00:40:8C": "Axis Camera", "AC:CC:8E": "Axis Camera",
    "44:19:B6": "Hikvision", "BC:AD:28": "Hikvision", "C0:56:E3": "Hikvision", "E0:50:8B": "Hikvision",
    "14:A7:8B": "Dahua", "3C:EF:8C": "Dahua", "90:02:A9": "Dahua", "A0:BD:1D": "Dahua",
    "00:00:85": "Canon", "00:1E:8F": "Canon", "70:85:C2": "Canon",
    "00:80:77": "Brother", "30:05:5C": "Brother",
    "00:26:73": "Ricoh", "00:00:21": "Ricoh",
    "00:00:AA": "Xerox", "00:01:6C": "Xerox",
    "00:17:C4": "Kyocera", "00:C0:EE": "Kyocera",
    "00:17:88": "Philips", "30:FD:38": "Google", "F4:F5:DB": "Google",
    "00:03:93": "Apple", "00:05:02": "Apple", "34:36:3B": "Apple", "F0:18:98": "Apple",
}

def lookup_vendor(mac):
    if not mac:
        return "Unknown"
    norm = mac.upper().replace("-", ":")
    prefix = ":".join(norm.split(":")[:3])
    return OUI_DATABASE.get(prefix, "Generic Vendor")

def get_arp_table():
    """Reads system ARP cache to map active IP -> MAC."""
    arp_map = {}
    try:
        output = subprocess.check_output("arp -a", shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in output.splitlines():
            m = re.search(r"(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})", line)
            if m:
                ip = m.group(1)
                mac = m.group(2).replace("-", ":").upper()
                arp_map[ip] = mac
    except Exception:
        pass
    return arp_map

def ping_host(ip, timeout_ms=300):
    """Fast ping for Windows/Linux."""
    if os.name == 'nt':
        cmd = ["ping", "-n", "1", "-w", str(timeout_ms), str(ip)]
    else:
        cmd = ["ping", "-c", "1", "-W", str(max(1, int(timeout_ms/1000))), str(ip)]
    try:
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
        return res.returncode == 0
    except Exception:
        return False

def check_tcp_port(ip, port, timeout_sec=0.4):
    """Check if a specific TCP port is open."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout_sec)
            return s.connect_ex((str(ip), port)) == 0
    except Exception:
        return False

def resolve_hostname(ip):
    """Resolve DNS / NetBIOS hostname for an IP."""
    try:
        host, _, _ = socket.gethostbyaddr(str(ip))
        return host
    except Exception:
        # Fallback to nbtstat on Windows
        if os.name == 'nt':
            try:
                out = subprocess.check_output(f"nbtstat -A {ip}", shell=True, text=True, timeout=1.5, stderr=subprocess.DEVNULL)
                for line in out.splitlines():
                    if "<00>" in line and "UNIQUE" in line:
                        parts = line.split()
                        if parts:
                            return parts[0].strip()
            except Exception:
                pass
    return ""

def scan_single_device(ip, ports_to_check, arp_map):
    """Probe a single IP address."""
    ip_str = str(ip)
    
    # 1. Ping
    is_alive = ping_host(ip_str)
    
    # 2. Check ports
    open_ports = []
    for p in ports_to_check:
        if check_tcp_port(ip_str, p):
            open_ports.append(p)
            is_alive = True  # If port open, device is alive even if ping was blocked

    if not is_alive and not open_ports:
        return None

    # 3. Resolve Hostname
    hostname = resolve_hostname(ip_str)

    # 4. Resolve MAC & Vendor
    mac = arp_map.get(ip_str, "")
    vendor = lookup_vendor(mac) if mac else "Unknown"

    # 5. Determine Device Type
    device_type = "Network Device"
    if any(p in open_ports for p in [9100, 515, 631]):
        device_type = "Printer"
    elif any(p in open_ports for p in [554, 8000, 37777]):
        device_type = "IP Camera / CCTV"
    elif any(p in open_ports for p in [135, 445, 3389, 5985]):
        device_type = "Workstation / Server (Windows)"
    elif 22 in open_ports:
        device_type = "Server / Switch (Linux/Network)"
    elif 80 in open_ports or 443 in open_ports:
        device_type = "Web Managed Device / Router"

    return {
        "ipAddress": ip_str,
        "hostname": hostname,
        "macAddress": mac or f"UNKNOWN-{ip_str.replace('.', '-')}",
        "deviceType": device_type,
        "vendor": vendor,
        "openPorts": open_ports,
        "discoveredAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

def scan_vlan_subnets(subnets, ports=None, max_threads=50, progress_callback=None):
    """
    Scans a list of CIDR subnets (e.g. ['192.168.10.0/24', '192.168.50.0/24']).
    """
    if ports is None:
        ports = [9100, 554, 80, 443, 3389, 445, 135, 22, 8000]

    all_ips = []
    for sub in subnets:
        sub = sub.strip()
        if not sub:
            continue
        try:
            net = ipaddress.ip_network(sub, strict=False)
            all_ips.extend([ip for ip in net.hosts()])
        except ValueError:
            # Single IP or range
            if "-" in sub:
                parts = sub.split("-")
                base = ".".join(parts[0].strip().split(".")[:3])
                start_oct = int(parts[0].strip().split(".")[-1])
                end_oct = int(parts[1].strip().split(".")[-1])
                for octet in range(start_oct, end_oct + 1):
                    all_ips.append(ipaddress.ip_address(f"{base}.{octet}"))
            else:
                try:
                    all_ips.append(ipaddress.ip_address(sub))
                except ValueError:
                    print(f"[-] Dải IP không hợp lệ: {sub}")

    total = len(all_ips)
    print(f"[*] Bắt đầu quét {total} địa chỉ IP qua {len(subnets)} VLAN/Subnets...")
    
    # Refresh ARP cache
    arp_map = get_arp_table()

    results = []
    scanned = 0

    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        future_to_ip = {executor.submit(scan_single_device, ip, ports, arp_map): ip for ip in all_ips}
        for future in as_completed(future_to_ip):
            scanned += 1
            if progress_callback:
                progress_callback(scanned, total)
            try:
                data = future.result()
                if data:
                    results.append(data)
                    print(f"  [+] Tìm thấy: {data['ipAddress']:<15} | {data['deviceType']:<25} | {data['hostname'] or 'N/A':<15} | {data['vendor']}")
            except Exception as e:
                pass

    return results

def push_to_simply_it(devices, server_url="http://localhost:3001"):
    """
    Sync discovered devices to SIMPLY IT central database via API.
    """
    endpoint = f"{server_url.rstrip('/')}/api/v1/auto-scan/collect"
    success_count = 0
    failed_count = 0

    print(f"\n[*] Đang đồng bộ {len(devices)} thiết bị về máy chủ {endpoint}...")

    for dev in devices:
        payload = {
            "hostname": dev["hostname"] or f"{dev['deviceType']} ({dev['ipAddress']})",
            "serialNumber": f"SN-{dev['macAddress'].replace(':', '')[-8:]}",
            "brand": dev["vendor"],
            "model": dev["deviceType"],
            "deviceType": dev["deviceType"],
            "scannedAt": dev["discoveredAt"],
            "specs": {
                "ipAddress": dev["ipAddress"],
                "macAddress": dev["macAddress"],
                "openPorts": dev["openPorts"],
                "autoDiscovered": True,
                "vlanSubnet": ".".join(dev["ipAddress"].split(".")[:3]) + ".0/24"
            }
        }

        try:
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib_request.Request(
                endpoint,
                data=data_bytes,
                headers={"Content-Type": "application/json", "User-Agent": "SimplyIT-VLANScanner/1.0"},
                method="POST"
            )
            with urllib_request.urlopen(req, timeout=5) as resp:
                if resp.status in (200, 201):
                    success_count += 1
                else:
                    failed_count += 1
        except Exception as ex:
            failed_count += 1

    print(f"[+] Hoàn tất đồng bộ: {success_count} thành công, {failed_count} lỗi hoặc máy chủ chưa sẵn sàng.")
    return success_count, failed_count

def main():
    parser = argparse.ArgumentParser(description="SIMPLY IT - Multi-VLAN Network Scanner")
    parser.add_argument("--subnets", "-s", type=str, default="192.168.1.0/24",
                        help="Danh sách VLAN subnets ngăn cách bởi dấu phẩy (vd: 192.168.10.0/24,192.168.20.0/24,192.168.50.0/24)")
    parser.add_argument("--threads", "-t", type=int, default=60, help="Số luồng quét đồng thời (mặc định 60)")
    parser.add_argument("--server", "-u", type=str, default="http://localhost:3001", help="URL máy chủ Simply IT")
    parser.add_argument("--sync", action="store_true", help="Tự động đồng bộ vào hệ thống sau khi quét")
    parser.add_argument("--export", "-o", type=str, default="", help="Đường dẫn file JSON/CSV xuất kết quả")

    args = parser.parse_args()

    subnet_list = [s.strip() for s in args.subnets.split(",") if s.strip()]
    start_time = time.time()

    devices = scan_vlan_subnets(subnet_list, max_threads=args.threads)

    elapsed = round(time.time() - start_time, 2)
    print(f"\n[+] Quét xong trong {elapsed} giây! Tìm thấy {len(devices)} thiết bị đang hoạt động.")

    if args.export:
        if args.export.endswith(".csv"):
            import csv
            with open(args.export, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=["ipAddress", "hostname", "macAddress", "deviceType", "vendor", "openPorts", "discoveredAt"])
                writer.writeheader()
                for d in devices:
                    row = dict(d)
                    row["openPorts"] = ",".join(map(str, row["openPorts"]))
                    writer.writerow(row)
            print(f"[+] Đã xuất file CSV: {args.export}")
        else:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(devices, f, ensure_ascii=False, indent=2)
            print(f"[+] Đã xuất file JSON: {args.export}")

    if args.sync or input("\nBạn có muốn đồng bộ thiết bị này lên SIMPLY IT ngay không? (y/n): ").strip().lower() == 'y':
        push_to_simply_it(devices, server_url=args.server)

if __name__ == "__main__":
    main()

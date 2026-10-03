# 📘 HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG QUẢN LÝ TÀI SẢN CNTT (SIMPLY IT) TRONG MẠNG ĐA VLAN

> **Dự án:** Quản lý Tài sản CNTT (ITSM) — SIMPLY IT Enterprise & Community  
> **Thư mục lưu trữ:** `D:\QLTBIT`  
> **Phiên bản mở khóa:** Đầy đủ phân hệ Sơ đồ 2D, Quét LAN tự động, Kiểm kê tài sản, Cảnh báo thay đổi phần cứng & phần mềm.

---

## 🌟 1. CÁC TÍNH NĂNG ĐÃ ĐƯỢC TÍCH HỢP & MỞ KHÓA HOÀN TOÀN

1. **🗺️ Sơ đồ Mặt bằng Tòa nhà 2D & Tủ Rack Data Center (`/floor-maps`):**
   * Upload sơ đồ mặt bằng văn phòng/tòa nhà dạng hình ảnh.
   * Ghim vị trí máy trạm, switch, camera, máy in trực quan bằng kéo thả.
   * Trực quan hóa tủ mạng Data Center (12U, 24U, 42U).
   * *Đã tháo bỏ 100% màn hình chặn bản quyền Enterprise.*

2. **📡 Quét Tự Động & Phát Hiện Thiết Bị Mạng LAN (`/discovery`):**
   * Nhận diện Vendor qua địa chỉ MAC (OUI).
   * Phát hiện máy in qua cổng `9100`, `515`, `631`.
   * Phát hiện Camera IP / DVR / NVR qua cổng `554`, `8000`, `37777`.
   * Phát hiện máy chủ/máy trạm Windows qua cổng `135`, `445`, `3389`.
   * *Đã mở menu trực tiếp trên Sidebar và tích hợp AI Enrich thông số.*

3. **📋 Đợt Kiểm Kê Tài Sản Toàn Diện (`/assets/audit`):**
   * Tạo chiến dịch kiểm kê theo phòng ban / chi nhánh.
   * Dùng điện thoại quét mã QR đối soát danh sách thực tế.
   * Tự động phát hiện tài sản thừa, thiếu hoặc lệch phòng ban.

4. **⚡ Giám Sát Thay Đổi Phần Cứng & Phần Mềm (Hardware & Software Change Tracking):**
   * **Phần cứng:** Cảnh báo nguy cấp khi máy trạm bị rút bớt RAM, tráo đổi CPU, đổi ổ cứng SSD/HDD, tháo card đồ họa GPU, thay Mainboard, đổi card mạng MAC.
   * **Phần mềm:** Cảnh báo khi người dùng cài thêm phần mềm mới (game, phần mềm lạ, công cụ can thiệp) hoặc gỡ bỏ phần mềm (antivirus, phần mềm nghiệp vụ).
   * **Lịch sử thay đổi (Audit Trail):** Ghi nhận chi tiết từng mốc thời gian, linh kiện cũ ➔ linh kiện mới.

---

## 🚀 2. CÁCH KHỞI CHẠY CHƯƠNG TRÌNH

Tại thư mục `D:\QLTBIT`, bạn có các cách khởi chạy:

### Cách 1: Chạy Trung Tâm Điều Hành (Khuyên dùng)
* Nhấp đúp chuột vào file: **`start_qltbit.bat`**
* Màn hình điều khiển tương tác sẽ xuất hiện cho phép bạn:
  * `[1]` Khởi động máy chủ SIMPLY IT (Server Web & khay hệ thống).
  * `[2]` Mở công cụ Quét mạng Đa VLAN (giao diện đồ họa GUI).
  * `[3]` Quét mạng Đa VLAN bằng dòng lệnh siêu tốc (CLI).
  * `[4]` Đóng gói bộ cài đặt Agent cho máy trạm gửi qua GPO / USB.
  * `[5]` Mở trang web quản trị trên trình duyệt.

### Cách 2: Chạy Trực Tiếp File Thực Thi Máy Chủ
* Nhấp đúp chuột vào file: **`SimplyIT_Server.exe`**
* Phần mềm sẽ chạy ngầm dưới khay hệ thống (System Tray cạnh đồng hồ Windows) và tự động bật trình duyệt web tại `http://localhost:3001`.

---

## 🌐 3. MÔ HÌNH VÀ GIẢI PHÁP TRIỂN KHAI TRONG MẠNG NHIỀU VLAN

Trong mạng doanh nghiệp phân chia nhiều VLAN (ví dụ: VLAN 10 Máy chủ, VLAN 20 Văn phòng, VLAN 30 Nhà máy, VLAN 40 Máy in, VLAN 50 Camera IP):

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MÔ HÌNH VẬN HÀNH TRÊN MẠNG ĐA VLAN                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [VLAN 20: Văn Phòng]        [VLAN 30: Nhà Máy]      [VLAN 40: Wi-Fi] │
│      PC / Laptop                 PC / Laptop            Laptop Wi-Fi   │
│           │                           │                      │         │
│           │ (PowerShell Agent chạy qua GPO / Task Scheduler)         │         │
│           │ Gửi HTTP/HTTPS POST thông số phần cứng, phần mềm định kỳ │         │
│           └───────────────────────────┼──────────────────────┘         │
│                                       ▼                                │
│                     ┌───────────────────────────────────┐              │
│                     │       ROUTER / CORE SWITCH L3     │              │
│                     │       Định tuyến Inter-VLAN       │              │
│                     │   (Chỉ mở Port 3001/3443 về Svr)  │              │
│                     └─────────────────┬─────────────────┘              │
│                                       ▼                                │
│                     ┌───────────────────────────────────┐              │
│                     │         MÁY CHỦ SIMPLY IT         │              │
│                     │         (Đặt tại VLAN 10)         │              │
│                     │ - Tiếp nhận Health & Inventory    │              │
│                     │ - So sánh & Ghi Log thay đổi      │              │
│                     │ - Hiển thị Sơ đồ 2D & Tủ Rack     │              │
│                     │ - Quản lý Đợt kiểm kê tài sản     │              │
│                     └───────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────┘
```

### Quy trình triển khai 3 bước tối ưu:

### Bước 1: Cấu hình Mạng & Tường lửa (Firewall)
* Đặt máy chủ SIMPLY IT tại một IP tĩnh trong VLAN Server (ví dụ: `192.168.10.50`).
* Trên Router / Core Switch L3, tạo Access Control List (ACL) hoặc Firewall Rule:
  * Cho phép các dải VLAN máy trạm (`192.168.20.0/24`, `192.168.30.0/24`...) truy cập tới IP máy chủ `192.168.10.50` trên cổng **`3001`** (HTTP) hoặc **`3443`** (HTTPS).

### Bước 2: Triển khai Agent Tự Động Trên Máy Trạm (Windows Workstations)
* Trong thư mục `D:\QLTBIT`, mở thư mục **`GOI_CAI_DAT_AGENT`** (được tạo tự động từ mục `[4]` trong menu).
* **Triển khai qua Active Directory GPO (Khuyên dùng cho mạng Domain):**
  * Đặt script vào thư mục GPO Startup Script (`\\domain\sysvol\...`).
  * Cấu hình tham số: `-ServerUrl "http://192.168.10.50:3001" -Mode Install`.
  * Khi máy trạm khởi động, script sẽ tự động tạo một Windows Scheduled Task (`SimplyIT_Audit`) chạy ẩn dưới quyền `SYSTEM`, định kỳ gửi thông số về máy chủ mỗi 15 phút.
* **Triển khai thủ công hoặc qua USB (Cho máy Workgroup):**
  * Copy thư mục `GOI_CAI_DAT_AGENT` sang máy trạm.
  * Nhấp chuột phải vào `Install_Agent.bat` -> Chọn **Run as administrator**.
  * Nhập URL máy chủ (ví dụ: `http://192.168.10.50:3001`). Xong!

### Bước 3: Quét Tự Động Thiết Bị Mạng, Máy In & Camera IP (Không có Agent)
* Với các thiết bị không thể cài Agent như Máy in, Switch, Camera IP, Router:
* Sử dụng công cụ **Quét Mạng Đa VLAN (GUI)** (`tools/vlan_scanner_gui.py`):
  * Nhập các dải VLAN cần quét: `192.168.40.0/24, 192.168.50.0/24, 192.168.60.0/24`.
  * Nhấp **🚀 Bắt Đầu Quét Mạng**.
  * Nhấp **☁️ Đồng Bộ Vào Hệ Thống** để nạp toàn bộ thiết bị tìm thấy vào cơ sở dữ liệu.

---

## 📁 4. CẤU TRÚC TỆP TIN DỰ ÁN TẠI `D:\QLTBIT`

```text
D:\QLTBIT\
├── SimplyIT_Server.exe            # Ứng dụng khay hệ thống quản trị máy chủ SIMPLY IT
├── start_qltbit.bat               # Menu điều hành All-in-One tiện lợi
├── qltbit_manager.py              # Bộ điều phối trung tâm bằng Python
├── build_exe.ps1                  # Script biên dịch lại SimplyIT_Server.exe từ C#
├── SimplyIT_Community_Launcher.cs # Mã nguồn C# launcher
│
├── tools\
│   ├── vlan_scanner_gui.py        # Giao diện đồ họa quét mạng tự động đa VLAN
│   ├── vlan_scanner.py            # Công cụ quét đa luồng siêu tốc (CLI)
│   ├── setup_environment.ps1      # Kiểm tra và cài đặt Node.js, PostgreSQL/Docker
│   └── agent\                     # Các script cài đặt & gỡ bỏ Agent máy trạm
│       ├── Install_Agent.bat
│       ├── Uninstall_Agent.bat
│       └── Run_Audit_Now.bat
│
├── GOI_CAI_DAT_AGENT\             # Gói cài đặt sẵn sàng phân phối cho máy trạm khách
│   ├── agent.ps1
│   ├── Install_Agent.bat
│   ├── Uninstall_Agent.bat
│   └── HUONG_DAN_SU_DUNG.txt
│
├── src\                           # Toàn bộ mã nguồn ứng dụng Web SIMPLY IT (Next.js)
├── prisma\                        # Schema cơ sở dữ liệu (PostgreSQL)
├── public\scripts\                # Script PowerShell thu thập thông tin chuyên sâu
└── .env                           # Tệp cấu hình kết nối Database, Port, JWT Secret
```

# 📚 TÀI LIỆU TOÀN DIỆN: HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG HỆ THỐNG QLTBIT (SERVER & AGENT)

> **Dự án:** Quản lý Tài sản CNTT (ITSM) & Giám sát Phần cứng / Phần mềm Đa VLAN  
> **Thư mục triển khai:** `D:\QLTBIT`  
> **Áp dụng cho:** Máy chủ (Server Web, Database, VLAN Scanner) và Máy trạm khách (Workstation Agent).

---

## 📑 MỤC LỤC
1. [TỔNG QUAN KIẾN TRÚC HỆ THỐNG](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [HƯỚNG DẪN CÀI ĐẶT MÁY CHỦ (SERVER INSTALLATION)](#2-hướng-dẫn-cài-đặt-máy-chủ-server-installation)
   - [2.1 Yêu cầu hệ thống](#21-yêu-cầu-hệ-thống)
   - [2.2 Cách A: Cài đặt trực tiếp trên Windows (Khuyên dùng)](#22-cách-a-cài-đặt-trực-tiếp-trên-windows-khuyên-dùng)
   - [2.3 Cách B: Cài đặt tự động bằng Docker Desktop (Nhanh nhất)](#23-cách-b-cài-đặt-tự-động-bằng-docker-desktop-nhanh-nhất)
   - [2.4 Cấu hình file .env](#24-cấu-hình-file-env)
   - [2.5 Mở cổng Firewall & Định tuyến Inter-VLAN](#25-mở-cổng-firewall--định-tuyến-inter-vlan)
3. [HƯỚNG DẪN SỬ DỤNG MÁY CHỦ (SERVER USER MANUAL)](#3-hướng-dẫn-sử-dụng-máy-chủ-server-user-manual)
   - [3.1 Khởi động hệ thống qua Trung tâm Điều hành](#31-khởi-động-hệ-thống-qua-trung-tâm-điều-hành)
   - [3.2 Đăng nhập & Bàn làm việc chính](#32-đăng-nhập--bàn-làm-việc-chính)
   - [3.3 Quản lý Tài sản & Giám sát Cảnh báo Thay đổi](#33-quản-lý-tài-sản--giám-sát-cảnh-báo-thay-đổi)
   - [3.4 Import Dữ Liệu Excel Chuẩn Khoa Phòng (21 Cột)](#34-import-dữ-liệu-excel-chuẩn-khoa-phòng-21-cột)
   - [3.5 Tùy Biến Bảng: Ẩn/Hiện Cột & Sắp Xếp Trực Quan](#35-tùy-biến-bảng-ẩn-hiện-cột--sắp-xếp-trực-quan)
   - [3.6 Quản Lý Danh Mục Khoa Phòng Đa Khu Vực / Tòa Nhà](#36-quản-lý-danh-mục-khoa-phòng-đa-khu-vực--tòa-nhà)
   - [3.7 Quản Lý Biên Bản Thiết Bị & Phụ Tùng Xuất Kho](#37-quản-lý-biên-bản-thiết-bị--phụ-tùng-xuất-kho)
   - [3.8 Sử dụng Sơ đồ Mặt bằng 2D & Tủ Rack Data Center](#38-sử-dụng-sơ-đồ-mặt-bằng-2d--tủ-rack-data-center)
   - [3.9 Sử dụng Công cụ Quét Mạng Tự Động Đa VLAN](#39-sử-dụng-công-cụ-quét-mạng-tự-động-đa-vlan)
   - [3.10 Tổ chức Đợt Kiểm Kê Tài Sản](#310-tổ-chức-đợt-kiểm-kê-tài-sản)
4. [HƯỚNG DẪN CÀI ĐẶT AGENT MÁY TRẠM (AGENT INSTALLATION)](#4-hướng-dẫn-cài-đặt-agent-máy-trạm-agent-installation)
   - [4.1 Chuẩn bị gói cài đặt GOI_CAI_DAT_AGENT](#41-chuẩn-bị-gói-cài-đặt-goi_cai_dat_agent)
   - [4.2 Phương án 1: Cài đặt thủ công bằng 1-Click (USB / Máy đơn lẻ)](#42-phương-án-1-cài-đặt-thủ-công-bằng-1-click-usb--máy-đơn-lẻ)
   - [4.3 Phương án 2: Triển khai hàng loạt qua Active Directory GPO](#43-phương-án-2-triển-khai-hàng-loạt-qua-active-directory-gpo)
   - [4.4 Phương án 3: Triển khai từ xa qua PowerShell / SCCM / Action1](#44-phương-án-3-triển-khai-từ-xa-qua-powershell--sccm--action1)
5. [HƯỚNG DẪN SỬ DỤNG & KIỂM TRA AGENT (AGENT OPERATION)](#5-hướng-dẫn-sử-dụng--kiểm-tra-agent-agent-operation)
   - [5.1 Cơ chế chạy ngầm Scheduled Task](#51-cơ-chế-chạy-ngầm-scheduled-task)
   - [5.2 Kích hoạt kiểm kê tức thì (Run Audit On Demand)](#52-kích-hoạt-kiểm-kê-tức-thì-run-audit-on-demand)
   - [5.3 Kiểm tra File Log trên máy trạm](#53-kiểm-tra-file-log-trên-máy-trạm)
   - [5.4 Thử nghiệm cảnh báo thay đổi phần cứng & phần mềm](#54-thử-nghiệm-cảnh-báo-thay-đổi-phần-cứng--phần-mềm)
   - [5.5 Gỡ bỏ Agent sạch sẽ](#55-gỡ-bỏ-agent-sạch-sẽ)
6. [BẢNG XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)](#6-bảng-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      KIẾN TRÚC TOÀN CẢNH MẠNG ĐA VLAN                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   [VLAN 20: Văn Phòng]         [VLAN 30: Nhà Máy]          [VLAN 40: Ban Giám Đốc]│
│      PC / Laptop                  PC / Laptop                  Laptop VIP        │
│           │                            │                            │           │
│           │ (PowerShell Agent chạy ngầm qua Scheduled Task định kỳ 15 phút)     │
│           │ Tự động quét: CPU, RAM, Ổ cứng, GPU, Mainboard, MAC & Phần mềm      │
│           └────────────────────────────┼────────────────────────────┘           │
│                                        ▼                                        │
│                      ┌───────────────────────────────────┐                      │
│                      │       ROUTER / CORE SWITCH L3     │                      │
│                      │       Định tuyến Inter-VLAN       │                      │
│                      │ (Cho phép Port 3001/3443 về Svr)  │                      │
│                      └─────────────────┬─────────────────┘                      │
│                                        ▼                                        │
│                      ┌───────────────────────────────────┐                      │
│                      │       MÁY CHỦ QLTBIT (VLAN 10) │                      │
│                      │   IP: 192.168.10.50 (Ví dụ)       │                      │
│                      │                                   │                      │
│                      │  • Cổng 3001: Web Dashboard       │                      │
│                      │  • Cổng 3443: HTTPS Quét Mã QR    │                      │
│                      │  • Cổng 5432: PostgreSQL DB       │                      │
│                      │  • Engine: So Sánh & Cảnh Báo     │                      │
│                      │  • Tools: Quét Đa VLAN Tự Động    │                      │
│                      └───────────────────────────────────┘                      │
│                                        ▲                                        │
│                                        │ (Quét chủ động ICMP + TCP Ports)       │
│                                        │                                        │
│                      ┌─────────────────┴─────────────────┐                      │
│                      │  CÁC THIẾT BỊ KHÔNG THỂ CÀI AGENT │                      │
│                      │  • VLAN 50: Máy in (Port 9100)    │                      │
│                      │  • VLAN 60: Camera IP (Port 554)  │                      │
│                      │  • VLAN 10: Switch/Router (SSH)   │                      │
│                      └───────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. HƯỚNG DẪN CÀI ĐẶT MÁY CHỦ (SERVER INSTALLATION)

### 2.1 Yêu cầu hệ thống
* **Hệ điều hành:** Windows 10, Windows 11, Windows Server 2016/2019/2022 hoặc Ubuntu Server.
* **Phần cứng tối thiểu:** CPU 2 Cores, RAM 4 GB (khuyên dùng 8 GB), Ổ cứng trống 10 GB.
* **Môi trường bắt buộc:**
  * **Python 3.8+** (đã có sẵn trên máy của bạn: Python 3.11.9).
  * **Node.js LTS (v20.x trở lên)**: Nền tảng chạy Web Server Next.js.
  * **PostgreSQL (v14+)** hoặc **Docker Desktop**.

---

### 2.2 Cách A: Cài đặt tự động bằng Trình Cài Đặt 1-Click (Khuyên Dùng Nhất)

Đây là phương thức đơn giản và nhanh chóng nhất. Bạn không cần phải gõ lệnh hay am hiểu kỹ thuật:

1. **Chạy Trình Cài Đặt**:
   * Nhấp đúp chuột vào file **`QLTBIT_Setup.exe`** (hoặc **`Cai_Dat_QLTBIT.exe`**).
2. **Chọn Chế Độ Cài Đặt**:
   * 🌟 **Cài đặt CẢ HAI: Máy Chủ & Agent (Khuyên dùng)**: Máy tính này vừa làm Server quản trị trung tâm, vừa tự giám sát chính phần cứng của nó.
   * 🏢 **Chỉ cài đặt MÁY CHỦ (Server)**: Chỉ chạy Web Dashboard, Database và mở cổng mạng.
   * 💻 **Chỉ cài đặt AGENT (Client)**: Chỉ cài đặt script giám sát máy trạm chạy ngầm.
3. **Bấm "🚀 BẮT ĐẦU CÀI ĐẶT NGAY"**:
   * Hệ thống sẽ tự động:
     - Tự động kiểm tra và cài đặt Node.js LTS nếu máy chưa có.
     - Tự động kích hoạt Cơ sở dữ liệu PostgreSQL Portable tích hợp trên cổng 5432.
     - Tự động tạo bảng dữ liệu và nạp tài khoản Admin (`admin@company.com / Admin@123`).
     - Tự động mở cổng tường lửa Windows (Port 3001 và 3443).
     - Tự động tạo biểu tượng Shortcut trên màn hình Desktop.
     - Tự động khởi chạy máy chủ và mở trình duyệt web `http://localhost:3001`!

---

### 2.3 Cách B: Cài đặt thủ công bằng dòng lệnh trên Windows

---

### 2.3 Cách B: Cài đặt tự động bằng Docker Desktop (Nhanh nhất)

Nếu bạn không muốn cài PostgreSQL thủ công, Docker sẽ tự động dựng toàn bộ Web Server và Database chỉ bằng 1 câu lệnh duy nhất:
1. Cài đặt [Docker Desktop cho Windows](https://www.docker.com/products/docker-desktop/).
2. Mở PowerShell tại `D:\QLTBIT` và chạy:
   ```powershell
   docker compose up -d
   ```
3. Docker sẽ tự động:
   * Tải ảnh PostgreSQL và cấu hình database.
   * Chạy container máy chủ QLTBIT trên cổng `3001` (HTTP) và `3443` (HTTPS).
   * Khởi tạo bảng dữ liệu tự động.
4. Mở trình duyệt tại: `http://localhost:3001`.

---

### 2.4 Cấu hình file .env
File [`.env`](file:///D:/QLTBIT/.env) chứa các thông số quan trọng của hệ thống:
```env
# 1. Kết nối PostgreSQL (thay Admin@123 bằng mật khẩu của bạn)
DATABASE_URL="postgresql://postgres:Admin@123@localhost:5432/it_asset_db?schema=public"

# 2. Cổng mạng hệ thống
PORT="3001"
HTTPS_PORT="3443"
NEXT_PUBLIC_APP_URL="http://localhost:3001"

# 3. Mã bảo mật ký Token JWT
JWT_SECRET="simply-secret-production-qltbit-token-key-2026-secure-random-hash"

# 4. Trí tuệ nhân tạo Google Gemini (Tùy chọn: bóc tách hóa đơn, gợi ý thông số)
GEMINI_API_KEY="your-gemini-api-key"
```

---

### 2.5 Mở cổng Firewall & Định tuyến Inter-VLAN
Để các máy trạm từ các VLAN khác có thể gửi dữ liệu về máy chủ, hãy cấu hình tường lửa trên máy chủ:

#### Trên Windows Server / Windows 10/11:
Mở PowerShell bằng quyền **Administrator** và chạy:
```powershell
New-NetFirewallRule -DisplayName "QLTBIT HTTP Port 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "QLTBIT HTTPS Port 3443" -Direction Inbound -LocalPort 3443 -Protocol TCP -Action Allow
```

#### Trên Router / Firewall doanh nghiệp (Fortinet, MikroTik, Cisco, pfSense):
* Tạo quy tắc cho phép luồng dữ liệu từ các mạng con nội bộ (`192.168.0.0/16` hoặc từng VLAN cụ thể) đi đến địa chỉ IP máy chủ QLTBIT (ví dụ: `192.168.10.50`) trên cổng **`3001`** và **`3443`**.

---

## 3. HƯỚNG DẪN SỬ DỤNG MÁY CHỦ (SERVER USER MANUAL)

### 3.1 Khởi động hệ thống qua Trung tâm Điều hành
Nhấp đúp vào file **[`start_qltbit.bat`](file:///D:/QLTBIT/start_qltbit.bat)**. Màn hình tương tác hiển thị:
```text
==============================================================================
      HỆ THỐNG QUẢN TRỊ TÀI SẢN CNTT (ITSM) — QLTBIT COMMUNITY
      Thư mục dự án: D:\QLTBIT
==============================================================================

  [1] 🚀 Khởi động Máy chủ QLTBIT (Chạy giao diện Server & Khay hệ thống)
  [2] 📡 Bật Công cụ Quét mạng Đa VLAN (Giao diện đồ họa GUI trực quan)
  [3] ⚡ Quét mạng Đa VLAN bằng Dòng lệnh (CLI Scanner siêu tốc)
  [4] 📦 Tạo Gói cài đặt Agent cho Máy trạm (Đóng gói gửi qua GPO / USB)
  [5] 🌐 Mở Trang Quản trị trên Trình duyệt (http://localhost:3001)
  [6] 🛠️  Kiểm tra & Cài đặt Môi trường (Node.js, PostgreSQL / Docker)
  [7] 📂 Mở Thư mục dự án trong Windows Explorer

  [0] ❌ Thoát
==============================================================================
👉 Chọn một chức năng [0-7]:
```

---

### 3.2 Đăng nhập & Bàn làm việc chính
* **Địa chỉ truy cập:** `http://localhost:3001` (hoặc `http://<IP_MAY_CHU>:3001` từ máy khác trong mạng).
* **Tài khoản mặc định:**
  * **Email:** `admin@company.com` (hoặc tài khoản khởi tạo khi chạy seed).
  * **Mật khẩu:** `Admin@123`
* Sau khi đăng nhập, bạn sẽ thấy Dashboard tổng quan: số lượng thiết bị, trạng thái bảo hành, cảnh báo phần cứng, số lượng ticket hỗ trợ.

---

### 3.3 Quản lý Tài sản & Giám sát Cảnh báo Thay đổi
1. Vào menu **Quản lý Tài sản** ➔ **Danh sách Thiết bị** (`/assets`).
2. Nhấp vào bất kỳ máy tính nào để mở cửa sổ chi tiết:
   * **Thông số phần cứng:** Xem số thanh RAM, model vi xử lý CPU, danh sách ổ cứng, card màn hình GPU, địa chỉ MAC, phiên bản Windows.
   * **⚠️ Cảnh báo thay đổi phần cứng (Hardware Tamper):** Nếu người dùng tháo bớt 1 thanh RAM, thay đổi ổ cứng hoặc đổi card mạng, hệ thống sẽ hiện khung màu cam cảnh báo tức thì!
   * **🛡️ Cảnh báo phát hiện công cụ Crack/Bẻ khóa:** Tự động phát hiện các tool can thiệp hệ thống như KMSAuto, KMSPico...
   * **📜 Nhật ký lịch sử thay đổi (Change Logs):** Xem từng mốc thời gian linh kiện hoặc phần mềm nào vừa bị thay đổi (hiển thị rõ giá trị cũ ➔ giá trị mới).

---

### 3.4 Import Dữ Liệu Excel Chuẩn Khoa Phòng (21 Cột), Chống Trùng & Báo Cáo Lỗi
Hệ thống tích hợp bộ phân tích và nhập file Excel thông minh, hỗ trợ trực tiếp các file kiểm kê định dạng thực tế từ bệnh viện, trung tâm y tế và doanh nghiệp lớn:

1. **Vào chức năng Nhập Excel & Tải Mẫu Chuẩn:**
   * Truy cập **Quản lý Tài sản** ➔ **Danh sách Thiết bị** (`/assets`).
   * Trên thanh công cụ, nhấn nút **"Nhập Excel"** (icon 📥) để mở hộp thoại nhập liệu.
   * **Tải Mẫu Excel Chuẩn (`.xlsx`)**: Nhấn nút **"Tải Mẫu Excel"** màu xanh ngọc. Hệ thống sẽ lập tức tạo và tải xuống file Microsoft Excel `.xlsx` gồm **3 sheet**:
     - *Sheet 1 (Mau_Tieu_Chuan)*: Cấu trúc cơ bản đầy đủ các trường (Mã tài sản, Tên máy tính, Danh mục, CPU, RAM, Ổ cứng, Giá mua, Ngày mua, Hạn bảo hành, Trạng thái...).
     - *Sheet 2 (Mau_Khoa_Phong_21_Cot)*: Mẫu chuẩn 21 cột thực tế theo định dạng kiểm kê bệnh viện kèm dữ liệu mẫu sinh động.
     - *Sheet 3 (Huong_Dan_Nhap)*: Bảng hướng dẫn chi tiết ý nghĩa từng cột, định dạng ngày tháng, và các mã trạng thái hợp lệ.
2. **Cấu trúc file Excel hỗ trợ (21 Cột Chuẩn Khoa Phòng):**
   * Hỗ trợ file Excel có tiêu đề đa tầng (Header & Sub-header cho cụm Màn hình):
     - `STT`, `QR`, `Tên khoa phòng`, `Tên loại thiết bị`, `Mã thiết bị`, `Tên thiết bị`, `Tên hãng sản xuất`, `Năm sản xuất`, `Model`, `Số seri`.
     - Cấu hình máy tính: `CPU`, `RAM`, `HDD`.
     - Cụm Màn hình đi kèm: `Hãng sản xuất`, `Năm sản xuất`, `Model`, `Số seri`.
     - `Tình trạng`, `Mã thiết bị cũ`, `Tính cấp lại`, `Ghi chú`.
3. **Cơ chế Chống Trùng Lặp Dữ Liệu & Bảo Vệ CSDL:**
   * **Kiểm tra đối chiếu nghiêm ngặt:** Hệ thống tự động so khớp `Mã tài sản (assetTag)` và `Số serial (serialNumber)` với toàn bộ cơ sở dữ liệu hiện có và các dòng nội bộ trong cùng file Excel.
   * **Từ chối thêm thiết bị trùng:** Nếu phát hiện mã tài sản hoặc số serial đã tồn tại, hệ thống **tuyệt đối không thêm vào cơ sở dữ liệu** và không tự ý sinh mã hậu tố gây sai lệch tài sản.
4. **Tự Động Xuất File Excel Báo Cáo Thiết Bị Lỗi & Trùng Lặp:**
   * Khi phát hiện thiết bị bị trùng hoặc dữ liệu dòng không hợp lệ, hệ thống tự động sinh file Excel báo cáo lỗi `Danh_Sach_Thiet_Bi_Loi_Trung.xlsx`.
   * File Excel này sao chép lại toàn bộ các dòng bị từ chối và bổ sung thêm cột **"LÝ DO LỖI / NGUYÊN NHÂN TRÙNG LẶP"** (được định dạng nổi bật màu đỏ cam).
   * Cửa sổ thông báo của hệ thống sẽ hiện cảnh báo màu vàng cam và xuất hiện nút **"📥 Tải File Excel Thiết Bị Lỗi / Trùng ({N} thiết bị)"** để bạn tải ngay về máy, kiểm tra lý do và điều chỉnh lại dữ liệu.

---

### 3.5 Bộ Lọc Khoa Phòng, Cột STT & Tùy Biến Bảng Danh Sách Thiết Bị
Để phục vụ nhu cầu xem dữ liệu, tra cứu nhanh theo phòng ban và thao tác vận hành hàng loạt của Kế toán, Quản lý kho và Kỹ thuật viên CNTT:

1. **Bộ Lọc Thiết Bị Theo Khoa Phòng / Phòng Ban (Department Filter):**
   * Trên thanh lọc nâng cao (`Advanced Filter & Search Bar`), nhấn vào dropdown **"📍 Khoa phòng (Tất cả)"**.
   * Chọn khoa phòng cụ thể (ví dụ: *Phòng Tài Chính Kế Toán*, *Khoa Cấp Cứu*, *Khoa Khám Bệnh*...).
   * Hệ thống sẽ tự động lọc tức thì toàn bộ thiết bị đang thuộc khoa phòng đó (bao gồm thiết bị đặt tại địa điểm đó hoặc cấp phát cho nhân sự thuộc khoa phòng).
   * Khi cần xem lại toàn bộ, chọn lại **"📍 Khoa phòng (Tất cả)"** hoặc nhấn nút **"Xóa Tất Cả Bộ Lọc"**.
2. **Cột Số Thứ Tự (STT) Đánh Số Theo Trang:**
   * Cột **STT** hiển thị ở vị trí đầu tiên của bảng danh sách, đánh số lũy tiến theo số trang và số dòng (trang 1: 1-25; trang 2: 26-50...).
   * **Bám dính kép (Sticky Dual-Column):** Khi cuộn ngang sang phải để xem Cấu hình, Màn hình, Bảo hành hay Giá trị tài sản, cột STT và cột Mã tài sản luôn bám dính ở mép trái giúp bạn không bị mất dấu thiết bị.
   * Cột STT có thể ẩn hoặc hiện tùy ý thông qua menu *Tùy chọn cột*.
3. **Chọn Xóa Nhiều Thiết Bị Cùng Lúc (Bulk Delete):**
   * Đánh dấu tick chọn vào ô checkbox ở đầu các dòng thiết bị bạn muốn xóa (hoặc tick ô checkbox ở hàng tiêu đề để chọn tất cả thiết bị trên trang).
   * **Thao tác xóa linh hoạt:**
     - Bấm nút **"🗑️ Xóa ({N}) Đã Chọn"** màu đỏ trên thanh công cụ phía trên.
     - Hoặc bấm nút **"Xóa Đã Chọn"** trên thanh **Bottom Floating Action Bar** nổi cố định ở mép dưới màn hình.
   * **Bảo vệ an toàn qua Thùng Rác (Trash):**
     - Thiết bị bị xóa sẽ được đưa vào **Thùng Rác**, tự động gỡ an toàn các phân bổ, vé hỗ trợ và tài liệu liên quan mà không làm hỏng dữ liệu hệ thống.
     - Ngay sau khi xóa, hệ thống hiển thị thông báo với nút **"Hoàn tác (Undo)"** 1-Click để bạn khôi phục lại ngay tức thì nếu bấm nhầm.
4. **Tùy Chọn Ẩn / Hiện Cột (Column Visibility):**
   * Nhấn nút **"Tùy chọn cột"** (icon ⚙️) trên thanh công cụ bảng thiết bị.
   * Đánh dấu hoặc bỏ chọn các cột bạn muốn hiển thị: *Số thứ tự (STT), Mã tài sản, Tên & Model, Khoa phòng / Vị trí, Danh mục, Nguyên giá, Bảo hành & Ngày mua, Trạng thái, Người giữ, Cấu hình (CPU/RAM/HDD), Màn hình đi kèm, Thao tác*.
   * **Ghi nhớ cấu hình:** Trình duyệt tự động lưu tùy chọn của bạn vào `localStorage`. Khi tải lại trang hoặc mở ở phiên làm việc sau, giao diện hiển thị vẫn được giữ nguyên vẹn.
5. **Sắp Xếp Dữ Liệu Khi Click Tiêu Đề Cột (Column Sorting):**
   * Click trực tiếp vào tiêu đề bất kỳ cột nào có biểu tượng mũi tên:
     - *Lần 1*: Sắp xếp tăng dần (A ➔ Z hoặc giá trị nhỏ ➔ lớn, hiển thị `↑`).
     - *Lần 2*: Sắp xếp giảm dần (Z ➔ A hoặc giá trị lớn ➔ nhỏ, hiển thị `↓`).
     - *Lần 3*: Hủy sắp xếp, quay về thứ tự mặc định ban đầu.
6. **Nút "Xóa Sắp Xếp & Làm Mới" (Clear Sort & Refresh):**
   * Khi đang sắp xếp, hệ thống hiển thị huy hiệu báo rõ cột đang áp dụng.
   * Nhấn nút **"Xóa sắp xếp & Làm mới"** (icon 🔄) để lập tức khôi phục trật tự bảng về mặc định và cập nhật lại dữ liệu mới nhất từ máy chủ.

---

### 3.6 Quản Lý Danh Mục Khoa Phòng Đa Khu Vực / Tòa Nhà
Phục vụ mô hình quản trị tại các bệnh viện, trường đại học hoặc doanh nghiệp sở hữu nhiều tòa nhà, khuôn viên:

1. Vào menu **Thiết lập** ➔ **Danh mục Khoa Phòng** (`/categories`).
2. **Mô hình Một Khoa Phòng - Nhiều Vị Trí:**
   * Một khoa/phòng có thể sở hữu nhiều vị trí làm việc tại các tòa nhà và tầng khác nhau (ví dụ: *Khoa Khám Bệnh* có phòng khám tại *Nhà A - Tầng 1*, *Nhà B - Tầng 2*).
3. **Thao tác quản lý:**
   * Bấm **"Thêm Khoa/Phòng"** hoặc nhấp vào khoa phòng hiện có để chỉnh sửa.
   * Thêm động các trường **Tòa nhà**, **Khu vực**, **Vị trí chi tiết** (Tầng/Phòng).
   * Khi thêm thiết bị hoặc lập biên bản, hệ thống cho phép chọn chính xác vị trí trực thuộc này.

---

### 3.7 Quản Lý Biên Bản Thiết Bị & Phụ Tùng Xuất Kho
Hỗ trợ quy trình luân chuyển tài sản chuyên nghiệp, chống thất thoát:

1. Vào menu **Quản lý Tài sản** ➔ **Biên bản Bàn giao** (`/asset-handover`).
2. **Lập Biên bản Thêm Thiết Bị & Xuất Phụ Tùng từ Kho:**
   * Khi thêm máy tính mới hoặc nâng cấp cho khoa phòng, bạn có thể chọn **Xuất trực tiếp phụ tùng/linh kiện từ kho** (RAM, SSD, Card màn hình, Bàn phím, Chuột...).
   * Hệ thống tự động trừ tồn kho phụ tùng và liên kết mã linh kiện vào thiết bị được bàn giao.
3. **Lập Biên bản Thu Hồi Tài Sản Thông Minh:**
   * Khi chọn khoa phòng cần thu hồi, danh sách thiết bị sẽ **tự động lọc chỉ hiển thị các thiết bị thuộc khoa phòng đó**.
   * Loại bỏ hoàn toàn nguy cơ chọn nhầm thiết bị của khoa phòng khác.
4. **Chuẩn hóa form & In ấn PDF:**
   * Toàn bộ form không còn văn bản mẫu giả định; thông tin bên giao, bên nhận được chọn trực tiếp từ danh sách nhân sự thực tế.
   * Hỗ trợ xem trước và in ấn biên bản chuẩn A4 có chữ ký hai bên.

---

### 3.8 Sử dụng Sơ đồ Mặt bằng 2D & Tủ Rack Data Center
1. Vào menu **Quản lý Tài sản** ➔ **Sơ đồ Mặt bằng 2D** (`/floor-maps`).
2. **Tạo mặt bằng tòa nhà:**
   * Bấm **Thêm mặt bằng mới** ➔ Đặt tên (ví dụ: *Văn phòng Tầng 3 - Tòa nhà A*).
   * Tải ảnh sơ đồ mặt bằng (bản vẽ kiến trúc PNG/JPG/SVG).
3. **Bố trí thiết bị:**
   * Chọn máy tính, màn hình, máy in từ danh sách bên trái và **kéo thả** vào vị trí bàn làm việc tương ứng trên sơ đồ.
4. **Mô phỏng tủ Rack Server (Data Center):**
   * Chuyển sang tab **Tủ Rack** ➔ Tạo tủ mới (chọn kích thước 12U, 24U hoặc 42U).
   * Gắn các Switch, Server, Router, UPS vào đúng vị trí từng Unit U để quản lý trực quan.

---

### 3.9 Sử dụng Công cụ Quét Mạng Tự Động Đa VLAN
Dành cho các thiết bị mạng không thể cài Agent (như Máy in văn phòng, Camera an ninh IP, Access Point Wi-Fi, Switch, Router):

1. **Khởi động giao diện quét:**
   * Từ `start_qltbit.bat`, chọn phím **`[2]`**.
   * Hoặc chạy trực tiếp: `python tools/vlan_scanner_gui.py`.
2. **Nhập các dải VLAN doanh nghiệp cần quét:**
   * Ví dụ: `192.168.10.0/24, 192.168.40.0/24, 192.168.50.0/24` (ngăn cách bằng dấu phẩy).
3. **Bấm "🚀 Bắt Đầu Quét Mạng":**
   * Chương trình sẽ quét đa luồng 60 luồng song song, tự động nhận diện thiết bị qua cổng kết nối và tra cứu hãng sản xuất qua địa chỉ MAC OUI (Dell, HP, Hikvision, Dahua, Canon, Ricoh, Cisco...).
4. **Bấm "☁️ Đồng Bộ Vào Hệ Thống":**
   * Toàn bộ danh sách thiết bị vừa tìm thấy sẽ được tự động nạp vào cơ sở dữ liệu QLTBIT mà bạn không cần phải nhập tay từng máy!

---

### 3.10 Tổ chức Đợt Kiểm Kê Tài Sản
1. Vào menu **Quản lý Tài sản** ➔ **Kiểm kê Tài sản** (`/assets/audit`).
2. Bấm **Tạo đợt kiểm kê mới** (ví dụ: *Kiểm kê cuối năm 2026 - Chi nhánh Miền Nam*).
3. Sử dụng điện thoại hoặc máy tính bảng kết nối vào mạng nội bộ, truy cập qua giao diện **HTTPS (Cổng 3443)**:
   * Mở trang `/scan` hoặc `/assets/audit` trên điện thoại.
   * Cấp quyền Camera và quét mã QR / mã vạch dán trên thân máy.
   * Hệ thống sẽ tự động tick chọn: **Đã kiểm kê**, phát hiện máy nào **Đang thất lạc**, máy nào **Bị di chuyển sai phòng ban**.

---

## 4. HƯỚNG DẪN CÀI ĐẶT AGENT MÁY TRẠM (AGENT INSTALLATION)

### 4.1 Chuẩn bị gói cài đặt GOI_CAI_DAT_AGENT
Tại thư mục `D:\QLTBIT`, khi bạn chọn phím `[4]` trong menu `start_qltbit.bat`, hệ thống sẽ tự động tạo thư mục:
📂 **`D:\QLTBIT\GOI_CAI_DAT_AGENT\`** bao gồm:
* `agent.ps1`: Script thu thập dữ liệu chuyên sâu 100% tương thích Windows 7/8/10/11.
* `Install_Agent.bat`: File cài đặt tự động 1-click.
* `Uninstall_Agent.bat`: File gỡ cài đặt sạch sẽ.
* `Run_Audit_Now.bat`: File kiểm kê và báo cáo tức thì.
* `HUONG_DAN_SU_DUNG.txt`: Tóm tắt nhanh hướng dẫn.

---

### 4.2 Phương án 1: Cài đặt thủ công bằng 1-Click (USB / Máy đơn lẻ)

Áp dụng cho máy trạm Workgroup không thuộc Domain hoặc muốn cài nhanh:

1. Copy toàn bộ thư mục **`GOI_CAI_DAT_AGENT`** sang máy tính người dùng (qua USB hoặc ổ đĩa mạng chia sẻ).
2. Nhấp chuột phải vào file **`Install_Agent.bat`** ➔ Chọn **Run as administrator** (Bắt buộc chạy quyền quản trị viên).
3. Cửa sổ hiển thị nhắc bạn nhập địa chỉ máy chủ:
   ```text
   Nhập địa chỉ máy chủ QLTBIT [Mặc định: http://192.168.1.100:3001]:
   ```
   👉 *Nhập địa chỉ IP thực tế của máy chủ QLTBIT trong mạng (ví dụ: `http://192.168.10.50:3001`).*
4. File cài đặt sẽ tự động:
   * Tạo thư mục hệ thống tại: `C:\ProgramData\QLTBIT\`.
   * Đăng ký tác vụ ngầm **Scheduled Task** (`QLTBIT_Audit`) chạy dưới quyền tối cao `SYSTEM`.
   * Kích hoạt lần quét đầu tiên gửi về máy chủ.
5. **Kết quả:** Trên web QLTBIT, máy tính vừa cài đặt sẽ xuất hiện ngay lập tức trong danh sách tài sản với đầy đủ CPU, RAM, Ổ cứng và danh sách phần mềm!

---

### 4.3 Phương án 2: Triển khai hàng loạt qua Active Directory GPO

Áp dụng cho doanh nghiệp có máy chủ Windows Server Domain Controller (triển khai hàng trăm máy tự động mà không cần đi từng máy):

1. **Đưa script lên thư mục chia sẻ SYSVOL:**
   * Copy file `agent.ps1` vào thư mục chia sẻ mạng:
     `\\domain.com\sysvol\domain.com\scripts\QLTBIT\agent.ps1`
2. **Tạo Group Policy Object (GPO):**
   * Mở **Group Policy Management Console** (`gpmc.msc`).
   * Tạo GPO mới đặt tên: `QLTBIT_Agent_Deployment`.
   * Chuột phải chọn **Edit**, điều hướng đến:
     `Computer Configuration` ➔ `Policies` ➔ `Windows Settings` ➔ `Scripts (Startup/Shutdown)` ➔ Nhấp đúp **Startup**.
3. **Thêm Script chạy:**
   * Chọn tab **PowerShell Scripts** ➔ Bấm **Add**.
   * Script Name: `\\domain.com\sysvol\domain.com\scripts\QLTBIT\agent.ps1`
   * Script Parameters: `-ServerUrl "http://192.168.10.50:3001" -Mode Install`
4. **Áp dụng GPO:**
   * Gán GPO vào Organizational Unit (OU) chứa các máy tính cần cài đặt.
   * Khi người dùng bật máy tính vào đầu ngày làm việc, máy tính sẽ tự động cài đặt Agent ngầm trong 3 giây mà người dùng hoàn toàn không biết và không bị gián đoạn công việc!

---

### 4.4 Phương án 3: Triển khai từ xa qua PowerShell / SCCM / Action1

Nếu bạn dùng công cụ quản trị từ xa (như PowerShell Remoting, PDQ Deploy, Action1, Endpoint Manager):
Chạy một lệnh PowerShell duy nhất trên máy đích với quyền Administrator:
```powershell
powershell.exe -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'http://192.168.10.50:3001/scripts/get_system_info.ps1' -OutFile '$env:TEMP\agent.ps1'; & '$env:TEMP\agent.ps1' -ServerUrl 'http://192.168.10.50:3001' -Mode Install"
```

---

## 5. HƯỚNG DẪN SỬ DỤNG & KIỂM TRA AGENT (AGENT OPERATION)

### 5.1 Cơ chế chạy ngầm Scheduled Task
* Agent hoạt động hoàn toàn tự động thông qua Windows Task Scheduler.
* Tên tác vụ: **`QLTBIT_Audit`**
* Tài khoản thực thi: **`NT AUTHORITY\SYSTEM`** (quyền cao nhất của Windows).
* Chu kỳ thực hiện: Mặc định **15 phút/lần** (hoặc mỗi khi khởi động máy / mở khóa màn hình).
* **Đặc tính an toàn:** Hoàn toàn vô hình (`-WindowStyle Hidden`), không hiện bất kỳ cửa sổ CMD hay PowerShell nào, mức tiêu hao CPU dưới 1% và thời gian thu thập thông tin chỉ mất khoảng 2 - 4 giây.

---

### 5.2 Kích hoạt kiểm kê tức thì (Run Audit On Demand)
Nếu bạn vừa nâng cấp RAM hoặc cài phần mềm mới cho người dùng và muốn hệ thống cập nhật lên Web Server ngay mà không cần đợi 15 phút:
* Vào thư mục `GOI_CAI_DAT_AGENT` trên máy trạm.
* Nhấp đúp vào file: **`Run_Audit_Now.bat`**.
* Quá trình kiểm kê sẽ thực thi ngay và hiển thị thông báo thành công trên màn hình.

---

### 5.3 Kiểm tra File Log trên máy trạm
Trên bất kỳ máy trạm nào đã cài Agent, toàn bộ nhật ký hoạt động đều được ghi tại:
📁 **`C:\ProgramData\QLTBIT\QLTBIT-Agent.log`**

Mở file này bằng Notepad, bạn sẽ thấy lịch sử gửi dữ liệu:
```text
2026-09-25 14:00:00 [INFO] Bắt đầu thu thập thông số máy trạm: PC-VANPHONG-01
2026-09-25 14:00:02 [INFO] Thu thập CPU: Intel Core i5-12400 (6 cores)
2026-09-25 14:00:02 [INFO] Thu thập RAM: 16 GB (2 slots: 8GB + 8GB)
2026-09-25 14:00:03 [INFO] Phát hiện 42 phần mềm cài đặt trong hệ thống.
2026-09-25 14:00:04 [INFO] Gửi dữ liệu tới http://192.168.10.50:3001/api/v1/auto-scan/collect -> HTTP 200 OK!
```

---

### 5.4 Xem và Thử nghiệm cảnh báo thay đổi phần cứng & phần mềm lạ
#### Cách mở tính năng trên giao diện Web:
1. Vào menu **Tài sản & Thiết bị** (`/assets`) trên thanh điều hướng bên trái.
2. Nhấp chuột vào tên thiết bị máy tính cần xem để mở cửa sổ popup **"Chi Tiết Thiết Bị" (`AssetDetailModal`)**.
3. Chuyển sang Tab: **"Cấu hình Phần cứng & Kiểm kê"** (nằm ngay cạnh tab Thông tin chung).
4. **Hệ thống cảnh báo động thông minh**:
   - Nếu máy tính bình thường: Hiển thị bảng thông số cấu hình sạch màu xanh.
   - **⚠️ Khung màu cam nổi bật**: `⚠️ Cảnh Báo Thay Đổi Linh Kiện Phần Cứng (Hardware Tamper / Change)` ➔ Hiển thị ngay lập tức khi phát hiện RAM bị tháo, ổ cứng bị hoán đổi, hoặc CPU thay đổi.
   - **🛡️ Khung màu đỏ an ninh**: `🛡️ Cảnh Báo An Ninh: Phát Hiện Công Cụ Bẻ Khóa / Crack / KMS` ➔ Liệt kê chính xác công cụ lậu như `KMSAuto`, `KMSPico`, `AutoKMS`...
   - **📜 Khung nhật ký lịch sử**: `📜 Lịch Sử Thay Đổi Phần Cứng & Phần Mềm` ➔ Ghi nhận chi tiết từng sự kiện thay đổi (`16GB ➔ 8GB`, phần mềm mới cài, phần mềm bị gỡ bỏ).
   - Ngoài ra, trên bảng danh sách tài sản `/assets`, các máy có cảnh báo sẽ tự động gắn huy hiệu màu cam nổi bật để Quản trị viên phát hiện ngay mà không cần mở từng máy.

---

### 5.5 Gỡ bỏ Agent sạch sẽ
Khi thu hồi máy hoặc không muốn giám sát nữa:
1. Vào thư mục `GOI_CAI_DAT_AGENT`.
2. Nhấp chuột phải vào file **`Uninstall_Agent.bat`** ➔ Chọn **Run as administrator**.
3. File sẽ tự động hủy Scheduled Task `QLTBIT_Audit` và xóa sạch thư mục `C:\ProgramData\QLTBIT`.

---

## 6. HƯỚNG DẪN CẬP NHẬT KHI CÓ THAY ĐỔI VỀ CODE (UPDATE SERVER & AGENT)

### ❓ Câu hỏi: Khi có code mới thì có cần cài lại phần mềm không?
👉 **TRẢ LỜI: HOÀN TOÀN KHÔNG CẦN CÀI LẠI!**
Toàn bộ cơ sở dữ liệu PostgreSQL (35+ bảng), kho tài liệu ảnh chứng từ (`public/uploads`) và cấu hình hệ thống (`.env`) của bạn được bảo toàn nguyên vẹn 100%.

### 🏢 A. Quy trình cập nhật ở Máy Chủ (Server)
Khi có phiên bản mới trên GitHub hoặc có code mới từ nhà phát triển:
1. **Bước 1**: Tắt máy chủ QLTBIT (Nhấp chuột phải vào icon ở khay Taskbar ➔ Chọn **Thoát / Exit**).
2. **Bước 2**: Nhấp đúp vào file **`update.bat`** tại thư mục dự án `D:\QLTBIT`.
   - File script sẽ tự động kéo code mới nhất (`git pull`), cài thêm thư viện (`npm install`), nâng cấp cấu trúc cơ sở dữ liệu (`npx prisma db push`), và biên dịch bản chạy tối ưu (`npm run build`).
3. **Bước 3**: Khởi động lại máy chủ bằng `QLTBIT_Server.exe` hoặc file `start_qltbit.bat` ➔ Hoàn tất 100%!

### 💻 B. Quy trình cập nhật ở Máy Trạm (Agent)
👉 **99% trường hợp: BẠN KHÔNG CẦN LÀM BẤT KỲ ĐIỀU GÌ Ở MÁY TRẠM!**
* **Lý do**: Agent trên máy trạm chỉ là một tác vụ ngầm định kỳ 15 phút đẩy thông số cấu hình về máy chủ.
* Toàn bộ logic phát hiện tháo trộm linh kiện, phân tích RAM bị giảm, đối chiếu bẻ khóa KMS lậu... đều chạy tập trung trên **Máy Chủ (Server)**. Do đó, khi Server cập nhật tính năng mới, tất cả các máy trạm tự động được áp dụng tính năng đó ngay lập tức mà Quản trị viên không cần đến từng máy khách.
* **Trường hợp duy nhất cần cập nhật Agent**: Khi có bản cập nhật script thu thập mới (`agent.ps1`) hoặc khi cơ quan thay đổi địa chỉ IP của máy chủ. Khi đó bạn chỉ cần:
  - Copy file `agent.ps1` trong thư mục `GOI_CAI_DAT_AGENT` đè vào `C:\ProgramData\QLTBIT\agent.ps1` trên máy trạm (hoặc chạy lại `Install_Agent.bat`).
  - Hoặc triển khai cập nhật hàng loạt qua Group Policy (GPO) trong mạng Active Directory.

---

## 7. BẢNG XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

| Vấn đề gặp phải | Nguyên nhân | Cách khắc phục triệt để |
| :--- | :--- | :--- |
| **Không thấy nút Lưu trong phần Cấu hình Server IP / Quét QR** | Nút lưu trước đây nằm ở thanh nổi cuối trang khiến khó nhìn. | Hiện đã có nút **`[ 💾 Lưu cấu hình Server IP ]`** màu xanh nổi bật nằm ngay bên phải ô nhập URL. Bấm là lưu ngay! |
| **Không thấy khung Cảnh Báo Tháo Trộm Linh Kiện** | Máy tính đang xem không có sự cố hoặc đang ở tab Thông tin chung. | Vào chi tiết máy tính ➔ Chuyển sang Tab **"Cấu hình Phần cứng & Kiểm kê"**. Khung cảnh báo chỉ hiện ra KHI CÓ BẤT THƯỜNG (RAM bị tháo, ổ cứng bị đổi, hoặc cài phần mềm crack). |
| **Máy trạm báo lỗi "Chưa chạy quyền Administrator" khi cài đặt** | Người dùng nhấp đúp trực tiếp vào file thay vì chạy quyền Admin. | Nhấp **chuột phải** vào `Install_Agent.bat` ➔ chọn **Run as administrator**. |
| **Agent gửi dữ liệu nhưng báo lỗi HTTP 404 hoặc Connection Refused** | Địa chỉ IP máy chủ bị sai hoặc Web Server QLTBIT chưa được bật. | Kiểm tra máy chủ QLTBIT đã bật `QLTBIT_Server.exe` chưa. Đảm bảo IP máy chủ cấu hình trong Agent là đúng (ví dụ: `http://192.168.10.50:3001`). |
| **Máy trạm ở VLAN khác không kết nối được tới máy chủ** | Tường lửa Windows hoặc Router chặn luồng Inter-VLAN. | 1. Mở cổng 3001 và 3443 trên tường lửa máy chủ (xem mục 2.5).<br>2. Kiểm tra rule định tuyến giữa các VLAN trên Switch L3 / Firewall. |
| **Không mở được camera quét mã QR trên điện thoại** | Trình duyệt di động (Chrome, Safari) bắt buộc phải có kết nối bảo mật HTTPS mới cấp quyền Camera. | Trên điện thoại, truy cập qua giao diện **HTTPS trên cổng 3443**: `https://<IP_MAY_CHU>:3443/scan`. Nếu trình duyệt cảnh báo chứng chỉ tự ký, bấm *Nâng cao (Advanced)* ➔ *Tiếp tục truy cập (Proceed)*. |
| **Scanner Đa VLAN quét không thấy máy trạm** | Máy trạm Windows mặc định bật tường lửa chặn Ping (ICMP). | Không lo lắng: Scanner vẫn quét cổng mở (135, 445, 3389). Nếu có cổng mở, thiết bị vẫn được nhận diện là Windows Workstation. Đối với máy trạm, phương án tối ưu nhất vẫn là triển khai **Agent qua GPO**. |
| **Lệnh `npm` hoặc `node` báo "is not recognized"** | Chưa cài đặt Node.js hoặc chưa thêm Node.js vào biến môi trường PATH. | Chạy `tools/setup_environment.ps1` hoặc cài Node.js LTS từ [nodejs.org](https://nodejs.org/), sau đó khởi động lại cửa sổ PowerShell. |

---

> 🎉 **Hệ thống đã sẵn sàng 100%!** Mọi thắc mắc kỹ thuật hoặc nhu cầu phát triển thêm tính năng, bạn có thể xem thêm trong file [`HUONG_DAN_TRIEN_KHAI_DA_VLAN.md`](file:///D:/QLTBIT/HUONG_DAN_TRIEN_KHAI_DA_VLAN.md).

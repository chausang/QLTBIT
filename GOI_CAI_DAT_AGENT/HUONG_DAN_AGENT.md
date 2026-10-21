# 🛡️ HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG AGENT MÁY TRẠM (QLTBIT)

> Bộ công cụ tự động thu thập cấu hình phần cứng & phần mềm trên máy trạm Windows, hoạt động định kỳ và phát hiện cảnh báo thay đổi linh kiện gửi về máy chủ QLTBIT trong mạng đa VLAN.

---

## 📂 Danh Sách File Trong Gói Này

| Tên File | Chức Năng |
| :--- | :--- |
| **`Install_Agent.bat`** | File cài đặt 1-Click (nhấp chuột phải chọn *Run as administrator*). |
| **`Run_Audit_Now.bat`** | File kích hoạt kiểm kê tức thì (không cần đợi chu kỳ 15 phút). |
| **`Uninstall_Agent.bat`** | File gỡ bỏ sạch sẽ Agent khỏi máy trạm. |
| **`agent.ps1`** | Script PowerShell thu thập thông tin chuyên sâu (chạy ngầm dưới quyền `SYSTEM`). |
| **`HUONG_DAN_SU_DUNG.txt`** | Bản tóm tắt nhanh hướng dẫn dạng text. |

---

## 🚀 1. Cài Đặt Thủ Công (Cho Từng Máy Trạm)

1. Sao chép thư mục `GOI_CAI_DAT_AGENT` sang máy tính cần cài đặt.
2. Nhấp chuột phải vào file **`Install_Agent.bat`** ➔ Chọn **Run as administrator**.
3. Khi được hỏi:
   ```text
   Nhập địa chỉ máy chủ QLTBIT [Mặc định: http://192.168.1.100:3001]:
   ```
   👉 Điền địa chỉ IP máy chủ thực tế của bạn (ví dụ: `http://192.168.10.50:3001`).
4. Hệ thống sẽ tự động đăng ký một tác vụ chạy ngầm **Scheduled Task: `QLTBIT_Audit`** định kỳ **15 phút/lần**, chạy vô hình dưới quyền `NT AUTHORITY\SYSTEM`.

---

## 🏢 2. Triển Khai Hàng Loạt Qua Active Directory GPO

Nếu công ty có hệ thống Domain Controller, bạn có thể triển khai tự động cho hàng trăm máy:

1. Đặt file `agent.ps1` vào thư mục chia sẻ:
   `\\domain.com\sysvol\domain.com\scripts\QLTBIT\agent.ps1`
2. Mở `gpmc.msc`, tạo GPO mới gắn vào OU Máy tính:
   * Đường dẫn: `Computer Configuration` ➔ `Policies` ➔ `Windows Settings` ➔ `Scripts` ➔ `Startup`
   * Thêm PowerShell Script:
     * **Script Name:** `\\domain.com\sysvol\domain.com\scripts\QLTBIT\agent.ps1`
     * **Script Parameters:** `-ServerUrl "http://192.168.10.50:3001" -Mode Install`
3. Khi máy tính khởi động, Agent sẽ tự động cài đặt ngầm trong 3 giây.

---

## 🔍 3. Kiểm Tra & Giám Sát

* **Kiểm tra File Log:** `C:\ProgramData\QLTBIT\QLTBIT-Agent.log`
* **Kiểm tra Payload JSON gần nhất:** `C:\ProgramData\QLTBIT\QLTBIT-last-payload.json`
* **Gỡ bỏ Agent:** Chạy `Uninstall_Agent.bat` với quyền Administrator.

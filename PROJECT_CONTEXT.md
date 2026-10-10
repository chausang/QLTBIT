# Simply IT - Project Context & AI Memory Handover (Bàn Giao Ngữ Cảnh)

> 📌 **Mục đích tài liệu:** Lưu giữ toàn bộ ngữ cảnh, tư duy thiết kế, các quyết định nghiệp vụ đã thống nhất và hướng dẫn dành cho AI Assistant (Antigravity / Gemini) khi chuyển đổi sang máy tính mới hoặc bắt đầu phiên làm việc mới.

---

## 1. Thông Tin Tổng Quan & Triết Lý Phát Triển
- **Dự án:** Simply IT - Hệ thống Quản trị Tài sản CNTT (ITAM) & Helpdesk Service Desk cho Doanh nghiệp / Tập đoàn.
- **Tech Stack:**
  - **Framework:** Next.js 15 (App Router), React 19, Tailwind CSS.
  - **Database & ORM:** PostgreSQL, Prisma ORM (`prisma/schema.prisma`).
  - **Server Runtime:** Node.js (`server.js` tùy chỉnh hỗ trợ cả HTTP :3001 và HTTPS :3443).
  - **Client Caching:** Hệ thống SWR tự viết (`src/lib/client-cache.ts`) tối ưu độ trễ 0ms, BroadcastChannel và custom events cho Reactive Sync giữa các tab/modal.
- **Triết lý làm việc (Ponytail Senior Dev Mode):**
  - Đơn giản, thực dụng, tôn trọng nghiệp vụ thực tế, không over-engineering.
  - Giao diện phản hồi 0ms (Optimistic UI) cho các thao tác xóa, thêm, sửa.
  - Mọi logic phi vụn vặt đều phải có kiểm thử tự động xác minh (`scripts/qa-system-audit.js`).

---

## 2. Các Quyết Định Nghiệp Vụ Cốt Lõi Đã Thống Nhất Cùng User

### 🗑️ 2.1. Thùng Rác (Recycle Bin) & Khôi Phục Tức Thì
- **Thời gian lưu trữ mặc định:** **30 ngày** (có thể cấu hình trong bảng `system_settings`).
- **Cơ chế Soft-Delete:** Khi xóa Tài sản, Bản quyền, Nhân sự... hệ thống chụp lại bản snapshot đầy đủ lưu vào bảng `TrashItem`, xóa khỏi bảng chính để bảo đảm tính toàn vẹn.
- **Auto-Purge:** Tự động quét dọn vĩnh viễn các mục có `expiresAt < now()`.
- **0ms Undo Toast (`TrashUndoToast.tsx`):**
  - Khi người dùng xóa bất kỳ mục nào, popup nổi ở góc phải màn hình trong **4 giây** kèm thanh tiến trình thu nhỏ dần.
  - Bấm **`[ ↩️ Hoàn tác ]`** sẽ phục hồi bản ghi ngay lập tức tại chỗ và xóa cache để bảng hiển thị lại thiết bị/nhân sự mà không cần tải lại trang.
- **Phím tắt nhanh trên trang Tài sản:** Nút `🗑️ Thùng rác (N)` trực tiếp trên thanh filter của trang `/assets`.

### 🔑 2.2. Cho Phép Vượt Định Mức Bản Quyền (License Over-Allocation / True-up)
- **Quy tắc:** Trong thực tế IT doanh nghiệp, việc cấp phát license vượt số chỗ mua (over-allocation) là **HOÀN TOÀN ĐƯỢC PHÉP** (phục vụ cấp phát khẩn cấp, thời gian ân hạn hoặc đối soát True-up cuối năm).
- **Hành vi hệ thống:** Không chặn lỗi 400. Hệ thống cho phép gán tiếp, cập nhật số `usedSeats` chính xác (ví dụ: `5/2 seats`), và trả về cờ `isOverAllocated: true` kèm thông báo ghi nhận vượt hạn mức.

### 💰 2.3. Khấu Hao Tài Chính & Tiền Tệ
- Tính khấu hao theo phương pháp đường thẳng (Straight-Line).
- Đã bọc an toàn chống chia cho 0 (`usefulLifeMonths <= 0`) để không bao giờ bị vỡ giao diện hiển thị `NaN ₫`.
- Hỗ trợ đa tiền tệ (VND, USD, EUR, JPY, SGD) với tỉ giá hối đoái.

### 👥 2.4. Quy Trình Nghỉ Việc (Offboarding)
- Khi nhân viên nghỉ việc: Thu hồi toàn bộ máy tính về trạng thái `AVAILABLE`, thu hồi các bản quyền phần mềm (`revokedAt`), khóa tài khoản đăng nhập (`isActive = false`) và từ chối đăng nhập (HTTP 403).

### 📦 2.5. Trình Cài Đặt Trọn Gói 1-Click (Setup Wizard & PostgreSQL Portable)
- **File thực thi:** `SimplyIT_Setup.exe` (và `Cai_Dat_SimplyIT.exe`).
- **3 Chế độ cài đặt:**
  1. Cài đặt CẢ HAI: Server & Agent (Máy quản trị viên).
  2. Chỉ cài đặt Máy Chủ (SIMPLY IT Central Server).
  3. Chỉ cài đặt Agent Giám Sát (Client Workstation).
- **Zero-Setup Database:** Đi kèm PostgreSQL 17 Portable trong thư mục `pgsql`, tự động tạo dữ liệu và kết nối `127.0.0.1:5432` mà không cần cài đặt rườm rà.
- **Tường lửa & Task Scheduler:** Tự động mở Inbound Port 3001 & 3443, tự động đăng ký tác vụ `SimplyIT_Audit` chạy ngầm định kỳ 15 phút.

### 🏢 2.7. Danh Mục Khoa Phòng Đa Khu Vực & Nghiệp Vụ Biên Bản Thiết Bị (v1.0.7)
- **Danh Mục Khoa Phòng (`/categories`)**: Hỗ trợ quan hệ 1 khoa phòng có nhiều khu vực/tòa nhà/tầng trực thuộc. Thêm/sửa/xóa động các trường vị trí.
- **Biên Bản Thêm Thiết Bị Xuất Phụ Tùng Từ Kho**: Hỗ trợ chọn xuất phụ tùng/linh kiện trực tiếp từ kho (RAM, SSD, card mạng...) gắn kèm khi lập biên bản.
- **Biên Bản Thu Hồi Lọc Theo Khoa Phòng**: Khi chọn khoa phòng, danh sách thiết bị tự động lọc chỉ hiển thị thiết bị thuộc khoa phòng đó, loại bỏ rủi ro chọn nhầm tài sản.
- **Chuẩn Hóa Form**: Xóa bỏ các placeholder tên người ví dụ, hỗ trợ in PDF chuẩn A4.

### 📊 2.8. Import Excel 21 Cột & Tùy Biến Bảng Thiết Bị (v1.0.8)
- **Import Excel 21 Cột Khoa Phòng**: Thuật toán quét 5 dòng đầu nhận diện header đa tầng (cụm Màn hình sub-header). Tách cấu hình CPU, RAM, HDD và Màn hình vào `specs`.
- **Khử Trùng Lặp Mã Nhóm**: Khi file Excel lặp mã nhóm (ví dụ `PC.KH2400`), tự động lấy tên định danh duy nhất (ví dụ `K_NHIEM_01_T7`) làm `assetTag` hoặc sinh hậu tố duy nhất, lưu mã nhóm vào `fixedAssetName`, giải quyết triệt để lỗi ràng buộc duy nhất.
- **Tùy Chọn Ẩn/Hiện Cột (Column Visibility)**: Popover tùy chọn cột trên bảng danh sách thiết bị, tự động lưu cấu hình người dùng vào `localStorage`.
- **Sắp Xếp & Làm Mới (Sort & Reset)**: Click tiêu đề cột để sắp xếp 3 trạng thái (Tăng dần `↑`, Giảm dần `↓`, Hủy), nút Xóa sắp xếp & Làm mới khôi phục danh sách tức thì.

### 🏛️ 2.9. Bảng Kiểm Kê TSCĐ Khoa Phòng 29 Cột & Mã Quản Lý (MQL) Toàn Diện (v1.0.12)
- **Model `DepartmentFixedAsset`**: Bảng dữ liệu 29 cột chuẩn kế toán theo mẫu Excel bệnh viện/doanh nghiệp: STT, Tên TSCĐ, Mã số TSC, Mã quản lý, Nơi sử dụng, Hãng SX, Nước SX, Năm SD, Sổ sách (1-2-3), Kiểm kê (4-5-6), Chênh lệch (7-8-9), Ghi chú, Khoa phòng, Kho, Nhóm, Thành tiền sổ, Thành tiền tiêu hao, % Khấu hao, Ngày tính KH, Năm KH, Ghi chú 1, STT KK.
- **Mã quản lý (`managementCode`)**: Sinh tự động `MQL-xxxxxx` hoặc nhập tay/để trống trên cả Thiết bị (`Asset`), Phụ tùng linh kiện (`SparePart`) và TSCĐ kiểm kê. Tự động hiển thị liên kết chéo khi trùng mã.
- **Import/Export Excel**:
  - Export: file `.xlsx` 2 tầng tiêu đề gộp ô, màu sắc và định dạng số chuẩn xác 100% theo mẫu ảnh.
  - Import: Nhận diện dòng tiêu đề, parse linh hoạt 29 cột, có tùy chọn tự sinh mã quản lý cho các dòng còn trống.

---


## 3. Cấu Trúc Mã Nguồn Quan Trọng
- `src/lib/trash.ts`: Thư viện xử lý Thùng rác, snapshot dữ liệu, tính ngày hết hạn và khôi phục.
- `src/components/common/TrashUndoToast.tsx`: Toast hoàn tác 0ms nổi trên màn hình.
- `src/lib/client-cache.ts`: Quản lý bộ nhớ đệm SWR và đồng bộ revalidation đa tab.
- `src/app/api/system/backup/`: Hệ thống sao lưu và phục hồi toàn bộ database + upload qua file `.zip`.
- `scripts/qa-system-audit.js`: Kịch bản kiểm thử tự động toàn diện 52 ca test qua 9 module (100% PASS).

---

## 4. Hướng Dẫn Cho AI Khi Bắt Đầu Phiên Mới
Khi người dùng mở một phiên làm việc mới trên máy mới:
1. Đọc file này để nắm trọn vẹn phong cách, các quy tắc và quyết định đã thống nhất.
2. Kiểm tra trạng thái Git (`git status`, `git log -n 5`) để biết commit gần nhất.
3. Luôn trả lời ngắn gọn, trực diện, đúng trọng tâm kỹ thuật bằng tiếng Việt.

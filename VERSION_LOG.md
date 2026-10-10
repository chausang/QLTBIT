# 📜 SIMPLY IT - NHẬT KÝ PHIÊN BẢN (VERSION LOG)

Tài liệu này ghi lại chi tiết toàn bộ lịch sử phát triển, nâng cấp tính năng, cải tiến kiến trúc và sửa lỗi của hệ thống **Simply IT (Quản lý Tài sản CNTT & Dịch vụ Doanh nghiệp)** qua từng phiên bản phát hành chính thức.

---

## 📌 BẢNG TỔNG HỢP CÁC PHIÊN BẢN

| Phiên Bản | Ngày Phát Hành | Tên Bản Phát Hành / Trọng Tâm | Trạng Thái |
| :--- | :---: | :--- | :---: |
| **v1.0.12** | **10/10/2026** | **Bảng Kiểm Kê TSCĐ Khoa Phòng Chuẩn Kế Toán (29 Cột) & Mã Quản Lý Xuyên Suốt** | **Mới nhất (Latest)** |
| **v1.0.11** | **10/10/2026** | **Linh Hoạt Người Nhận Bàn Giao Thiết Bị & Chuẩn Hóa Bên Giao Biên Bản** | **Ổn định (Stable)** |
| **v1.0.10** | **10/10/2026** | **Bộ Lọc Thiết Bị Theo Khoa Phòng & Cột Số Thứ Tự (STT) Bảng Dữ Liệu** | **Ổn định (Stable)** |
| **v1.0.9** | **10/10/2026** | **Tải Mẫu Excel .XLSX, Chống Trùng & Báo Cáo Lỗi Excel, Xóa Hàng Loạt Thiết Bị** | **Ổn định (Stable)** |
| **v1.0.8** | **10/10/2026** | **Import Excel Khoa Phòng 21 Cột, Tùy Chọn Cột & Sắp Xếp Trực Quan** | Ổn định |
| **v1.0.7** | **09/10/2026** | **Danh Mục Khoa Phòng Đa Khu Vực & Tối Ưu Biên Bản Thiết Bị** | Ổn định |
| **v1.0.6** | **03/10/2026** | **Sao Lưu & Phục Hồi Toàn Diện (Disaster Recovery & 1-Click Backup)** | Ổn định |
| **v1.0.5** | **02/10/2026** | **Bộ Cài Đặt Tự Động 1-Click (Setup Wizard & PostgreSQL Portable)** | Ổn định |
| **v1.0.4** | **20/09/2026** | **Quy Trình Phê Duyệt Thông Minh & Lịch Gia Hạn Chi Phí 12 Tháng** | Ổn định |
| **v1.0.3** | **12/09/2026** | **Vòng Đời Nhân Sự Nghỉ Việc (Offboarding) & Thùng Rác 0ms Hoạt Tác** | Ổn định |
| **v1.0.2** | **05/09/2026** | **Khung Chat AI Kéo Thả, Menu Chuột Phải & Tự Động Nhận Diện Thiết Bị** | Ổn định |
| **v1.0.1** | **28/08/2026** | **Chuẩn Hóa Cổng Kép Dual-Port HTTP 3001 / HTTPS 3443 & Đóng Gói Docker** | Ổn định |
| **v1.0.0** | **15/08/2026** | **Khởi Tạo Hệ Thống Simply IT Community Edition** | Bản gốc |

---

## 🚀 CHI TIẾT CÁC BẢN CẬP NHẬT

---

### 🌟 [v1.0.12] - 10/10/2026: Bảng Kiểm Kê TSCĐ Khoa Phòng Chuẩn Kế Toán (29 Cột) & Mã Quản Lý Xuyên Suốt

Bản cập nhật **v1.0.12** triển khai toàn diện Bảng Kiểm Kê Tài Sản Cố Định (TSCĐ) Khoa Phòng chuẩn 29 cột theo mẫu kế toán thực tế, tích hợp cột Mã Quản Lý (MQL) tự sinh/nhập tay liên kết xuyên suốt giữa Thiết Bị, Phụ Tùng Linh Kiện và TSCĐ Kiểm Kê:

#### 1. 🚀 Tính Năng Mới & Nâng Cấp (Features & Improvements)
- **Bảng Kiểm Kê Tài Sản Cố Định Khoa Phòng Chuẩn Kế Toán (`DepartmentFixedAsset`)**:
  - Tích hợp tab **"🏛️ TSCĐ Khoa Phòng (Theo Mẫu)"** vào trang Kiểm kê tài sản (`/assets/audit`).
  - Cấu trúc 29 cột chuẩn 100% theo mẫu kế toán bệnh viện/doanh nghiệp: STT, Tên TSCĐ, Mã số TSC, Mã quản lý (MQL), Nơi sử dụng, Hãng SX, Nước SX, Năm SD, Sổ sách (1-2-3), Kiểm kê (4-5-6), Chênh lệch (7-8-9), Ghi chú, Khoa phòng, Kho, Nhóm, Thành tiền sổ, Thành tiền tiêu hao, % Khấu hao, Ngày tính KH, Năm KH, Ghi chú 1, STT KK.
  - Tự động seed dữ liệu mẫu đầy đủ từ dòng 31 trở xuống.
- **Mã Quản Lý (MQL) Tự Sinh & Liên Kết Xuyên Suốt**:
  - Bổ sung `managementCode` vào CSDL `Asset`, `SparePart`, `DepartmentFixedAsset`.
  - Nút bấm `⚡ Tự sinh mã` tiền tố `MQL-xxxxxx` hoặc cho phép gõ tự do/để trống.
  - Tự động phát hiện và liên kết hiển thị badge Thiết bị và Linh kiện khi trùng mã quản lý.
- **Import & Export Excel TSCĐ Khoa Phòng**:
  - Xuất Excel 2 tầng tiêu đề gộp ô, format tiền tệ và màu sắc chuẩn theo mẫu ảnh.
  - Nhập Excel 29 cột tự động đọc tiêu đề từ dòng 28-30.
- **Đồng Bộ Trên Toàn Bộ Giao Diện**:
  - Bổ sung cột Mã quản lý vào Danh sách thiết bị (`/assets`) và Phụ tùng linh kiện (`/spare-parts`).

---

### 🌟 [v1.0.11] - 10/10/2026: Linh Hoạt Người Nhận Bàn Giao Thiết Bị & Chuẩn Hóa Bên Giao Biên Bản

Bản cập nhật **v1.0.11** hoàn thiện trải nghiệm điều chuyển tài sản linh hoạt theo thực tế doanh nghiệp và bệnh viện, đồng thời loại bỏ thông tin mặc định cá nhân hóa trong các mẫu biên bản:

#### 1. 🚀 Tính Năng Mới & Nâng Cấp (Features & Improvements)
- **Linh Hoạt Người Nhận Trong Modal Điều Chuyển Thiết Bị (`AssetTransferModal`)**:
  - **Không bắt buộc chọn nhân sự**: Bỏ hoàn toàn ràng buộc bắt buộc `toUserId` và dấu sao đỏ `(*)`.
  - **Hỗ trợ tự gõ họ tên trực tiếp**:
    - Người dùng có thể gõ trực tiếp họ tên người nhận vào ô tìm kiếm mà không cần chọn trong dropdown.
    - Cơ chế nhận diện thông minh: Tự động đối chiếu nhân sự có sẵn; nếu là nhân sự mới thì backend tự động khởi tạo tài khoản nhân viên (Staff) và liên kết phân bổ chính xác.
    - Tích hợp nút chọn nhanh trong dropdown: `✍️ Dùng tên tự do: "..." (Tự động ghi nhận)`.
  - **Cho phép để trống người nhận**:
    - Cho phép lưu điều chuyển thiết bị khi để trống ô người nhận (bàn giao thiết bị chung theo phòng ban/vị trí, luân chuyển kho mà không gán người phụ trách cụ thể).
    - Tự động hoàn tất phân bổ cũ (nếu có) và đưa thiết bị về trạng thái Sẵn sàng (`AVAILABLE`).
  - **Cải tiến giao diện**:
    - Nút xóa nhanh `X` 1-Click để xóa trắng ô người nhận.
    - Huy hiệu trạng thái trực quan: Phân biệt rõ "Nhân sự từ hệ thống", "Tên người nhận tự do (Tự động ghi nhận)", và "Để trống: Bàn giao không gán đích danh".
    - Tự động đóng dropdown khi click chuột ra ngoài (`click outside`).
- **Chuẩn Hóa Biên Bản Thiết Bị & Loại Bỏ Tên Mặc Định**:
  - Xóa bỏ hoàn toàn tên mặc định "Nguyễn Hoàn Danh" ở bên bàn giao trong API mẫu biên bản (`/api/minutes`).
  - Dọn dẹp sạch sẽ dữ liệu mẫu trong cơ sở dữ liệu để trường bên bàn giao luôn ở trạng thái trống, cho phép người dùng tự nhập hoặc ký tên theo thực tế.

---

### 🌟 [v1.0.10] - 10/10/2026: Bộ Lọc Thiết Bị Theo Khoa Phòng & Cột Số Thứ Tự (STT) Bảng Dữ Liệu

Bản cập nhật **v1.0.10** hoàn thiện trải nghiệm tra cứu và quản lý tài sản theo phân cấp hành chính khoa phòng / địa điểm, đồng thời bổ sung cột Số Thứ Tự chuẩn hóa theo phân trang:

#### 1. 🚀 Tính Năng Mới & Nâng Cấp (Features & Improvements)
- **Bộ Lọc Thiết Bị Theo Khoa Phòng / Phòng Ban (Department / Location Filter)**:
  - Tích hợp trực tiếp dropdown **"📍 Khoa phòng (Tất cả)"** lên thanh công cụ lọc nâng cao (`Advanced Filter & Search Bar`).
  - Tự động nạp danh sách các Khoa phòng/Phòng ban đã cấu hình (kèm thông tin Tòa nhà trực thuộc nếu có).
  - **Lọc máy chủ tốc độ cao (Server-side Filter)**:
    - API `/api/assets` xử lý tham số `locationId` thông minh: lọc trực tiếp theo `locationId` (UUID) hoặc tra cứu linh hoạt qua tên khoa phòng và phòng ban nhân sự được phân bổ (`assignments.user.department`).
    - Đồng bộ tự động với các tính năng: Xuất Excel (Export), Thống kê KPI tài chính, và nút Xóa Tất Cả Bộ Lọc (Reset Filters).
- **Cột Số Thứ Tự (STT) Bảng Dữ Liệu Thiết Bị**:
  - Bổ sung cột **STT** hiển thị ở vị trí đầu tiên của bảng danh sách tài sản.
  - Tự động tính số thứ tự lũy tiến theo số trang và số dòng: `STT = (Trang - 1) * Số dòng + Index + 1` (ví dụ: Trang 1 từ 1-25, Trang 2 từ 26-50...).
  - **Cơ chế Sticky Dual-Column trơn tru**:
    - Khi cuộn ngang sang phải để xem Cấu hình phần cứng, Màn hình, Nguyên giá... cột **STT** (vị trí `left-0`) và cột **Mã tài sản & Checkbox** (vị trí `left-[44px]`) đồng thời bám dính hoàn hảo ở mép trái, không bị che khuất hay đè chồng.
  - **Tích hợp Tùy Chọn Cột (Column Visibility)**:
    - Cho phép người dùng bật/tắt hiển thị cột STT trong menu *Tùy chọn cột*.
    - Tự động ghi nhớ tùy biến của người dùng vào `localStorage`.

---

### 🌟 [v1.0.9] - 10/10/2026: Tải Mẫu Excel .XLSX, Chống Trùng & Báo Cáo Lỗi Excel, Xóa Hàng Loạt Thiết Bị

Bản cập nhật **v1.0.9** giải quyết triệt để các vấn đề cốt lõi trong quy trình Import dữ liệu tài sản từ Excel, kiểm soát toàn vẹn dữ liệu và nâng cao năng suất quản lý danh mục thiết bị:

#### 1. 🚀 Tính Năng Mới & Nâng Cấp (Features & Improvements)
- **Chuẩn Hóa Nút "Tải Mẫu Excel" Ra Định Dạng `.xlsx` Thật Sự**:
  - Khắc phục triệt để tình trạng tải nhầm file JSON do thiếu API route.
  - Xây dựng API route chuyên trách `/api/assets/export?template=true` sinh file Workbook `.xlsx` native chuẩn Microsoft Excel thông qua thư viện `exceljs`.
  - Bộ mẫu chuẩn tích hợp đa sheet gồm:
    - **Sheet 1: Mẫu Tiêu Chuẩn**: Cấu trúc cơ bản đầy đủ (Mã tài sản, Tên máy, Danh mục, CPU, RAM, Ổ cứng, Giá mua, Thời hạn bảo hành, Trạng thái...).
    - **Sheet 2: Mẫu Khoa Phòng (21 Cột)**: Định dạng chuẩn y tế/bệnh viện (STT, QR, Tên khoa phòng, Tên loại thiết bị, Mã thiết bị, Tên thiết bị, Hãng sx, Năm sx, Model, Số seri, CPU, RAM, HDD, Màn hình [Hãng, Năm, Model, Seri], Tình trạng, Mã cũ, Tính cấp lại, Ghi chú) kèm dữ liệu thực tế mẫu.
    - **Sheet 3: Hướng Dẫn & Quy Định Cột**: Hướng dẫn chi tiết kiểu dữ liệu từng cột, mẹo nhập nhanh và giải thích các mã trạng thái.
- **Cơ Chế Chống Trùng Dữ Liệu Nghiêm Ngặt & Bảo Vệ CSDL**:
  - Không tự ý sinh hậu tố giả để ép thêm dữ liệu trùng vào database.
  - Kiểm tra đối chiếu kép: So khớp cả trong CSDL hiện tại và các dòng nội bộ trong cùng file Excel dựa trên:
    - **Mã Thẻ Tài Sản (`assetTag`)**: Tuyệt đối không cho phép 2 thiết bị trùng mã tài sản.
    - **Số Serial (`serialNumber`)**: Cảnh báo và ngăn chặn trùng lặp số seri phần cứng.
  - **Tự động từ chối thêm các thiết bị trùng**, đảm bảo chỉ nhập các thiết bị hợp lệ mới vào hệ thống.
- **Tự Động Xuất File Excel Báo Cáo Thiết Bị Lỗi & Trùng Lặp**:
  - Khi phát hiện thiết bị bị trùng hoặc dữ liệu không hợp lệ, hệ thống tự động khởi tạo file Excel báo cáo lỗi mang tên `Danh_Sach_Thiet_Bi_Loi_Trung.xlsx`.
  - File Excel báo cáo sao chép lại toàn bộ thông tin dòng bị từ chối và bổ sung cột **"LÝ DO LỖI / NGUYÊN NHÂN TRÙNG LẶP"** (được định dạng nổi bật với nền màu cam đỏ và chữ đỏ đậm).
  - Giao diện modal hiển thị khung cảnh báo trực quan màu vàng cam, kèm nút bấm **"📥 Tải File Excel Thiết Bị Lỗi / Trùng ({N} thiết bị)"** cho phép người dùng tải ngay file về máy để chỉnh sửa và import lại dễ dàng.
- **Xóa Hàng Loạt Thiết Bị (Bulk Delete) Cùng Lúc**:
  - Bổ sung API `/api/assets/bulk-delete` hỗ trợ xử lý mảng `ids` trong một giao dịch an toàn (Prisma Transaction).
  - Tích hợp sâu vào hệ thống **Thùng Rác (Trash)**: Tự động lưu lại snapshot phục hồi trước khi xóa, gỡ an toàn liên kết phân bổ (assignments), phiếu hỗ trợ (tickets) và tài liệu đính kèm.
  - Giao diện người dùng cho phép chọn nhiều checkbox trên bảng danh sách:
    - Bổ sung nút **"🗑️ Xóa ({N}) Đã Chọn"** trên thanh công cụ trên cùng.
    - Bổ sung **Bottom Floating Action Bar** nổi cố định ở góc dưới màn hình khi có thiết bị được tick chọn, cung cấp các tác vụ nhanh: *Bàn giao hàng loạt*, *In tem QR hàng loạt*, *Xóa hàng loạt* và *Bỏ chọn tất cả*.
    - Hỗ trợ cơ chế **Optimistic UI (0ms)** và hiển thị Toast thông báo hoàn tác (Undo) 1-Click để khôi phục nhanh nếu bấm nhầm.

---

### 🌟 [v1.0.8] - 10/10/2026: Import Excel Khoa Phòng 21 Cột, Tùy Chọn Cột & Sắp Xếp Trực Quan

Bản cập nhật **v1.0.8** tập trung nâng cấp trải nghiệm quản lý bảng thiết bị, hỗ trợ nhập khẩu dữ liệu thực tế từ file Excel khoa phòng/bệnh viện với cấu trúc phức tạp, đồng thời trao quyền tùy biến giao diện linh hoạt cho người dùng.

#### 1. 🚀 Tính Năng Mới (Features)
- **Bộ Phân Tích & Nhập File Excel Chuẩn Khoa Phòng (21 Cột)**:
  - Hỗ trợ nhập danh sách máy tính từ các bảng kiểm kê thực tế của Bệnh viện, Trung tâm Y tế và Doanh nghiệp lớn với cấu trúc 21 cột:
    `STT`, `QR`, `Tên khoa phòng`, `Tên loại thiết bị`, `Mã thiết bị`, `Tên thiết bị`, `Tên hãng sản xuất`, `Năm sản xuất`, `Model`, `Số seri`, `CPU`, `RAM`, `HDD`, `Màn hình (Hãng sx, Năm sx, Model, Số seri)`, `Tình trạng`, `Mã thiết bị cũ`, `Tính cấp lại`, `Ghi chú`.
  - **Thuật toán nhận diện Header đa tầng thông minh (`detectAssetColumns`)**:
    - Tự động quét 5 dòng đầu tìm hàng tiêu đề chính và hàng sub-header của cụm Màn hình.
    - Nhận diện cột linh hoạt không phụ thuộc vị trí cố định (bằng từ khóa tiếng Việt không dấu, có dấu, tiếng Anh).
  - **Trích xuất phần cứng & màn hình vào `specs`**:
    - Tự động lưu trữ các trường cấu hình CPU, RAM, Ổ cứng và Màn hình đi kèm vào cấu trúc JSON của thiết bị để tra cứu và xuất báo cáo.
  - **Cơ chế chống xung đột mã nhóm (Unique Constraint Fallback)**:
    - Khi file Excel dùng chung một mã nhóm (ví dụ: nhiều máy cùng mang mã `PC.KH2400`), parser tự động dùng tên định danh duy nhất (ví dụ: `K_NHIEM_01_T7`) làm `assetTag` hoặc bổ sung hậu tố tự động, đồng thời lưu mã nhóm vào `fixedAssetName`, bảo đảm 100% không bị lỗi nghẽn ràng buộc duy nhất.
  - **Chuẩn hóa tình trạng**:
    - Tự động chuyển đổi các giá trị mã hóa như `0`, `0.0`, `Tốt` thành tình trạng `GOOD` và trạng thái `IN_USE` (Đang sử dụng).
- **Tùy Chọn Ẩn / Hiện Cột Thiết Bị (Column Visibility)**:
  - Bổ sung nút popover **Tùy Chọn Cột** trên thanh công cụ bảng danh sách thiết bị.
  - Cho phép người dùng bật hoặc tắt hiển thị từng cột: Mã tài sản, Tên & Model, Công ty & Vị trí, Danh mục, Nguyên giá, Bảo hành & Ngày mua, Trạng thái, Người giữ, Cấu hình (CPU/RAM/HDD), Màn hình đi kèm, Thao tác.
  - **Lưu trữ tùy biến cá nhân**: Tự động ghi nhớ cấu hình cột vào `localStorage` của trình duyệt, giữ nguyên giao diện người dùng ưa thích sau khi F5 hoặc đăng nhập lại.
- **Sắp Xếp Dữ Liệu Khi Click Tiêu Đề Cột (Column Sorting)**:
  - Cho phép click trực tiếp vào tiêu đề các cột trong bảng:
    - *Click lần 1*: Sắp xếp tăng dần (hiển thị icon `↑`).
    - *Click lần 2*: Sắp xếp giảm dần (hiển thị icon `↓`).
    - *Click lần 3*: Hủy sắp xếp về thứ tự mặc định.
  - Hỗ trợ sắp xếp cho: Tên thiết bị, Mã tài sản, Khoa phòng/Vị trí, Danh mục, Nguyên giá, Ngày mua/Bảo hành, Trạng thái.
- **Nút "Xóa Sắp Xếp & Làm Mới" (Clear Sort & Refresh)**:
  - Hiển thị huy hiệu trực quan đang sắp xếp theo cột nào.
  - Bấm nút **Xóa Sắp Xếp & Làm Mới** sẽ ngay lập tức khôi phục toàn bộ danh sách về trạng thái mặc định ban đầu và tải dữ liệu mới nhất từ máy chủ.

#### 2. 🛠️ Cải Tiến & Tối Ưu (Improvements)
- Tích hợp trực tiếp nút **Nhập Excel** trên thanh công cụ `ModuleDataToolbar` của trang thiết bị, kết nối trực tiếp đến API `/api/import` xử lý nền tốc độ cao.
- Làm sạch và loại bỏ hoàn toàn các từ ngữ tạm "hình 1", "hình 2" trong mã nguồn và giao diện người dùng.

---

### 🌟 [v1.0.7] - 09/10/2026: Danh Mục Khoa Phòng Đa Khu Vực & Tối Ưu Biên Bản Thiết Bị

Bản cập nhật **v1.0.7** tái cấu trúc mô hình Khoa Phòng / Địa điểm theo đặc thù bệnh viện và doanh nghiệp nhiều chi nhánh, đồng thời hoàn thiện nghiệp vụ Lập Biên Bản Thiết Bị.

#### 1. 🚀 Tính Năng Mới (Features)
- **Tái Cấu Trúc Danh Mục Khoa Phòng (Đa Tòa Nhà / Khu Vực / Vị Trí)**:
  - Chuyển đổi tên gọi quản lý thành **Danh Mục Khoa Phòng** chuyên biệt (`/categories`).
  - Hỗ trợ mô hình một khoa phòng sở hữu nhiều khu vực/tòa nhà/tầng làm việc khác nhau (ví dụ: *Khoa Hồi Sức Tích Cực* có phòng tại *Tòa nhà A - Tầng 2* và *Khu Cấp Cứu - Tầng 1*).
  - Cho phép thêm/sửa/xóa động nhiều trường tòa nhà, khu vực, vị trí trực thuộc ngay trong cửa sổ Khoa Phòng.
- **Tích Hợp Linh Kiện Phụ Tùng Vào Biên Bản Thêm Thiết Bị**:
  - Khi lập **Biên bản thêm thiết bị**, người dùng có thể chọn xuất trực tiếp linh kiện, phụ tùng từ kho (RAM, SSD, Card mạng, Chuột, Bàn phím...) để gắn kèm cho thiết bị mới.
- **Lọc Thiết Bị Thông Minh Trong Biên Bản Thu Hồi Tài Sản**:
  - Khi chọn khoa phòng trong Biên bản thu hồi, danh sách chọn nhanh thiết bị tự động lọc chính xác chỉ hiển thị các thiết bị đang thuộc quyền quản lý của khoa phòng đó.
  - Loại bỏ các thiết bị của khoa phòng khác, chống nhầm lẫn tài sản khi bàn giao/thu hồi.

#### 2. 🛠️ Cải Tiến & Chuẩn Hóa
- Chuẩn hóa form biên bản: Loại bỏ toàn bộ các placeholder tên người ví dụ ở bên giao và bên nhận, cho phép nhập hoặc chọn nhân sự thực tế.
- Tinh chỉnh giao diện in ấn biên bản PDF chuẩn A4, hiển thị rõ ràng thông tin khoa phòng, số hiệu biên bản và đại diện hai bên.

---

### 🌟 [v1.0.6] - 03/10/2026: Sao Lưu & Phục Hồi Toàn Diện (Disaster Recovery & 1-Click Backup)

- **Công Cụ 1-Click Sao Lưu & Phục Hồi (`Sao_Luu_Du_Lieu.bat` & `Phuc_Hoi_Du_Lieu.bat`)**:
  - Tự động xuất CSDL PostgreSQL qua `pg_dump.exe` an toàn tuyệt đối, triệt tiêu 100% lỗi khóa file `pg_internal.init`.
  - Tự động nhận diện ổ đĩa USB cắm ngoài để sao lưu trực tiếp ra USB dự phòng.
  - Gom toàn bộ kho ảnh hiện trạng, biên bản bàn giao, hóa đơn VAT (`public/uploads`) và cấu hình hệ thống `.env` vào gói ZIP chuẩn.
- **Menu Quản Trị Trung Tâm (`qltbit_manager.py`)**:
  - Bổ sung tùy chọn `[8] 💾 Sao Lưu & Phục Hồi Dữ Liệu`.
- **API Sao Lưu & Phục Hồi Web (`/api/system/backup/*`)**:
  - Hỗ trợ tải gói ZIP hoàn chỉnh chứa SQL Dump (`database_backup.sql`) và JSON Snapshot 35 bảng.
  - Phục hồi an toàn qua giao diện Web không làm gián đoạn máy chủ.

---

### 🌟 [v1.0.5] - 02/10/2026: Bộ Cài Đặt Tự Động 1-Click (Setup Wizard & PostgreSQL Portable)

- **Trình Cài Đặt Trọn Gói (`SimplyIT_Setup.exe` & `Cai_Dat_SimplyIT.exe`)**:
  - Wizard đồ họa trực quan 3 chế độ: Cài cả Server & Agent, Chỉ cài Server, Chỉ cài Agent máy trạm.
  - Tự động kiểm tra và cài đặt ngầm Node.js LTS nếu máy chưa có.
  - Đi kèm PostgreSQL 17 Portable trong thư mục `pgsql`, tự động nạp database và seed dữ liệu khởi tạo.
  - Mở cổng tường lửa Windows 3001 và 3443 qua lệnh tự động.
  - Đăng ký Scheduled Task `SimplyIT_Audit` chạy Agent bằng quyền SYSTEM định kỳ 15 phút.
- **Trình Điều Hành Máy Chủ (`SimplyIT_Server.exe`)**:
  - Khắc phục lỗi hiển thị nhật ký tiến trình (Logs) và tự động nhận diện Node.js.
  - Tự động khởi động PostgreSQL portable khi khởi chạy server.
- **Tài Liệu Hướng Dẫn Word Dành Cho Người Không Rành Kỹ Thuật (`HUONG_DAN_SU_DUNG_VA_CAI_DAT_SIMPLY_IT.docx`)**:
  - Cầm tay chỉ việc 8 nghiệp vụ thực tế hằng ngày (kiểm kê, cảnh báo tháo RAM, quét QR, sơ đồ 2D...).

---

### 🌟 [v1.0.4] - 20/09/2026: Quy Trình Phê Duyệt Thông Minh & Lịch Gia Hạn Chi Phí

- **Luồng Phê Duyệt Thông Minh (Smart Hybrid Approval Fallback)**:
  - Tự động nhận diện Cấp trên trực tiếp (`managerId`) từ hồ sơ người dùng.
  - Bộ chọn Cấp trên Searchable Combobox ưu tiên nhân sự cùng phòng ban.
  - Tính năng "Chuyển Cấp Trên Duyệt" (Re-route) dành cho IT Admin khi nhân viên gửi nhầm đơn.
- **Lịch Dự Báo Gia Hạn Chi Phí 12 Tháng (Renewal Runway Calendar)**:
  - Trực quan hóa dòng tiền chi tiêu IT cả năm cho Domain, SSL, Server, SaaS, Hợp đồng bảo trì.
- **Ký Nhận Bàn Giao Điện Tử (Digital Signature Canvas)**:
  - Hỗ trợ ký nhận bằng chuột hoặc màn hình cảm ứng điện thoại, nhúng chữ ký trực tiếp vào biên bản PDF.
- **Link Chia Sẻ Mật Khẩu Tự Hủy Dùng 1 Lần (One-Time Secret Link)**:
  - Mã hóa AES-256-GCM bảo vệ thông tin mật khẩu nhạy cảm chia sẻ nội bộ.

---

### 🌟 [v1.0.3] - 12/09/2026: Vòng Đời Nhân Sự Nghỉ Việc & Thùng Rác 0ms Hoàn Tác

- **Quy Trình Nhân Sự Nghỉ Việc (Offboarding Automation)**:
  - Tự động thu hồi toàn bộ thiết bị về kho (`AVAILABLE`), hủy gán bản quyền phần mềm, khóa tài khoản đăng nhập.
- **Thùng Rác Doanh Nghiệp (Recycle Bin) & 0ms Undo Toast**:
  - Cơ chế Soft-delete lưu trữ 30 ngày cho Tài sản, Bản quyền, Nhân sự, Hợp đồng.
  - Toast thông báo 4 giây góc màn hình cho phép bấm `[ ↩️ Hoàn tác ]` phục hồi tức thì không cần tải lại trang.

---

### 🌟 [v1.0.2] - 05/09/2026: Chatbot AI Kéo Thả & Menu Chuột Phải Bảng Tài Sản

- **Trợ Lý AI Kéo Thả Đa Năng**:
  - Cửa sổ chat AI có thể kéo thả tự do trên màn hình, hỗ trợ hỏi đáp kỹ thuật, tra cứu thiết bị và viết script.
- **Menu Chuột Phải Nhanh (Right-Click Context Menu)**:
  - Nhấp chuột phải vào bất kỳ hàng tài sản nào để mở menu thao tác nhanh: Sửa, Bàn giao, In tem QR, Bảo trì, Xóa.
- **Tự Động Phân Loại Thiết Bị (Device Classification Engine)**:
  - Nhận diện chính xác Laptop, Desktop, Workstation, Server, Rack Server, Máy in, Switch... dựa trên Chassis Type và CPU.

---

### 🌟 [v1.0.1] - 28/08/2026: Chuẩn Hóa Cổng Kép Dual-Port HTTP 3001 / HTTPS 3443

- **Quy Ước Mạng Cổng Kép**:
  - `Cổng 3001 (HTTP)`: Bàn làm việc Web, Dashboard, API và Agent máy trạm kết nối nội bộ.
  - `Cổng 3443 (HTTPS)`: Chạy chứng chỉ SSL tự ký để trình duyệt cấp quyền truy cập Camera quét mã QR di động (`/scan`).
- **Đóng Gói Docker Chuẩn Hóa**:
  - `Dockerfile` và `docker-compose.yml` mở sẵn 2 cổng 3001 & 3443, tự động chuyển đổi định dạng dòng CRLF sang LF.

---

### 🌟 [v1.0.0] - 15/08/2026: Khởi Tạo Hệ Thống Simply IT Community Edition

- Khởi tạo kiến trúc nền tảng: Next.js 15, React 19, Prisma ORM, PostgreSQL.
- Quản lý vòng đời tài sản CNTT, Bản quyền phần mềm, Hợp đồng dịch vụ.
- Hệ thống Helpdesk Ticket & Service Desk hỗ trợ nhân viên nội bộ.
- Agent PowerShell tự động thu thập cấu hình máy tính không cần cài đặt phần mềm nặng.

---

*Tài liệu được cập nhật tự động và đồng bộ với mã nguồn Simply IT.*

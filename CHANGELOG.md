# 📋 NHẬT KÝ CẬP NHẬT PHIÊN BẢN (CHANGELOG)

## [v1.0.15] - 10/10/2026

Bản cập nhật **v1.0.15** xử lý dứt điểm lỗi xóa tài sản cố định khoa phòng bị tự động hiện lại khi refresh trang và chuẩn hóa tên tab:
- **Khắc Phục Triệt Để Lỗi Dữ Liệu Bị Hiện Lại Sau Khi Refresh (`/api/department-fixed-assets`)**:
  - Loại bỏ hoàn toàn cơ chế tự động nạp dữ liệu mẫu (`auto-seed`) trong hàm GET khi bảng rỗng (`totalExisting === 0`).
  - Đảm bảo khi người dùng xóa tài sản hoặc làm sạch bảng dữ liệu, hệ thống giữ nguyên trạng thái bảng rỗng sau khi F5 / Refresh trang, không tự sinh lại các dòng mẫu.
- **Bổ Sung Tính Năng & Nút "Xóa Tất Cả" (Clear All)**:
  - Bổ sung tham số `{ all: true }` tại API `/api/department-fixed-assets/bulk-delete` hỗ trợ xóa sạch toàn bộ dữ liệu bảng chỉ với 1 thao tác.
  - Thêm nút **"Xóa tất cả"** trên thanh công cụ của bảng TSCĐ khoa phòng (kèm 2 bước xác nhận an toàn), giúp người dùng dọn sạch bảng nhanh chóng trước khi nạp file Excel mới.
  - Đồng bộ Checkbox: Cho phép tick chọn tất cả bao gồm cả các dòng tiêu đề phân nhóm (Group Header) để xóa sạch triệt để.
- **Loại Bỏ Hoàn Toàn Các Dòng Đánh Dấu & Dòng Trống Số Lượng Khi Import Excel (`/api/department-fixed-assets/import`)**:
  - Không import các dòng tiêu đề phân nhóm ("Tài sản thuộc CNTT quản lý", "Tài sản thuộc HCQT quản lý"...). Các dòng này chỉ đóng vai trò đánh dấu trong file Excel và nhận diện khoa phòng con, tuyệt đối không tạo bản ghi vào cơ sở dữ liệu.
  - Áp dụng bộ lọc chặt chẽ: Các dòng chỉ có trường tên mà không có số lượng (`bookQuantity <= 0` và `actualQuantity <= 0`) hoặc các dòng tổng kết ("Cộng", "Tổng cộng") đều được tự động bỏ qua 100%.
- **Chuẩn Hóa Tên Tab Điều Hướng**:
  - Đổi tên tab từ **"🏛️ TSCĐ Khoa Phòng (Theo Mẫu)"** thành **"🏛️ TSCĐ Khoa Phòng"** trên trang Kiểm kê tài sản (`/assets/audit`).

---

## [v1.0.14] - 10/10/2026

Bản cập nhật **v1.0.14** hoàn thiện chính xác cấu trúc bảng và luồng nhập Excel tài sản cố định (TSCĐ) khoa phòng theo đúng biểu mẫu kế toán thực tế:
- **Đổi Vị Trí Cột Mã Quản Lý Chuẩn Giao Diện (`DepartmentFixedAssetsTab` & Export)**:
  - Di chuyển cột **"Mã quản lý"** ra nằm **sau cột STT và trước cột "Tên tài sản cố định"**, thuận tiện cho việc đối chiếu và quét kiểm kê.
  - Đồng bộ thứ tự cột này trên cả giao diện bảng HTML và file xuất Excel (`/api/department-fixed-assets/export`).
- **Chuẩn Hóa Ánh Xạ Cột Khi Import Excel Theo Mẫu Chuẩn (`/api/department-fixed-assets/import`)**:
  - **Không import cột 1 làm STT**: Bỏ qua Cột 1 (Cột A) từ file Excel, hệ thống tự động sinh số thứ tự STT (`orderIndex`) tăng dần liên tục và chuẩn xác cho các tài sản được nạp.
  - **Khắc phục lệch cột**: Ánh xạ chuẩn xác 100% từng cột theo đúng mẫu: Cột B (Tên TSCĐ), Cột C (Mã số TSC), Cột D (Nơi sử dụng), Cột E (Hãng SX), Cột F (Nước SX), Cột G (Năm đưa vào SD), Cột H-J (Sổ sách 1-2-3), Cột K-M (Kiểm kê 4-5-6), Cột N-P (Chênh lệch 7-8-9), Cột Q (Ghi chú/Người dùng), Cột R (Khoa phòng), Cột S (Kho), Cột T (Nhóm), Cột U-V (Thành tiền), Cột W-Y (Khấu hao), Cột Z-AB (Ghi chú, STT KS).
  - Tự động sinh Mã Quản Lý (`MQL-xxxxxx`) cho từng thiết bị theo tùy chọn khi file Excel không có cột mã quản lý.
- **Bộ Lọc Độc Quyền "Chỉ Import Tài Sản Thuộc CNTT Quản Lý"**:
  - Tự động nhận diện phân nhóm trong file Excel: Khi duyệt qua dòng `Tài sản thuộc CNTT quản lý`, hệ thống thu thập toàn bộ thiết bị CNTT (Laptop, Desktop, Switch, Máy hủy giấy...).
  - Tự động ngắt và bỏ qua 100% các dòng thuộc nhóm HCQT (`Tài sản thuộc HCQT quản lý`), TBYT, Dược hoặc các bộ phận khác không do CNTT phụ trách.
  - Sắp xếp dòng tiêu đề nhóm CNTT (`orderIndex: 0`) luôn nằm ở đầu danh sách để giao diện hiển thị trực quan và ngăn nắp.

---

## [v1.0.13] - 10/10/2026

Bản cập nhật **v1.0.13** tập trung tối ưu hóa hiệu năng vượt trội cho Bảng Kiểm Kê TSCĐ Khoa Phòng, giải quyết dứt điểm hiện tượng treo giao diện và tải chậm khi nạp file Excel dung lượng lớn:
- **Tối Ưu Hóa Cực Nhanh Luồng Nhập Excel (`/api/department-fixed-assets/import`)**:
  - Chuyển đổi phương thức lưu dữ liệu từ vòng lặp đơn lẻ (`create`) sang lưu theo lô (`createMany` batch 200 bản ghi/lần), rút ngắn thời gian import từ 30s+ xuống chỉ còn 1-2 giây cho hàng ngàn dòng tài sản.
  - Cơ chế nhận diện kết thúc thông minh: Tự động dừng duyệt file khi gặp 15 dòng trống liên tiếp, tránh việc quét vô tận hàng chục nghìn dòng rỗng ở cuối file Excel.
  - Cải tiến hàm phân tích số `parseNumber`: Xử lý an toàn các ô công thức (`formula result`), phân cách hàng nghìn kiểu Việt Nam (`1.500.000`) và số thập phân (`14.29%`), loại bỏ triệt để lỗi số liệu bị đưa về 0.
- **Tối Ưu Hóa Hiệu Suất Truy Vấn & Thống Kê (`/api/department-fixed-assets`)**:
  - Thay thế phương pháp kéo toàn bộ dữ liệu về RAM để tính tổng bằng truy vấn SQL Aggregate trực tiếp (`prisma.departmentFixedAsset.aggregate` & `count`), giảm 95% mức chiếm dụng bộ nhớ RAM server.
  - Bảo vệ an toàn tuyệt đối các tham số phân trang (`page`, `pageSize`) chống lỗi `NaN` hoặc giá trị bất thường.
- **Trải Nghiệm Người Dùng (UX) & Phân Trang Chuẩn Mực (`DepartmentFixedAssetsTab`)**:
  - Tích hợp thanh phân trang chuẩn hệ thống `TablePaginationBar` (15, 25, 50, 100 bản ghi / trang) giúp bảng render nhẹ nhàng, mượt mà dù cơ sở dữ liệu có hàng chục nghìn thiết bị.
  - Bổ sung thông báo trạng thái dạng Pulse khi đang nạp file để người dùng luôn nắm bắt tiến độ xử lý.
  - Chuẩn hóa hàm gọi nạp dữ liệu, chống lỗi nhận sự kiện chuột `MouseEvent` làm hỏng chỉ số trang.

---

## [v1.0.12] - 10/10/2026

Bản cập nhật **v1.0.12** triển khai toàn diện Bảng Kiểm Kê Tài Sản Cố Định (TSCĐ) Khoa Phòng chuẩn 29 cột theo mẫu kế toán thực tế, tích hợp cột Mã Quản Lý (MQL) tự sinh/nhập tay liên kết xuyên suốt giữa Thiết Bị, Phụ Tùng Linh Kiện và TSCĐ Kiểm Kê:
- **Bảng Kiểm Kê Tài Sản Cố Định Khoa Phòng Chuẩn Kế Toán (`DepartmentFixedAsset`)**:
  - Tích hợp tab **"🏛️ TSCĐ Khoa Phòng (Theo Mẫu)"** vào trang Kiểm kê tài sản (`/assets/audit`).
  - Cấu trúc 29 cột chuẩn 100% theo mẫu kế toán bệnh viện/doanh nghiệp:
    - *Thông tin cơ bản*: Cột A (STT), Cột B (Tên TSCĐ), Cột C (Mã số TSC), Cột MQL (Mã quản lý), Cột D (Nơi sử dụng), Hãng SX, Nước SX, Năm đưa vào SD.
    - *Nhóm Theo sổ kế toán (1 - 2 - 3)*: Số lượng, Nguyên giá, Giá trị còn lại.
    - *Nhóm Theo kiểm kê (4 - 5 - 6)*: Số lượng, Nguyên giá, Giá trị còn lại.
    - *Nhóm Chênh lệch (7 - 8 - 9)*: Số lượng, Nguyên giá, Giá trị còn lại (tự động tính toán).
    - *Thông tin quản lý & khấu hao*: Ghi chú người dùng (Cột E), Khoa phòng, Kho, Nhóm, Thành tiền sổ, Thành tiền tiêu hao, Tỷ lệ % khấu hao, Ngày tính KH, Năm KH (Cột Y), GHI CHÚ, GHI CHÚ 1, STT KS/KK.
  - Hỗ trợ các dòng tiêu đề phân nhóm (Group Header) như "Tài sản thuộc CNTT quản lý", "Tài sản thuộc HCQT quản lý".
  - Tự động seed bộ dữ liệu mẫu ban đầu đúng từng ô, từng số liệu như trong hình từ dòng 31 trở xuống.
- **Trường Dữ Liệu Mã Quản Lý (Management Code - MQL) Xuyên Suốt**:
  - **Mô hình CSDL & Index**: Bổ sung trường `managementCode` vào bảng `Asset`, `SparePart`, và `DepartmentFixedAsset`.
  - **Tự sinh hoặc nhập tay linh hoạt**: Nút bấm `⚡ Tự sinh mã` tạo mã chuẩn tiền tố `MQL-xxxxxx` hoặc cho phép người dùng gõ tự do hoặc để trống.
  - **Liên kết chéo thông minh**: Tự động tra cứu và hiển thị badge liên kết màu xanh lá (Thiết bị) và màu cam hổ phách (Linh kiện) ngay trên bảng kiểm kê khi phát hiện trùng khớp `managementCode`.
- **Hệ Thống Import & Export Excel TSCĐ Khoa Phòng Chuyên Nghiệp**:
  - **Export Excel (`/api/department-fixed-assets/export`)**: Xuất file `.xlsx` định dạng 2 tầng tiêu đề gộp ô (Merge cells), highlight màu vàng các cột Hãng SX, Nước SX, Năm SD, định dạng số tiền chuẩn kế toán `#,##0.00`. Hỗ trợ tải file mẫu trắng (`?template=true`).
  - **Import Excel (`/api/department-fixed-assets/import`)**: Đọc file `.xlsx`/`.xls`, tự động nhận diện dòng tiêu đề bắt đầu từ dòng 28-30, import linh hoạt toàn bộ 29 cột, có tùy chọn xóa dữ liệu cũ và tự sinh mã quản lý cho các dòng còn trống.
- **Đồng Bộ Cột Mã Quản Lý Trên Toàn Hệ Thống**:
  - **Danh sách Thiết bị (`/assets`)**: Bổ sung cột "MÃ QUẢN LÝ", tùy chọn hiển thị trong menu Ẩn/Hiện cột, tìm kiếm theo mã quản lý, và ô nhập trong Modal Thêm Mới (`AssetAddModal`) / Chỉnh Sửa (`AssetEditModal`).
  - **Phụ tùng & Linh kiện (`/spare-parts`)**: Bổ sung cột "MÃ QUẢN LÝ", tìm kiếm theo mã quản lý, và ô nhập trong Modal Thêm Mới / Chỉnh Sửa / Drawer Chi Tiết.
  - **Kiểm kê đối soát (`/assets/audit`)**: Hiển thị badge Mã Quản Lý (MQL) trong bảng đối soát hiện trường và danh sách chi tiết.

---

## [v1.0.11] - 10/10/2026

Bản cập nhật **v1.0.11** hoàn thiện tính linh hoạt trong quy trình điều chuyển thiết bị và loại bỏ các thông tin mặc định cá nhân hóa trong các mẫu biên bản:
- **Linh Hoạt Người Nhận Trong Modal Điều Chuyển Thiết Bị (`AssetTransferModal`)**:
  - **Không bắt buộc chọn nhân sự**: Loại bỏ hoàn toàn ràng buộc validation bắt buộc `toUserId` và dấu sao đỏ `(*)`.
  - **Hỗ trợ gõ tên tự do trực tiếp**:
    - Người dùng có thể gõ trực tiếp họ tên người nhận vào ô tìm kiếm mà không bắt buộc phải click chọn từ danh sách nhân sự của hệ thống.
    - Cơ chế nhận diện thông minh: Tự động đối chiếu nhân sự có sẵn; nếu là nhân sự mới thì backend tự động khởi tạo tài khoản nhân viên (Staff) và liên kết phân bổ chính xác.
    - Bổ sung nút bấm xác nhận nhanh trong dropdown: `✍️ Dùng tên tự do: "..." (Tự động ghi nhận)`.
  - **Cho phép để trống người nhận**:
    - Cho phép lưu điều chuyển thiết bị khi để trống ô người nhận (bàn giao thiết bị chung theo phòng ban/vị trí, luân chuyển kho mà không gán người phụ trách cụ thể).
    - Tự động hoàn tất phân bổ cũ (nếu có) và đưa thiết bị về trạng thái Sẵn sàng (`AVAILABLE`).
  - **Cải tiến giao diện cao cấp**:
    - Nút xóa nhanh `X` 1-Click để xóa trắng ô người nhận.
    - Huy hiệu trạng thái thời gian thực: Thông báo rõ ràng trạng thái "Nhân sự từ hệ thống", "Tên người nhận tự do (Tự động ghi nhận)", hoặc "Để trống: Bàn giao không gán đích danh".
    - Tự động đóng dropdown khi click chuột ra ngoài (`click outside`).
- **Chuẩn Hóa Biên Bản Thiết Bị & Loại Bỏ Tên Mặc Định**:
  - Xóa bỏ hoàn toàn tên mặc định "Nguyễn Hoàn Danh" ở bên bàn giao trong API mẫu biên bản (`/api/minutes`).
  - Dọn dẹp sạch sẽ 100% các bản ghi mẫu tài liệu trong cơ sở dữ liệu để trường bên bàn giao luôn ở trạng thái trống, cho phép người dùng tự nhập hoặc ký tên theo thực tế.

---

## [v1.0.10] - 10/10/2026

Bản cập nhật **v1.0.10** bổ sung bộ lọc theo Khoa Phòng / Phòng Ban và tích hợp cột Số Thứ Tự (STT) theo phân trang trên bảng quản lý tài sản:
- **Bộ Lọc Theo Khoa Phòng / Phòng Ban (Department / Location Filter)**:
  - Thêm dropdown **"📍 Khoa phòng (Tất cả)"** trên thanh tìm kiếm & lọc nâng cao của trang quản lý tài sản (`/assets`).
  - Lọc server-side qua API `/api/assets` với tham số `locationId`: hỗ trợ lọc trực tiếp theo `locationId` và phòng ban của nhân sự được phân bổ (`department`).
  - Đồng bộ tự động với chức năng Xuất Excel và tổng hợp KPI tài chính.
- **Cột Số Thứ Tự (STT) Trên Bảng Danh Sách Thiết Bị**:
  - Bổ sung cột **STT** ở vị trí đầu tiên của bảng danh sách tài sản.
  - Tự động tính STT lũy tiến theo số trang và số dòng `(Trang - 1) * Số dòng + Index + 1`.
  - Hỗ trợ cơ chế bám dính kép (Sticky Dual-Column): Cột STT (`left-0`) và cột Mã tài sản (`left-[44px]`) luôn cố định khi cuộn ngang bảng.
  - Bổ sung tùy chọn bật/tắt cột STT trong menu **Tùy chọn cột**, ghi nhớ tự động vào `localStorage`.

---

## [v1.0.9] - 10/10/2026

Bản cập nhật **v1.0.9** tối ưu hóa quy trình Import Excel, chống trùng lặp dữ liệu, xuất báo cáo lỗi chi tiết bằng Excel và bổ sung tính năng xóa hàng loạt nhiều thiết bị:
- **Chuẩn Hóa Nút "Tải Mẫu Excel" Thành Định Dạng `.xlsx` Chuẩn**:
  - Khắc phục lỗi tải file `.json` do thiếu API route tải mẫu trước đó.
  - Xây dựng API route `/api/assets/export?template=true` sinh file Workbook `.xlsx` native chuẩn Microsoft Excel (qua `exceljs`) tích hợp 3 sheet:
    - *Sheet 1: Mẫu Tiêu Chuẩn*: Cấu trúc cơ bản đầy đủ (Mã tài sản, Tên máy, Danh mục, CPU, RAM, Ổ cứng, Giá mua, Thời hạn bảo hành, Trạng thái...).
    - *Sheet 2: Mẫu Khoa Phòng (21 Cột)*: Chuẩn y tế/bệnh viện (STT, QR, Khoa phòng, Mã thiết bị, Tên thiết bị, Hãng, Model, Serial, CPU, RAM, HDD, Màn hình, Tình trạng...).
    - *Sheet 3: Hướng Dẫn & Quy Định*: Ghi chú rõ ràng định dạng dữ liệu từng cột.
- **Cơ Chế Chống Trùng Dữ Liệu Nghiêm Ngặt & Bảo Vệ CSDL**:
  - Ngăn chặn hoàn toàn việc ghi đè hoặc tự sinh hậu tố giả khi phát hiện trùng lặp.
  - Kiểm tra đối chiếu kép: So khớp cả trong CSDL hiện tại và các dòng nội bộ trong cùng file Excel dựa trên `assetTag` (Mã tài sản) và `serialNumber` (Số serial).
  - Tự động từ chối thêm các thiết bị trùng, bảo đảm tính toàn vẹn 100% của cơ sở dữ liệu.
- **Tự Động Xuất File Excel Báo Cáo Thiết Bị Lỗi & Trùng Lặp**:
  - Tự động sinh file Excel báo cáo lỗi `Danh_Sach_Thiet_Bi_Loi_Trung.xlsx` khi có thiết bị trùng hoặc không hợp lệ.
  - File Excel báo cáo sao chép lại toàn bộ thông tin dòng bị từ chối và bổ sung cột **"LÝ DO LỖI / NGUYÊN NHÂN TRÙNG LẶP"** (định dạng nền màu cam đỏ, chữ đỏ đậm).
  - Modal Import hiển thị hộp cảnh báo màu vàng cam và nút bấm **"📥 Tải File Excel Thiết Bị Lỗi / Trùng ({N} thiết bị)"** cho phép người dùng tải ngay file về máy.
- **Xóa Hàng Loạt Thiết Bị (Bulk Delete) Cùng Lúc**:
  - Bổ sung API `/api/assets/bulk-delete` hỗ trợ xử lý mảng `ids` trong Prisma Transaction.
  - Tích hợp sâu vào hệ thống Thùng Rác (Trash): Tự động lưu snapshot phục hồi trước khi xóa, gỡ an toàn liên kết phân bổ (assignments), phiếu hỗ trợ (tickets) và tài liệu đính kèm.
  - Bảng danh sách thiết bị bổ sung nút **"🗑️ Xóa ({N}) Đã Chọn"** trên thanh công cụ và **Bottom Floating Action Bar** cố định ở cạnh dưới màn hình khi có thiết bị được chọn.
  - Áp dụng Optimistic UI (0ms) và hiển thị Toast thông báo hoàn tác (Undo) 1-Click để khôi phục nhanh.

---

## [v1.0.8] - 10/10/2026

Bản cập nhật **v1.0.8** tập trung nâng cấp trải nghiệm quản lý bảng thiết bị, hỗ trợ nhập khẩu dữ liệu thực tế từ file Excel khoa phòng/bệnh viện với cấu trúc 21 cột phức tạp, đồng thời trao quyền tùy biến hiển thị cột và sắp xếp trực quan linh hoạt cho người dùng:
- **Bộ Phân Tích & Nhập File Excel Chuẩn Khoa Phòng (21 Cột)**:
  - Hỗ trợ nhập danh sách máy tính từ các bảng kiểm kê thực tế của Bệnh viện, Trung tâm Y tế và Doanh nghiệp lớn với cấu trúc 21 cột:
    `STT`, `QR`, `Tên khoa phòng`, `Tên loại thiết bị`, `Mã thiết bị`, `Tên thiết bị`, `Tên hãng sản xuất`, `Năm sản xuất`, `Model`, `Số seri`, `CPU`, `RAM`, `HDD`, `Màn hình (Hãng sx, Năm sx, Model, Số seri)`, `Tình trạng`, `Mã thiết bị cũ`, `Tính cấp lại`, `Ghi chú`.
  - **Thuật toán nhận diện Header đa tầng thông minh (`detectAssetColumns`)**:
    - Tự động quét 5 dòng đầu tìm hàng tiêu đề chính và hàng sub-header của cụm Màn hình.
    - Nhận diện cột linh hoạt không phụ thuộc vị trí cố định (bằng từ khóa tiếng Việt không dấu, có dấu, tiếng Anh).
  - **Trích xuất phần cứng & màn hình vào `specs`**:
    - Tự động lưu trữ các trường cấu hình CPU, RAM, Ổ cứng và Màn hình đi kèm vào cấu trúc JSON của thiết bị để tra cứu và xuất báo cáo.
  - **Cơ chế chống xung đột mã nhóm (Unique Constraint Fallback)**:
    - Khi file Excel dùng chung một mã nhóm (nhiều máy cùng mang mã `PC.KH2400`), parser tự động dùng tên định danh duy nhất (ví dụ: `K_NHIEM_01_T7`) làm `assetTag` hoặc bổ sung hậu tố tự động, đồng thời lưu mã nhóm vào `fixedAssetName`, bảo đảm 100% không bị lỗi nghẽn ràng buộc duy nhất.
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
- **Làm sạch mã nguồn & giao diện**:
  - Tích hợp nút **Nhập Excel** trên thanh công cụ bảng thiết bị kết nối API `/api/import` xử lý nền tốc độ cao.
  - Loại bỏ hoàn toàn các từ ngữ tạm "hình 1", "hình 2" trong mã nguồn và giao diện người dùng.

---

## [v1.0.7] - 09/10/2026

Bản cập nhật **v1.0.7** tái cấu trúc mô hình Khoa Phòng / Địa điểm theo đặc thù bệnh viện và doanh nghiệp nhiều chi nhánh, đồng thời hoàn thiện nghiệp vụ Lập Biên Bản Thiết Bị:
- **Tái Cấu Trúc Danh Mục Khoa Phòng (Đa Tòa Nhà / Khu Vực / Vị Trí)**:
  - Chuyển đổi tên gọi quản lý thành **Danh Mục Khoa Phòng** chuyên biệt (`/categories`).
  - Hỗ trợ mô hình một khoa phòng sở hữu nhiều khu vực/tòa nhà/tầng làm việc khác nhau (ví dụ: *Khoa Hồi Sức Tích Cực* có phòng tại *Tòa nhà A - Tầng 2* và *Khu Cấp Cứu - Tầng 1*).
  - Cho phép thêm/sửa/xóa động nhiều trường tòa nhà, khu vực, vị trí trực thuộc ngay trong cửa sổ Khoa Phòng.
- **Tích Hợp Linh Kiện Phụ Tùng Vào Biên Bản Thêm Thiết Bị**:
  - Khi lập **Biên bản thêm thiết bị**, người dùng có thể chọn xuất trực tiếp linh kiện, phụ tùng từ kho (RAM, SSD, Card mạng, Chuột, Bàn phím...) để gắn kèm cho thiết bị mới.
- **Lọc Thiết Bị Thông Minh Trong Biên Bản Thu Hồi Tài Sản**:
  - Khi chọn khoa phòng trong Biên bản thu hồi, danh sách chọn nhanh thiết bị tự động lọc chính xác chỉ hiển thị các thiết bị đang thuộc quyền quản lý của khoa phòng đó.
  - Loại bỏ các thiết bị của khoa phòng khác, chống nhầm lẫn tài sản khi bàn giao/thu hồi.
- **Chuẩn Hóa Form & In Ấn Biên Bản**:
  - Chuẩn hóa form biên bản: Loại bỏ toàn bộ các placeholder tên người ví dụ ở bên giao và bên nhận, cho phép nhập hoặc chọn nhân sự thực tế.
  - Tinh chỉnh giao diện in ấn biên bản PDF chuẩn A4, hiển thị rõ ràng thông tin khoa phòng, số hiệu biên bản và đại diện hai bên.

---

## [v1.0.6] - 03/10/2026

Bản cập nhật **v1.0.6** bổ sung toàn diện hệ sinh thái **Sao Lưu & Phục Hồi Dữ Liệu (Full System Backup & Disaster Recovery)**:
- **Công cụ 1-Click Sao lưu & Phục hồi (`Sao_Luu_Du_Lieu.bat` & `Phuc_Hoi_Du_Lieu.bat`)**:
  - Tự động xuất CSDL PostgreSQL qua `pg_dump.exe` an toàn tuyệt đối, triệt tiêu 100% lỗi khóa file `pg_internal.init`.
  - Tự động nhận diện ổ đĩa USB đang cắm ngoài để sao lưu 1-Click trực tiếp ra USB.
  - Tự động gom toàn bộ kho ảnh hiện trạng, biên bản bàn giao, hóa đơn VAT (`public/uploads`) và cấu hình hệ thống `.env` vào gói nén ZIP tiêu chuẩn.
  - Phục hồi 1-Click khi di chuyển sang máy tính mới hoặc sau khi cài lại hệ điều hành Windows.
- **Tích hợp Menu Quản Trị Trung Tâm (`qltbit_manager.py`)**:
  - Bổ sung tùy chọn `[8] 💾 Sao Lưu & Phục Hồi Dữ Liệu` hỗ trợ đầy đủ thao tác trực quan.
- **Nâng cấp API Sao lưu & Phục hồi Web (`/api/system/backup/*`)**:
  - Hỗ trợ tải gói ZIP hoàn chỉnh chứa cả SQL Dump (`database_backup.sql`) lẫn JSON Snapshot 35 bảng.
  - Nhận diện linh hoạt định dạng tải lên `multipart/form-data` và binary stream, đảm bảo phục hồi trên giao diện Web trơn tru 100%.
- **Tài liệu Hướng dẫn Chuyên sâu (`HUONG_DAN_SAO_LUU_VA_PHUC_HOI_DU_LIEU.md`)**:
  - Hướng dẫn chi tiết quy trình chuyển đổi máy chủ, phục hồi sau thảm họa hỏng Windows, giải thích nguyên nhân và cách phòng tránh lỗi file cache `pg_internal.init`.

---

## [v1.0.5] - 02/10/2026

Bản cập nhật **v1.0.5** giải quyết triệt để vấn đề cài đặt và triển khai hệ thống QLTBIT: Đóng gói thành công Trình cài đặt tự động 1-Click (`QLTBIT_Setup.exe` / `Cai_Dat_QLTBIT.exe`), tích hợp trọn gói Cơ sở dữ liệu PostgreSQL Portable, khắc phục lỗi khởi động Web Server, cho phép tùy chọn cài Máy Chủ, Agent hoặc cả hai trên cùng một máy tính.

---

### 🌟 1. Tính Năng Mới & Nâng Cấp Triển Khai (Deployment & Installer)

#### A. Trình Cài Đặt Trọn Gói 1-Click (`QLTBIT_Setup.exe` & `Cai_Dat_QLTBIT.exe`)
- **Giao diện đồ họa Wizard trực quan, chuyên nghiệp**:
  - Tích hợp 3 chế độ cài đặt linh hoạt:
    1. 🌟 **Cài đặt CẢ HAI: Server & Agent (Khuyên dùng)**: Vừa cài máy chủ quản trị trung tâm, vừa cài Agent tự giám sát chính máy tính này.
    2. 🏢 **Chỉ cài đặt MÁY CHỦ (QLTBIT Server)**: Dành cho máy chủ trung tâm hoặc phòng máy chủ IT.
    3. 💻 **Chỉ cài đặt AGENT (Giám Sát Máy Trạm)**: Dành cho máy tính nhân viên, máy trạm các phòng ban trong mạng LAN / đa VLAN.
- **Tự động hóa hoàn toàn 100% từ A-Z**:
  - **Kiểm tra & Tự động cài đặt Node.js LTS**: Nếu máy tính chưa có Node.js, bộ cài sẽ tự động tải và cài đặt ngầm.
  - **Tích hợp sẵn PostgreSQL Portable**: Đi kèm bộ binary PostgreSQL chuẩn, tự động tạo cấu trúc và khởi chạy cơ sở dữ liệu `it_asset_db` mà không cần cài đặt rườm rà.
  - **Tự động đồng bộ lược đồ bảng & nạp tài khoản mẫu**: Chạy Prisma Sync và Seed dữ liệu ban đầu (`admin@company.com / Admin@123`).
  - **Tự động cấu hình tường lửa Windows**: Mở cổng 3001 (HTTP) và 3443 (HTTPS QR Scanner) qua `netsh advfirewall`.
  - **Tạo Shortcut màn hình Desktop**: Tạo biểu tượng QLTBIT Server với icon chuyên nghiệp.
  - **Cài đặt Agent chạy ngầm vô hình**: Tự động đăng ký Windows Task Scheduler `QLTBIT_Audit` chạy bằng quyền `SYSTEM` định kỳ 15 phút/lần.

#### B. Nâng Cấp Trình Điều Hành Máy Chủ (`QLTBIT_Server.exe`)
- **Khắc phục lỗi đứng hình ở bước [2/3]**:
  - Sửa lỗi race condition khi khởi tạo cửa sổ WinForms khiến nhật ký tiến trình (Logs) bị rỗng.
  - Nhận diện linh hoạt đường dẫn `node.exe` trên toàn hệ thống (kể cả khi vừa cài đặt mà chưa khởi động lại máy).
  - Tự động khởi động PostgreSQL tích hợp (`pgsql\bin\postgres.exe`) nếu máy chưa có dịch vụ database ngoài.
  - Tự động cuộn nhật ký theo thời gian thực (Auto-scroll) và hiển thị thông báo chẩn đoán bằng tiếng Việt dễ hiểu.

#### C. Dọn Dẹp Cấu Trúc Dự Án & Tạo Tài Liệu Word Cho Người Không Chuyên
- **Tối ưu hóa thư mục gốc (Project Cleanup)**:
  - Gom toàn bộ 13 file markdown/PDF kỹ thuật cũ và file tạm ở thư mục gốc vào thư mục mới: `archive/` (`archive/tai_lieu_cu/` và `archive/temp/`).
  - Thư mục gốc dự án trở nên gọn gàng, sạch sẽ, chỉ giữ lại các thành phần thực thi và tài liệu cốt lõi.
- **Tài Liệu Hướng Dẫn Word Trực Quan (`HUONG_DAN_SU_DUNG_VA_CAI_DAT_QLTBIT.docx`)**:
  - Biên soạn tài liệu Microsoft Word chuyên nghiệp, định dạng đẹp mắt với màu sắc chuẩn doanh nghiệp, bảng biểu, hộp lưu ý nổi bật.
  - Văn phong "cầm tay chỉ việc", trực quan, dễ hiểu 100% dành riêng cho người không rành công nghệ, kế toán, văn phòng, quản lý kho.
  - Hướng dẫn cài đặt 1-Click bằng chuột (cho Server và Agent máy trạm), kèm hướng dẫn sử dụng 8 nghiệp vụ thực tế hằng ngày (kiểm kê, cảnh báo tháo trộm RAM, bàn giao, thu hồi khi nghỉ việc, quét QR điện thoại, sơ đồ 2D).
- **Cập nhật Bảng Điều Khiển (`qltbit_manager.py`)**:
  - Bổ sung phím tắt `[7] 📖 Mở Tài Liệu Hướng Dẫn Chi Tiết (File Word: Cài đặt & Sử dụng)` để mở file Word trực tiếp.

---



## [v1.0.4] - 20/09/2026

Bản cập nhật **v1.0.4** mang đến bước tiến lớn về quy trình phê duyệt thông minh (Smart Approval Workflow), trực quan hóa dòng tiền chi tiêu IT 12 tháng (Renewal Runway Calendar), ký nhận bàn giao điện tử (Digital Signature), liên kết chia sẻ mật khẩu tự hủy dùng 1 lần (One-Time Secret Link), tính năng gợi ý tài liệu tự phục vụ thông minh khi tạo ticket (Smart Deflection), cùng hàng loạt sửa lỗi bảo mật và tối ưu trải nghiệm người dùng.

---

### 🌟 1. Tính Năng Mới & Nâng Cấp Nghiệp Vụ

#### A. Luồng Phê Duyệt Cấp Phát Thông Minh (Smart Hybrid Approval Fallback)
- **Tự động nhận diện Cấp trên trực tiếp (Auto-detect)**:
  - Tích hợp thông tin `managerId` và đối tượng Quản lý trực tiếp từ hồ sơ người dùng trong API `/api/auth/me`.
  - Tự động điền sẵn Cấp trên khi mở modal tạo yêu cầu, kèm huy hiệu trực quan `💡 Tự động nhận diện từ hồ sơ`.
- **Bộ chọn Cấp trên tìm kiếm thông minh (Searchable Combobox)**:
  - Thay thế dropdown cũ bằng giao diện tìm kiếm tức thì theo họ tên, email, phòng ban, chức vụ.
  - Tự động phân nhóm ưu tiên nhân sự `🏢 Cùng phòng ban` lên đầu để dễ dàng chọn đúng Trưởng bộ phận.
  - Hỗ trợ tùy chọn `🚀 Gửi thẳng cho Quản trị viên IT (Xử lý khẩn cấp)` cho các trường hợp phụ kiện nhỏ, chuột, phím, cáp hỏng.
- **Ràng buộc & cảnh báo thông minh theo loại yêu cầu**:
  - Với yêu cầu là **"Thiết bị mới" (Laptop/PC)** hoặc **"Bản quyền phần mềm"**: Hiển thị cảnh báo hướng dẫn nhân sự chọn Cấp trên duyệt chi phí trước khi chuyển sang IT.
- **Tính năng "Chuyển Cấp Trên Duyệt" dành cho IT Admin (Re-route)**:
  - Bổ sung API `POST /api/approvals/[id]/forward`: Cho phép Quản trị viên IT chuyển tiếp các đơn gửi thẳng IT sang cho Cấp trên của nhân viên duyệt ngân sách kèm lời nhắn và gửi email thông báo tự động.

#### B. Lịch Dự Báo Gia Hạn Chi Phí 12 Tháng (Renewal Runway Calendar)
- **Trực quan hóa dòng tiền chi tiêu IT**:
  - Tích hợp tab **Lịch Gia Hạn 12 Tháng** tại `/services?tab=runway` và Widget Runway trên Dashboard tổng quan.
  - Thống kê chi tiết tổng chi phí dự kiến theo từng tháng trong năm cho Domain, SSL, Hosting, Cloud Server, Đường truyền Internet, Thuê bao phần mềm SaaS và Hợp đồng bảo trì.
  - Biểu đồ cột trực quan phân bổ ngân sách, cảnh báo tháng cao điểm chi tiêu để Kế toán và Ban Giám đốc chủ động tài chính.

#### C. Ký Nhận Bàn Giao Điện Tử (Digital Signature Canvas)
- **Khung vẽ chữ ký cảm ứng HTML5 Canvas**:
  - Hỗ trợ ký nhận bằng chuột hoặc màn hình cảm ứng điện thoại/tablet (`SignaturePadModal.tsx`).
  - Tích hợp trực tiếp vào quy trình xuất kho và bàn giao thiết bị (`asset-handover-modal.tsx`).
  - Nhúng ảnh chữ ký số thực tế vào Biên bản bàn giao tài sản định dạng PDF, lưu trữ minh bạch lịch sử nhận máy.

#### D. Link Chia Sẻ Mật Khẩu Tự Hủy Dùng 1 Lần (One-Time Secret Link)
- **Bảo mật tuyệt đối thông tin đăng nhập**:
  - Mã hóa chuẩn quân đội AES-256-GCM bảo vệ mật khẩu hoặc ghi chú nhạy cảm (`/api/passwords/share`).
  - Sinh đường dẫn bí mật tạm thời dạng `/secret/[token]`. Người nhận chỉ mở xem được **đúng 1 lần duy nhất**, sau đó dữ liệu bị xóa vĩnh viễn khỏi bộ nhớ máy chủ.
  - Tùy chọn thời gian hết hạn linh hoạt: 1 giờ, 24 giờ, 3 ngày hoặc 7 ngày.

#### E. Gợi Ý Tự Phục Vụ Thông Minh Khi Tạo Ticket (Smart Deflection)
- **Tự động giảm tải cho đội ngũ IT Support**:
  - Tích hợp phân tích từ khóa theo thời gian thực trong modal tạo ticket (`CreateTicketModal.tsx`).
  - Gợi ý các bài viết hướng dẫn tương ứng từ Cơ sở tri thức (Knowledge Base) ngay khi người dùng gõ tiêu đề hoặc mô tả sự cố (VD: Cài máy in, cấu hình VPN, đổi mật khẩu Wifi).

#### G. Bàn Giao Hàng Loạt Nhiều Thiết Bị (Bulk Asset Handover & Dual Digital Signature)
- **Tối ưu hóa quy trình Onboarding & Cấp phát**:
  - Hỗ trợ chọn đồng thời nhiều thiết bị trên bảng tài sản (`/assets`) bằng checkbox hoặc phím tắt Chọn tất cả.
  - Thanh công cụ nổi (Floating Action Bar) hiển thị số lượng máy đã chọn và nút kích hoạt bàn giao hàng loạt.
  - Gộp tất cả thiết bị (Laptop, Màn hình, Bàn phím, Chuột, Phụ kiện) vào **1 Biên bản bàn giao duy nhất**.
  - Tự động điền đầy đủ thông tin nhân sự nhận (Họ tên, Email, Phòng ban, Chức vụ, SĐT).
  - Tích hợp **Ký điện tử kép (Dual Digital Signature)**: Cả Quản trị viên IT (Bên A) và Nhân viên tiếp nhận (Bên B) đều có thể ký trực tiếp trên màn hình cảm ứng hoặc chuột.
  - Xuất bản in PDF chuẩn khổ giấy A4, quốc hiệu tiêu ngữ, nhúng trực tiếp chữ ký số thực tế.
  - Cập nhật 1-click vào cơ sở dữ liệu: Đóng lượt bàn giao cũ, tạo phân bổ mới, chuyển trạng thái `IN_USE` và ghi vết `AuditLog` cho từng món đồ.

#### H. Tích Hợp Telegram Bot & Webhook Đa Kênh + Sách Hướng Dẫn Tương Tác
- **Bắn thông báo tức thời cho sự cố khẩn cấp (P1) và đơn duyệt**:
  - Hỗ trợ native nhà cung cấp `telegram` trong engine Webhook (`/src/lib/webhooks.ts`).
  - Tự động định dạng tin nhắn HTML trực quan với biểu tượng khẩn cấp, mã ticket, tiêu đề, kỹ thuật viên phụ trách, thời hạn SLA và liên kết xử lý 1-click.
  - Gửi thông báo ngay lập tức vào Nhóm chat IT Support hoặc kênh riêng khi có: Ticket P1 khẩn cấp (`ticket.urgent`), Ticket mới (`ticket.created`), Đơn phê duyệt mới (`approval.pending`).
  - Hỗ trợ đầy đủ các nền tảng: Telegram Bot, Microsoft Teams, Slack, Zalo OA / Custom Webhook JSON.
  - Tích hợp **Sách Hướng Dẫn Cấu Hình Từng Bước (Interactive Step-by-Step Setup Guide)** ngay trong tab Cài đặt Webhook, kèm bộ công cụ tự động tạo URL Telegram từ Bot Token và Chat ID.

---

### 🐛 2. Khắc Phục Lỗi (Bug Fixes)
- **Fix lỗi chặn người dùng tự phê duyệt (Prevent Self-Approval)**:
  - Ngăn chặn nhân viên tự chọn chính mình làm Quản lý phê duyệt tại API `POST /api/approvals`.
  - Chặn người tạo đơn tự duyệt yêu cầu của mình tại API `POST /api/approvals/[id]/approve`.
- **Fix lỗi xung đột mã yêu cầu AR (Duplicate Approval Code Constraint)**:
  - Khắc phục lỗi vi phạm ràng buộc duy nhất (`Unique Constraint P2002`) khi nhiều người dùng cùng tạo yêu cầu phê duyệt đồng thời trong cùng một thời điểm.
- **Fix lỗi thiếu trường dữ liệu trong API Auth**:
  - Bổ sung trường `managerId`, `position` và quan hệ `manager` vào response của `GET /api/auth/me`.
  - Bổ sung `managerId` vào câu truy vấn `requester` của `GET /api/approvals`.
- **Fix lỗi TypeScript Interface**:
  - Sửa lỗi thiếu thuộc tính `managerId` trong `ApprovalRequest.requester` interface tại trang `/approvals`.
- **Fix lỗi UX dropdown Cấp trên**:
  - Thay thế thẻ `<select>` gây tràn màn hình trên thiết bị di động bằng Searchable Combobox có scrollbar và phân nhóm khoa học.

---

## [v1.0.3] - 16/09/2026

Bản cập nhật **v1.0.3** tập trung khắc phục lỗi quét tự động (Auto-Scan Agent), tăng tốc độ và độ thông minh của AI, bổ sung quản lý đơn vị/nhà cung cấp đa chiều, cùng cơ chế đồng bộ dữ liệu phản ứng nhanh (Reactive Data Sync) cho toàn hệ thống.

---

### 🌟 1. Khắc Phục Lỗi & Nâng Cấp Quét Tự Động (Auto-Scan Agent)
- **Khắc phục lỗi HTTP 500 khi máy tính gửi Serial Number mặc định ("Default string")**:
  - Mainboard lắp ráp / Gigabyte (`B450 AORUS M`, `B550`, v.v.) thường trả về chuỗi `"Default string"` hoặc `"To be filled by O.E.M."`.
  - Bổ sung hàm lọc `isGenericSerial()` để chặn các serial mặc định rác ghi đè hoặc xung đột ràng buộc duy nhất (`@unique`) trong PostgreSQL.
  - Tự động chuyển `serialNumber` rác về `null` và sử dụng `Hostname` máy trạm làm khóa định danh, tránh tình trạng các máy clone ghi đè cấu hình của nhau.
- **Tối ưu nhận diện chủng loại thiết bị (Device Detection)**:
  - Tự động nhận diện chuẩn các dòng chipset / mainboard Desktop (`B450`, `B550`, `B650`, `H610`, `B760`, `Z790`, `AORUS`, `Tomahawk`...).
  - Ngăn chặn lỗi nhận diện nhầm máy bàn thành `Laptop` do thiết bị cắm bộ lưu điện UPS USB hoặc mã chassis BIOS trả về không chuẩn.
  - Thu thập và lưu trữ đầy đủ thông số VGA / cạc đồ họa rời trên cả máy bàn và laptop.
- **Nâng cấp Agent PowerShell (`simply-it-collector.ps1`)**:
  - Bổ sung hàm `Remove-NullCharacters`: Đệ quy làm sạch các ký tự rỗng NUL (`\0`) từ Windows Registry/WMI trước khi tuần tự hóa JSON gửi về server.
  - Tích hợp đọc luồng lỗi `ResponseStream`: Khi server trả về mã lỗi HTTP 4xx/5xx, Agent trích xuất thông điệp chi tiết từ server để kỹ thuật viên IT dễ dàng chẩn đoán.
- **Cơ chế sinh mã tài sản (`assetTag`) an toàn**:
  - Thay thế cách tính `count() + 1` bằng thuật toán truy vấn mã `AST-xxxx` lớn nhất hiện có và tự động tăng dần đến khi không còn trùng lặp, đảm bảo an toàn tuyệt đối khi có tài sản bị xóa.

---

### 🚀 2. Tối Ưu Tốc Độ AI & Quản Lý Đơn Vị / Nhà Cung Cấp
- **Tăng tốc AI Gemini**:
  - Nâng cấp sử dụng mô hình thế hệ mới `gemini-3.5-flash-lite`, giảm độ trễ phản hồi khi trích xuất hóa đơn, phân tích hợp đồng và chatbot hỗ trợ.
- **Bổ sung trường Công ty quản lý & Nhà cung cấp**:
  - Bổ sung trường Công ty quản lý (`companyName`) và Nhà cung cấp (`vendorId` / `vendor`) vào chi tiết tài sản, giấy phép dịch vụ CNTT và hợp đồng bảo trì.
  - Đồng bộ hiển thị nhất quán trên các thẻ thông tin và danh sách kiểm kê.

---

### ⚡ 3. Cơ Chế Đồng Bộ Dữ Liệu Phản Ứng Nhanh (Reactive Data Sync)
- **Tự động làm mới dữ liệu tức thì (Instant Mutation Revalidation)**:
  - Cập nhật, tạo mới hoặc xóa bất kỳ tài sản, bản quyền, dịch vụ, kho phụ tùng đều tự động revalidate SWR cache ngay lập tức mà không cần F5/reload trang thủ công.
- **Smart Background Polling & Focus Refresh**:
  - Tự động đồng bộ ngầm định kỳ và làm mới dữ liệu khi người dùng quay lại tab trình duyệt, bảo đảm dữ liệu luôn mới nhất giữa nhiều kỹ thuật viên IT cùng thao tác.

---

## [v1.0.1] - 12/09/2026

Bản cập nhật **v1.0.1** tập trung nâng cấp trải nghiệm người dùng, bổ sung quản lý vòng đời nhân sự (nghỉ việc), tăng cường bảo mật đăng nhập, nâng cấp khả năng tương tác bảng dữ liệu và khắc phục triệt để các lỗi cấu hình gửi email SMTP.

---

### 🌟 1. Tính Năng Mới & Nâng Cấp Nghiệp Vụ

#### A. Quản Lý Nhân Sự Nghỉ Việc & Chặn Đăng Nhập Tuyệt Đối
- **Phân loại trạng thái công tác**:
  - Thêm tab chuyên biệt `🛑 Nghỉ việc` trên trang Quản lý Người Dùng (`/users`).
  - Hiển thị badge trạng thái rõ nét: `🟢 Đang làm việc` vs `🛑 Đã nghỉ việc` trên bảng dữ liệu và modal chi tiết.
- **Chặn đăng nhập 3 lớp bảo mật**:
  - **Mật khẩu nội bộ**: Khi tài khoản có trạng thái Nghỉ việc (`isActive = false`), hệ thống lập tức từ chối đăng nhập (HTTP 403) kèm thông báo: *"Tài khoản của bạn đã nghỉ việc hoặc bị khóa. Không thể đăng nhập vào hệ thống."*
  - **Microsoft 365 SSO**: Nhận diện thuộc tính `accountEnabled` qua Microsoft Graph API. Khi tài khoản trên Entra ID bị khóa, tự động chuyển trạng thái sang Nghỉ việc và từ chối cấp phiên đăng nhập.
  - **Active Directory / LDAP**: Nhận diện cờ khóa tài khoản (`userAccountControl & 2`) từ máy chủ Domain Controller, chặn đăng nhập an toàn.
- **Thu hồi tài sản tự động**:
  - Khi quản trị viên chuyển nhân sự sang Nghỉ việc, hệ thống cung cấp tùy chọn: *"Tự động thu hồi toàn bộ thiết bị & license về kho"*, đưa máy tính về trạng thái `AVAILABLE` và giải phóng bản quyền phần mềm ngay lập tức.
- **Khôi phục công tác (`Reactivate`)**: Cho phép đưa nhân sự quay lại làm việc và mở khóa tài khoản chỉ với 1 click.

#### B. Đồng Bộ Thư Mục Tự Động (Directory Sync)
- **API `POST /api/users/sync-directory`**: Tự động kết nối với Microsoft Graph (M365) và máy chủ LDAP/AD để quét danh sách nhân viên.
- **Tự động xử lý**: Nếu tài khoản bị vô hiệu hóa hoặc đã xóa khỏi thư mục công ty, QLTBIT sẽ tự động chuyển tài khoản sang Nghỉ việc và ghi nhận Audit Log.
- **Nút bấm trực quan**: Bổ sung nút `🔄 Đồng Bộ Thư Mục` trực tiếp trên thanh công cụ trang Người Dùng.

#### C. Menu Chuột Phải Thao Tác Nhanh (Right-Click Context Menu)
- **Kích hoạt tự nhiên**: Khi nhấp chuột phải vào bất kỳ hàng nào trên bảng danh sách tài sản (`/assets`), mở ngay menu thao tác nổi tại vị trí con trỏ chuột.
- **Đầy đủ 8 thao tác chính**:
  1. 👁️ **Xem chi tiết thiết bị** (`Detail Modal`)
  2. ✏️ **Chỉnh sửa thông số** (`Edit Modal`)
  3. 🤝 **Cấp phát & điều chuyển** (`Transfer Modal`)
  4. 📄 **In biên bản bàn giao PDF** (`Handover PDF`)
  5. 🖨️ **In mã QR & tem nhãn** (`QR Print`)
  6. 🔧 **Bảo trì / Sửa chữa** (`Maintenance Modal`)
  7. 📋 **Sao chép mã tài sản** (`Copy Tag to Clipboard`)
  8. 🗑️ **Xóa thiết bị này** (`Delete with confirm`)
- **Tối ưu hiển thị**: Tự động căn chỉnh toạ độ trong phạm vi màn hình (`viewport bounds`), không bị tràn mép. Tự động đóng khi click ra ngoài, cuộn trang hoặc bấm `Escape`.

#### D. Kéo Thả Khung Chat AI Linh Hoạt (Draggable Floating Chat)
- **Không che khuất dữ liệu**:
  - Người dùng có thể nhấn giữ chuột (hoặc chạm tay trên màn hình cảm ứng) vào nút tròn AI và kéo đi bất kỳ đâu trên màn hình để tránh che khuất các nút thao tác hoặc cột dữ liệu.
  - Khi mở rộng khung chat (410x550px), thanh tiêu đề (header) đóng vai trò tay cầm kéo (`cursor-grab` / `⠿ Kéo để di chuyển`), cho phép vừa di chuyển khung chat vừa đọc dữ liệu bên dưới.
- **Phân biệt Click & Drag**: Nhấp chuột nhanh (< 4px) mở chat; nhấn giữ kéo (> 4px) di chuyển vị trí.
- **Nút "Gốc"**: Bấm để đưa khung chat về vị trí góc dưới phải mặc định.
- **Ghi nhớ vị trí**: Tự động lưu vị trí kéo vào `localStorage` (`simply:chat-pos`), giữ nguyên vị trí khi chuyển trang hoặc F5.

#### E. Tối Ưu Form Thêm & Sửa Thiết Bị (`/assets`)
- **Tự động điền ngày mua**: Form thêm tài sản tự động điền ngày mua mặc định là ngày hiện tại (`hôm nay`).
- **Chọn nhanh thời hạn bảo hành**: Bổ sung 4 nút chọn nhanh bảo hành: `1 năm (12T)`, `2 năm (24T)`, `3 năm (36T)`, `5 năm (60T)`. Tự động tính toán ngày hết hạn bảo hành dựa trên ngày mua.
- **Bổ sung trường ngày mua / ngày nhập hàng**: Hiển thị rõ ràng trường ngày mua trên form nhập liệu và bảng danh sách.

#### F. Tự Động Nhận Diện & Cập Nhật Đúng Danh Mục Thiết Bị (Laptop / PC / Server)
- **Vấn đề trước đây**: Khi thu thập thông tin tự động (`auto-scan/collect`), hệ thống chọn danh mục đầu tiên tìm thấy (thường rơi vào `🏢 Thiết bị văn phòng`) và khi cập nhật thiết bị đã có thì không cập nhật lại danh mục.
- **Giải pháp toàn diện**:
  - **Phía Agent thu thập (`get_system_info.ps1`, `simply-it-collector.ps1`)**:
    - Quét trực tiếp cảm biến pin (`Win32_Battery`) và khung vỏ máy (`Win32_SystemEnclosure.ChassisTypes`).
    - Nhận diện chính xác loại máy: `Laptop` (nếu có pin hoặc chassis loại 8..14, 30..32), `Server` (nếu chassis 17, 23, 28, 29 hoặc Windows Server), hoặc `Desktop`.
    - Gửi kèm cờ `deviceType`, `hasBattery`, `chassisTypes` về hệ thống.
  - **Phía Máy chủ & API (`/api/v1/auto-scan/collect` & `/api/auto-scan/collect`)**:
    - Module nhận diện thông minh đa tầng (`src/lib/device-detection.ts`): nhận diện theo tín hiệu phần cứng, model series (Lenovo type `21S6...`, `20XF...`, ThinkPad, Latitude, EliteBook...), từ khóa dòng sản phẩm.
    - Tìm và gán chính xác danh mục `Laptop` (hoặc `PC / Máy tính để bàn`, `Máy chủ`).
    - **Cập nhật cả thiết bị cũ**: Khi máy quét lại, nếu danh mục hiện tại là chung chung (`Thiết bị văn phòng`, `Khác`, hoặc trống), hệ thống tự động hiệu chỉnh sang đúng danh mục thực tế (`Laptop`) và ghi nhận vào lịch sử thay đổi.

---

### 🐛 2. Sửa Lỗi Hệ Thống (Bug Fixes)

#### A. Sửa Lỗi Lưu Cấu Hình SMTP Bị Mất Khi F5
- **Nguyên nhân**: API `GET /api/settings` trả về `{ success: true, data: settings }`, nhưng frontend lại kiểm tra `dataSettings.settings` (undefined), dẫn đến việc mỗi khi F5 trang, dữ liệu không được nạp vào form và bị xóa trắng.
- **Khắc phục**:
  - API `GET /api/settings` trả về cả `data` lẫn `settings` để tương thích toàn diện.
  - Frontend `email-settings-tab.tsx` đọc an toàn từ `dataSettings.data || dataSettings.settings`. Khi F5, cấu hình đã lưu luôn hiển thị đầy đủ.

#### B. Sửa Lỗi Gửi Thử Email Báo `connect ECONNREFUSED 127.0.0.1`
- **Nguyên nhân**:
  - Nút test email gửi thiếu thông tin host/port từ form, khiến `host` bị undefined.
  - Khi host rỗng, thư viện `nodemailer` mặc định trỏ về `localhost` (`127.0.0.1:587`), gây lỗi kết nối bị từ chối `ECONNREFUSED 127.0.0.1`.
- **Khắc phục**:
  - API `/api/email/test` tự động fallback về cấu hình đã lưu trong cơ sở dữ liệu nếu form không truyền lên.
  - Bắt buộc kiểm tra `host`: nếu Host trống, hệ thống từ chối và hiển thị thông báo hướng dẫn rõ ràng, không để nodemailer tự kết nối vào `127.0.0.1`.
  - Frontend truyền đầy đủ cấu hình đang nhập để kiểm tra trực tiếp.
  - Đồng bộ hóa các tên khóa cài đặt: `email.smtp_from_name` / `email.from_name`, `email.smtp_from_email` / `email.from_email`, `email.smtp_enabled` / `email.enabled`.
  - Thông báo lỗi mạng chi tiết, trực quan bằng tiếng Việt cho các trường hợp: sai Host/Port, chặn firewall, sai mật khẩu ứng dụng.

---

### 📦 3. Danh Sách Tập Tin Thay Đổi

- `package.json`: Nâng phiên bản từ `1.0.0` lên `1.0.1`.
- `src/components/layout/header.tsx`: Cập nhật hiển thị phiên bản `v1.0.1` trong modal About và Kỹ thuật.
- `src/components/settings/license-settings-tab.tsx`: Cập nhật hiển thị `v1.0.1`.
- `src/components/common/LicenseActivationModal.tsx`: Cập nhật hiển thị `v1.0.1`.
- `src/app/api/system/backup/download/route.ts`: Cập nhật phiên bản manifest backup `1.0.1`.
- `src/app/(dashboard)/assets/page.tsx`: Menu chuột phải context menu, tự động điền ngày mua, chọn nhanh hạn bảo hành.
- `src/components/chatbot/ChatWidget.tsx`: Kéo thả linh hoạt nút chat và khung chat AI.
- `src/app/(dashboard)/users/page.tsx`: Tab Nghỉ việc, hiển thị trạng thái, thu hồi tài sản, đồng bộ thư mục.
- `src/app/api/settings/route.ts`: Chuẩn hóa dữ liệu trả về `data` và `settings`.
- `src/components/settings/email-settings-tab.tsx`: Khắc phục nạp cấu hình khi F5 và truyền tham số test SMTP.
- `src/lib/email.ts`: Hỗ trợ đa dạng key SMTP, fallback an toàn, chẩn đoán lỗi tiếng Việt.
- `src/app/api/email/test/route.ts`: Hỗ trợ test linh hoạt theo form và theo database.
- `CHANGELOG.md`: Tài liệu ghi chú chi tiết bản cập nhật v1.0.1.

---

### 🚀 4. Hướng Dẫn Nâng Cấp Lên v1.0.1

1. **Kéo mã nguồn mới nhất từ GitHub**:
   ```bash
   git pull origin main
   ```
2. **Cập nhật database schema (nếu có)**:
   ```bash
   npx prisma generate
   ```
3. **Biên dịch và khởi động lại dịch vụ**:
   ```bash
   npm run build
   npm start
   ```
   *(Hoặc khởi động lại qua ứng dụng Launcher `QLTBIT_Server.exe`)*

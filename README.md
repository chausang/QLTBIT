# 🏥 QLTBIT — Chương Trình Quản Lý Thiết Bị Trong Bệnh Viện
> **"Giải pháp chuyển đổi số toàn diện quản lý tài sản, trang thiết bị CNTT và tiếp nhận hỗ trợ sự cố cho Bệnh viện, Cơ sở Y tế & Doanh nghiệp."**  
> An open-source, modern, and unified IT Asset Management (ITAM) and Helpdesk (ITSM) platform tailored for hospitals, healthcare facilities, and growing organizations.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

[Tổng Quan Tiếng Việt](#tổng-quan-tiếng-việt) • [English Overview](#english-overview) • [Cài Đặt Nhanh](#-cài-đặt-nhanh-với-docker-30-giây) • [Tài Liệu Hướng Dẫn Word (.docx)](./HUONG_DAN_SU_DUNG_VA_CAI_DAT_SIMPLY_IT.docx)

> 💡 **Bạn mới làm quen hoặc không rành về kỹ thuật?**  
> 👉 Mở ngay tài liệu Microsoft Word chi tiết, trực quan tại: **[HUONG_DAN_SU_DUNG_VA_CAI_DAT_SIMPLY_IT.docx](./HUONG_DAN_SU_DUNG_VA_CAI_DAT_SIMPLY_IT.docx)** *(Dành riêng cho người không chuyên: Cài đặt 1-Click bằng chuột và hướng dẫn chi tiết từng tính năng)*.

---

## 🚀 Cài Đặt Nhanh Với Docker (30 Giây)

Cách nhanh nhất và chuẩn xác nhất để triển khai chương trình QLTBIT trên máy chủ hoặc máy trạm cá nhân:

```bash
# 1. Tải mã nguồn dự án từ GitHub
git clone https://github.com/chausang/QLTBIT.git
cd QLTBIT

# 2. Khởi chạy toàn bộ hệ thống bằng Docker Compose
docker compose up -d
```

Sau khi các container khởi động hoàn tất, truy cập hệ thống qua trình duyệt web:
* 🌐 **Cổng Web thông thường (HTTP):** `http://localhost:3001`
* 🔒 **Cổng bảo mật HTTPS (Hỗ trợ Camera quét mã QR/mã vạch trên Điện thoại & Tablet):** `https://localhost:3443`

**Tài khoản đăng nhập quản trị mặc định:**
* **Email:** `admin@company.com`
* **Mật khẩu:** `Admin@123`

*(Hệ thống sẽ yêu cầu đổi mật khẩu mới trong lần đăng nhập đầu tiên để đảm bảo an toàn).*

---

## <a name="tổng-quan-tiếng-việt"></a>🇻🇳 Tổng Quan Tiếng Việt

**QLTBIT** là nền tảng quản trị tài sản trang thiết bị CNTT & tiếp nhận yêu cầu hỗ trợ kỹ thuật tinh gọn, chuyên sâu dành cho các Bệnh viện, Trung tâm Y tế, Phòng khám hoặc Doanh nghiệp:

### ✨ Các Tính Năng Nổi Bật

1. **Quản lý Tài sản & Trang thiết bị Khoa/Phòng (ITAM)**:
   - Quản lý phân bổ máy trạm, laptop, màn hình, máy in tem nhãn, thiết bị mạng, máy quét mã vạch theo từng Khoa/Phòng bệnh viện.
   - Theo dõi trọn vẹn vòng đời tài sản từ lúc mua sắm, bàn giao, bảo hành, sửa chữa, thay thế linh kiện đến khi thanh lý.
   - Tự động thống kê số lượng thiết bị theo trạng thái (Đang sử dụng, Sẵn sàng, Hỏng chờ sửa, Dự phòng).
2. **In Tem Nhãn & Quét Mã QR Kiểm Kê Hiện Trường**:
   - Tự động tạo và in tem mã QR / Barcode chuẩn khổ Decal văn phòng và tem dán thiết bị y tế.
   - Quét mã QR trực tiếp qua Camera điện thoại di động / máy tính bảng để kiểm kê thực tế tại từng khoa phòng.
   - Hỗ trợ nhập và xuất dữ liệu 2 chiều nhanh chóng bằng file Microsoft Excel.
3. **Cổng Tiếp Nhận & Xử Lý Sự Cố Khoa Phòng (Helpdesk / ITSM)**:
   - Cổng tự phục vụ (Self-Service) cho cán bộ, y bác sĩ, điều dưỡng gửi phiếu yêu cầu hỗ trợ sự cố máy tính, máy in, mạng.
   - Phân công kỹ thuật viên phụ trách, phân loại mức độ ưu tiên (P1 Khẩn cấp đến P4 Thấp) và cam kết thời gian hoàn thành (SLA).
   - Nhật ký trao đổi trực quan, gửi hình ảnh đính kèm lỗi và lập biên bản bàn giao xử lý sự cố.
4. **Quản trị Bản Quyền Phần Mềm & Dịch Vụ**:
   - Quản lý số lượng giấy phép (Seat) bản quyền hệ điều hành, phần mềm văn phòng, diệt virus và phần mềm chuyên môn.
   - Cảnh báo trực quan các hợp đồng dịch vụ mạng, bản quyền sắp hết hạn trước 30 ngày.
5. **Két Sắt Mật Khẩu An Toàn (Password Vault)**:
   - Lưu trữ an toàn thông tin tài khoản quản trị mạng, máy chủ cơ sở dữ liệu, router wifi với mã hóa cấp quân sự AES-256.
6. **Thu Thập Cấu Hình Máy Tự Động (Agent Scan)**:
   - Cung cấp script / agent thu thập tự động thông tin CPU, RAM, Ổ cứng, Số Serial, Tên máy và gửi thẳng về máy chủ chỉ với 1 cú click.
7. **Trợ Lý Ảo AI Copilot Thông Minh**:
   - Tích hợp Google Gemini API hỗ trợ tư vấn kỹ thuật, gợi ý cách xử lý sự cố và đọc thông số thiết bị từ hình ảnh.
8. **Đa Ngôn Ngữ Hoàn Toàn**: Chuyển đổi linh hoạt và mượt mà giữa **Tiếng Việt** và **Tiếng Anh**.

---

## <a name="english-overview"></a>🌐 English Overview

**QLTBIT** is an open-source, modern, and unified IT Asset Management (ITAM) and Helpdesk (ITSM) system specifically designed for hospitals, healthcare facilities, and enterprises.

### ✨ Key Capabilities

* **💻 Hardware Asset Management (ITAM)**: Track complete hardware lifecycles across hospital departments (workstations, clinical laptops, medical barcode printers, network switches, accessories).
* **🏷️ QR Code & Barcode Labeling**:
  * Auto-generate standard Decal labels for printers.
  * Instant QR code scanning via mobile phone or laptop camera for field audits.
  * Batch Excel import and export.
* **🎫 Helpdesk & Ticket Portal (ITSM)**:
  * Self-service user ticket portal for clinical and administrative staff.
  * Technician assignment, priority levels (P1 - P4), and committed resolution deadlines (SLA).
  * Activity thread, attachments, and resolution documentation.
* **🔑 Software Licenses & SaaS Tracker**:
  * Monitor Seat utilization (`Used / Total Seats`) with color-coded threshold bars.
  * 30-day proactive expiry alerts on the executive dashboard.
* **🔐 Secure Password Vault**:
  * AES-256 encrypted credential store for network infrastructure, servers, and departmental logins.
* **🤖 AI Copilot (Bring Your Own Key)**:
  * Integrate Google Gemini API free-tier key for technical troubleshooting, OCR specs extraction, and advice.
* **🌐 Bilingual Support**: 100% native support for both **English** and **Tiếng Việt**.

---

## 🛠️ Cài Đặt Thủ Công Môi Trường Phát Triển (Manual Setup)

Nếu bạn muốn chạy trực tiếp mã nguồn bằng Node.js và PostgreSQL trên máy tính:

### Yêu Cầu Tiên Quyết
* **Node.js**: Phiên bản `v20.0.0` trở lên (Khuyến nghị `v22 LTS`)
* **PostgreSQL**: Phiên bản `v15` hoặc `v16`

### Các Bước Thực Hiện

```bash
# 1. Tải mã nguồn về máy
git clone https://github.com/chausang/QLTBIT.git
cd QLTBIT

# 2. Cài đặt các gói thư viện phụ thuộc
npm install

# 3. Tạo file cấu hình môi trường (.env)
cp .env.example .env

# 4. Cấu hình chuỗi kết nối DATABASE_URL trong file .env phù hợp với PostgreSQL của bạn
# Ví dụ: DATABASE_URL="postgresql://postgres:password@localhost:5432/qltbit_db?schema=public"

# 5. Đồng bộ cấu trúc cơ sở dữ liệu và nạp dữ liệu khởi tạo
npx prisma db push
npm run db:seed

# 6. Khởi động máy chủ phát triển
npm run dev
```

Mở trình duyệt tại địa chỉ: **`http://localhost:3001`** (hoặc bảo mật **`https://localhost:3443`**)

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án QLTBIT được phát hành dưới giấy phép mã nguồn mở **[Apache License 2.0](LICENSE)**.

## 📌 Nguồn Gốc & Tham Khảo (Credits)

Mã nguồn tham khảo từ dự án [takien26/Simply-it-community: Phiên bản ITSM Free](https://github.com/takien26/Simply-it-community).

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script tạo file tài liệu Word (.docx) Hướng dẫn Cài đặt & Sử dụng SIMPLY IT
Dành riêng cho người không chuyên về công nghệ.
"""

import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_shading(cell, color_hex):
    """Đặt màu nền cho ô trong bảng"""
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=140, bottom=140, left=200, right=200):
    """Đặt padding cho ô trong bảng (đơn vị dxa, 20 dxa = 1 pt)"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout(doc, text_content, title="💡 LƯU Ý QUAN TRỌNG", box_type="info"):
    """Thêm hộp ghi chú / mẹo nổi bật đẹp mắt"""
    # Màu sắc dựa trên loại hộp
    if box_type == "success":
        border_color = "10B981" # Green
        bg_color = "ECFDF5"
        title_color = RGBColor(4, 120, 87)
    elif box_type == "warning":
        border_color = "F59E0B" # Orange
        bg_color = "FFFBEB"
        title_color = RGBColor(180, 83, 9)
    else: # info
        border_color = "0284C7" # Ocean Blue
        bg_color = "F0F9FF"
        title_color = RGBColor(3, 105, 161)

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, bg_color)
    set_cell_margins(cell, top=160, bottom=160, left=240, right=200)

    # Đặt viền trái dày, bỏ 3 viền còn lại
    borders_xml = f'''
    <w:tcBorders {nsdecls("w")}>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="32" w:space="0" w:color="{border_color}"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tcBorders>
    '''
    cell._tc.get_or_add_tcPr().append(parse_xml(borders_xml))

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(title + "\n")
    run_title.bold = True
    run_title.font.name = "Segoe UI"
    run_title.font.size = Pt(10.5)
    run_title.font.color.rgb = title_color

    run_body = p.add_run(text_content)
    run_body.font.name = "Segoe UI"
    run_body.font.size = Pt(10)
    run_body.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_table(tbl, col_widths, headers, data, header_bg="0F172A", alt_row_bg="F8FAFC"):
    """Tạo bảng biểu chuyên nghiệp với màu sắc đẹp"""
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Tạo hàng tiêu đề
    hdr_cells = tbl.rows[0].cells
    for i, header_text in enumerate(headers):
        hdr_cells[i].text = header_text
        set_cell_shading(hdr_cells[i], header_bg)
        set_cell_margins(hdr_cells[i], top=160, bottom=160, left=160, right=160)
        p = hdr_cells[i].paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        for run in p.runs:
            run.font.name = "Segoe UI"
            run.font.size = Pt(10)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Thêm các hàng dữ liệu
    for row_idx, row_data in enumerate(data):
        row_cells = tbl.add_row().cells
        bg_col = alt_row_bg if row_idx % 2 == 1 else "FFFFFF"
        for i, val in enumerate(row_data):
            row_cells[i].text = str(val)
            set_cell_shading(row_cells[i], bg_col)
            set_cell_margins(row_cells[i], top=120, bottom=120, left=160, right=160)
            p = row_cells[i].paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            for run in p.runs:
                run.font.name = "Segoe UI"
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(30, 41, 59)

    # Đặt độ rộng cột
    for row in tbl.rows:
        for i, width in enumerate(col_widths):
            row.cells[i].width = width

    # Viền bảng tinh tế
    tblBorders = parse_xml(f'''
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tblBorders>
    ''')
    tbl._tbl.tblPr.append(tblBorders)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Segoe UI"
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42) # Dark Navy
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Segoe UI"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(2, 132, 199) # Ocean Blue
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Segoe UI"
    run.font.size = Pt(11)
    run.font.bold = True
    run.font.color.rgb = RGBColor(51, 65, 85) # Slate Dark
    return p

def add_body_p(doc, text="", bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Segoe UI"
        r_pre.font.size = Pt(10.5)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    if text:
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(10.5)
        r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_bullet_p(doc, text="", bold_prefix=""):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Segoe UI"
        r_pre.font.size = Pt(10.5)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    if text:
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(10.5)
        r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def main():
    doc = Document()

    # Đặt lề trang 2cm
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.9)
        s.right_margin = Inches(0.9)

    # ==================== TRANG BÌA / HEADER ====================
    tbl_cover = doc.add_table(rows=1, cols=1)
    tbl_cover.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_cover = tbl_cover.cell(0, 0)
    set_cell_shading(c_cover, "0A192F") # Deep Midnight Navy
    set_cell_margins(c_cover, top=360, bottom=360, left=360, right=360)

    p_cover = c_cover.paragraphs[0]
    p_cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cover.paragraph_format.space_before = Pt(10)
    p_cover.paragraph_format.space_after = Pt(6)

    r_sys = p_cover.add_run("SIMPLY IT — HỆ THỐNG QUẢN LÝ TÀI SẢN CNTT DOANH NGHIỆP\n")
    r_sys.font.name = "Segoe UI"
    r_sys.font.size = Pt(12)
    r_sys.font.bold = True
    r_sys.font.color.rgb = RGBColor(0, 184, 212) # Cyan Accent

    r_main_title = p_cover.add_run("SÁCH HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG TỪ A - Z\n")
    r_main_title.font.name = "Segoe UI"
    r_main_title.font.size = Pt(20)
    r_main_title.font.bold = True
    r_main_title.font.color.rgb = RGBColor(255, 255, 255)

    r_sub = p_cover.add_run("ĐẶC BIỆT DÀNH CHO NGƯỜI DÙNG KHÔNG CHUYÊN CÔNG NGHỆ\n")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(11)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(226, 232, 240)

    r_ver = p_cover.add_run("Bản Cài Đặt 1-Click Đơn Giản • Phiên Bản v1.0.5 Community Edition")
    r_ver.font.name = "Segoe UI"
    r_ver.font.size = Pt(10)
    r_ver.font.italic = True
    r_ver.font.color.rgb = RGBColor(148, 163, 184)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Lời mở đầu
    add_callout(
        doc,
        "Chào bạn! Nếu bạn là nhân viên văn phòng, kế toán, quản lý tài sản hoặc nhân sự mà không hiểu biết sâu về kỹ thuật CNTT — Đừng lo lắng! Toàn bộ hệ thống SIMPLY IT đã được đóng gói thành phần mềm '1-Click' cực kỳ trực quan. Bạn chỉ cần nhấp chuột giống như cài đặt phần mềm Zalo hoặc Word thông thường.",
        title="🌟 CAM KẾT: 100% NGƯỜI KHÔNG RÀNH CÔNG NGHỆ VẪN CÀI VÀ DÙNG ĐƯỢC!",
        box_type="info"
    )

    # ==================== PHẦN 1 ====================
    add_heading_1(doc, "PHẦN 1: SIMPLY IT LÀ GÌ? VÌ SAO DOANH NGHIỆP NÊN DÙNG?")
    add_body_p(doc, "SIMPLY IT giống như một 'Người Quản Lý Kho Kỹ Thuật Số Thông Minh' của cơ quan bạn. Thay vì phải dùng sổ tay hay file Excel để ghi chép thủ công từng chiếc máy tính, SIMPLY IT tự động làm mọi việc cho bạn:")

    add_bullet_p(doc, "Bạn không cần đi từng phòng mở máy xem cấu hình. Phần mềm tự động biết máy đó dùng vi xử lý gì, có mấy thanh RAM, ổ cứng còn trống bao nhiêu.", "1. Tự động kiểm kê phần cứng: ")
    add_bullet_p(doc, "Nếu ai đó lén tháo bớt 1 thanh RAM hay tráo đổi ổ cứng của công ty mang về, hệ thống sẽ lập tức báo động đỏ trên màn hình quản lý.", "2. Báo động chống trộm/tráo linh kiện: ")
    add_bullet_p(doc, "Khi có nhân viên mới vào hoặc nhân viên nghỉ việc, chỉ cần 1 cú nhấp chuột là bạn biết chính xác cần bàn giao hay thu hồi máy nào, màn hình nào, không bao giờ lo bị sót.", "3. Bàn giao & Thu hồi tài sản chuẩn chỉ: ")
    add_bullet_p(doc, "Mỗi máy tính dán một con tem mã QR nhỏ. Bạn cầm điện thoại quét một cái 'tít' là biết ngay máy này mua ngày nào, ai đang dùng, còn bảo hành bao lâu.", "4. Quét mã QR bằng điện thoại: ")
    add_bullet_p(doc, "Khi máy tính của nhân viên bị hỏng màn hình, hỏng chuột hay mạng chập chờn, họ chỉ cần gửi yêu cầu trên trang web, bộ phận IT tiếp nhận sửa chữa có lịch sử rõ ràng.", "5. Phiếu báo hỏng & Sửa chữa (Ticket): ")

    # ==================== PHẦN 2 ====================
    add_heading_1(doc, "PHẦN 2: CHUẨN BỊ TRƯỚC KHI CÀI ĐẶT (RẤT ĐƠN GIẢN)")
    add_body_p(doc, "Để cài đặt SIMPLY IT, bạn không cần phải mua máy chủ chuyên dụng đắt tiền hay thuê kỹ sư CNTT. Bạn chỉ cần:")

    tbl_req = doc.add_table(rows=1, cols=3)
    format_table(
        tbl_req,
        [Inches(2.0), Inches(2.2), Inches(2.8)],
        ["Thành phần", "Yêu cầu tối thiểu", "Ghi chú dành cho bạn"],
        [
            ["Máy tính cài đặt", "Máy tính bàn hoặc Laptop", "Dùng bất kỳ máy tính nào của công ty chạy Windows 10 hoặc 11."],
            ["Bộ nhớ RAM", "4 GB (Tốt nhất từ 8 GB)", "Hầu hết các máy tính hiện nay đều đáp ứng tốt."],
            ["Ổ cứng trống", "Khoảng 5 GB trống", "Để lưu trữ phần mềm và cơ sở dữ liệu tài sản."],
            ["Môi trường mạng", "Mạng nội bộ (Wi-Fi / Dây LAN)", "Để các máy tính trong công ty có thể kết nối với nhau."]
        ]
    )

    add_callout(
        doc,
        "Bạn KHÔNG CẦN phải cài đặt trước PostgreSQL hay phần mềm cơ sở dữ liệu rườm rà nào khác! SIMPLY IT đã tích hợp sẵn cơ sở dữ liệu Portable chạy ngầm gọn gàng trong thư mục pgsql/.",
        title="💡 ĐIỂM ĐẶC BIỆT: TÍCH HỢP SẴN DATABASE PORTABLE",
        box_type="success"
    )

    # ==================== PHẦN 3 ====================
    add_heading_1(doc, "PHẦN 3: HƯỚNG DẪN CÀI ĐẶT MÁY CHỦ (SERVER) — CHỈ VỚI 3 CÚ NHẤP CHUỘT")
    add_body_p(doc, "Đây là phần quan trọng nhất: Cài đặt Trung tâm Quản trị SIMPLY IT trên máy tính của Quản lý / Kỹ thuật viên:")

    add_heading_2(doc, "Bước 1: Mở Trình Cài Đặt 1-Click")
    add_body_p(doc, "Mở thư mục chương trình tại ổ đĩa (ví dụ: D:\\QLTBIT), tìm file có tên:")
    add_bullet_p(doc, "(Hoặc file tiếng Anh: SimplyIT_Setup.exe). Nhấp đúp chuột để mở.", "Cai_Dat_SimplyIT.exe: ")

    add_heading_2(doc, "Bước 2: Chọn Chế Độ Cài Đặt")
    add_body_p(doc, "Cửa sổ giao diện hiện đại sẽ hiện ra. Bạn sẽ thấy 3 lựa chọn:")

    tbl_mode = doc.add_table(rows=1, cols=3)
    format_table(
        tbl_mode,
        [Inches(2.2), Inches(2.6), Inches(2.2)],
        ["Chế độ lựa chọn", "Chương trình sẽ làm gì?", "Ai nên chọn mục này?"],
        [
            ["🌟 Cài đặt CẢ HAI\n(Server & Agent)", "Cài đặt toàn bộ: Web Quản trị, Cơ sở dữ liệu, Mở tường lửa và Cài luôn Agent giám sát chính máy này.", "👉 KHUYÊN DÙNG CHO BẠN (Máy Quản lý / IT)"],
            ["🏢 Chỉ cài đặt MÁY CHỦ\n(Server Only)", "Chỉ cài đặt Web Quản lý và Cơ sở dữ liệu trung tâm, không cài Agent giám sát máy này.", "Dành cho máy chủ chuyên dụng đặt trong phòng Server."],
            ["💻 Chỉ cài đặt AGENT\n(Client Only)", "Rất nhẹ, không cần Database. Chỉ cài công cụ theo dõi chạy ngầm để gửi thông tin về máy chủ.", "Dành cho các máy tính của nhân viên trong cơ quan."]
        ]
    )

    add_body_p(doc, "👉 Bạn chỉ cần tích chọn vào mục đầu tiên: '🌟 Cài đặt CẢ HAI: Máy Chủ & Agent (Khuyên Dùng)'.")

    add_heading_2(doc, "Bước 3: Bấm Bắt Đầu Cài Đặt")
    add_body_p(doc, "Nhấp vào nút to màu xanh biển ở góc dưới: '🚀 BẮT ĐẦU CÀI ĐẶT NGAY'.")
    add_body_p(doc, "Sau khi bấm nút, phần mềm sẽ tự động làm hết mọi việc từ A đến Z trong khoảng 1 phút:")
    add_bullet_p(doc, "Tự động kiểm tra và cấu hình môi trường Node.js.")
    add_bullet_p(doc, "Tự động khởi động Cơ sở dữ liệu PostgreSQL tích hợp trên cổng 5432.")
    add_bullet_p(doc, "Tự động tạo các bảng quản lý và nạp tài khoản Quản trị viên đầu tiên.")
    add_bullet_p(doc, "Tự động mở cổng Tường lửa Windows (Port 3001 và 3443) để các máy khác và điện thoại có thể truy cập.")
    add_bullet_p(doc, "Tự động tạo biểu tượng Shortcut ngoài màn hình Desktop để bạn mở nhanh lần sau.")

    add_callout(
        doc,
        "Khi cài xong, chữ sẽ chuyển thành màu xanh lá cây: '🎉 CHÚC MỪNG BẠN! HỆ THỐNG ĐÃ CÀI ĐẶT THÀNH CÔNG 100%!'. Đồng thời trình duyệt web của bạn sẽ tự động bật lên trang chủ SIMPLY IT tại địa chỉ: http://localhost:3001.",
        title="✅ CÀI ĐẶT HOÀN TẤT TRONG 1 PHÚT!",
        box_type="success"
    )

    add_heading_2(doc, "Thông tin tài khoản đăng nhập mặc định:")
    add_bullet_p(doc, "http://localhost:3001 (hoặc địa chỉ IP máy chủ của bạn)", "Địa chỉ trang web: ")
    add_bullet_p(doc, "admin@company.com (hoặc admin@simplyit.com)", "Tên đăng nhập (Email): ")
    add_bullet_p(doc, "Admin@123 (Chữ A viết hoa)", "Mật khẩu: ")

    # ==================== PHẦN 4 ====================
    add_heading_1(doc, "PHẦN 4: HƯỚNG DẪN CÀI ĐẶT MÁY TRẠM CHO NHÂN VIÊN (CLIENT AGENT)")
    add_body_p(doc, "Để máy chủ tự động thu thập cấu hình của các máy tính trong văn phòng, bạn chỉ cần cho máy đó chạy Agent một lần duy nhất.")

    add_heading_2(doc, "Cách 1: Cài bằng Trình Cài Đặt 1-Click (Dễ nhất)")
    add_bullet_p(doc, "Chép file Cai_Dat_SimplyIT.exe vào USB mang sang máy tính của nhân viên (hoặc gửi qua mạng nội bộ / Zalo).")
    add_bullet_p(doc, "Nhấp đúp chuột mở file Cai_Dat_SimplyIT.exe.")
    add_bullet_p(doc, "Tích chọn vào mục thứ 3: '💻 Chỉ cài đặt AGENT (Client)'.")
    add_bullet_p(doc, "Ở ô 'Địa chỉ Máy Chủ SIMPLY IT', nhập địa chỉ IP của máy chủ trong mạng (Ví dụ: http://192.168.1.50:3001).")
    add_bullet_p(doc, "Nhấn nút '🚀 BẮT ĐẦU CÀI ĐẶT NGAY'. Hoàn tất trong đúng 3 giây!")

    add_heading_2(doc, "Cách 2: Cài bằng Gói cài đặt nhanh (Dành cho bộ phận IT)")
    add_bullet_p(doc, "Copy thư mục GOI_CAI_DAT_AGENT sang máy nhân viên.")
    add_bullet_p(doc, "Nhấp chuột phải vào file Install_Agent.bat ➔ Chọn 'Run as administrator' (Chạy quyền Quản trị viên).")
    add_bullet_p(doc, "Gõ địa chỉ IP máy chủ ➔ Nhấn Enter. Hệ thống sẽ tự động đăng ký tác vụ chạy ngầm.")

    add_callout(
        doc,
        "Agent sau khi cài đặt sẽ hoạt động 100% vô hình (Hidden). Không có bất kỳ cửa sổ đen nào bật lên làm phiền người dùng. Cứ mỗi 15 phút, nó sẽ tự động gửi thông tin cập nhật về máy chủ. Mức chiếm CPU dưới 0.5%, hoàn toàn không làm chậm máy!",
        title="🛡️ TÍNH NĂNG VÔ HÌNH VÀ AN TOÀN TUYỆT ĐỐI",
        box_type="info"
    )

    # ==================== PHẦN 5 ====================
    add_heading_1(doc, "PHẦN 5: HƯỚNG DẪN SỬ DỤNG CÁC TÍNH NĂNG CHÍNH HẰNG NGÀY")

    add_heading_2(doc, "5.1. Đăng nhập và Đổi mật khẩu tài khoản")
    add_body_p(doc, "Mở trình duyệt (Chrome, Cốc Cốc, Edge), gõ địa chỉ http://localhost:3001 (hoặc địa chỉ IP máy chủ). Nhập email và mật khẩu Admin@123 để vào hệ thống.")
    add_body_p(doc, "Để bảo mật, hãy vào menu Cài đặt (góc dưới bên trái) ➔ Chọn tab 'Tài khoản' ➔ Nhập mật khẩu mới của bạn và bấm Lưu.")

    add_heading_2(doc, "5.2. Quản lý Danh sách Thiết bị (Menu 'Tài Sản')")
    add_body_p(doc, "Bấm vào menu 'Tài sản' trên thanh điều hướng bên trái:")
    add_bullet_p(doc, "Danh sách máy tính: Bạn sẽ thấy bảng liệt kê tất cả máy tính đang có trong cơ quan.")
    add_bullet_p(doc, "Xem chi tiết một máy tính: Nhấp chuột vào dòng của máy đó để xem cửa sổ chi tiết:")
    add_bullet_p(doc, "Xem máy dùng chip Core i5 hay i7, có mấy thanh RAM (mỗi thanh bao nhiêu GB, nhãn hiệu gì), ổ cứng dung lượng bao nhiêu còn trống bao nhiêu.", "- Tab Phần cứng: ")
    add_bullet_p(doc, "Liệt kê toàn bộ các phần mềm đang được cài đặt trong máy tính đó.", "- Tab Phần mềm: ")
    add_bullet_p(doc, "Ghi lại rõ ai là người đã từng sử dụng máy tính này từ trước đến nay.", "- Tab Lịch sử: ")

    add_heading_2(doc, "5.3. Xem Cảnh Báo 'Tháo Trộm Linh Kiện' & Phần Mềm Lạ")
    add_body_p(doc, "Cách mở trên giao diện Web: Vào menu 'Tài sản' (Assets) ➔ Nhấp chuột vào thiết bị cần kiểm tra ➔ Chuyển sang Tab: 'Cấu hình Phần cứng & Kiểm kê'.")
    add_body_p(doc, "Đây là tính năng độc quyền cực kỳ thông minh của SIMPLY IT:")
    add_bullet_p(doc, "Cảnh báo động thông minh: Khung cảnh báo chỉ hiện ra KHI THỰC SỰ CÓ BẤT THƯỜNG. Nếu máy tính hoạt động ổn định, hệ thống hiển thị bảng cấu hình sạch màu xanh.")
    add_bullet_p(doc, "Nếu có ai đó tháo bớt 1 thanh RAM hoặc tráo đổi ổ cứng sang máy khác, trên chi tiết thiết bị sẽ lập tức hiện một khung màu cam nổi bật: '⚠️ PHÁT HIỆN THAY ĐỔI CẤU HÌNH PHẦN CỨNG!'.")
    add_bullet_p(doc, "Mục 'Nhật ký thay đổi' bên dưới sẽ ghi rõ: Ngày 03/10/2026, RAM giảm từ 16GB xuống còn 8GB (hoặc ổ cứng bị hoán đổi). Nhờ đó bạn phát hiện ngay ai đã can thiệp vào máy.")
    add_bullet_p(doc, "Tự động phát hiện các phần mềm bẻ khóa độc hại nguy hiểm (như KMSAuto, KMSPico...) để cảnh báo quản trị viên xử lý sớm qua khung màu đỏ vi phạm chính sách.")

    add_heading_2(doc, "5.4. Quy trình Bàn Giao Thiết Bị Cho Nhân Viên Mới")
    add_bullet_p(doc, "Bước 1: Vào menu 'Tài sản', chọn máy tính cần giao.")
    add_bullet_p(doc, "Bước 2: Bấm nút 'Bàn giao' (Assign) ở góc trên bên phải.")
    add_bullet_p(doc, "Bước 3: Chọn tên nhân viên nhận máy, ngày bàn giao và tình trạng máy (ví dụ: máy mới 99%, có đủ sạc và chuột).")
    add_bullet_p(doc, "Bước 4: Bấm 'Xác nhận'. Hệ thống sẽ tự động cập nhật người giữ máy và cho phép bạn in biên bản bàn giao ra giấy A4 để 2 bên ký tên.")

    add_heading_2(doc, "5.5. Quy trình Thu Hồi Tài Sản Khi Nhân Viên Nghỉ Việc (1-Click)")
    add_body_p(doc, "Trước đây khi nhân viên nghỉ việc, công ty rất hay bị mất mát hoặc quên thu hồi màn hình, chuột, tài khoản mật khẩu:")
    add_bullet_p(doc, "Bước 1: Vào menu 'Người dùng / Nhân sự'.")
    add_bullet_p(doc, "Bước 2: Tìm nhân viên sắp nghỉ việc ➔ Bấm nút 'Quy trình nghỉ việc (Offboarding)'.")
    add_bullet_p(doc, "Bước 3: Màn hình sẽ tự động gom tất cả những gì người đó đang mượn của công ty: Máy tính xách tay nào, Màn hình phụ nào, Tài khoản email nào.")
    add_bullet_p(doc, "Bước 4: Bạn chỉ cần tích chọn từng món khi nhận lại bàn giao. Bấm 'Hoàn tất thu hồi' ➔ Tài sản tự động được đưa về trạng thái 'Trong kho' để sẵn sàng giao cho người tiếp theo!")

    add_heading_2(doc, "5.6. Gửi & Xử Lý Phiếu Báo Hỏng / Sửa Chữa (Menu 'Phiếu Hỗ Trợ')")
    add_body_p(doc, "Khi nhân viên trong công ty gặp sự cố máy tính:")
    add_bullet_p(doc, "Bấm 'Tạo phiếu mới' ➔ Chọn thiết bị bị hỏng ➔ Nhập lỗi (ví dụ: 'Màn hình chập chờn lúc lên lúc không').")
    add_bullet_p(doc, "Kỹ thuật viên IT mở danh sách phiếu, bấm nhận phiếu và chuyển sang 'Đang xử lý'.")
    add_bullet_p(doc, "Khi sửa xong, IT ghi chú cách xử lý (ví dụ: 'Đã thay dây cáp HDMI mới') ➔ Bấm 'Đã hoàn tất'. Nhân viên sẽ biết máy mình đã xong.")

    add_heading_2(doc, "5.7. Dùng Điện Thoại Quét Mã QR Để Kiểm Kê Nhanh")
    add_body_p(doc, "Vào các đợt kiểm kê tài sản cuối năm, bạn không cần phải cầm giấy bút đi từng phòng:")
    add_bullet_p(doc, "Bước 1: Dùng điện thoại (kết nối Wi-Fi cơ quan), mở trình duyệt web vào địa chỉ: https://<IP_MAY_CHU>:3443/scan.")
    add_bullet_p(doc, "Bước 2: Bấm 'Cho phép Camera'.")
    add_bullet_p(doc, "Bước 3: Đưa camera vào mã QR dán trên thân máy tính.")
    add_bullet_p(doc, "Bước 4: Màn hình điện thoại phát tiếng 'tít', hiện tên máy, người dùng và tự động tích xanh 'Đã kiểm kê'. Mỗi máy chỉ mất đúng 2 giây!")

    add_heading_2(doc, "5.8. Xem Vị Trí Thiết Bị Trên Sơ Đồ Phòng Ban (Sơ Đồ 2D)")
    add_body_p(doc, "Vào menu 'Sơ đồ mặt bằng' để xem bản vẽ các phòng ban trong cơ quan. Bạn có thể kéo thả biểu tượng máy tính vào đúng bàn làm việc thực tế của nhân viên. Khi cần tìm máy tính của ai đang ở tầng mấy, phòng nào, bạn chỉ cần liếc nhìn sơ đồ là biết ngay.")

    add_heading_2(doc, "5.9. Hướng Dẫn Cập Nhật Phần Mềm Khi Có Code Mới (Update Server & Agent)")
    add_body_p(doc, "Khi hệ thống SIMPLY IT có phiên bản mới hoặc thay đổi về mã nguồn:")
    add_bullet_p(doc, "CÓ CẦN CÀI LẠI KHÔNG? -> HOÀN TOÀN KHÔNG CẦN CÀI LẠI! Toàn bộ cơ sở dữ liệu PostgreSQL và hình ảnh/chứng từ của bạn được giữ nguyên vẹn 100%.")
    add_bullet_p(doc, "CẬP NHẬT Ở MÁY CHỦ (SERVER): Chỉ cần 1-Click! Thoát ứng dụng Simply IT ➔ Nhấp đúp chuột vào file 'update.bat' tại thư mục dự án. Hệ thống sẽ tự động cập nhật code mới, nâng cấp CSDL và biên dịch hoàn toàn tự động. Xong bấm bật lại SimplyIT_Server.exe là xong.", "- Bước 1: ")
    add_bullet_p(doc, "CẬP NHẬT Ở MÁY TRẠM (AGENT): 99% trường hợp KHÔNG CẦN LÀM GÌ CẢ! Do Agent chỉ là tác vụ ngầm định kỳ gửi thông tin phần cứng về máy chủ, mọi logic so sánh tháo trộm linh kiện hay phát hiện phần mềm crack đều do Server xử lý. Khi Server có tính năng mới, tất cả máy trạm tự động hưởng lợi ngay mà IT không cần đến từng máy.", "- Bước 2: ")
    add_bullet_p(doc, "KHI NÀO MỚI CẦN CẬP NHẬT AGENT? Chỉ khi có bản cập nhật file script thu thập mới hoặc khi cơ quan thay đổi địa chỉ IP của máy chủ. Khi đó chỉ cần copy file 'agent.ps1' trong thư mục GOI_CAI_DAT_AGENT đè sang máy trạm hoặc chạy lại Install_Agent.bat.", "- Lưu ý: ")

    # ==================== PHẦN 6 ====================
    add_heading_1(doc, "PHẦN 6: BẢNG HỎI ĐÁP & XỬ LÝ LỖI ĐƠN GIẢN (TROUBLESHOOTING)")

    tbl_faq = doc.add_table(rows=1, cols=2)
    format_table(
        tbl_faq,
        [Inches(3.2), Inches(4.0)],
        ["Câu hỏi thường gặp", "Giải đáp & Cách xử lý siêu dễ"],
        [
            ["Làm sao để máy khác trong văn phòng mở được trang web?", "Trên máy khác trong cùng mạng Wi-Fi/LAN, mở trình duyệt gõ: http://<Địa_Chỉ_IP_Máy_Chủ>:3001.\n(Ví dụ: http://192.168.1.50:3001)."],
            ["Nếu tắt máy tính chủ thì hệ thống có chạy không?", "Khi máy tính cài SIMPLY IT Server bị tắt, trang web sẽ tạm ngưng. Khi bạn bật máy tính lên lại, chỉ cần nhấp đúp vào biểu tượng ngoài màn hình Desktop là hệ thống tự hoạt động trở lại bình thường."],
            ["Điện thoại báo 'Kết nối không riêng tư' khi mở camera quét QR?", "Vì cổng 3443 sử dụng chứng chỉ bảo mật nội bộ tự cấp của công ty. Bạn chỉ cần bấm 'Nâng cao' (Advanced) ➔ bấm 'Tiếp tục truy cập' (Proceed to site) là camera sẽ mở ngay bình thường."],
            ["Dữ liệu lưu ở đâu? Có sợ bị lộ ra ngoài mạng không?", "Toàn bộ dữ liệu nằm 100% trong máy tính của bạn tại thư mục pgsql/data, không hề gửi lên bất kỳ đám mây công cộng nào, đảm bảo an toàn tuyệt đối cho cơ quan."],
            ["Nếu muốn khởi động lại máy chủ thì làm thế nào?", "Tìm biểu tượng SIMPLY IT ở góc phải màn hình máy tính (khay đồng hồ Windows) ➔ Nhấp chuột phải ➔ Chọn 'Khởi động lại'."]
        ]
    )

    # ==================== PHẦN 7 ====================
    add_heading_1(doc, "PHẦN 7: TỔNG KẾT CÁC FILE QUAN TRỌNG TRONG THƯ MỤC")
    add_body_p(doc, "Để thuận tiện cho bạn tra cứu, dưới đây là danh sách các file cốt lõi trong thư mục chương trình:")

    tbl_files = doc.add_table(rows=1, cols=3)
    format_table(
        tbl_files,
        [Inches(2.5), Inches(2.2), Inches(2.5)],
        ["Tên tập tin (File)", "Công dụng", "Cách sử dụng"],
        [
            ["Cai_Dat_SimplyIT.exe\n(hoặc SimplyIT_Setup.exe)", "Trình Cài Đặt Trọn Gói 1-Click (Cài Server, Agent hoặc cả hai)", "Nhấp đúp chuột để cài đặt hệ thống mới."],
            ["SimplyIT_Server.exe", "Bộ khởi chạy Máy chủ Quản trị ngầm dưới khay hệ thống", "Nhấp đúp để bật máy chủ và cơ sở dữ liệu."],
            ["start_qltbit.bat", "Bảng điều khiển quản trị trung tâm bằng menu số [1-7]", "Nhấp đúp để chọn quét mạng, cài đặt, v.v."],
            ["GOI_CAI_DAT_AGENT", "Thư mục chứa gói cài đặt Agent máy trạm", "Copy thư mục này sang máy nhân viên để cài đặt."],
            ["push_to_github.bat", "Công cụ đồng bộ mã nguồn lên GitHub", "Dành cho kỹ thuật viên khi cần sao lưu code."],
            ["archive/", "Thư mục lưu trữ tài liệu kỹ thuật cũ và file tạm", "Được gom gọn gàng để thư mục gốc luôn sạch đẹp."]
        ]
    )

    add_callout(
        doc,
        "🎉 Chúc mừng bạn đã nắm vững toàn bộ cách cài đặt và vận hành hệ thống SIMPLY IT! Hệ thống này là phiên bản Community Edition hoàn toàn MIỄN PHÍ VĨNH VIỄN dành tặng cho cộng đồng doanh nghiệp và cơ quan tại Việt Nam.",
        title="🌟 CHÚC BẠN VẬN HÀNH HỆ THỐNG THÀNH CÔNG VÀ HIỆU QUẢ!",
        box_type="success"
    )

    output_path = r"d:\Antigravity\QLTBIT\HUONG_DAN_SU_DUNG_VA_CAI_DAT_SIMPLY_IT.docx"
    doc.save(output_path)
    try:
        print(f"[OK] Da tao thanh cong tai lieu Word tai: {output_path}")
    except Exception:
        pass

if __name__ == "__main__":
    main()


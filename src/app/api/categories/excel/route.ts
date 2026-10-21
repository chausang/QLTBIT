import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// GET /api/categories/excel?action=template&type={type}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'template';
    const type = searchParams.get('type') || 'assets';

    if (action === 'template') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QLTBIT';
      const sheet = workbook.addWorksheet('Mau_Nhap_Lieu');

      // Style header
      const headerFill: ExcelJS.FillPattern = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }, // Blue 800
      };
      const headerFont: Partial<ExcelJS.Font> = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };

      let columns: any[] = [];
      let sampleRows: any[] = [];

      switch (type) {
        case 'assets':
          columns = [
            { header: 'Tên Danh Mục (*)', key: 'name', width: 30 },
            { header: 'Biểu Tượng (Emoji)', key: 'icon', width: 20 },
            { header: 'Mô Tả', key: 'description', width: 40 },
          ];
          sampleRows = [
            { name: 'Laptop / Máy tính xách tay', icon: '💻', description: 'Máy tính xách tay cho cán bộ nhân viên' },
            { name: 'PC Desktop / Máy để bàn', icon: '🖥️', description: 'Máy tính để bàn phục vụ công việc cố định' },
            { name: 'Màn hình máy tính', icon: '🖥️', description: 'Màn hình LCD, LED 24-27 inch' },
            { name: 'Máy in / Scan', icon: '🖨️', description: 'Máy in văn phòng, đa chức năng' },
          ];
          break;

        case 'licenses':
          columns = [
            { header: 'Tên Nhóm License (*)', key: 'name', width: 32 },
            { header: 'Biểu Tượng (Emoji)', key: 'icon', width: 20 },
            { header: 'Mô Tả / Ứng Dụng Đại Diện', key: 'description', width: 45 },
          ];
          sampleRows = [
            { name: 'Ứng dụng Văn phòng & Email', icon: '📄', description: 'Microsoft 365, Google Workspace' },
            { name: 'Thiết kế Đồ họa & CAD', icon: '🎨', description: 'Adobe Creative Cloud, AutoCAD' },
            { name: 'Bảo mật & Diệt virus', icon: '🛡️', description: 'Kaspersky Endpoint, Bitdefender' },
          ];
          break;

        case 'services':
          columns = [
            { header: 'Tên Dịch Vụ IT (*)', key: 'name', width: 32 },
            { header: 'Biểu Tượng (Emoji)', key: 'icon', width: 20 },
            { header: 'Loại Dịch Vụ', key: 'serviceType', width: 25 },
            { header: 'Mô Tả Chi Tiết', key: 'description', width: 45 },
          ];
          sampleRows = [
            { name: 'Đường truyền Internet Cáp quang', icon: '🌐', serviceType: 'INTERNET', description: 'Đường truyền VNPT, FPT, Viettel' },
            { name: 'Máy chủ Cloud / VPS', icon: '☁️', serviceType: 'CLOUD_HOSTING', description: 'AWS, FPT Cloud, Viettel IDC' },
            { name: 'Tên miền & SSL', icon: '🛡️', serviceType: 'DOMAIN_SSL', description: 'Tên miền doanh nghiệp và chứng chỉ bảo mật' },
          ];
          break;

        case 'vendors':
          columns = [
            { header: 'Tên Nhà Cung Cấp (*)', key: 'name', width: 32 },
            { header: 'Người Liên Hệ', key: 'contactPerson', width: 25 },
            { header: 'Số Điện Thoại', key: 'phone', width: 20 },
            { header: 'Email Liên Hệ', key: 'email', width: 28 },
            { header: 'Địa Chỉ', key: 'address', width: 35 },
            { header: 'Website', key: 'website', width: 25 },
            { header: 'Ghi Chú', key: 'notes', width: 30 },
          ];
          sampleRows = [
            { name: 'Công ty TNHH Máy Tính Phong Vũ', contactPerson: 'Nguyễn Văn A', phone: '0901234567', email: 'sales@phongvu.vn', address: 'Hà Nội', website: 'https://phongvu.vn', notes: 'Cung cấp linh kiện PC, màn hình' },
            { name: 'Công ty Cổ phần Viễn thông FPT', contactPerson: 'Trần Thị B', phone: '0912345678', email: 'support@fpt.vn', address: 'Hà Nội', website: 'https://fpt.vn', notes: 'Nhà cung cấp Internet & Cloud' },
          ];
          break;

        case 'companies':
          columns = [
            { header: 'Tên Công Ty / Chi Nhánh (*)', key: 'name', width: 35 },
            { header: 'Mã Viết Tắt', key: 'code', width: 20 },
            { header: 'Ghi Chú', key: 'notes', width: 35 },
          ];
          sampleRows = [
            { name: 'Tổng Công Ty (HQ)', code: 'HQ', notes: 'Trụ sở chính' },
            { name: 'Chi Nhánh Hà Nội', code: 'HN', notes: 'Văn phòng miền Bắc' },
            { name: 'Chi Nhánh TP.HCM', code: 'HCM', notes: 'Văn phòng miền Nam' },
          ];
          break;

        case 'locations':
          columns = [
            { header: 'Tên Vị Trí / Khoa Phòng (*)', key: 'name', width: 32 },
            { header: 'Tòa Nhà', key: 'building', width: 25 },
            { header: 'Tầng', key: 'floor', width: 15 },
            { header: 'Ghi Chú', key: 'notes', width: 35 },
          ];
          sampleRows = [
            { name: 'Phòng IT / Server Room', building: 'Tòa nhà A', floor: 'Tầng 3', notes: 'Trung tâm dữ liệu chính' },
            { name: 'Phòng Hành Chính Nhân Sự', building: 'Tòa nhà A', floor: 'Tầng 2', notes: 'Bộ phận HC-NS' },
            { name: 'Phòng Kế Toán', building: 'Tòa nhà B', floor: 'Tầng 4', notes: 'Bộ phận Tài chính Kế toán' },
          ];
          break;
      }

      sheet.columns = columns;

      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      sampleRows.forEach((row) => sheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Mau_Nhap_${type}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
  } catch (error: any) {
    console.error('Categories excel error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý file Excel' }, { status: 500 });
  }
}

// POST /api/categories/excel?type={type} - Import Excel rows
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'assets';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: 'File Excel không có dữ liệu (sheet trống)' }, { status: 400 });
    }

    let importedCount = 0;
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Bỏ qua tiêu đề
      const values = row.values as any[];
      if (!values || values.length <= 1) return;
      rows.push(values);
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dòng dữ liệu nào trong file Excel' }, { status: 400 });
    }

    switch (type) {
      case 'assets': {
        for (const r of rows) {
          const name = String(r[1] || '').trim();
          if (!name) continue;
          const icon = String(r[2] || '📦').trim();
          const description = r[3] ? String(r[3]).trim() : null;

          await prisma.assetCategory.upsert({
            where: {
              name_parentId: {
                name,
                parentId: null as any,
              },
            },
            create: { name, icon, description, isActive: true },
            update: { icon, description, isActive: true },
          });
          importedCount++;
        }
        break;
      }

      case 'licenses': {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'categories.license' } });
        let list: any[] = [];
        try {
          if (setting?.value) list = JSON.parse(setting.value);
        } catch {}

        for (const r of rows) {
          const name = String(r[1] || '').trim();
          if (!name) continue;
          const icon = String(r[2] || '📄').trim();
          const description = r[3] ? String(r[3]).trim() : '';

          const idx = list.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
          if (idx >= 0) {
            list[idx].icon = icon;
            list[idx].description = description;
          } else {
            list.push({
              id: `cat-lic-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name,
              icon,
              description,
              customFields: [],
              count: 0,
            });
          }
          importedCount++;
        }

        await prisma.systemSetting.upsert({
          where: { key: 'categories.license' },
          create: { key: 'categories.license', value: JSON.stringify(list), type: 'JSON', group: 'general', label: 'Danh mục license' },
          update: { value: JSON.stringify(list) },
        });
        break;
      }

      case 'services': {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'categories.service' } });
        let list: any[] = [];
        try {
          if (setting?.value) list = JSON.parse(setting.value);
        } catch {}

        for (const r of rows) {
          const name = String(r[1] || '').trim();
          if (!name) continue;
          const icon = String(r[2] || '🌐').trim();
          const serviceType = String(r[3] || 'OTHER').trim();
          const description = r[4] ? String(r[4]).trim() : '';

          const idx = list.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
          if (idx >= 0) {
            list[idx].icon = icon;
            list[idx].serviceType = serviceType;
            list[idx].description = description;
          } else {
            list.push({
              id: `cat-svc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name,
              icon,
              serviceType,
              description,
              customFields: [],
              count: 0,
            });
          }
          importedCount++;
        }

        await prisma.systemSetting.upsert({
          where: { key: 'categories.service' },
          create: { key: 'categories.service', value: JSON.stringify(list), type: 'JSON', group: 'general', label: 'Danh mục dịch vụ IT' },
          update: { value: JSON.stringify(list) },
        });
        break;
      }

      case 'vendors': {
        for (const r of rows) {
          const name = String(r[1] || '').trim();
          if (!name) continue;
          const contactPerson = r[2] ? String(r[2]).trim() : null;
          const phone = r[3] ? String(r[3]).trim() : null;
          const email = r[4] ? String(r[4]).trim() : null;
          const address = r[5] ? String(r[5]).trim() : null;
          const website = r[6] ? String(r[6]).trim() : null;
          const notes = r[7] ? String(r[7]).trim() : null;

          const existing = await prisma.vendor.findFirst({ where: { name } });
          if (existing) {
            await prisma.vendor.update({
              where: { id: existing.id },
              data: { contactPerson, phone, email, address, website, notes, isActive: true },
            });
          } else {
            await prisma.vendor.create({
              data: { name, contactPerson, phone, email, address, website, notes, isActive: true },
            });
          }
          importedCount++;
        }
        break;
      }

      case 'companies': {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'corporate.companies' } });
        let list: string[] = [];
        try {
          if (setting?.value) list = JSON.parse(setting.value);
        } catch {}

        for (const r of rows) {
          const name = String(r[1] || '').trim();
          if (!name) continue;
          if (!list.some((c) => c.toLowerCase() === name.toLowerCase())) {
            list.push(name);
          }
          importedCount++;
        }

        await prisma.systemSetting.upsert({
          where: { key: 'corporate.companies' },
          create: { key: 'corporate.companies', value: JSON.stringify(list), type: 'JSON', group: 'general', label: 'Danh sách công ty' },
          update: { value: JSON.stringify(list) },
        });
        break;
      }

      case 'locations': {
        for (const r of rows) {
          const name = String(r[1] || '').trim();
          if (!name) continue;
          const building = r[2] ? String(r[2]).trim() : null;
          const floor = r[3] ? String(r[3]).trim() : null;
          const notes = r[4] ? String(r[4]).trim() : null;

          const existing = await prisma.location.findFirst({ where: { name } });
          if (existing) {
            await prisma.location.update({
              where: { id: existing.id },
              data: { building, floor, notes, isActive: true },
            });
          } else {
            await prisma.location.create({
              data: { name, building, floor, notes, isActive: true },
            });
          }
          importedCount++;
        }
        break;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      message: `Đã nhập thành công ${importedCount} mục từ file Excel`,
    });
  } catch (error: any) {
    console.error('Import categories excel error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi nhập dữ liệu từ Excel' }, { status: 500 });
  }
}

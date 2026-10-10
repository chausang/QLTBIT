import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAssetTemplate } from '@/lib/services/excel-import';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// GET /api/assets/export?template=true hoặc xuất toàn bộ danh sách tài sản
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isTemplate = searchParams.get('template') === 'true';
    const lang = (searchParams.get('lang') || 'vi').toLowerCase();
    const isEn = lang === 'en';

    if (isTemplate) {
      const buffer = await generateAssetTemplate(lang);
      const fileName = isEn ? 'Asset_Import_Template.xlsx' : 'Mau_Nhap_Thiet_Bi.xlsx';

      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers,
      });
    }

    // Xuất dữ liệu danh sách tài sản ra file Excel (.xlsx)
    const assets = await prisma.asset.findMany({
      include: {
        category: true,
        vendor: true,
        location: true,
        assignments: {
          where: { returnedAt: null },
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Simply IT';
    const worksheet = workbook.addWorksheet(isEn ? 'Assets Inventory' : 'Danh Sách Thiết Bị');

    // Header đa cột
    worksheet.columns = isEn
      ? [
          { header: 'No.', key: 'stt', width: 8 },
          { header: 'Asset Tag', key: 'assetTag', width: 18 },
          { header: 'Device Name', key: 'name', width: 28 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Brand', key: 'brand', width: 16 },
          { header: 'Model', key: 'model', width: 18 },
          { header: 'Serial Number', key: 'serialNumber', width: 20 },
          { header: 'Status', key: 'status', width: 16 },
          { header: 'Condition', key: 'condition', width: 14 },
          { header: 'Purchase Date', key: 'purchaseDate', width: 16 },
          { header: 'Cost (VND)', key: 'purchasePrice', width: 18 },
          { header: 'Warranty Expiry', key: 'warrantyExpiry', width: 16 },
          { header: 'Location / Dept', key: 'location', width: 22 },
          { header: 'Company', key: 'company', width: 26 },
          { header: 'Assigned User', key: 'user', width: 24 },
          { header: 'CPU', key: 'cpu', width: 18 },
          { header: 'RAM', key: 'ram', width: 14 },
          { header: 'Storage', key: 'storage', width: 18 },
          { header: 'Notes', key: 'notes', width: 28 },
        ]
      : [
          { header: 'STT', key: 'stt', width: 8 },
          { header: 'Mã Tài Sản', key: 'assetTag', width: 18 },
          { header: 'Tên Thiết Bị', key: 'name', width: 28 },
          { header: 'Danh Mục', key: 'category', width: 20 },
          { header: 'Thương Hiệu', key: 'brand', width: 16 },
          { header: 'Model', key: 'model', width: 18 },
          { header: 'Số Serial', key: 'serialNumber', width: 20 },
          { header: 'Trạng Thái', key: 'status', width: 16 },
          { header: 'Tình Trạng', key: 'condition', width: 14 },
          { header: 'Ngày Mua', key: 'purchaseDate', width: 16 },
          { header: 'Nguyên Giá (VND)', key: 'purchasePrice', width: 18 },
          { header: 'Hạn Bảo Hành', key: 'warrantyExpiry', width: 16 },
          { header: 'Vị Trí / Khoa Phòng', key: 'location', width: 22 },
          { header: 'Công Ty Quản Lý', key: 'company', width: 26 },
          { header: 'Người Đang Sử Dụng', key: 'user', width: 24 },
          { header: 'CPU', key: 'cpu', width: 18 },
          { header: 'RAM', key: 'ram', width: 14 },
          { header: 'Ổ Cứng', key: 'storage', width: 18 },
          { header: 'Ghi Chú', key: 'notes', width: 28 },
        ];

    // Format Header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' },
      };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    assets.forEach((asset, idx) => {
      const activeAssignee = asset.assignments?.[0]?.user;
      const specs = (asset.specs as any) || {};

      worksheet.addRow({
        stt: idx + 1,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category?.name || '—',
        brand: asset.brand || '—',
        model: asset.model || '—',
        serialNumber: asset.serialNumber || '—',
        status: asset.status,
        condition: asset.condition,
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().slice(0, 10) : '—',
        purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : '—',
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().slice(0, 10) : '—',
        location: asset.location?.name || '—',
        company: asset.companyName || '—',
        user: activeAssignee ? `${activeAssignee.fullName || activeAssignee.name} (${activeAssignee.email})` : '—',
        cpu: specs.cpu || specs.processor || '—',
        ram: specs.ram || specs.memory || '—',
        storage: specs.storage || specs.disk || specs.ssd || '—',
        notes: asset.notes || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `SimplyIT_Assets_${dateStr}.xlsx`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Export assets error:', error);
    return NextResponse.json({ error: 'Failed to export assets' }, { status: 500 });
  }
}

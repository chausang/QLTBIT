import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isTemplate = searchParams.get('template') === 'true';
    const department = searchParams.get('department') || '';
    const warehouse = searchParams.get('warehouse') || '';
    const assetGroup = searchParams.get('assetGroup') || '';
    const search = searchParams.get('search')?.trim() || '';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Simply IT Asset Management';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bang_Kiem_Ke_TSCD', {
      views: [{ showGridLines: true }],
    });

    // Tiêu đề bảng
    const titleRow = sheet.addRow(['BẢNG KIỂM KÊ TÀI SẢN CỐ ĐỊNH CÁC KHOA PHÒNG']);
    titleRow.font = { name: 'Times New Roman', size: 14, bold: true };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.mergeCells('A1:AC1');
    sheet.addRow([]); // Dòng trống

    // Header Hàng 1 (Row 3): Tiêu đề chính và các nhóm gộp
    const row3 = sheet.addRow([
      'STT',
      'Tên tài sản cố định',
      'Mã số TSC',
      'Mã quản lý',
      'Nơi sử dụng',
      'Hãng SX',
      'Nước SX',
      'Năm đưa vào sử dụng',
      'Theo sổ kế toán', '', '',
      'Theo kiểm kê', '', '',
      'Chênh lệch', '', '',
      'Ghi chú',
      'Khoa, phòng',
      'Kho',
      'Nhóm',
      'Thành tiền sổ sách',
      'Thành tiền kiểm kê',
      'Tỷ lệ % khấu hao',
      'Ngày tính khấu hao',
      'Thời gian KH',
      'GHI CHÚ',
      'GHI CHÚ 1',
      'STT KK',
    ]);

    // Header Hàng 2 (Row 4): Chi tiết nhóm
    const row4 = sheet.addRow([
      '', '', '', '', '', '', '', '',
      'Số lượng', 'Nguyên giá', 'Giá trị còn lại',
      'Số lượng', 'Nguyên giá', 'Giá trị còn lại',
      'Số lượng', 'Nguyên giá', 'Giá trị còn lại',
      '', '', '', '', '', '', '', '', '', '', '', '',
    ]);

    // Header Hàng 3 (Row 5): Đánh số ký hiệu cột (theo mẫu ảnh dòng 30)
    const row5 = sheet.addRow([
      'A', 'B', 'C', 'MQL', 'D', 'SX1', 'SX2', 'NAM',
      '1', '2', '3',
      '4', '5', '6',
      '7', '8', '9',
      'E', 'KP', 'KHO', 'NHOM', 'TT1', 'TT2', '%KH', 'NGAY_KH', 'NAM_KH', 'GC', 'GC1', 'KK'
    ]);

    // Merge các ô theo chiều dọc cho các cột đơn
    sheet.mergeCells('A3:A4'); // STT
    sheet.mergeCells('B3:B4'); // Tên tài sản cố định
    sheet.mergeCells('C3:C4'); // Mã số TSC
    sheet.mergeCells('D3:D4'); // Mã quản lý
    sheet.mergeCells('E3:E4'); // Nơi sử dụng
    sheet.mergeCells('F3:F4'); // Hãng SX
    sheet.mergeCells('G3:G4'); // Nước SX
    sheet.mergeCells('H3:H4'); // Năm đưa vào sử dụng
    sheet.mergeCells('I3:K3'); // Theo sổ kế toán
    sheet.mergeCells('L3:N3'); // Theo kiểm kê
    sheet.mergeCells('O3:Q3'); // Chênh lệch
    sheet.mergeCells('R3:R4'); // Ghi chú
    sheet.mergeCells('S3:S4'); // Khoa, phòng
    sheet.mergeCells('T3:T4'); // Kho
    sheet.mergeCells('U3:U4'); // Nhóm
    sheet.mergeCells('V3:V4'); // Thành tiền sổ sách
    sheet.mergeCells('W3:W4'); // Thành tiền kiểm kê
    sheet.mergeCells('X3:X4'); // Tỷ lệ % khấu hao
    sheet.mergeCells('Y3:Y4'); // Ngày tính khấu hao
    sheet.mergeCells('Z3:Z4'); // Thời gian KH
    sheet.mergeCells('AA3:AA4'); // GHI CHÚ
    sheet.mergeCells('AB3:AB4'); // GHI CHÚ 1
    sheet.mergeCells('AC3:AC4'); // STT KK

    // Thiết lập style cho Header rows (3, 4, 5)
    [row3, row4, row5].forEach((row) => {
      row.font = { name: 'Times New Roman', size: 10, bold: true };
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row.height = 24;
    });

    // Tô màu nền cho header: Nền xám nhạt, các cột Hãng SX, Nước SX, Năm SD tô màu vàng
    for (let c = 1; c <= 29; c++) {
      const cell1 = sheet.getRow(3).getCell(c);
      const cell2 = sheet.getRow(4).getCell(c);
      const cell3 = sheet.getRow(5).getCell(c);

      const isYellowCol = c >= 6 && c <= 8; // F, G, H: Hãng SX, Nước SX, Năm đưa vào SD
      const fillColor = isYellowCol ? 'FFFF00' : 'F2F2F2';

      [cell1, cell2, cell3].forEach((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // Lấy dữ liệu
    let records: any[] = [];
    if (!isTemplate) {
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { fixedAssetCode: { contains: search, mode: 'insensitive' } },
          { managementCode: { contains: search, mode: 'insensitive' } },
          { noteUser: { contains: search, mode: 'insensitive' } },
          { usedLocation: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (department && department !== 'ALL') where.department = { equals: department, mode: 'insensitive' };
      if (warehouse && warehouse !== 'ALL') where.warehouse = { equals: warehouse, mode: 'insensitive' };
      if (assetGroup && assetGroup !== 'ALL') where.assetGroup = { equals: assetGroup, mode: 'insensitive' };

      records = await prisma.departmentFixedAsset.findMany({
        where,
        orderBy: [{ isGroupHeader: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      });
    }

    // Nếu tải template hoặc DB chưa có dữ liệu, thêm các dòng mẫu y như hình
    if (records.length === 0) {
      records = [
        {
          orderIndex: null,
          name: 'Tài sản thuộc CNTT quản lý',
          fixedAssetCode: '',
          managementCode: '',
          usedLocation: 'BGĐ',
          brand: '',
          originCountry: '',
          inUseDate: '',
          bookQuantity: 0,
          bookPrice: 0,
          bookRemainingValue: 0,
          actualQuantity: 0,
          actualPrice: 0,
          actualRemainingValue: 0,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: '',
          department: 'BGĐ',
          warehouse: 'CNTT',
          assetGroup: '',
          bookAmount: 0,
          actualAmount: 0,
          depreciationRate: 0,
          depreciationDate: '',
          depreciationPeriod: '0',
          notes: '',
          notes1: '',
          auditOrderIndex: null,
          isGroupHeader: true,
        },
        {
          orderIndex: 1,
          name: 'Máy Laptop HP ProBook 440-G5',
          fixedAssetCode: 'PCKH-HP-440',
          managementCode: 'MQL-00032',
          usedLocation: 'BGĐ',
          brand: 'HP',
          originCountry: 'Mỹ',
          inUseDate: '2015',
          bookQuantity: 1,
          bookPrice: 13150000,
          bookRemainingValue: 0,
          actualQuantity: 1,
          actualPrice: 13150000,
          actualRemainingValue: 0,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: 'Bs Hồng',
          department: 'BGĐ',
          warehouse: 'CNTT',
          assetGroup: 'Máy móc',
          bookAmount: 13150000,
          actualAmount: 13150000,
          depreciationRate: 14.29,
          depreciationDate: '',
          depreciationPeriod: '4',
          notes: '',
          notes1: '',
          auditOrderIndex: 2,
          isGroupHeader: false,
        },
        {
          orderIndex: 2,
          name: 'Máy Tính để bàn HP Pavilion TP01-3009d',
          fixedAssetCode: 'PCKH-HP-TP01',
          managementCode: 'MQL-00033',
          usedLocation: 'BGĐ',
          brand: 'HP',
          originCountry: 'Mỹ',
          inUseDate: '2022',
          bookQuantity: 1,
          bookPrice: 14586000,
          bookRemainingValue: 3750060,
          actualQuantity: 1,
          actualPrice: 14586000,
          actualRemainingValue: 3750060,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: 'Bs Hùng',
          department: 'BGĐ',
          warehouse: 'CNTT',
          assetGroup: 'Máy móc',
          bookAmount: 14586000,
          actualAmount: 14586000,
          depreciationRate: 14.29,
          depreciationDate: '',
          depreciationPeriod: '4',
          notes: '',
          notes1: '',
          auditOrderIndex: 3,
          isGroupHeader: false,
        },
        {
          orderIndex: 3,
          name: 'Máy hủy giấy Bingo C35',
          fixedAssetCode: 'TS-BINGO-C35',
          managementCode: 'MQL-00034',
          usedLocation: 'BGĐ',
          brand: 'Bingo',
          originCountry: 'Đức',
          inUseDate: '07/06/2024',
          bookQuantity: 1,
          bookPrice: 8131200,
          bookRemainingValue: 0,
          actualQuantity: 1,
          actualPrice: 8131200,
          actualRemainingValue: 0,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: 'BGĐ',
          department: 'BGĐ',
          warehouse: 'CNTT',
          assetGroup: 'Thiết bị',
          bookAmount: 8131200,
          actualAmount: 8131200,
          depreciationRate: 0,
          depreciationDate: '07/06/2024',
          depreciationPeriod: '5',
          notes: '',
          notes1: '',
          auditOrderIndex: 4,
          isGroupHeader: false,
        },
        {
          orderIndex: null,
          name: 'Tài sản thuộc HCQT quản lý',
          fixedAssetCode: '',
          managementCode: '',
          usedLocation: 'BGĐ',
          brand: '',
          originCountry: '',
          inUseDate: '',
          bookQuantity: 0,
          bookPrice: 0,
          bookRemainingValue: 0,
          actualQuantity: 0,
          actualPrice: 0,
          actualRemainingValue: 0,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: '',
          department: 'BGĐ',
          warehouse: 'HCQT',
          assetGroup: '',
          bookAmount: 0,
          actualAmount: 0,
          depreciationRate: 0,
          depreciationDate: '',
          depreciationPeriod: '0',
          notes: '',
          notes1: '',
          auditOrderIndex: null,
          isGroupHeader: true,
        },
        {
          orderIndex: 4,
          name: 'Bàn cụm FA2/1207 FC(A)',
          fixedAssetCode: 'TB-BAN-FA2',
          managementCode: 'MQL-00036',
          usedLocation: 'BGĐ',
          brand: 'Hòa Phát',
          originCountry: 'Việt Nam',
          inUseDate: '26/09/2025',
          bookQuantity: 1,
          bookPrice: 10283760,
          bookRemainingValue: 9255380,
          actualQuantity: 1,
          actualPrice: 10283760,
          actualRemainingValue: 9255380,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: 'P. GĐ',
          department: 'BGĐ',
          warehouse: 'HCQT',
          assetGroup: 'Máy móc',
          bookAmount: 10283760,
          actualAmount: 10283760,
          depreciationRate: 10,
          depreciationDate: '26/09/2025',
          depreciationPeriod: '5',
          notes: '',
          notes1: '',
          auditOrderIndex: 10,
          isGroupHeader: false,
        },
        {
          orderIndex: 5,
          name: 'Máy lạnh NAGAKAWA NIS - C18R2H10 2HP inverter (02)',
          fixedAssetCode: 'ML-NAGA-2HP',
          managementCode: 'MQL-00037',
          usedLocation: 'BGĐ',
          brand: 'Nagakawa',
          originCountry: 'Nhật Bản',
          inUseDate: '25/04/2024',
          bookQuantity: 1,
          bookPrice: 16489000,
          bookRemainingValue: 12366750,
          actualQuantity: 1,
          actualPrice: 16489000,
          actualRemainingValue: 12366750,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: 'Bs. Hiền (Thư viện cũ)',
          department: 'BGĐ',
          warehouse: 'HCQT',
          assetGroup: 'Máy móc',
          bookAmount: 16489000,
          actualAmount: 16489000,
          depreciationRate: 12.5,
          depreciationDate: '',
          depreciationPeriod: '10',
          notes: '',
          notes1: '',
          auditOrderIndex: 6,
          isGroupHeader: false,
        },
        {
          orderIndex: 6,
          name: 'Máy lạnh Sharp inverter 2,0 HP AH/AU X18ZEW SN: 31008318',
          fixedAssetCode: 'ML-SHARP-2HP',
          managementCode: 'MQL-00038',
          usedLocation: 'BGĐ',
          brand: 'Sharp',
          originCountry: 'Thái Lan',
          inUseDate: '2024',
          bookQuantity: 1,
          bookPrice: 20628000,
          bookRemainingValue: 15471000,
          actualQuantity: 1,
          actualPrice: 20628000,
          actualRemainingValue: 15471000,
          diffQuantity: 0,
          diffPrice: 0,
          diffRemainingValue: 0,
          noteUser: 'Giám đốc',
          department: 'BGĐ',
          warehouse: 'HCQT',
          assetGroup: 'Máy móc',
          bookAmount: 20628000,
          actualAmount: 20628000,
          depreciationRate: 12.5,
          depreciationDate: '',
          depreciationPeriod: '4',
          notes: '',
          notes1: '',
          auditOrderIndex: 7,
          isGroupHeader: false,
        },
      ];
    }

    // Điền các dòng dữ liệu vào sheet
    records.forEach((rec, idx) => {
      const dataRow = sheet.addRow([
        rec.isGroupHeader ? '' : (rec.orderIndex || idx + 1),
        rec.name || '',
        rec.fixedAssetCode || '',
        rec.managementCode || '',
        rec.usedLocation || '',
        rec.brand || '',
        rec.originCountry || '',
        rec.inUseDate || '',
        rec.isGroupHeader ? '' : (rec.bookQuantity || 0),
        rec.isGroupHeader ? '' : (rec.bookPrice || 0),
        rec.isGroupHeader ? '' : (rec.bookRemainingValue || 0),
        rec.isGroupHeader ? '' : (rec.actualQuantity || 0),
        rec.isGroupHeader ? '' : (rec.actualPrice || 0),
        rec.isGroupHeader ? '' : (rec.actualRemainingValue || 0),
        rec.isGroupHeader ? '' : (rec.diffQuantity || 0),
        rec.isGroupHeader ? '' : (rec.diffPrice || 0),
        rec.isGroupHeader ? '' : (rec.diffRemainingValue || 0),
        rec.noteUser || '',
        rec.department || '',
        rec.warehouse || '',
        rec.assetGroup || '',
        rec.isGroupHeader ? '' : (rec.bookAmount || 0),
        rec.isGroupHeader ? '' : (rec.actualAmount || 0),
        rec.isGroupHeader ? '' : (rec.depreciationRate || ''),
        rec.depreciationDate || '',
        rec.depreciationPeriod || '',
        rec.notes || '',
        rec.notes1 || '',
        rec.isGroupHeader ? '' : (rec.auditOrderIndex || ''),
      ]);

      dataRow.font = {
        name: 'Times New Roman',
        size: 10,
        bold: Boolean(rec.isGroupHeader),
      };

      if (rec.isGroupHeader) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E6F0FA' },
        };
      }

      // Border & Alignment cho từng cell
      for (let c = 1; c <= 29; c++) {
        const cell = dataRow.getCell(c);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Căn lề số cho các cột tiền / số lượng
        const isNumberCol = [9, 10, 11, 12, 13, 14, 15, 16, 17, 22, 23].includes(c);
        if (isNumberCol && !rec.isGroupHeader) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0.00';
        } else if ([1, 4, 24, 29].includes(c)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      }
    });

    // Căn chỉnh độ rộng các cột (Auto Column Widths)
    const colWidths = [
      6,   // STT
      35,  // Tên tài sản cố định
      16,  // Mã số TSC
      16,  // Mã quản lý
      12,  // Nơi sử dụng
      14,  // Hãng SX
      14,  // Nước SX
      18,  // Năm đưa vào sử dụng
      10,  // SL sổ
      16,  // Nguyên giá sổ
      16,  // Giá trị còn lại sổ
      10,  // SL KK
      16,  // Nguyên giá KK
      16,  // Giá trị còn lại KK
      10,  // SL Chênh lệch
      16,  // Nguyên giá Chênh lệch
      16,  // Còn lại Chênh lệch
      20,  // Ghi chú (người dùng)
      14,  // Khoa, phòng
      12,  // Kho
      14,  // Nhóm
      16,  // Thành tiền sổ
      16,  // Thành tiền KK
      14,  // Tỷ lệ % KH
      16,  // Ngày tính KH
      12,  // Năm KH
      16,  // GHI CHÚ
      16,  // GHI CHÚ 1
      10,  // STT KK
    ];

    colWidths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = isTemplate
      ? 'Mau_Kiem_Ke_Tai_San_Co_Dinh_Khoa_Phong.xlsx'
      : `Danh_Sach_TSCD_Khoa_Phong_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export department fixed assets error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xuất file Excel' }, { status: 500 });
  }
}

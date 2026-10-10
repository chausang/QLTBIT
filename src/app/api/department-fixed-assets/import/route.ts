import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'object' && val !== null) {
    if (typeof val.result === 'number') return isNaN(val.result) ? 0 : val.result;
    if (val.result !== undefined && val.result !== null) val = val.result;
    else if (val.text !== undefined && val.text !== null) val = val.text;
  }
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  // Nếu chứa cả dấu chấm và phẩy (vd: 1.500.000,50)
  if (str.includes('.') && str.includes(',')) {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  // Nếu chỉ chứa dấu phẩy (vd: 14,29 hoặc 1500,5)
  if (str.includes(',')) {
    const cleaned = str.replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  // Nếu có nhiều dấu chấm (vd: 1.500.000)
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount > 1) {
    const cleaned = str.replace(/\./g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  if (dotCount === 1) {
    const parts = str.split('.');
    if (parts[1].length === 3 && parts[0].length >= 1) {
      const cleaned = str.replace(/\./g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.text) return String(val.text).trim();
  if (typeof val === 'object' && val.result !== undefined) return String(val.result).trim();
  return String(val).trim();
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const autoGenManagementCode = formData.get('autoGenManagementCode') === 'true';
    const clearExisting = formData.get('clearExisting') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file Excel để nhập' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: 'File Excel không có dữ liệu' }, { status: 400 });
    }

    // Nếu chọn xóa dữ liệu cũ trước khi nạp
    if (clearExisting) {
      await prisma.departmentFixedAsset.deleteMany({});
    }

    // Tìm dòng bắt đầu chứa dữ liệu:
    // Dòng dữ liệu thường bắt đầu sau dòng chứa ký hiệu cột hoặc sau dòng header (thường từ dòng 4 trở đi)
    let startRowIndex = 4;
    for (let r = 1; r <= 15; r++) {
      const row = sheet.getRow(r);
      const valA = parseText(row.getCell(1).value);
      const valB = parseText(row.getCell(2).value);
      const valC = parseText(row.getCell(3).value);
      // Dòng ký hiệu cột: Cột B có chữ 'B' và Cột C có chữ 'C'
      if ((valB.toUpperCase() === 'B' && valC.toUpperCase() === 'C') || (valA.toUpperCase() === 'A' && valB.toUpperCase() === 'B')) {
        startRowIndex = r + 1;
        break;
      }
    }

    const recordsToCreate: any[] = [];
    const totalRows = sheet.rowCount;

    // Lấy STT hiện tại lớn nhất
    const maxOrder = await prisma.departmentFixedAsset.aggregate({
      _max: { orderIndex: true },
    });
    let currentOrder = clearExisting ? 0 : (maxOrder._max.orderIndex || 0);

    let emptyConsecutiveRows = 0;
    const nowTimestamp = Date.now().toString().slice(-6);
    let isCNTTSection = false;

    for (let r = startRowIndex; r <= totalRows; r++) {
      const row = sheet.getRow(r);
      // Cột B (cell 2): Tên tài sản cố định
      const name = parseText(row.getCell(2).value);

      // Nếu không có tên tài sản
      if (!name) {
        emptyConsecutiveRows++;
        // Nếu gặp 15 dòng liên tiếp trống, xem như đã kết thúc bảng dữ liệu
        if (emptyConsecutiveRows >= 15) {
          break;
        }
        continue;
      }

      // Reset lại bộ đếm dòng trống khi gặp dòng có dữ liệu
      emptyConsecutiveRows = 0;

      // Không import Cột 1 (Cột A) làm STT.
      // Các cột được map chuẩn xác 100% theo cấu trúc Hình 2:
      const fixedAssetCode = parseText(row.getCell(3).value); // Cột C (3): Mã số TSC
      const usedLocation = parseText(row.getCell(4).value);   // Cột D (4): Nơi sử dụng (BGĐ, v.v.)
      const brand = parseText(row.getCell(5).value);          // Cột E (5): Hãng SX
      const originCountry = parseText(row.getCell(6).value);  // Cột F (6): Nước SX
      const inUseDate = parseText(row.getCell(7).value);      // Cột G (7): Năm đưa vào sử dụng

      // Sổ sách (Cột H, I, J)
      const bookQuantity = parseNumber(row.getCell(8).value);
      const bookPrice = parseNumber(row.getCell(9).value);
      const bookRemainingValue = parseNumber(row.getCell(10).value);

      // Kiểm kê (Cột K, L, M)
      const actualQuantity = parseNumber(row.getCell(11).value);
      const actualPrice = parseNumber(row.getCell(12).value);
      const actualRemainingValue = parseNumber(row.getCell(13).value);

      // Chênh lệch (Cột N, O, P)
      let diffQuantity = parseNumber(row.getCell(14).value);
      let diffPrice = parseNumber(row.getCell(15).value);
      let diffRemainingValue = parseNumber(row.getCell(16).value);

      if (diffQuantity === 0 && (actualQuantity !== 0 || bookQuantity !== 0)) {
        diffQuantity = actualQuantity - bookQuantity;
      }
      if (diffPrice === 0 && (actualPrice !== 0 || bookPrice !== 0)) {
        diffPrice = actualPrice - bookPrice;
      }
      if (diffRemainingValue === 0 && (actualRemainingValue !== 0 || bookRemainingValue !== 0)) {
        diffRemainingValue = actualRemainingValue - bookRemainingValue;
      }

      const noteUser = parseText(row.getCell(17).value);       // Cột Q (17): Ghi chú (Người dùng: Bs Hồng, Bs Hưng, BGĐ...)
      const department = parseText(row.getCell(18).value);     // Cột R (18): Khoa, phòng (BGĐ...)
      let warehouse = parseText(row.getCell(19).value);        // Cột S (19): Kho (CNTT...)
      const assetGroup = parseText(row.getCell(20).value);     // Cột T (20): Nhóm (Máy móc, Thiết bị...)

      const bookAmount = parseNumber(row.getCell(21).value) || bookPrice;     // Cột U (21): Thành tiền sổ sách
      const actualAmount = parseNumber(row.getCell(22).value) || actualPrice; // Cột V (22): Thành tiền kiểm kê
      const depreciationRate = parseNumber(row.getCell(23).value);            // Cột W (23): Tỷ lệ % khấu hao
      const depreciationDate = parseText(row.getCell(24).value);              // Cột X (24): Ngày tính khấu hao
      const depreciationPeriod = parseText(row.getCell(25).value);            // Cột Y (25): Năm KH / Thời gian KH
      const notes = parseText(row.getCell(26).value);                         // Cột Z (26): GHI CHÚ
      const notes1 = parseText(row.getCell(27).value);                        // Cột AA (27): GHI CHÚ 1
      const auditOrderIndex = parseNumber(row.getCell(28).value);             // Cột AB (28): STT KS

      // Kiểm tra dòng tiêu đề phân nhóm (Ví dụ: "Tài sản thuộc CNTT quản lý", "Tài sản thuộc HCQT quản lý")
      const lowerName = name.toLowerCase();
      const isSectionHeader = lowerName.includes('tài sản thuộc') || (!fixedAssetCode && !bookPrice && !actualPrice && !usedLocation);

      if (isSectionHeader) {
        if (name.toUpperCase().includes('CNTT')) {
          isCNTTSection = true;
          // Thêm dòng tiêu đề nhóm CNTT vào danh sách
          recordsToCreate.push({
            orderIndex: 0,
            name,
            fixedAssetCode: null,
            managementCode: null,
            usedLocation: usedLocation || null,
            brand: null,
            originCountry: null,
            inUseDate: null,
            bookQuantity: 0,
            bookPrice: 0,
            bookRemainingValue: 0,
            actualQuantity: 0,
            actualPrice: 0,
            actualRemainingValue: 0,
            diffQuantity: 0,
            diffPrice: 0,
            diffRemainingValue: 0,
            noteUser: null,
            department: department || null,
            warehouse: 'CNTT',
            assetGroup: null,
            bookAmount: 0,
            actualAmount: 0,
            depreciationRate: null,
            depreciationDate: null,
            depreciationPeriod: null,
            notes: null,
            notes1: null,
            auditOrderIndex: null,
            isGroupHeader: true,
          });
        } else {
          // Bắt đầu nhóm của bộ phận khác (HCQT, TBYT, Dược...), kết thúc khối CNTT
          isCNTTSection = false;
        }
        continue;
      }

      // CHỈ IMPORT TÀI SẢN THUỘC CNTT QUẢN LÝ
      const isWarehouseCNTT = warehouse.toUpperCase().includes('CNTT');
      const isDeptCNTT = department.toUpperCase().includes('CNTT');
      const belongsToCNTT = isWarehouseCNTT || isDeptCNTT || (isCNTTSection && (!warehouse || isWarehouseCNTT));

      if (!belongsToCNTT) {
        // Bỏ qua tài sản thuộc HCQT, TBYT hoặc các khoa phòng khác
        continue;
      }

      if (!warehouse) {
        warehouse = 'CNTT';
      }

      // Tự sinh STT tăng dần cho từng tài sản (KHÔNG dùng cột 1 STT từ Excel)
      currentOrder++;

      // Sinh mã quản lý nếu người dùng có tùy chọn
      let managementCode: string | null = null;
      if (autoGenManagementCode) {
        managementCode = `MQL-${nowTimestamp}${String(currentOrder).padStart(4, '0')}`;
      }

      recordsToCreate.push({
        orderIndex: currentOrder,
        name,
        fixedAssetCode: fixedAssetCode || null,
        managementCode,
        usedLocation: usedLocation || null,
        brand: brand || null,
        originCountry: originCountry || null,
        inUseDate: inUseDate || null,
        bookQuantity,
        bookPrice,
        bookRemainingValue,
        actualQuantity,
        actualPrice,
        actualRemainingValue,
        diffQuantity,
        diffPrice,
        diffRemainingValue,
        noteUser: noteUser || null,
        department: department || null,
        warehouse,
        assetGroup: assetGroup || null,
        bookAmount,
        actualAmount,
        depreciationRate: depreciationRate || null,
        depreciationDate: depreciationDate || null,
        depreciationPeriod: depreciationPeriod || null,
        notes: notes || null,
        notes1: notes1 || null,
        auditOrderIndex: auditOrderIndex ? Math.round(auditOrderIndex) : null,
        isGroupHeader: false,
      });
    }

    if (recordsToCreate.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dòng dữ liệu tài sản nào trong file' }, { status: 400 });
    }

    // Lưu vào cơ sở dữ liệu cực nhanh theo lô (batch insert 200 bản ghi/lần)
    const BATCH_SIZE = 200;
    for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
      const chunk = recordsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.departmentFixedAsset.createMany({
        data: chunk,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Nhập thành công ${recordsToCreate.length} dòng tài sản cố định từ file Excel`,
      count: recordsToCreate.length,
    });
  } catch (error: any) {
    console.error('Import department fixed assets error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi nhập dữ liệu từ file Excel' }, { status: 500 });
  }
}

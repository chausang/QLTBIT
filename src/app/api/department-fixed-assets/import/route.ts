import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/\./g, '').replace(/,/g, '.');
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
      // Nếu dòng chứa chữ 'A' và 'B' (dòng ký hiệu cột), thì dòng tiếp theo là dữ liệu
      if (valA.toUpperCase() === 'A' && valB.toUpperCase() === 'B') {
        startRowIndex = r + 1;
        break;
      }
      // Hoặc nếu dòng có STT = '1' hoặc số 1
      if (valA === '1' && valB.length > 2) {
        startRowIndex = r;
        break;
      }
    }

    const recordsToCreate: any[] = [];
    const totalRows = sheet.rowCount;

    // Lấy STT hiện tại lớn nhất
    const maxOrder = await prisma.departmentFixedAsset.aggregate({
      _max: { orderIndex: true },
    });
    let currentOrder = maxOrder._max.orderIndex || 0;

    for (let r = startRowIndex; r <= totalRows; r++) {
      const row = sheet.getRow(r);
      const name = parseText(row.getCell(2).value);

      // Nếu cả dòng trống tên, bỏ qua
      if (!name) continue;

      const orderIndexRaw = row.getCell(1).value;
      const fixedAssetCode = parseText(row.getCell(3).value);
      let managementCode = parseText(row.getCell(4).value);
      const usedLocation = parseText(row.getCell(5).value);
      const brand = parseText(row.getCell(6).value);
      const originCountry = parseText(row.getCell(7).value);
      const inUseDate = parseText(row.getCell(8).value);

      // Sổ sách
      const bookQuantity = parseNumber(row.getCell(9).value);
      const bookPrice = parseNumber(row.getCell(10).value);
      const bookRemainingValue = parseNumber(row.getCell(11).value);

      // Kiểm kê
      const actualQuantity = parseNumber(row.getCell(12).value);
      const actualPrice = parseNumber(row.getCell(13).value);
      const actualRemainingValue = parseNumber(row.getCell(14).value);

      // Chênh lệch (tự động tính nếu trong file trống)
      let diffQuantity = parseNumber(row.getCell(15).value);
      let diffPrice = parseNumber(row.getCell(16).value);
      let diffRemainingValue = parseNumber(row.getCell(17).value);

      if (diffQuantity === 0 && (actualQuantity !== 0 || bookQuantity !== 0)) {
        diffQuantity = actualQuantity - bookQuantity;
      }
      if (diffPrice === 0 && (actualPrice !== 0 || bookPrice !== 0)) {
        diffPrice = actualPrice - bookPrice;
      }
      if (diffRemainingValue === 0 && (actualRemainingValue !== 0 || bookRemainingValue !== 0)) {
        diffRemainingValue = actualRemainingValue - bookRemainingValue;
      }

      const noteUser = parseText(row.getCell(18).value);
      const department = parseText(row.getCell(19).value);
      const warehouse = parseText(row.getCell(20).value);
      const assetGroup = parseText(row.getCell(21).value);

      const bookAmount = parseNumber(row.getCell(22).value) || bookPrice;
      const actualAmount = parseNumber(row.getCell(23).value) || actualPrice;
      const depreciationRate = parseNumber(row.getCell(24).value);
      const depreciationDate = parseText(row.getCell(25).value);
      const depreciationPeriod = parseText(row.getCell(26).value);
      const notes = parseText(row.getCell(27).value);
      const notes1 = parseText(row.getCell(28).value);
      const auditOrderIndex = parseNumber(row.getCell(29).value);

      // Nhận diện dòng header nhóm (ví dụ: "Tài sản thuộc CNTT quản lý")
      const isHeader = (!orderIndexRaw && !bookPrice && !actualPrice) || name.toLowerCase().includes('tài sản thuộc');

      // Tự sinh mã quản lý nếu để trống và có tùy chọn
      if (!isHeader && !managementCode && autoGenManagementCode) {
        managementCode = `MQL-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      }

      if (!isHeader) {
        currentOrder++;
      }

      recordsToCreate.push({
        orderIndex: isHeader ? null : currentOrder,
        name,
        fixedAssetCode: fixedAssetCode || null,
        managementCode: managementCode || null,
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
        warehouse: warehouse || null,
        assetGroup: assetGroup || null,
        bookAmount,
        actualAmount,
        depreciationRate: depreciationRate || null,
        depreciationDate: depreciationDate || null,
        depreciationPeriod: depreciationPeriod || null,
        notes: notes || null,
        notes1: notes1 || null,
        auditOrderIndex: auditOrderIndex ? Math.round(auditOrderIndex) : null,
        isGroupHeader: isHeader,
      });
    }

    if (recordsToCreate.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dòng dữ liệu tài sản nào trong file' }, { status: 400 });
    }

    // Lưu vào cơ sở dữ liệu
    for (const rec of recordsToCreate) {
      await prisma.departmentFixedAsset.create({ data: rec });
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

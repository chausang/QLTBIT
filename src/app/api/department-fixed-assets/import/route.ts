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

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Hàm nhận diện thiết bị công nghệ thông tin (CNTT / IT Assets)
 * Bao gồm: máy tính, laptop, máy in, mạng, máy chủ, camera, tivi, smart phone, linh kiện, bản quyền...
 */
function isITAssetItem(params: {
  name: string;
  warehouse?: string | null;
  department?: string | null;
  usedLocation?: string | null;
  assetGroup?: string | null;
  notes?: string | null;
  notes1?: string | null;
  isCNTTSection?: boolean;
}): boolean {
  const { name, warehouse, department, usedLocation, assetGroup, notes, notes1, isCNTTSection } = params;

  // 1. Nếu nằm trong block được đánh dấu CNTT từ file Excel
  if (isCNTTSection) return true;

  // 2. Nếu Kho hoặc Khoa phòng là CNTT / IT / Tin học
  const deptWarehouseCombined = `${warehouse || ''} ${department || ''} ${usedLocation || ''}`.toUpperCase();
  if (
    deptWarehouseCombined.includes('CNTT') ||
    deptWarehouseCombined.includes('TIN HỌC') ||
    deptWarehouseCombined.includes('VIỄN THÔNG') ||
    deptWarehouseCombined.includes('CÔNG NGHỆ THÔNG TIN') ||
    /\bIT\b/.test(deptWarehouseCombined)
  ) {
    return true;
  }

  // 3. Nếu Nhóm tài sản (assetGroup) chỉ định CNTT / Tin học / Thiết bị văn phòng điện tử
  if (assetGroup) {
    const groupUpper = assetGroup.toUpperCase();
    if (
      groupUpper.includes('CNTT') ||
      groupUpper.includes('TIN HỌC') ||
      groupUpper.includes('VIỄN THÔNG') ||
      groupUpper.includes('CÔNG NGHỆ THÔNG TIN') ||
      /\bIT\b/.test(groupUpper)
    ) {
      return true;
    }
  }

  // 4. Nhận diện thông minh qua TÊN TÀI SẢN (name) và Ghi chú (notes, notes1)
  const rawText = `${name} ${notes || ''} ${notes1 || ''}`.toLowerCase();
  const normalizedText = removeVietnameseTones(rawText);

  // Danh sách từ khóa IT (Tiếng Việt không dấu và Tiếng Anh)
  const itKeywords: (string | RegExp)[] = [
    // Tivi & Màn hình hiển thị
    'tivi',
    'ti vi',
    /\btv\b/i,
    'smart tv',
    'smart tivi',
    'qled',
    'oled',
    'man hinh',
    'monitor',
    'display',
    'lcd',
    'man vi tinh',
    'bang tuong tac',
    'smart board',
    'smartboard',

    // Điện thoại, Smart phone, Thiết bị di động & liên lạc
    'smartphone',
    'smart phone',
    'dien thoai',
    'telephone',
    'ip phone',
    'ipphone',
    'voip',
    'tong dai',
    'bo dam',
    'may tinh bang',
    'tablet',
    'ipad',
    'galaxy tab',

    // Máy tính, Máy vi tính, Laptop, Workstation, All-in-one
    'may tinh',
    'may vi tinh',
    'laptop',
    'notebook',
    'macbook',
    'imac',
    'desktop',
    /\bpc\b/i,
    'workstation',
    'all in one',
    'all-in-one',
    /\baio\b/i,
    'may bo',
    'case may',
    'thung may',

    // Máy in, Máy scan, Máy đọc mã vạch, Photocopy
    'may in',
    'printer',
    'laserjet',
    'inkjet',
    'may photo',
    'photocopy',
    'photocopier',
    'may scan',
    'scanner',
    'may quet',
    'ma vach',
    'barcode',
    'dau doc ma vach',
    'may doc the',
    'dau doc the',

    // Máy chiếu & Thiết bị trình chiếu
    'may chieu',
    'projector',
    'man chieu',
    'but trinh chieu',

    // Máy chủ, Lưu trữ, Tủ Rack & Bộ lưu điện UPS
    'may chu',
    'server',
    'blade server',
    'rack server',
    /\bnas\b/i,
    /\bsan\b/i,
    /\bups\b/i,
    'bo luu dien',
    'luu dien',
    'santak',
    /\bapc\b/i,
    'eaton',
    'cyberpower',
    'tu mang',
    'tu rack',
    /\brack\b/i,
    'patch panel',

    // Thiết bị mạng & Viễn thông
    'switch',
    'router',
    'modem',
    'wifi',
    'wi-fi',
    'access point',
    'accesspoint',
    'firewall',
    'tuong lua',
    'can bang tai',
    'bo chia mang',
    'hub mang',
    'card mang',
    'day mang',
    'cap mang',
    'chuyen mach',
    'converter quang',
    'quang dien',
    'module quang',
    /\bsfp\b/i,
    'cisco',
    'mikrotik',
    'draytek',
    'ruijie',
    'tp-link',
    'tplink',
    'linksys',
    'ubiquiti',
    'unifi',
    'fortinet',
    'juniper',

    // Camera giám sát & Thiết bị ghi hình
    'camera',
    'webcam',
    'cctv',
    'dau ghi',
    'dau thu hinh',
    /\bdvr\b/i,
    /\bnvr\b/i,

    // Máy chấm công & Kiểm soát cửa
    'cham cong',
    'may cham cong',
    'nhan dien khuon mat',
    'kiem soat ra vao',
    'van tay',
    'khoa tu',

    // Linh kiện & Phụ kiện máy tính
    'ban phim',
    'keyboard',
    'chuot quang',
    'chuot may tinh',
    'chuot khong day',
    'chuot vi tinh',
    /\bmouse\b/i,
    'o cung',
    /\bhdd\b/i,
    /\bssd\b/i,
    /\bram\b/i,
    /\bcpu\b/i,
    'mainboard',
    'bo mach chu',
    'card man hinh',
    'card vga',
    /\bvga\b/i,
    'nguon may tinh',
    /\busb\b/i,
    'the nho',
    'flash drive',
    'tai nghe',
    'headphone',
    'headset',
    'loa vi tinh',
    'loa may tinh',
    'soundbar',
    'micro hop',
    'microphone',

    // Phần mềm & Bản quyền
    'phan mem',
    'software',
    'license',
    'ban quyen',
    'he dieu hanh',
    'windows',
    'office 365',
    'antivirus',
    'diet virus',
  ];

  for (const kw of itKeywords) {
    if (typeof kw === 'string') {
      if (normalizedText.includes(kw)) {
        return true;
      }
    } else if (kw instanceof RegExp) {
      if (kw.test(normalizedText)) {
        return true;
      }
    }
  }

  return false;
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
    const importMode = (formData.get('importMode') as string) || (formData.get('itOnly') === 'false' ? 'ALL' : 'IT_ONLY');
    const isItOnly = importMode === 'IT_ONLY';

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

    // Tìm dòng bắt đầu chứa dữ liệu và kiểm tra cấu trúc cột
    // Dòng dữ liệu thường bắt đầu sau dòng chứa ký hiệu cột hoặc sau dòng header (thường từ dòng 4 trở đi)
    let startRowIndex = 4;
    let hasMqlColumn = false;

    for (let r = 1; r <= 15; r++) {
      const row = sheet.getRow(r);
      const valA = parseText(row.getCell(1).value).toUpperCase();
      const valB = parseText(row.getCell(2).value).toUpperCase();
      const valC = parseText(row.getCell(3).value).toUpperCase();

      // Kiểm tra file mẫu xuất ra có cột 'Mã quản lý' / 'MQL' ở cột 2
      if (valB === 'MQL' || valB.includes('MÃ QUẢN LÝ') || valB.includes('MA QUAN LY')) {
        hasMqlColumn = true;
      }

      // Dòng ký hiệu cột: Cột B có chữ 'B' hoặc Cột C có chữ 'B' (nếu có cột MQL)
      if (
        (valB === 'B' && valC === 'C') ||
        (valA === 'A' && valB === 'B') ||
        (valB === 'MQL' && valC === 'B')
      ) {
        startRowIndex = r + 1;
        break;
      }
    }

    // Nếu dòng 3 hoặc 4 có ghi 'Mã quản lý' ở cell 2
    if (!hasMqlColumn) {
      for (let r = 1; r <= Math.min(startRowIndex, 10); r++) {
        const textCell2 = parseText(sheet.getRow(r).getCell(2).value).toUpperCase();
        if (textCell2.includes('MÃ QUẢN LÝ') || textCell2.includes('MA QUAN LY') || textCell2 === 'MQL') {
          hasMqlColumn = true;
          break;
        }
      }
    }

    const colOffset = hasMqlColumn ? 1 : 0;
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
    let currentSectionDept = '';

    for (let r = startRowIndex; r <= totalRows; r++) {
      const row = sheet.getRow(r);
      // Cột Tên tài sản cố định: cell 2 (nếu không có cột MQL) hoặc cell 3 (nếu có cột MQL)
      const name = parseText(row.getCell(2 + colOffset).value);

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

      // Các trường theo cấu trúc biểu mẫu:
      const excelManagementCode = hasMqlColumn ? parseText(row.getCell(2).value) : '';
      const fixedAssetCode = parseText(row.getCell(3 + colOffset).value); // Mã số TSC
      const usedLocation = parseText(row.getCell(4 + colOffset).value);   // Nơi sử dụng
      const brand = parseText(row.getCell(5 + colOffset).value);          // Hãng SX
      const originCountry = parseText(row.getCell(6 + colOffset).value);  // Nước SX
      const inUseDate = parseText(row.getCell(7 + colOffset).value);      // Năm đưa vào sử dụng

      // Sổ sách
      const bookQuantity = parseNumber(row.getCell(8 + colOffset).value);
      const bookPrice = parseNumber(row.getCell(9 + colOffset).value);
      const bookRemainingValue = parseNumber(row.getCell(10 + colOffset).value);

      // Kiểm kê
      const actualQuantity = parseNumber(row.getCell(11 + colOffset).value);
      const actualPrice = parseNumber(row.getCell(12 + colOffset).value);
      const actualRemainingValue = parseNumber(row.getCell(13 + colOffset).value);

      // Chênh lệch
      let diffQuantity = parseNumber(row.getCell(14 + colOffset).value);
      let diffPrice = parseNumber(row.getCell(15 + colOffset).value);
      let diffRemainingValue = parseNumber(row.getCell(16 + colOffset).value);

      if (diffQuantity === 0 && (actualQuantity !== 0 || bookQuantity !== 0)) {
        diffQuantity = actualQuantity - bookQuantity;
      }
      if (diffPrice === 0 && (actualPrice !== 0 || bookPrice !== 0)) {
        diffPrice = actualPrice - bookPrice;
      }
      if (diffRemainingValue === 0 && (actualRemainingValue !== 0 || bookRemainingValue !== 0)) {
        diffRemainingValue = actualRemainingValue - bookRemainingValue;
      }

      const noteUser = parseText(row.getCell(17 + colOffset).value);       // Ghi chú (Người dùng)
      let department = parseText(row.getCell(18 + colOffset).value);       // Khoa, phòng
      let warehouse = parseText(row.getCell(19 + colOffset).value);        // Kho
      const assetGroup = parseText(row.getCell(20 + colOffset).value);     // Nhóm

      const bookAmount = parseNumber(row.getCell(21 + colOffset).value) || bookPrice;     // Thành tiền sổ sách
      const actualAmount = parseNumber(row.getCell(22 + colOffset).value) || actualPrice; // Thành tiền kiểm kê
      const depreciationRate = parseNumber(row.getCell(23 + colOffset).value);            // Tỷ lệ % khấu hao
      const depreciationDate = parseText(row.getCell(24 + colOffset).value);              // Ngày tính khấu hao
      const depreciationPeriod = parseText(row.getCell(25 + colOffset).value);            // Năm KH / Thời gian KH
      const notes = parseText(row.getCell(26 + colOffset).value);                         // GHI CHÚ
      const notes1 = parseText(row.getCell(27 + colOffset).value);                        // GHI CHÚ 1
      const auditOrderIndex = parseNumber(row.getCell(28 + colOffset).value);             // STT KS

      // 1. Kiểm tra dòng tiêu đề phân nhóm (Ví dụ: "Tài sản thuộc CNTT quản lý", "Tài sản thuộc HCQT quản lý")
      // CÁC DÒNG NÀY CHỈ ĐỂ ĐÁNH DẤU TÀI SẢN TRONG FILE EXCEL, TUYỆT ĐỐI KHÔNG IMPORT VÀO DATABASE!
      const lowerName = name.toLowerCase();
      const isMarkingSection = lowerName.includes('tài sản thuộc') || lowerName.includes('tài sản do');

      if (isMarkingSection) {
        if (name.toUpperCase().includes('CNTT') || warehouse.toUpperCase().includes('CNTT')) {
          isCNTTSection = true;
          // Ghi nhận khoa phòng nếu có ghi ở dòng đánh dấu
          if (department) {
            currentSectionDept = department;
          } else if (usedLocation) {
            currentSectionDept = usedLocation;
          }
        } else {
          // Bắt đầu nhóm của bộ phận khác (HCQT, TBYT, Dược...), kết thúc khối CNTT
          isCNTTSection = false;
        }
        // Dòng này chỉ để đánh dấu, không import vào
        continue;
      }

      // 2. YÊU CẦU: Các dòng chỉ có trường tên, không có số lượng thì KHÔNG IMPORT VÀO
      const hasValidQuantity = (bookQuantity !== null && bookQuantity > 0) || (actualQuantity !== null && actualQuantity > 0);
      if (!hasValidQuantity) {
        // Bỏ qua hoàn toàn dòng không có số lượng
        continue;
      }

      // 3. Bỏ qua các dòng tổng kết (Cộng, Tổng cộng...)
      if (lowerName.startsWith('cộng') || lowerName.startsWith('tổng cộng') || lowerName === 'tổng') {
        continue;
      }

      // 4. KIỂM TRA PHẠM VI NHẬP (IMPORT MODE: IT_ONLY vs ALL)
      const isIT = isITAssetItem({
        name,
        warehouse,
        department,
        usedLocation,
        assetGroup,
        notes,
        notes1,
        isCNTTSection,
      });

      if (isItOnly && !isIT) {
        // Bỏ qua tài sản không thuộc CNTT khi người dùng chọn "Chỉ nhập tài sản CNTT"
        continue;
      }

      // Nếu là thiết bị CNTT mà cột Kho đang trống, tự động gán vào kho CNTT
      if (isIT && !warehouse) {
        warehouse = 'CNTT';
      }

      // Nếu dòng tài sản chưa có thông tin khoa phòng, kế thừa từ dòng đánh dấu trước đó
      if (!department && currentSectionDept) {
        department = currentSectionDept;
      }

      // Tự sinh STT tăng dần cho từng tài sản (KHÔNG dùng cột 1 STT từ Excel)
      currentOrder++;

      // Giữ mã quản lý nếu Excel đã có hoặc sinh mới nếu người dùng bật tùy chọn
      let managementCode: string | null = excelManagementCode || null;
      if (!managementCode && autoGenManagementCode) {
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
        isGroupHeader: false,
      });
    }

    if (recordsToCreate.length === 0) {
      const modeHint = isItOnly
        ? 'Không tìm thấy tài sản CNTT nào trong file (hãy kiểm tra lại file hoặc chọn tùy chọn "Nhập tất cả từ file").'
        : 'Không tìm thấy dòng dữ liệu tài sản hợp lệ nào trong file Excel.';
      return NextResponse.json({ error: modeHint }, { status: 400 });
    }

    // Lưu vào cơ sở dữ liệu cực nhanh theo lô (batch insert 200 bản ghi/lần)
    const BATCH_SIZE = 200;
    for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
      const chunk = recordsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.departmentFixedAsset.createMany({
        data: chunk,
      });
    }

    const successMessage = isItOnly
      ? `Nhập thành công ${recordsToCreate.length} tài sản CNTT từ file Excel`
      : `Nhập thành công tất cả ${recordsToCreate.length} tài sản cố định từ file Excel`;

    return NextResponse.json({
      success: true,
      message: successMessage,
      count: recordsToCreate.length,
      mode: importMode,
    });
  } catch (error: any) {
    console.error('Import department fixed assets error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi nhập dữ liệu từ file Excel' }, { status: 500 });
  }
}


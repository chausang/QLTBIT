import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { ImportType, ImportBatchStatus, ImportRecordStatus, AssetStatus, AssetCondition, LicenseType, LicenseStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';
import { normalizeEmail, normalizeCompanyName, normalizeAssetTag } from '@/lib/normalize';

// ==================== INTERFACES ====================

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface ImportFailedRowItem {
  rowNumber: number;
  assetTag?: string;
  name?: string;
  serialNumber?: string;
  categoryName?: string;
  locationName?: string;
  hardwareSpecs?: string;
  reason: string;
}

export interface ImportResultSummary {
  batchId: string;
  fileName: string;
  importType: ImportType;
  totalRows: number;
  successRows: number;
  failedRows: number;
  duplicateRows?: number;
  errors: RowValidationError[];
  failedItems?: ImportFailedRowItem[];
  errorReportBase64?: string;
  status: ImportBatchStatus;
}

export interface AssetRowData {
  assetTag: string;
  name: string;
  fixedAssetName?: string;
  categoryName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status?: string;
  condition?: string;
  purchaseDate?: Date | string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  warrantyExpiry?: Date | string;
  vendorName?: string;
  locationName?: string;
  companyName?: string;
  userEmail?: string;
  notes?: string;
  // Các trường cấu hình chi tiết & thiết bị khoa phòng
  cpu?: string;
  ram?: string;
  storage?: string;
  monitorBrand?: string;
  monitorYear?: string;
  monitorModel?: string;
  monitorSerial?: string;
  manufacturingYear?: string;
  oldAssetCode?: string;
  reissueStatus?: string;
}

export interface LicenseRowData {
  name: string;
  licenseKey?: string;
  licenseType?: string;
  totalSeats?: number;
  purchaseDate?: Date | string;
  expiryDate?: Date | string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  vendorName?: string;
  companyName?: string;
  userEmail?: string;
  notes?: string;
}

// ==================== TEMPLATE GENERATORS ====================

export async function generateAssetTemplate(lang: string = 'vi'): Promise<Buffer> {
  const isEn = lang === 'en';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Simply IT';

  // ==================== SHEET 1: MẪU TIÊU CHUẨN ====================
  const worksheet = workbook.addWorksheet(isEn ? 'Standard Asset Template' : 'Mẫu Tài Sản Tiêu Chuẩn');

  // Define columns
  worksheet.columns = isEn
    ? [
        { header: 'Asset Tag (*)', key: 'assetTag', width: 18 },
        { header: 'Device Name (*)', key: 'name', width: 28 },
        { header: 'Category (*)', key: 'categoryName', width: 20 },
        { header: 'Brand', key: 'brand', width: 16 },
        { header: 'Model', key: 'model', width: 18 },
        { header: 'Serial Number', key: 'serialNumber', width: 20 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Condition', key: 'condition', width: 16 },
        { header: 'Purchase Date (YYYY-MM-DD)', key: 'purchaseDate', width: 25 },
        { header: 'Purchase Price (VND)', key: 'purchasePrice', width: 20 },
        { header: 'Warranty Expiry (YYYY-MM-DD)', key: 'warrantyExpiry', width: 26 },
        { header: 'Vendor', key: 'vendorName', width: 24 },
        { header: 'Location', key: 'locationName', width: 20 },
        { header: 'Company', key: 'companyName', width: 28 },
        { header: 'Assigned User (Email)', key: 'userEmail', width: 28 },
        { header: 'CPU', key: 'cpu', width: 18 },
        { header: 'RAM', key: 'ram', width: 14 },
        { header: 'Storage / SSD', key: 'storage', width: 18 },
        { header: 'Notes', key: 'notes', width: 30 },
      ]
    : [
        { header: 'Mã tài sản (*)', key: 'assetTag', width: 18 },
        { header: 'Tên thiết bị (*)', key: 'name', width: 28 },
        { header: 'Danh mục (*)', key: 'categoryName', width: 20 },
        { header: 'Thương hiệu', key: 'brand', width: 16 },
        { header: 'Model', key: 'model', width: 18 },
        { header: 'Số Serial', key: 'serialNumber', width: 20 },
        { header: 'Trạng thái', key: 'status', width: 18 },
        { header: 'Tình trạng', key: 'condition', width: 16 },
        { header: 'Ngày mua (YYYY-MM-DD)', key: 'purchaseDate', width: 22 },
        { header: 'Giá mua (VND)', key: 'purchasePrice', width: 18 },
        { header: 'Hạn bảo hành (YYYY-MM-DD)', key: 'warrantyExpiry', width: 25 },
        { header: 'Nhà cung cấp', key: 'vendorName', width: 24 },
        { header: 'Vị trí đặt', key: 'locationName', width: 20 },
        { header: 'Công Ty Quản Lý', key: 'companyName', width: 28 },
        { header: 'Người sử dụng (Email)', key: 'userEmail', width: 28 },
        { header: 'CPU', key: 'cpu', width: 18 },
        { header: 'RAM', key: 'ram', width: 14 },
        { header: 'Ổ cứng / SSD', key: 'storage', width: 18 },
        { header: 'Ghi chú', key: 'notes', width: 30 },
      ];

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Blue 800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Sample data row
  worksheet.addRow({
    assetTag: 'AST-0001',
    name: 'PC Desktop Dell OptiPlex 7090',
    categoryName: isEn ? 'Desktop' : 'PC / Máy tính để bàn',
    brand: 'Dell',
    model: 'OptiPlex 7090',
    serialNumber: 'SN-DELL-7090-01',
    status: 'IN_USE',
    condition: 'GOOD',
    purchaseDate: '2024-01-15',
    purchasePrice: 18500000,
    warrantyExpiry: '2027-01-15',
    vendorName: isEn ? 'Dell Official Store' : 'Phong Vũ',
    locationName: isEn ? 'Emergency Dept' : 'Khoa Cấp Cứu',
    companyName: isEn ? 'Hospital Branch 1' : 'Bệnh Viện Đa Khoa',
    userEmail: 'it.admin@company.com',
    cpu: 'Intel Core i5-11500',
    ram: '16GB DDR4',
    storage: 'SSD 512GB NVMe',
    notes: isEn ? 'Office computer' : 'Máy tính bàn khoa cấp cứu',
  });

  worksheet.addRow({
    assetTag: 'AST-0002',
    name: 'Laptop Dell Latitude 5540',
    categoryName: isEn ? 'Laptop' : 'Laptop / Máy tính xách tay',
    brand: 'Dell',
    model: 'Latitude 5540',
    serialNumber: 'SN-DELL-5540-02',
    status: 'AVAILABLE',
    condition: 'NEW',
    purchaseDate: '2024-02-10',
    purchasePrice: 24500000,
    warrantyExpiry: '2027-02-10',
    vendorName: isEn ? 'Authorized Dealer' : 'An Phát',
    locationName: isEn ? 'IT Warehouse' : 'Kho IT',
    companyName: isEn ? 'Hospital Branch 1' : 'Bệnh Viện Đa Khoa',
    userEmail: '',
    cpu: 'Intel Core i7-1365U',
    ram: '32GB DDR5',
    storage: 'SSD 1TB NVMe',
    notes: isEn ? 'Backup laptop' : 'Laptop dự phòng sự cố',
  });

  // ==================== SHEET 2: MẪU KHOA PHÒNG (21 CỘT) ====================
  const hospitalSheet = workbook.addWorksheet(isEn ? 'Hospital Dept Template (21 Cols)' : 'Mẫu Khoa Phòng (21 Cột)');

  // Hàng 1: Header chính (đa tầng)
  const hRow1 = hospitalSheet.getRow(1);
  hRow1.height = 26;
  hRow1.values = [
    'STT', 'QR', 'Tên khoa phòng', 'Tên loại thiết bị', 'Mã thiết bị', 'Tên thiết bị',
    'Tên hãng sản xuất', 'Năm sản xuất', 'Model', 'Số seri', 'CPU', 'RAM', 'HDD',
    'Màn hình', '', '', '', // 4 cột cho Màn hình
    'Tình trạng', 'Mã thiết bị cũ', 'Tính cấp lại', 'Ghi chú'
  ];

  // Merge cụm Màn hình ở hàng 1 (N1:Q1 - cột 14 đến 17)
  hospitalSheet.mergeCells('N1:Q1');

  // Hàng 2: Sub-header
  const hRow2 = hospitalSheet.getRow(2);
  hRow2.height = 24;
  hRow2.values = [
    '', '', '', '', '', '',
    '', '', '', '', '', '', '',
    'Hãng sx', 'Năm sx', 'Model', 'Số seri',
    '', '', '', ''
  ];

  // Merge các cột đơn lẻ giữa hàng 1 và hàng 2 (A1:A2, B1:B2, ...)
  const singleCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'R', 'S', 'T', 'U'];
  singleCols.forEach((col) => {
    hospitalSheet.mergeCells(`${col}1:${col}2`);
  });

  // Style header 2 hàng
  [1, 2].forEach((rNum) => {
    const row = hospitalSheet.getRow(rNum);
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' }, // Teal 600
      };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF99F6E4' } },
        bottom: { style: 'thin', color: { argb: 'FF99F6E4' } },
        left: { style: 'thin', color: { argb: 'FF99F6E4' } },
        right: { style: 'thin', color: { argb: 'FF99F6E4' } },
      };
    });
  });

  // Độ rộng cột Sheet Khoa Phòng
  hospitalSheet.columns = [
    { width: 6 },  // STT
    { width: 8 },  // QR
    { width: 22 }, // Tên khoa phòng
    { width: 20 }, // Tên loại thiết bị
    { width: 16 }, // Mã thiết bị
    { width: 20 }, // Tên thiết bị (Định danh)
    { width: 16 }, // Tên hãng sản xuất
    { width: 12 }, // Năm sản xuất
    { width: 16 }, // Model
    { width: 18 }, // Số seri
    { width: 16 }, // CPU
    { width: 12 }, // RAM
    { width: 16 }, // HDD
    { width: 14 }, // Màn hình: Hãng sx
    { width: 10 }, // Màn hình: Năm sx
    { width: 14 }, // Màn hình: Model
    { width: 16 }, // Màn hình: Số seri
    { width: 14 }, // Tình trạng
    { width: 16 }, // Mã thiết bị cũ
    { width: 14 }, // Tính cấp lại
    { width: 24 }, // Ghi chú
  ];

  // Thêm dữ liệu mẫu Sheet Khoa Phòng
  hospitalSheet.addRow([
    1, '', 'Khoa Khám Bệnh', 'Máy vi tính', 'PC.KH2400', 'KB_PHONG01_01',
    'Dell', '2022', 'OptiPlex 3080', 'DELL-KB-001', 'Core i5 10400', '8GB', 'SSD 256GB',
    'Dell', '2022', 'E2220H', 'MON-KB-001', '0', 'KB-OLD-01', 'Không', 'Máy bàn khám số 1'
  ]);
  hospitalSheet.addRow([
    2, '', 'Khoa Cấp Cứu', 'Máy vi tính', 'PC.KH2400', 'CC_TRUCTAP_02',
    'HP', '2023', 'ProDesk 400 G7', 'HP-CC-002', 'Core i5 11500', '16GB', 'SSD 512GB',
    'HP', '2023', 'P22v G4', 'MON-CC-002', '0', '', 'Không', 'Máy trực cấp cứu 24/7'
  ]);
  hospitalSheet.addRow([
    3, '', 'Khoa Chẩn Đoán HA', 'Máy vi tính', 'PC.KH2400', 'CDHA_XQUANG_01',
    'Lenovo', '2023', 'ThinkCentre M70s', 'LN-CDHA-003', 'Core i7 12700', '32GB', 'SSD 1TB NVMe',
    'LG', '2023', '27UN880 4K', 'MON-CDHA-003', '0', '', 'Không', 'Máy đọc phim X-Quang'
  ]);

  // ==================== SHEET 3: HƯỚNG DẪN NHẬP ====================
  const instructionSheet = workbook.addWorksheet(isEn ? 'Instructions' : 'Hướng dẫn nhập');
  instructionSheet.columns = [
    { header: isEn ? 'Column / Format' : 'Cột / Định dạng', key: 'col', width: 28 },
    { header: isEn ? 'Rules & Allowed Values' : 'Quy tắc & Giá trị cho phép', key: 'rule', width: 75 },
  ];
  const instHeader = instructionSheet.getRow(1);
  instHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  instHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  instHeader.height = 28;

  instructionSheet.addRows(
    isEn
      ? [
          { col: 'Asset Tag (*)', rule: 'Required. Unique asset tag. If duplicate with existing system records or rows in file, it will be rejected and logged to error Excel.' },
          { col: 'Device Name (*)', rule: 'Required. Name of the device (or unique PC identifier).' },
          { col: 'Category (*)', rule: 'Required. e.g. Desktop, Laptop, Monitor, Printer, Network Device...' },
          { col: 'Serial Number', rule: 'Serial number. Must be unique across hardware devices.' },
          { col: 'Status', rule: 'AVAILABLE, IN_USE, MAINTENANCE, RETIRED, LOST. Default: AVAILABLE' },
          { col: 'Condition', rule: 'NEW (New), GOOD (Good), FAIR (Medium), POOR (Poor), BROKEN (Damaged). Default: GOOD' },
          { col: '21-Column Hospital Format', rule: 'Supported via Sheet 2. Auto-extracts CPU, RAM, HDD and attached monitor details into specs JSON.' },
          { col: 'Duplicate Rejection', rule: 'Duplicate devices by Asset Tag or Serial Number will NOT be added to DB and will be exported to Error Excel for review.' },
        ]
      : [
          { col: 'Mã tài sản (*)', rule: 'Bắt buộc. Mã định danh duy nhất. Nếu trùng với thiết bị đã có trong hệ thống hoặc trùng trong file, hệ thống sẽ BỎ QUA và xuất ra file Excel lỗi.' },
          { col: 'Tên thiết bị (*)', rule: 'Bắt buộc. Tên máy tính hoặc định danh duy nhất (ví dụ: KB_PHONG01_01).' },
          { col: 'Danh mục (*)', rule: 'Bắt buộc. Danh mục thiết bị (Máy vi tính, Laptop, Máy in, Màn hình...). Tự động tạo mới nếu chưa có.' },
          { col: 'Số Serial', rule: 'Số serial của thiết bị. Nếu đã tồn tại trong hệ thống hoặc lặp lại trong file, sẽ bị từ chối chống trùng.' },
          { col: 'Tình trạng', rule: '0 hoặc Tốt: Tốt (GOOD). 1 hoặc Trung bình: Trung bình (FAIR). Hỏng: Hỏng (BROKEN).' },
          { col: 'Trạng thái', rule: 'AVAILABLE (Sẵn sàng), IN_USE (Đang dùng), MAINTENANCE (Bảo trì), RETIRED (Thanh lý).' },
          { col: 'Định dạng 21 Cột Khoa Phòng', rule: 'Xem mẫu tại Sheet 2 "Mẫu Khoa Phòng (21 Cột)". Tự động nhận diện cấu hình CPU, RAM, Ổ cứng và cụm Màn hình đi kèm.' },
          { col: 'Chính sách Chống Trùng', rule: 'Thiết bị bị trùng Mã hoặc trùng Serial sẽ KHÔNG ĐƯỢC THÊM VÀO HỆ THỐNG và sẽ được xuất ra file Excel lỗi có ghi rõ lý do để đối soát.' },
        ]
  );

  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}

export async function generateLicenseTemplate(lang: string = 'vi'): Promise<Buffer> {
  const isEn = lang === 'en';
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(isEn ? 'Licenses List' : 'Danh sách License');

  worksheet.columns = isEn
    ? [
        { header: 'Software Name (*)', key: 'name', width: 28 },
        { header: 'License Key', key: 'licenseKey', width: 30 },
        { header: 'License Type', key: 'licenseType', width: 20 },
        { header: 'Total Seats (*)', key: 'totalSeats', width: 18 },
        { header: 'Purchase Date (YYYY-MM-DD)', key: 'purchaseDate', width: 24 },
        { header: 'Expiry Date (YYYY-MM-DD)', key: 'expiryDate', width: 24 },
        { header: 'Purchase Price (VND)', key: 'purchasePrice', width: 20 },
        { header: 'Vendor', key: 'vendorName', width: 24 },
        { header: 'Company', key: 'companyName', width: 28 },
        { header: 'Assigned User (Email)', key: 'userEmail', width: 28 },
        { header: 'Notes', key: 'notes', width: 30 },
      ]
    : [
        { header: 'Tên phần mềm (*)', key: 'name', width: 28 },
        { header: 'License Key', key: 'licenseKey', width: 30 },
        { header: 'Loại License', key: 'licenseType', width: 20 },
        { header: 'Số lượng Seats (*)', key: 'totalSeats', width: 18 },
        { header: 'Ngày mua (YYYY-MM-DD)', key: 'purchaseDate', width: 22 },
        { header: 'Ngày hết hạn (YYYY-MM-DD)', key: 'expiryDate', width: 25 },
        { header: 'Giá mua (VND)', key: 'purchasePrice', width: 18 },
        { header: 'Nhà cung cấp', key: 'vendorName', width: 24 },
        { header: 'Công Ty Quản Lý', key: 'companyName', width: 28 },
        { header: 'Người sử dụng (Email)', key: 'userEmail', width: 28 },
        { header: 'Ghi chú', key: 'notes', width: 30 },
      ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }, // Teal
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  worksheet.addRow({
    name: 'Microsoft 365 Business Standard',
    licenseKey: 'XXXXX-XXXXX-XXXXX-XXXXX',
    licenseType: 'SUBSCRIPTION',
    totalSeats: 25,
    purchaseDate: '2024-01-01',
    expiryDate: '2025-01-01',
    purchasePrice: 65000000,
    vendorName: isEn ? 'Microsoft Official Partner' : 'FPT Smart Cloud',
    companyName: isEn ? 'Acme Global Corporation' : 'Công ty Cổ phần Tập đoàn GELEX',
    userEmail: 'an.nguyen@company.com',
    notes: isEn ? 'Annual license subscription for corporate staff' : 'Gói bản quyền năm cho toàn công ty',
  });

  worksheet.addRow({
    name: 'Adobe Creative Cloud All Apps',
    licenseKey: 'ADOBE-CC-2024-TEAM',
    licenseType: 'SUBSCRIPTION',
    totalSeats: 5,
    purchaseDate: '2024-03-01',
    expiryDate: '2025-03-01',
    purchasePrice: 38000000,
    vendorName: 'Adobe Direct',
    companyName: isEn ? 'Acme Digital Media' : 'Công ty Cổ phần Dây Cáp Điện Việt Nam',
    userEmail: '',
    notes: isEn ? 'Assigned to Design & Marketing team' : 'Cấp phát cho Team Design & Marketing',
  });

  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}

export async function generateUserTemplate(lang: string = 'vi'): Promise<Buffer> {
  const isEn = lang === 'en';
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(isEn ? 'Staff List' : 'Danh Sách Nhân Sự');

  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = isEn
    ? 'STAFF & SYSTEM USERS IMPORT TEMPLATE'
    : 'MẪU IMPORT DANH SÁCH NHÂN SỰ & NGƯỜI DÙNG HỆ THỐNG';
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6366F1' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells('A2:L2');
  const subCell = worksheet.getCell('A2');
  subCell.value = isEn
    ? 'Note: Columns marked with (*) are required. Default password is Staff@123 if empty. Roles: Staff / IT / Admin.'
    : 'Lưu ý: Các cột có dấu (*) là bắt buộc. Mật khẩu nếu để trống hệ thống sẽ tự đặt mặc định là Staff@123. Vai trò: Staff / IT Support / Admin.';
  subCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]);

  const headers = isEn
    ? [
        'No.',
        'Full Name (*)',
        'Login Email (*)',
        'Company',
        'Division / Department',
        'Job Title / Position',
        'Phone Number',
        'Workplace / Office Location',
        'Direct Manager Email',
        'Role (Staff/IT/Admin)',
        'Status (Active/Inactive)',
        'Initial Password',
      ]
    : [
        'STT',
        'Họ Và Tên (*)',
        'Email Đăng Nhập (*)',
        'Công Ty Quản Lý',
        'Khối / Phòng Ban',
        'Chức Danh / Vị Trí',
        'Số Điện Thoại',
        'Khu Vực / Cơ Sở Làm Việc',
        'Email Quản Lý Trực Tiếp',
        'Vai Trò (Staff/IT/Admin)',
        'Trạng Thái (Đang làm việc/Nghỉ việc)',
        'Mật Khẩu Khởi Tạo',
      ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  const sampleRows = isEn
    ? [
        [1, 'John Smith', 'john.smith@company.com', 'Acme Global Corporation', 'Information Technology (IT)', 'System Administrator', '+1-555-0199', 'Headquarters', 'admin@company.com', 'IT', 'Active', 'Staff@123'],
        [2, 'Sarah Connor', 'sarah.connor@company.com', 'Acme Global Corporation', 'Human Resources', 'HR Specialist', '+1-555-0188', 'Headquarters', 'john.smith@company.com', 'Staff', 'Active', 'Staff@123'],
        [3, 'David Warner', 'david.warner@company.com', 'Acme Global Corporation', 'Sales & Marketing', 'Sales Manager', '+1-555-0177', 'Regional Branch', '', 'Staff', 'Active', 'Staff@123'],
        [4, 'Emily Watson', 'emily.watson@company.com', 'Acme Global Corporation', 'Operations', 'Operations Engineer', '+1-555-0166', 'Manufacturing Plant', '', 'Staff', 'Active', 'Staff@123'],
      ]
    : [
        [1, 'Nguyễn Văn An', 'an.nguyen@company.com', 'CÔNG TY CỔ PHẦN HÀ YẾN', 'Ban Công Nghệ Thông Tin (IT)', 'Chuyên viên Quản trị Hệ thống', '0987112233', 'Trụ sở Hà Nội', 'admin@company.com', 'Staff', 'Đang làm việc', 'Staff@123'],
        [2, 'Trần Thị Bình', 'binh.tran@company.com', 'Khối Nhân Sự & Hành Chính', 'Chuyên viên Tuyển dụng', '0912345678', 'Trụ sở Hà Nội', 'an.nguyen@company.com', 'Staff', 'Đang làm việc', 'Staff@123'],
        [3, 'Lê Hoàng Cường', 'cuong.le@company.com', 'CÔNG TY TNHH HÀ YẾN IND', 'Khối Kinh Doanh & Thị Trường', 'Trưởng phòng Kinh doanh', '0903456789', 'Văn phòng TP.HCM', '', 'Staff', 'Đang làm việc', 'Staff@123'],
        [4, 'Phạm Minh Đức', 'duc.pham@company.com', 'CÔNG TY CỔ PHẦN TÂN HÀ PHÁT CÔNG NGHIỆP', 'Khối Vận Hành & Sản Xuất', 'Kỹ sư Vận hành', '0978654321', 'Nhà máy Hưng Yên', '', 'Staff', 'Đang làm việc', 'Staff@123'],
      ];

  sampleRows.forEach((row) => {
    const addedRow = worksheet.addRow(row);
    addedRow.height = 22;
    addedRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 ? 'center' : colNumber === 7 ? 'center' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  worksheet.columns = [
    { width: 8 },  // STT
    { width: 26 }, // Họ Và Tên
    { width: 30 }, // Email
    { width: 35 }, // Công Ty
    { width: 32 }, // Phòng Ban
    { width: 30 }, // Chức Danh
    { width: 18 }, // Số Điện Thoại
    { width: 26 }, // Khu Vực / Cơ Sở
    { width: 28 }, // Email Quản Lý
    { width: 24 }, // Vai Trò
    { width: 26 }, // Trạng Thái
    { width: 20 }, // Mật Khẩu
  ];

  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}

// ==================== EXCEL PARSER & IMPORTER ====================

/**
 * Parse and import assets from Excel buffer
 */
export async function importAssetsFromExcel(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<ImportResultSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('File Excel không có sheet nào.');
  }

  // Create Batch record
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      importType: 'ASSET',
      status: 'PROCESSING',
      importedById: userId,
    },
  });

  const rowsData: { rowNumber: number; data: AssetRowData }[] = [];
  const errors: RowValidationError[] = [];
  const seenTags = new Set<string>();
  const seenSerials = new Set<string>();

  const { colMap, dataStartRowIndex } = detectAssetColumns(worksheet);

  // 1. Parse Excel rows (skip header & sub-header rows)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < dataStartRowIndex) return;

    const rawAssetTag = colMap.assetTag ? getCellValue(row.getCell(colMap.assetTag))?.trim() : undefined;
    const rawName = colMap.name ? getCellValue(row.getCell(colMap.name))?.trim() : undefined;
    const fixedAssetName = colMap.fixedAssetName ? getCellValue(row.getCell(colMap.fixedAssetName))?.trim() : undefined;
    const categoryName = colMap.categoryName ? getCellValue(row.getCell(colMap.categoryName))?.trim() : undefined;
    const brand = colMap.brand ? getCellValue(row.getCell(colMap.brand))?.trim() : undefined;
    const model = colMap.model ? getCellValue(row.getCell(colMap.model))?.trim() : undefined;
    const rawSerial = colMap.serialNumber ? getCellValue(row.getCell(colMap.serialNumber))?.trim() : undefined;
    const serialNumber = (rawSerial && rawSerial !== '0' && rawSerial !== '-') ? rawSerial.toUpperCase() : undefined;
    const rawStatus = colMap.status ? getCellValue(row.getCell(colMap.status))?.trim() : undefined;
    const rawCondition = colMap.condition ? getCellValue(row.getCell(colMap.condition))?.trim() : undefined;
    const purchaseDate = colMap.purchaseDate ? parseDateValue(row.getCell(colMap.purchaseDate).value) : undefined;
    const purchasePrice = colMap.purchasePrice ? parseNumberValue(row.getCell(colMap.purchasePrice).value) : undefined;
    const warrantyExpiry = colMap.warrantyExpiry ? parseDateValue(row.getCell(colMap.warrantyExpiry).value) : undefined;
    const vendorName = colMap.vendorName ? getCellValue(row.getCell(colMap.vendorName))?.trim() : undefined;
    const locationName = colMap.locationName ? getCellValue(row.getCell(colMap.locationName))?.trim() : undefined;
    const rawComp = colMap.companyName ? getCellValue(row.getCell(colMap.companyName))?.trim() : undefined;
    const companyName = rawComp ? normalizeCompanyName(rawComp) : undefined;
    const rawUserEmail = colMap.userEmail ? getCellValue(row.getCell(colMap.userEmail))?.trim() : undefined;
    const userEmail = rawUserEmail ? normalizeEmail(rawUserEmail) : undefined;
    const notes = colMap.notes ? getCellValue(row.getCell(colMap.notes))?.trim() : undefined;

    // Chi tiết phần cứng & thông số đặc thù
    const cpu = colMap.cpu ? getCellValue(row.getCell(colMap.cpu))?.trim() : undefined;
    const ram = colMap.ram ? getCellValue(row.getCell(colMap.ram))?.trim() : undefined;
    const storage = colMap.storage ? getCellValue(row.getCell(colMap.storage))?.trim() : undefined;
    const monitorBrand = colMap.monitorBrand ? getCellValue(row.getCell(colMap.monitorBrand))?.trim() : undefined;
    const monitorYear = colMap.monitorYear ? getCellValue(row.getCell(colMap.monitorYear))?.trim() : undefined;
    const monitorModel = colMap.monitorModel ? getCellValue(row.getCell(colMap.monitorModel))?.trim() : undefined;
    const monitorSerial = colMap.monitorSerial ? getCellValue(row.getCell(colMap.monitorSerial))?.trim() : undefined;
    const manufacturingYear = colMap.manufacturingYear ? getCellValue(row.getCell(colMap.manufacturingYear))?.trim() : undefined;
    const oldAssetCode = colMap.oldAssetCode ? getCellValue(row.getCell(colMap.oldAssetCode))?.trim() : undefined;
    const reissueStatus = colMap.reissueStatus ? getCellValue(row.getCell(colMap.reissueStatus))?.trim() : undefined;

    // Bỏ qua dòng trống hoàn toàn
    if (!rawAssetTag && !rawName && !categoryName && !locationName && !model && !serialNumber) return;

    const resolvedCategory = categoryName || 'Máy tính';
    const resolvedName = rawName || (rawAssetTag ? `Thiết bị ${rawAssetTag}` : `Thiết bị dòng ${rowNumber}`);

    let assetTag = rawAssetTag ? normalizeAssetTag(rawAssetTag) : undefined;
    let finalFixedAssetName = fixedAssetName;

    // Trong mẫu khoa phòng: nếu cột mã thiết bị là mã nhóm (như PC.KH2400),
    // và cột tên thiết bị là mã định danh riêng (như KB_PHONG01_01)
    if (!assetTag && rawName) {
      assetTag = normalizeAssetTag(rawName);
    } else if (assetTag && rawName && rawName.trim().length > 0 && assetTag.includes('.')) {
      // Lưu mã nhóm vào fixedAssetName để đối soát
      if (!finalFixedAssetName) finalFixedAssetName = assetTag;
      // Nếu tên thiết bị là mã định danh riêng (không có dấu cách hoặc có dấu gạch dưới)
      if (!rawName.includes(' ') || rawName.includes('_')) {
        assetTag = normalizeAssetTag(rawName);
      }
    }

    if (!assetTag) {
      assetTag = `TB-${Date.now().toString().slice(-4)}-${rowNumber}`;
    }

    // Chuẩn hóa Tình trạng & Trạng thái hoạt động
    let conditionVal = rawCondition;
    let statusVal = rawStatus;
    if (rawCondition === '0' || rawCondition === '0.0' || rawCondition?.toLowerCase() === 'tốt') {
      conditionVal = 'GOOD';
      if (!statusVal) statusVal = 'IN_USE';
    } else if (rawCondition === '1' || rawCondition?.toLowerCase() === 'trung bình') {
      conditionVal = 'FAIR';
      if (!statusVal) statusVal = 'IN_USE';
    } else if (rawCondition?.toLowerCase() === 'hỏng' || rawCondition?.toLowerCase() === 'hư') {
      conditionVal = 'BROKEN';
      if (!statusVal) statusVal = 'MAINTENANCE';
    }

    rowsData.push({
      rowNumber,
      data: {
        assetTag: assetTag || '',
        name: resolvedName,
        fixedAssetName: finalFixedAssetName,
        categoryName: resolvedCategory,
        brand,
        model,
        serialNumber,
        status: statusVal,
        condition: conditionVal,
        purchaseDate,
        purchasePrice,
        warrantyExpiry,
        vendorName,
        locationName,
        companyName,
        userEmail,
        notes,
        cpu,
        ram,
        storage,
        monitorBrand,
        monitorYear,
        monitorModel,
        monitorSerial,
        manufacturingYear,
        oldAssetCode,
        reissueStatus,
      },
    });
  });

  const totalRows = rowsData.length;
  let successRows = 0;
  let failedRows = 0;
  let duplicateRows = 0;
  const failedItems: ImportFailedRowItem[] = [];

  // 2. Pre-fetch DB records to check duplicates and resolve references
  const existingTags = new Set(
    (await prisma.asset.findMany({ select: { assetTag: true } })).map((a) => a.assetTag.toUpperCase().trim())
  );
  const existingSerials = new Set(
    (await prisma.asset.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true } }))
      .map((a) => (a.serialNumber as string).toUpperCase().trim())
  );

  const fileSeenTags = new Set<string>();
  const fileSeenSerials = new Set<string>();

  const usersByEmail = new Map<string, { id: string; email: string; fullName: string }>();
  (await prisma.user.findMany({ select: { id: true, email: true, fullName: true } })).forEach((u) => {
    usersByEmail.set(u.email.toLowerCase().trim(), u);
  });

  const categoriesMap = new Map<string, string>();
  (await prisma.assetCategory.findMany({ select: { id: true, name: true } })).forEach((c) =>
    categoriesMap.set(c.name.toLowerCase().trim(), c.id)
  );

  const vendorsMap = new Map<string, string>();
  (await prisma.vendor.findMany({ select: { id: true, name: true } })).forEach((v) =>
    vendorsMap.set(v.name.toLowerCase().trim(), v.id)
  );

  const locationsMap = new Map<string, string>();
  (await prisma.location.findMany({ select: { id: true, name: true } })).forEach((l) =>
    locationsMap.set(l.name.toLowerCase().trim(), l.id)
  );

  // 3. Process each row with strict duplicate checking
  const newCompanies = new Set<string>();

  for (const item of rowsData) {
    const { rowNumber, data } = item;
    const rowErrors: string[] = [];

    const normTag = data.assetTag.toUpperCase().trim();
    const normSerial = data.serialNumber ? data.serialNumber.toUpperCase().trim() : undefined;

    // A. KIỂM TRA TRÙNG LẶP (DUPLICATE CHECK)
    const duplicateReasons: string[] = [];

    if (existingTags.has(normTag)) {
      duplicateReasons.push(`Trùng mã tài sản '${data.assetTag}' với thiết bị đã có sẵn trong hệ thống`);
    } else if (fileSeenTags.has(normTag)) {
      duplicateReasons.push(`Trùng mã tài sản '${data.assetTag}' với dòng khác trong file Excel`);
    }

    if (normSerial) {
      if (existingSerials.has(normSerial)) {
        duplicateReasons.push(`Trùng số serial '${data.serialNumber}' với thiết bị đã có sẵn trong hệ thống`);
      } else if (fileSeenSerials.has(normSerial)) {
        duplicateReasons.push(`Trùng số serial '${data.serialNumber}' với dòng khác trong file Excel`);
      }
    }

    // NẾU BỊ TRÙNG: KHÔNG THÊM VÀO DATABASE VÀ GHI NHẬN LỖI
    if (duplicateReasons.length > 0) {
      failedRows++;
      duplicateRows++;
      const reasonMsg = duplicateReasons.join('; ');
      errors.push({ rowNumber, field: 'duplicate', message: reasonMsg });
      failedItems.push({
        rowNumber,
        assetTag: data.assetTag || '—',
        name: data.name || '—',
        serialNumber: data.serialNumber || '—',
        categoryName: data.categoryName || '—',
        locationName: data.locationName || '—',
        hardwareSpecs: [data.cpu, data.ram, data.storage].filter(Boolean).join(' | ') || '—',
        reason: reasonMsg,
      });

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'FAILED',
          errorMessage: reasonMsg,
        },
      });
      continue; // BỎ QUA DÒNG NÀY, KHÔNG INSERT
    }

    // B. Resolve or auto-create Category
    let categoryId = categoriesMap.get(data.categoryName.toLowerCase().trim());
    if (!categoryId && data.categoryName) {
      try {
        const newCat = await prisma.assetCategory.create({
          data: { name: data.categoryName.trim() },
        });
        categoryId = newCat.id;
        categoriesMap.set(data.categoryName.toLowerCase().trim(), newCat.id);
      } catch {
        rowErrors.push(`Không thể tạo danh mục '${data.categoryName}'.`);
      }
    }

    // Resolve or auto-create Vendor
    let vendorId = data.vendorName ? vendorsMap.get(data.vendorName.toLowerCase().trim()) : undefined;
    if (!vendorId && data.vendorName) {
      try {
        const newVendor = await prisma.vendor.create({
          data: { name: data.vendorName.trim() },
        });
        vendorId = newVendor.id;
        vendorsMap.set(data.vendorName.toLowerCase().trim(), newVendor.id);
      } catch {
        // Optional
      }
    }

    // Resolve or auto-create Location
    let locationId = data.locationName ? locationsMap.get(data.locationName.toLowerCase().trim()) : undefined;
    if (!locationId && data.locationName) {
      try {
        const newLoc = await prisma.location.create({
          data: { name: data.locationName.trim() },
        });
        locationId = newLoc.id;
        locationsMap.set(data.locationName.toLowerCase().trim(), newLoc.id);
      } catch {
        // Optional
      }
    }

    // Validate Status & Condition enums
    const validStatus = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST'];
    const assetStatus: AssetStatus = validStatus.includes(data.status?.toUpperCase() || '')
      ? (data.status?.toUpperCase() as AssetStatus)
      : 'AVAILABLE';

    const validCondition = ['NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN'];
    const assetCondition: AssetCondition = validCondition.includes(data.condition?.toUpperCase() || '')
      ? (data.condition?.toUpperCase() as AssetCondition)
      : 'NEW';

    // C. Kiểm tra các lỗi dữ liệu cơ bản khác (thiếu tên, thiếu mã, thiếu danh mục)
    if (rowErrors.length > 0 || !data.assetTag || !data.name || !categoryId) {
      failedRows++;
      const combinedMsg = rowErrors.join(' ') || 'Thiếu thông tin bắt buộc (Mã tài sản, Tên thiết bị hoặc Danh mục)';
      errors.push({ rowNumber, field: 'row', message: combinedMsg });
      failedItems.push({
        rowNumber,
        assetTag: data.assetTag || '—',
        name: data.name || '—',
        serialNumber: data.serialNumber || '—',
        categoryName: data.categoryName || '—',
        locationName: data.locationName || '—',
        hardwareSpecs: [data.cpu, data.ram, data.storage].filter(Boolean).join(' | ') || '—',
        reason: combinedMsg,
      });

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'FAILED',
          errorMessage: combinedMsg,
        },
      });
      continue;
    }

    // Gom thông số cấu hình và màn hình vào specs JSON
    const specsData: Record<string, any> = {};
    if (data.cpu) specsData.cpu = data.cpu;
    if (data.ram) specsData.ram = data.ram;
    if (data.storage) specsData.storage = data.storage;
    if (data.monitorBrand) specsData.monitorBrand = data.monitorBrand;
    if (data.monitorYear) specsData.monitorYear = data.monitorYear;
    if (data.monitorModel) specsData.monitorModel = data.monitorModel;
    if (data.monitorSerial) specsData.monitorSerial = data.monitorSerial;
    if (data.manufacturingYear) specsData.manufacturingYear = data.manufacturingYear;
    if (data.oldAssetCode) specsData.oldAssetCode = data.oldAssetCode;
    if (data.reissueStatus) specsData.reissueStatus = data.reissueStatus;

    // D. Insert Asset vào CSDL
    try {
      const createdAsset = await prisma.asset.create({
        data: {
          assetTag: data.assetTag,
          name: data.name,
          fixedAssetName: data.fixedAssetName || null,
          categoryId,
          brand: data.brand || null,
          model: data.model || null,
          serialNumber: data.serialNumber || null,
          status: assetStatus,
          condition: assetCondition,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          purchasePrice: data.purchasePrice || null,
          purchaseCurrency: 'VND',
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          vendorId: vendorId || null,
          locationId: locationId || null,
          companyName: data.companyName || null,
          specs: Object.keys(specsData).length > 0 ? specsData : null,
          notes: data.notes ? `[Import Excel] ${data.notes}` : '[Import Excel]',
        },
      });

      if (data.companyName) {
        newCompanies.add(data.companyName);
      }

      // Auto-assign to user if email matches
      if (data.userEmail) {
        const cleanEmail = extractEmail(data.userEmail);
        const targetUser = cleanEmail ? usersByEmail.get(cleanEmail) : null;
        if (targetUser) {
          try {
            await prisma.assetAssignment.create({
              data: {
                assetId: createdAsset.id,
                userId: targetUser.id,
                assignedById: userId,
                assignedAt: new Date(),
                notes: 'Tự động gán cho người sử dụng khi Import Excel',
              },
            });

            if (assetStatus === 'AVAILABLE') {
              await prisma.asset.update({
                where: { id: createdAsset.id },
                data: { status: 'IN_USE' },
              });
            }

            await createAuditLog({
              action: 'ASSIGN',
              entityType: 'Asset',
              entityId: createdAsset.id,
              changes: {
                assignedToUserId: targetUser.id,
                assignedToEmail: targetUser.email,
                assignedToName: targetUser.fullName,
                source: 'EXCEL_IMPORT',
              },
              userId,
            });
          } catch (assignErr) {
            console.warn(`Could not auto-assign asset ${createdAsset.assetTag} to user ${targetUser.email}:`, assignErr);
          }
        }
      }

      // Đánh dấu thiết bị đã được thêm thành công vào Set chống trùng
      existingTags.add(normTag);
      fileSeenTags.add(normTag);
      if (normSerial) {
        existingSerials.add(normSerial);
        fileSeenSerials.add(normSerial);
      }

      successRows++;

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'SUCCESS',
          entityId: createdAsset.id,
        },
      });
    } catch (err) {
      failedRows++;
      const errMsg = err instanceof Error ? err.message : 'Database error';
      errors.push({ rowNumber, field: 'db', message: errMsg });
      failedItems.push({
        rowNumber,
        assetTag: data.assetTag || '—',
        name: data.name || '—',
        serialNumber: data.serialNumber || '—',
        categoryName: data.categoryName || '—',
        locationName: data.locationName || '—',
        hardwareSpecs: [data.cpu, data.ram, data.storage].filter(Boolean).join(' | ') || '—',
        reason: `Lỗi CSDL: ${errMsg}`,
      });

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'FAILED',
          errorMessage: errMsg,
        },
      });
    }
  }

  // Auto-sync new company names into corporate.companies setting
  if (newCompanies.size > 0) {
    await syncCorporateCompanies(newCompanies);
  }

  // ==================== 4. TẠO FILE EXCEL BÁO CÁO LỖI NẾU CÓ DÒNG LỖI / TRÙNG ====================
  let errorReportBase64: string | undefined = undefined;
  if (failedItems.length > 0) {
    try {
      const errWorkbook = new ExcelJS.Workbook();
      errWorkbook.creator = 'Simply IT';
      const errSheet = errWorkbook.addWorksheet('Thiet_Bi_Loi_Trung');

      // Title Row
      errSheet.mergeCells('A1:I1');
      const titleCell = errSheet.getCell('A1');
      titleCell.value = 'DANH SÁCH THIẾT BỊ KHÔNG THỂ NHẬP (TRÙNG DỮ LIỆU HOẶC LỖI THÔNG TIN)';
      titleCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // Red 600
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      errSheet.getRow(1).height = 32;

      // Header Row
      errSheet.columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Dòng Excel', key: 'rowNumber', width: 12 },
        { header: 'Mã Tài Sản', key: 'assetTag', width: 20 },
        { header: 'Tên Thiết Bị', key: 'name', width: 28 },
        { header: 'Số Serial', key: 'serialNumber', width: 20 },
        { header: 'Khoa Phòng / Vị Trí', key: 'locationName', width: 22 },
        { header: 'Danh Mục', key: 'categoryName', width: 20 },
        { header: 'Cấu Hình Phần Cứng', key: 'hardwareSpecs', width: 26 },
        { header: 'LÝ DO LỖI / NGUYÊN NHÂN TRÙNG LẶP', key: 'reason', width: 50 },
      ];

      const hRow = errSheet.getRow(2);
      hRow.height = 28;
      hRow.eachCell((cell, colNum) => {
        const isReasonCol = colNum === 9;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isReasonCol ? 'FFB91C1C' : 'FF1E293B' },
        };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });

      // Data Rows
      failedItems.forEach((item, idx) => {
        const row = errSheet.addRow({
          stt: idx + 1,
          rowNumber: item.rowNumber,
          assetTag: item.assetTag || '—',
          name: item.name || '—',
          serialNumber: item.serialNumber || '—',
          locationName: item.locationName || '—',
          categoryName: item.categoryName || '—',
          hardwareSpecs: item.hardwareSpecs || '—',
          reason: item.reason,
        });

        row.height = 24;
        row.alignment = { vertical: 'middle' };

        // Border cho từng ô
        row.eachCell((cell, colNum) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          // Ô Lý do lỗi: Nổi bật màu đỏ / cam
          if (colNum === 9) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF991B1B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          }
        });
      });

      const errBuf = await errWorkbook.xlsx.writeBuffer();
      errorReportBase64 = Buffer.from(errBuf).toString('base64');
    } catch (errReportErr) {
      console.error('Failed to generate error Excel report:', errReportErr);
    }
  }

  // 5. Update Batch status
  const finalStatus: ImportBatchStatus =
    failedRows === 0 ? 'COMPLETED' : successRows === 0 ? 'FAILED' : 'COMPLETED';

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      totalRows,
      successRows,
      failedRows,
      status: finalStatus,
    },
  });

  // 6. Audit Log
  await createAuditLog({
    action: 'IMPORT',
    entityType: 'Asset',
    entityId: batch.id,
    userId,
    changes: {
      fileName,
      totalRows,
      successRows,
      failedRows,
      duplicateRows,
    },
  });

  return {
    batchId: batch.id,
    fileName,
    importType: 'ASSET',
    totalRows,
    successRows,
    failedRows,
    duplicateRows,
    errors,
    failedItems,
    errorReportBase64,
    status: finalStatus,
  };
}

/**
 * Parse and import licenses from Excel buffer
 */
export async function importLicensesFromExcel(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<ImportResultSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('File Excel không có sheet nào.');
  }

  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      importType: 'LICENSE',
      status: 'PROCESSING',
      importedById: userId,
    },
  });

  const rowsData: { rowNumber: number; data: LicenseRowData }[] = [];
  const errors: RowValidationError[] = [];

  const headerRow = worksheet.getRow(1);
  const colMap = detectLicenseColumns(headerRow);

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const name = getCellValue(row.getCell(colMap.name))?.trim();
    const licenseKey = colMap.licenseKey ? getCellValue(row.getCell(colMap.licenseKey))?.trim() : undefined;
    const licenseType = colMap.licenseType ? getCellValue(row.getCell(colMap.licenseType))?.trim() : undefined;
    const totalSeats = colMap.totalSeats ? parseNumberValue(row.getCell(colMap.totalSeats).value) || 1 : 1;
    const purchaseDate = colMap.purchaseDate ? parseDateValue(row.getCell(colMap.purchaseDate).value) : undefined;
    const expiryDate = colMap.expiryDate ? parseDateValue(row.getCell(colMap.expiryDate).value) : undefined;
    const purchasePrice = colMap.purchasePrice ? parseNumberValue(row.getCell(colMap.purchasePrice).value) : undefined;
    const vendorName = colMap.vendorName ? getCellValue(row.getCell(colMap.vendorName))?.trim() : undefined;
    const rawComp = colMap.companyName ? getCellValue(row.getCell(colMap.companyName))?.trim() : undefined;
    const companyName = rawComp ? normalizeCompanyName(rawComp) : undefined;
    const rawUserEmail = colMap.userEmail ? getCellValue(row.getCell(colMap.userEmail))?.trim() : undefined;
    const userEmail = rawUserEmail ? normalizeEmail(rawUserEmail) : undefined;
    const notes = colMap.notes ? getCellValue(row.getCell(colMap.notes))?.trim() : undefined;

    if (!name) return;

    rowsData.push({
      rowNumber,
      data: {
        name,
        licenseKey,
        licenseType,
        totalSeats,
        purchaseDate,
        expiryDate,
        purchasePrice,
        vendorName,
        companyName,
        userEmail,
        notes,
      },
    });
  });

  const totalRows = rowsData.length;
  let successRows = 0;
  let failedRows = 0;

  const usersByEmail = new Map<string, { id: string; email: string; fullName: string }>();
  (await prisma.user.findMany({ select: { id: true, email: true, fullName: true } })).forEach((u) => {
    usersByEmail.set(u.email.toLowerCase().trim(), u);
  });

  const vendorsMap = new Map<string, string>();
  (await prisma.vendor.findMany({ select: { id: true, name: true } })).forEach((v) =>
    vendorsMap.set(v.name.toLowerCase(), v.id)
  );

  const newCompanies = new Set<string>();

  for (const item of rowsData) {
    const { rowNumber, data } = item;

    if (!data.name) {
      failedRows++;
      errors.push({ rowNumber, field: 'name', message: 'Tên phần mềm là bắt buộc.' });
      continue;
    }

    let vendorId = data.vendorName ? vendorsMap.get(data.vendorName.toLowerCase()) : undefined;
    if (!vendorId && data.vendorName) {
      try {
        const newVendor = await prisma.vendor.create({ data: { name: data.vendorName } });
        vendorId = newVendor.id;
        vendorsMap.set(data.vendorName.toLowerCase(), newVendor.id);
      } catch {
        // Ignored
      }
    }

    const validTypes = ['PERPETUAL', 'SUBSCRIPTION', 'OEM', 'TRIAL', 'OPEN_SOURCE'];
    const type: LicenseType = validTypes.includes(data.licenseType?.toUpperCase() || '')
      ? (data.licenseType?.toUpperCase() as LicenseType)
      : 'PERPETUAL';

    try {
      const createdLicense = await prisma.license.create({
        data: {
          name: data.name,
          licenseKey: data.licenseKey || null,
          licenseType: type,
          totalSeats: data.totalSeats || 1,
          usedSeats: 0,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          purchasePrice: data.purchasePrice || null,
          purchaseCurrency: 'VND',
          vendorId: vendorId || null,
          companyName: data.companyName || null,
          status: 'ACTIVE',
          notes: data.notes ? `[Import Excel] ${data.notes}` : '[Import Excel]',
        },
      });

      if (data.companyName) {
        newCompanies.add(data.companyName);
      }

      // Auto-assign license seat to user if email matches
      if (data.userEmail) {
        const cleanEmail = extractEmail(data.userEmail);
        const targetUser = cleanEmail ? usersByEmail.get(cleanEmail) : null;
        if (targetUser) {
          try {
            await prisma.licenseAssignment.create({
              data: {
                licenseId: createdLicense.id,
                userId: targetUser.id,
                assignedById: userId,
                assignedAt: new Date(),
                notes: 'Tự động gán cho người sử dụng khi Import Excel',
              },
            });

            await prisma.license.update({
              where: { id: createdLicense.id },
              data: { usedSeats: { increment: 1 } },
            });

            await createAuditLog({
              action: 'ASSIGN',
              entityType: 'License',
              entityId: createdLicense.id,
              changes: {
                assignedToUserId: targetUser.id,
                assignedToEmail: targetUser.email,
                assignedToName: targetUser.fullName,
                source: 'EXCEL_IMPORT',
              },
              userId,
            });
          } catch (assignErr) {
            console.warn(`Could not auto-assign license ${createdLicense.name} to user ${targetUser.email}:`, assignErr);
          }
        }
      }

      successRows++;
      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'SUCCESS',
          entityId: createdLicense.id,
        },
      });
    } catch (err) {
      failedRows++;
      const errMsg = err instanceof Error ? err.message : 'Database error';
      errors.push({ rowNumber, field: 'db', message: errMsg });

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'FAILED',
          errorMessage: errMsg,
        },
      });
    }
  }

  // Auto-sync new company names into corporate.companies setting
  if (newCompanies.size > 0) {
    await syncCorporateCompanies(newCompanies);
  }

  const finalStatus: ImportBatchStatus =
    failedRows === 0 ? 'COMPLETED' : successRows === 0 ? 'FAILED' : 'COMPLETED';

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { totalRows, successRows, failedRows, status: finalStatus },
  });

  await createAuditLog({
    action: 'IMPORT',
    entityType: 'License',
    entityId: batch.id,
    userId,
    changes: { fileName, totalRows, successRows, failedRows },
  });

  return {
    batchId: batch.id,
    fileName,
    importType: 'LICENSE',
    totalRows,
    successRows,
    failedRows,
    errors,
    status: finalStatus,
  };
}

// ==================== VALUE PARSERS & COLUMN DETECTORS ====================

function extractEmail(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const match = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase().trim() : (str.includes('@') ? str.toLowerCase().trim() : null);
}

export async function syncCorporateCompanies(companies: Iterable<string | null | undefined>): Promise<void> {
  const list = Array.from(companies)
    .map((c) => (c ? String(c).trim() : ''))
    .filter(Boolean);
  if (list.length === 0) return;

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'corporate.companies' } });
    let currentCompanies: string[] = [];
    if (setting?.value) {
      try {
        currentCompanies = JSON.parse(setting.value);
      } catch {}
    }
    let added = false;
    for (const comp of list) {
      if (!currentCompanies.includes(comp)) {
        currentCompanies.push(comp);
        added = true;
      }
    }
    if (added) {
      await prisma.systemSetting.upsert({
        where: { key: 'corporate.companies' },
        create: {
          key: 'corporate.companies',
          value: JSON.stringify(currentCompanies),
          type: 'JSON',
          group: 'general',
          label: 'Danh sách công ty quản lý trong tập đoàn',
        },
        update: {
          value: JSON.stringify(currentCompanies),
        },
      });
    }
  } catch (err) {
    console.warn('Could not auto-sync corporate.companies:', err);
  }
}

interface AssetColumnMap {
  assetTag: number;
  name: number;
  fixedAssetName?: number;
  categoryName: number;
  brand: number;
  model: number;
  serialNumber: number;
  status: number;
  condition: number;
  purchaseDate: number;
  purchasePrice: number;
  warrantyExpiry: number;
  vendorName: number;
  locationName: number;
  companyName: number;
  userEmail: number;
  notes: number;
  // Các trường mở rộng cấu hình máy tính & thiết bị khoa phòng
  cpu?: number;
  ram?: number;
  storage?: number;
  monitorBrand?: number;
  monitorYear?: number;
  monitorModel?: number;
  monitorSerial?: number;
  manufacturingYear?: number;
  oldAssetCode?: number;
  reissueStatus?: number;
}

function detectAssetColumns(worksheet: ExcelJS.Worksheet): {
  colMap: AssetColumnMap;
  headerRowIndex: number;
  dataStartRowIndex: number;
} {
  let bestHeaderRowIndex = 1;
  let maxMatchedScore = 0;

  // Quét 5 dòng đầu tiên để tìm dòng Header chính
  const checkRowsCount = Math.min(6, worksheet.rowCount);
  for (let r = 1; r <= checkRowsCount; r++) {
    const row = worksheet.getRow(r);
    let score = 0;
    row.eachCell((cell) => {
      const val = cell.value?.toString().trim().toLowerCase() || '';
      if (
        val.includes('mã thiết bị') ||
        val.includes('mã tài sản') ||
        val.includes('tên thiết bị') ||
        val.includes('tên khoa phòng') ||
        val.includes('loại thiết bị') ||
        val.includes('hãng sản xuất') ||
        val.includes('số seri') ||
        val.includes('model') ||
        val.includes('cpu') ||
        val.includes('ram') ||
        val.includes('hdd') ||
        val.includes('màn hình') ||
        val.includes('danh mục') ||
        val.includes('asset tag')
      ) {
        score++;
      }
    });
    if (score > maxMatchedScore) {
      maxMatchedScore = score;
      bestHeaderRowIndex = r;
    }
  }

  const primaryRow = worksheet.getRow(bestHeaderRowIndex);
  const nextRow = worksheet.getRow(bestHeaderRowIndex + 1);

  // Kiểm tra xem dòng tiếp theo có phải sub-header (ví dụ dòng 3 có 'hãng sx', 'năm sx', 'model', 'số seri' của cột Màn hình)
  let hasSubHeader = false;
  if (nextRow && nextRow.cellCount > 0) {
    let subScore = 0;
    nextRow.eachCell((cell) => {
      const v = cell.value?.toString().trim().toLowerCase() || '';
      if (
        v.includes('hãng sx') ||
        v.includes('năm sx') ||
        v.includes('số seri') ||
        v.includes('model') ||
        v.includes('hãng')
      ) {
        subScore++;
      }
    });
    if (subScore >= 2) {
      hasSubHeader = true;
    }
  }

  const map: Partial<AssetColumnMap> = {};
  const dataStartRowIndex = hasSubHeader ? bestHeaderRowIndex + 2 : bestHeaderRowIndex + 1;

  // Thu thập text header cho từng cột (kết hợp dòng chính và sub-header)
  const maxCol = Math.max(primaryRow.cellCount, nextRow?.cellCount || 0, 30);
  for (let col = 1; col <= maxCol; col++) {
    const pVal = primaryRow.getCell(col).value?.toString().trim().toLowerCase() || '';
    const sVal = hasSubHeader ? nextRow.getCell(col).value?.toString().trim().toLowerCase() || '' : '';
    const combined = `${pVal} ${sVal}`.trim();

    if (!combined) continue;

    if (combined.includes('mã thiết bị cũ') || combined.includes('mã tscđ') || combined.includes('tên tscđ') || combined.includes('mã cũ')) {
      map.oldAssetCode = col;
    } else if (combined.includes('mã thiết bị') || combined.includes('mã tài sản') || combined.includes('ma tai san') || combined.includes('asset tag') || combined.includes('mã ts')) {
      map.assetTag = col;
    } else if (combined.includes('tên thiết bị') || combined.includes('ten thiet bi') || combined.includes('tên máy') || combined.includes('device name')) {
      map.name = col;
    } else if (combined.includes('tên loại thiết bị') || combined.includes('loại thiết bị') || combined.includes('danh mục') || combined.includes('category')) {
      map.categoryName = col;
    } else if (combined.includes('tên khoa phòng') || combined.includes('khoa phòng') || combined.includes('vị trí') || combined.includes('vi tri') || combined.includes('location')) {
      map.locationName = col;
    } else if (combined.includes('màn hình hãng') || (pVal.includes('màn hình') && sVal.includes('hãng'))) {
      map.monitorBrand = col;
    } else if (combined.includes('màn hình năm') || (pVal.includes('màn hình') && sVal.includes('năm'))) {
      map.monitorYear = col;
    } else if (combined.includes('màn hình model') || (pVal.includes('màn hình') && sVal.includes('model'))) {
      map.monitorModel = col;
    } else if (combined.includes('màn hình số seri') || combined.includes('màn hình seri') || (pVal.includes('màn hình') && sVal.includes('seri'))) {
      map.monitorSerial = col;
    } else if (combined.includes('tên hãng sản xuất') || combined.includes('hãng sản xuất') || combined.includes('hãng sx') || combined.includes('thương hiệu') || combined.includes('brand')) {
      map.brand = col;
    } else if (combined.includes('năm sản xuất') || combined.includes('năm sx')) {
      map.manufacturingYear = col;
    } else if (combined.includes('model')) {
      map.model = col;
    } else if (combined.includes('số seri') || combined.includes('serial') || combined.includes('so seri')) {
      map.serialNumber = col;
    } else if (combined.includes('cpu') || combined.includes('processor') || combined.includes('vi xử lý')) {
      map.cpu = col;
    } else if (combined.includes('ram') || combined.includes('bộ nhớ')) {
      map.ram = col;
    } else if (combined.includes('hdd') || combined.includes('ssd') || combined.includes('ổ cứng') || combined.includes('storage')) {
      map.storage = col;
    } else if (combined.includes('tính cấp lại') || combined.includes('cấp lại') || combined.includes('reissue')) {
      map.reissueStatus = col;
    } else if (combined.includes('tình trạng') || combined.includes('tinh trang') || combined.includes('condition')) {
      map.condition = col;
    } else if (combined.includes('trạng thái') || combined.includes('trang thai') || combined.includes('status')) {
      map.status = col;
    } else if (combined.includes('ngày mua') || combined.includes('purchase date')) {
      map.purchaseDate = col;
    } else if (combined.includes('giá mua') || combined.includes('purchase price') || combined.includes('nguyên giá')) {
      map.purchasePrice = col;
    } else if (combined.includes('bảo hành') || combined.includes('warranty')) {
      map.warrantyExpiry = col;
    } else if (combined.includes('nhà cung cấp') || combined.includes('vendor')) {
      map.vendorName = col;
    } else if (combined.includes('công ty') || combined.includes('company')) {
      map.companyName = col;
    } else if (combined.includes('người sử dụng') || combined.includes('người dùng') || combined.includes('email') || combined.includes('user')) {
      map.userEmail = col;
    } else if (combined.includes('ghi chú') || combined.includes('note')) {
      map.notes = col;
    }
  }

  const finalColMap: AssetColumnMap = {
    assetTag: map.assetTag || 5, // Cột E trong mẫu
    name: map.name || 6,         // Cột F
    fixedAssetName: map.fixedAssetName,
    categoryName: map.categoryName || 4, // Cột D
    brand: map.brand || 7,       // Cột G
    model: map.model || 9,       // Cột I
    serialNumber: map.serialNumber || 10, // Cột J
    status: map.status || 0,
    condition: map.condition || 18, // Cột R
    purchaseDate: map.purchaseDate || 0,
    purchasePrice: map.purchasePrice || 0,
    warrantyExpiry: map.warrantyExpiry || 0,
    vendorName: map.vendorName || 0,
    locationName: map.locationName || 3, // Cột C
    companyName: map.companyName || 0,
    userEmail: map.userEmail || 0,
    notes: map.notes || 21,      // Cột U
    // Chi tiết
    cpu: map.cpu || 11,          // Cột K
    ram: map.ram || 12,          // Cột L
    storage: map.storage || 13,  // Cột M
    monitorBrand: map.monitorBrand || 14, // Cột N
    monitorYear: map.monitorYear || 15,   // Cột O
    monitorModel: map.monitorModel || 16, // Cột P
    monitorSerial: map.monitorSerial || 17,// Cột Q
    manufacturingYear: map.manufacturingYear || 8, // Cột H
    oldAssetCode: map.oldAssetCode || 19, // Cột S
    reissueStatus: map.reissueStatus || 20, // Cột T
  };

  return {
    colMap: finalColMap,
    headerRowIndex: bestHeaderRowIndex,
    dataStartRowIndex,
  };
}

interface LicenseColumnMap {
  name: number;
  licenseKey: number;
  licenseType: number;
  totalSeats: number;
  purchaseDate: number;
  expiryDate: number;
  purchasePrice: number;
  vendorName: number;
  companyName: number;
  userEmail: number;
  notes: number;
}

function detectLicenseColumns(headerRow: ExcelJS.Row): LicenseColumnMap {
  const map: Partial<LicenseColumnMap> = {};
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value?.toString().trim().toLowerCase() || '';
    if (val.includes('tên phần mềm') || val.includes('ten phan mem') || val.includes('tên license') || val.includes('software') || val.includes('tên')) {
      map.name = colNumber;
    } else if (val.includes('key') || val.includes('khóa') || val.includes('khoa')) {
      map.licenseKey = colNumber;
    } else if (val.includes('loại') || val.includes('loai') || val.includes('type')) {
      map.licenseType = colNumber;
    } else if (val.includes('seat') || val.includes('số lượng') || val.includes('so luong')) {
      map.totalSeats = colNumber;
    } else if (val.includes('ngày mua') || val.includes('ngay mua') || val.includes('purchase date')) {
      map.purchaseDate = colNumber;
    } else if (val.includes('hết hạn') || val.includes('het han') || val.includes('expiry')) {
      map.expiryDate = colNumber;
    } else if (val.includes('giá mua') || val.includes('gia mua') || val.includes('price')) {
      map.purchasePrice = colNumber;
    } else if (val.includes('nhà cung cấp') || val.includes('nha cung cap') || val.includes('vendor')) {
      map.vendorName = colNumber;
    } else if (val.includes('công ty') || val.includes('cong ty') || val.includes('pháp nhân') || val.includes('phap nhan') || val.includes('company')) {
      map.companyName = colNumber;
    } else if (val.includes('người sử dụng') || val.includes('nguoi su dung') || val.includes('người dùng') || val.includes('nguoi dung') || val.includes('email') || val.includes('user')) {
      map.userEmail = colNumber;
    } else if (val.includes('ghi chú') || val.includes('ghi chu') || val.includes('note')) {
      map.notes = colNumber;
    }
  });

  return {
    name: map.name || 1,
    licenseKey: map.licenseKey || 2,
    licenseType: map.licenseType || 3,
    totalSeats: map.totalSeats || 4,
    purchaseDate: map.purchaseDate || 5,
    expiryDate: map.expiryDate || 6,
    purchasePrice: map.purchasePrice || 7,
    vendorName: map.vendorName || 8,
    companyName: map.companyName || (headerRow.cellCount >= 11 ? 9 : 0),
    userEmail: map.userEmail || (headerRow.cellCount >= 11 ? 10 : (headerRow.cellCount >= 10 ? 9 : 0)),
    notes: map.notes || (map.userEmail ? (map.userEmail === 10 ? 11 : 10) : (headerRow.cellCount >= 11 ? 11 : (headerRow.cellCount >= 10 ? 10 : 9))),
  };
}

function getCellValue(cell: ExcelJS.Cell): string | null {
  if (cell.value === null || cell.value === undefined) return null;
  if (typeof cell.value === 'object') {
    if ('text' in cell.value && typeof cell.value.text === 'string') {
      return cell.value.text;
    }
    if ('result' in cell.value) {
      return String(cell.value.result ?? '');
    }
  }
  return String(cell.value);
}

function parseNumberValue(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

function parseDateValue(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    // Try YYYY-MM-DD
    const isoMatch = val.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Try DD/MM/YYYY
    const vnMatch = val.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (vnMatch) {
      const [, d, m, y] = vnMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  return undefined;
}

export async function generateServiceTemplate(lang: string = 'vi'): Promise<Buffer> {
  const isEn = lang === 'en';
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(isEn ? 'IT_Services_List' : 'Mau_Import_Dich_Vu');

  worksheet.columns = isEn
    ? [
        { header: 'Service Code (*)', key: 'serviceCode', width: 18 },
        { header: 'Service Package Name (*)', key: 'name', width: 35 },
        { header: 'Service Type (*)', key: 'serviceType', width: 20 },
        { header: 'Cost (VND)', key: 'cost', width: 18 },
        { header: 'Billing Cycle (*)', key: 'billingCycle', width: 16 },
        { header: 'Start Date (YYYY-MM-DD)', key: 'startDate', width: 24 },
        { header: 'Renewal Date (YYYY-MM-DD)', key: 'renewalDate', width: 24 },
        { header: 'Account / Contract Number', key: 'accountNumber', width: 24 },
        { header: 'Static IP / Configuration', key: 'ipStatic', width: 22 },
        { header: 'Bandwidth / Specs', key: 'bandwidth', width: 24 },
        { header: 'Vendor / Partner', key: 'vendorName', width: 25 },
        { header: 'Company', key: 'companyName', width: 25 },
        { header: 'Installation Location', key: 'locationName', width: 22 },
        { header: 'Support Hotline', key: 'contactSupport', width: 25 },
        { header: 'Notes', key: 'notes', width: 30 },
      ]
    : [
        { header: 'Mã Dịch Vụ (*)', key: 'serviceCode', width: 16 },
        { header: 'Tên Gói Dịch Vụ (*)', key: 'name', width: 35 },
        { header: 'Loại Dịch Vụ (*)', key: 'serviceType', width: 22 },
        { header: 'Giá Cước (VNĐ)', key: 'cost', width: 18 },
        { header: 'Chu Kỳ (*)', key: 'billingCycle', width: 16 },
        { header: 'Ngày Bắt Đầu (YYYY-MM-DD)', key: 'startDate', width: 22 },
        { header: 'Ngày Gia Hạn (YYYY-MM-DD)', key: 'renewalDate', width: 22 },
        { header: 'Mã Thuê Bao / Khách Hàng', key: 'accountNumber', width: 22 },
        { header: 'IP Tĩnh / Cấu Hình', key: 'ipStatic', width: 20 },
        { header: 'Băng Thông / Thông Số', key: 'bandwidth', width: 22 },
        { header: 'Nhà Cung Cấp / Đối Tác', key: 'vendorName', width: 25 },
        { header: 'Công Ty Quản Lý', key: 'companyName', width: 25 },
        { header: 'Vị Trí Lắp Đặt', key: 'locationName', width: 20 },
        { header: 'Hotline Hỗ Trợ', key: 'contactSupport', width: 25 },
        { header: 'Ghi Chú', key: 'notes', width: 30 },
      ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B21A8' },
  };

  worksheet.addRow({
    serviceCode: 'SVC-NET-001',
    name: isEn
      ? 'High-speed Fiber FTTH Enterprise 500Mbps'
      : 'Đường truyền Internet Cáp quang FTTH Viettel Pro 500Mbps',
    serviceType: 'INTERNET',
    cost: 1500000,
    billingCycle: 'MONTHLY',
    startDate: '2025-01-01',
    renewalDate: '2026-01-01',
    accountNumber: 'HNI_FTTH_588291',
    ipStatic: '115.78.22.105 / 29',
    bandwidth: isEn ? '500 Mbps International 30 Mbps' : '500 Mbps Quốc tế 30 Mbps',
    vendorName: 'Viettel Telecom',
    companyName: isEn ? 'Acme Global Corporation' : 'Công ty Cổ phần Tập đoàn ABC',
    locationName: isEn ? 'HQ Server Room' : 'Phòng IT',
    contactSupport: isEn ? '+84 18008119 - Support: 0988.123.456' : '18008119 - KTV: 0988.123.456',
    notes: isEn ? 'Monthly routine maintenance' : 'Bảo trì định kỳ hàng tháng',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

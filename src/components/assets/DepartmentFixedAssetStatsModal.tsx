'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Building2,
  Monitor,
  Laptop,
  Printer,
  ScanLine,
  Copy,
  Tv,
  Smartphone,
  Presentation,
  Server,
  Camera,
  Boxes,
  Search,
  Filter,
  Download,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Sparkles,
  ExternalLink,
  Table,
  LayoutGrid,
  Info,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { useLanguage } from '@/lib/i18n/context';
import { DeviceCategoryKey } from '@/app/api/department-fixed-assets/stats/route';

export interface DeviceCategoryDef {
  key: DeviceCategoryKey;
  labelVi: string;
  labelEn: string;
  shortLabelVi: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const DEVICE_CATEGORY_DEFS: DeviceCategoryDef[] = [
  {
    key: 'DESKTOP',
    labelVi: 'Máy tính để bàn (PC)',
    labelEn: 'Desktop PC',
    shortLabelVi: 'Máy tính PC',
    icon: Monitor,
    color: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'LAPTOP',
    labelVi: 'Máy tính xách tay (Laptop)',
    labelEn: 'Laptop',
    shortLabelVi: 'Laptop',
    icon: Laptop,
    color: 'text-indigo-600 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    key: 'MONITOR',
    labelVi: 'Màn hình máy tính',
    labelEn: 'Monitor',
    shortLabelVi: 'Màn hình',
    icon: Monitor,
    color: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    key: 'PRINTER',
    labelVi: 'Máy in',
    labelEn: 'Printer',
    shortLabelVi: 'Máy in',
    icon: Printer,
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'SCANNER',
    labelVi: 'Máy quét / Scan / Mã vạch',
    labelEn: 'Scanner',
    shortLabelVi: 'Máy Scan',
    icon: ScanLine,
    color: 'text-teal-600 dark:text-teal-400',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    badgeText: 'text-teal-700 dark:text-teal-300',
  },
  {
    key: 'PHOTOCOPY',
    labelVi: 'Máy Photocopy',
    labelEn: 'Photocopier',
    shortLabelVi: 'Photocopy',
    icon: Copy,
    color: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    key: 'TV',
    labelVi: 'Tivi / Smart TV / Màn chiếu LED',
    labelEn: 'TV / Display',
    shortLabelVi: 'Tivi / TV',
    icon: Tv,
    color: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
  {
    key: 'PHONE',
    labelVi: 'Điện thoại / Smart phone / Tablet',
    labelEn: 'Phone / Smartphone',
    shortLabelVi: 'Điện thoại/Phone',
    icon: Smartphone,
    color: 'text-pink-600 dark:text-pink-400',
    badgeBg: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800',
    badgeText: 'text-pink-700 dark:text-pink-300',
  },
  {
    key: 'PROJECTOR',
    labelVi: 'Máy chiếu & Màn chiếu',
    labelEn: 'Projector',
    shortLabelVi: 'Máy chiếu',
    icon: Presentation,
    color: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
  {
    key: 'NETWORK_SERVER',
    labelVi: 'Server, UPS & Thiết bị mạng',
    labelEn: 'Server & Network',
    shortLabelVi: 'Server / Mạng',
    icon: Server,
    color: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  {
    key: 'CAMERA',
    labelVi: 'Camera & Đầu ghi hình',
    labelEn: 'Camera & DVR',
    shortLabelVi: 'Camera / Đầu ghi',
    icon: Camera,
    color: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    badgeText: 'text-violet-700 dark:text-violet-300',
  },
  {
    key: 'OTHER',
    labelVi: 'Thiết bị & Phụ kiện khác',
    labelEn: 'Other Equipment',
    shortLabelVi: 'Khác',
    icon: Boxes,
    color: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    badgeText: 'text-slate-700 dark:text-slate-300',
  },
];

interface DepartmentFixedAssetStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepartmentFixedAssetStatsModal({
  isOpen,
  onClose,
}: DepartmentFixedAssetStatsModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const txt = (vi: string, en: string, ja?: string) => (language === 'ja' ? ja || en : isEn ? en : vi);

  // Filters & State
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'department' | 'usedLocation'>('department');
  const [scope, setScope] = useState<'IT_ONLY' | 'ALL'>('IT_ONLY');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [sortBy, setSortBy] = useState<'total' | 'name'>('total');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [isMaximized, setIsMaximized] = useState(false);

  // Data from API
  const [departments, setDepartments] = useState<any[]>([]);
  const [grandTotals, setGrandTotals] = useState<any>({
    totalDepartments: 0,
    totalDevices: 0,
    bookPriceTotal: 0,
    bookRemainingTotal: 0,
    counts: {},
  });
  const [warehouses, setWarehouses] = useState<string[]>([]);

  // Drill-down Detail Modal State
  const [drillDownData, setDrillDownData] = useState<{
    departmentName: string;
    categoryKey?: DeviceCategoryKey | 'ALL';
    categoryLabel: string;
    items: any[];
  } | null>(null);

  // Tải dữ liệu từ API
  const loadStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('groupBy', groupBy);
      params.set('scope', scope);
      if (warehouseFilter !== 'ALL') params.set('warehouse', warehouseFilter);

      const res = await fetch(`/api/department-fixed-assets/stats?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDepartments(data.data.departments || []);
        setGrandTotals(data.data.grandTotals || {});
        if (data.data.warehouses) setWarehouses(data.data.warehouses);
      }
    } catch (err) {
      console.error('Load department stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, groupBy, scope, warehouseFilter]);

  // Bộ lọc tìm kiếm & sắp xếp trên Frontend
  const filteredDepartments = useMemo(() => {
    let list = [...departments];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.departmentName.toLowerCase().includes(q));
    }

    if (hideEmpty) {
      list = list.filter((d) => d.totalDevices > 0);
    }

    if (sortBy === 'name') {
      list.sort((a, b) => a.departmentName.localeCompare(b.departmentName, 'vi'));
    } else {
      list.sort((a, b) => b.totalDevices - a.totalDevices);
    }

    return list;
  }, [departments, search, hideEmpty, sortBy]);

  // Tổng hợp động các cột theo danh sách đang filter
  const currentFilteredTotals = useMemo(() => {
    const totals: Record<string, number> = { totalDevices: 0 };
    DEVICE_CATEGORY_DEFS.forEach((cat) => {
      totals[cat.key] = 0;
    });

    filteredDepartments.forEach((dept) => {
      totals.totalDevices += dept.totalDevices || 0;
      DEVICE_CATEGORY_DEFS.forEach((cat) => {
        totals[cat.key] += dept.counts?.[cat.key] || 0;
      });
    });

    return totals;
  }, [filteredDepartments]);

  // Mở drill-down xem danh sách thiết bị khi click vào ô
  const handleOpenDrillDown = (
    departmentName: string,
    categoryKey: DeviceCategoryKey | 'ALL',
    categoryLabel: string,
    items: any[]
  ) => {
    if (!items || items.length === 0) return;
    setDrillDownData({
      departmentName,
      categoryKey,
      categoryLabel,
      items,
    });
  };

  // Xuất file Excel
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QLTBIT Management';
      workbook.created = new Date();

      // Sheet 1: Ma Trận Thống Kê Theo Khoa Phòng
      const sheet1 = workbook.addWorksheet('Thong_Ke_Khoa_Phong', {
        views: [{ showGridLines: true }],
      });

      const title = groupBy === 'usedLocation'
        ? 'BẢNG THỐNG KÊ SỐ LƯỢNG THIẾT BỊ THEO NƠI SỬ DỤNG'
        : 'BẢNG THỐNG KÊ SỐ LƯỢNG THIẾT BỊ CNTT THEO KHOA PHÒNG';

      const titleRow = sheet1.addRow([title]);
      titleRow.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet1.mergeCells('A1:O1');

      const subTitle = `Phạm vi: ${scope === 'IT_ONLY' ? 'Chỉ tài sản CNTT' : 'Toàn bộ tài sản cố định'} | Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`;
      const subTitleRow = sheet1.addRow([subTitle]);
      subTitleRow.font = { name: 'Times New Roman', size: 10, italic: true };
      subTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet1.mergeCells('A2:O2');
      sheet1.addRow([]); // Dòng trống

      // Headers (Row 4)
      const headerRow = sheet1.addRow([
        'STT',
        groupBy === 'usedLocation' ? 'Nơi Sử Dụng' : 'Khoa, Phòng',
        ...DEVICE_CATEGORY_DEFS.map((c) => c.shortLabelVi),
        'TỔNG CỘNG',
      ]);

      headerRow.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 28;

      headerRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colNumber === 15 ? 'FF0F766E' : 'FF1E293B' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Data Rows
      filteredDepartments.forEach((dept, idx) => {
        const row = sheet1.addRow([
          idx + 1,
          dept.departmentName,
          ...DEVICE_CATEGORY_DEFS.map((c) => dept.counts?.[c.key] || 0),
          dept.totalDevices || 0,
        ]);

        row.font = { name: 'Times New Roman', size: 10 };
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(15).font = { name: 'Times New Roman', size: 10, bold: true };

        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          if (colNumber >= 3 && colNumber <= 14 && cell.value === 0) {
            cell.value = '-';
            cell.font = { color: { argb: 'FF94A3B8' } };
          }
        });
      });

      // Dòng Tổng Cộng (Summary Footer)
      const footerRow = sheet1.addRow([
        '',
        'TỔNG CỘNG TOÀN VIỆN',
        ...DEVICE_CATEGORY_DEFS.map((c) => currentFilteredTotals[c.key] || 0),
        currentFilteredTotals.totalDevices || 0,
      ]);

      footerRow.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      footerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      footerRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      footerRow.height = 24;

      footerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }, // Màu vàng nhạt nổi bật
        };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FFB45309' } },
          left: { style: 'thin', color: { argb: 'FFB45309' } },
          bottom: { style: 'medium', color: { argb: 'FFB45309' } },
          right: { style: 'thin', color: { argb: 'FFB45309' } },
        };
      });

      // Tự động chỉnh độ rộng cột
      sheet1.columns = [
        { width: 6 },
        { width: 32 },
        ...DEVICE_CATEGORY_DEFS.map(() => ({ width: 14 })),
        { width: 16 },
      ];

      // Sheet 2: Danh Sách Chi Tiết Toàn Bộ Thiết Bị
      const sheet2 = workbook.addWorksheet('Chi_Tiet_Thiet_Bi', {
        views: [{ showGridLines: true }],
      });

      const s2Header = sheet2.addRow([
        'STT',
        'Khoa, Phòng',
        'Nơi Sử Dụng',
        'Loại Thiết Bị',
        'Tên Tài Sản Cố Định',
        'Mã Số TSC',
        'Mã Quản Lý',
        'Hãng SX',
        'Năm SD',
        'Số Lượng',
        'Nguyên Giá Sổ Sách',
        'Còn Lại Sổ Sách',
        'Người Dùng / Vị Trí Ghi Chú',
        'Kho Quản Lý',
      ]);

      s2Header.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      s2Header.alignment = { vertical: 'middle', horizontal: 'center' };
      s2Header.height = 24;
      s2Header.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        };
      });

      let sttIndex = 1;
      filteredDepartments.forEach((dept) => {
        DEVICE_CATEGORY_DEFS.forEach((cat) => {
          const items = dept.itemsByCategory?.[cat.key] || [];
          items.forEach((item: any) => {
            sheet2.addRow([
              sttIndex++,
              dept.departmentName,
              item.usedLocation || '',
              cat.shortLabelVi,
              item.name,
              item.fixedAssetCode || '',
              item.managementCode || '',
              item.brand || '',
              item.inUseDate || '',
              item.effectiveQuantity || 1,
              item.bookPrice || 0,
              item.bookRemainingValue || 0,
              item.noteUser || '',
              item.warehouse || '',
            ]);
          });
        });
      });

      sheet2.columns = [
        { width: 6 },
        { width: 28 },
        { width: 20 },
        { width: 18 },
        { width: 36 },
        { width: 18 },
        { width: 16 },
        { width: 14 },
        { width: 12 },
        { width: 10 },
        { width: 18 },
        { width: 18 },
        { width: 24 },
        { width: 14 },
      ];

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `Thong_Ke_Thiet_Bi_Khoa_Phong_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert(txt('Xuất file Excel thất bại', 'Failed to export Excel', 'Excel出力に失敗しました'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'fixed inset-2 sm:inset-4 w-auto h-auto'
            : 'max-w-7xl w-full max-h-[94vh] h-[90vh]'
        }`}
      >
        {/* ==================== 1. MODAL HEADER ==================== */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl shadow-xs">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  {txt(
                    'Báo Cáo & Thống Kê Thiết Bị Theo Khoa Phòng',
                    'Department Device Inventory Matrix & Report',
                    '部署別機器統計・突合マトリクス'
                  )}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {filteredDepartments.length} {txt('khoa/phòng', 'departments', '部署')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {txt(
                  'Thống kê số lượng máy tính (PC, laptop), màn hình, máy in, máy scan, tivi, smart phone... theo từng khoa phòng dựa trên danh sách TSCĐ.',
                  'Aggregated counts of PCs, laptops, printers, monitors, TVs, phones... per department from fixed assets.',
                  '固定資産データに基づく各部署のPC、ノートPC、プリンタ、モニタ、TV、スマホ等の集計'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={txt('Xuất bảng ma trận & chi tiết ra file Excel', 'Export Excel', 'Excel出力')}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">{txt('Xuất Báo Cáo Excel', 'Export Excel', 'Excel出力')}</span>
            </button>

            <button
              type="button"
              onClick={loadStats}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              title={txt('Làm mới dữ liệu', 'Refresh data', '再読込')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              title={isMaximized ? txt('Thu nhỏ', 'Restore', '元に戻す') : txt('Phóng to', 'Maximize', '最大化')}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              title={txt('Đóng', 'Close', '閉じる')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================== 2. KPI CARDS TỔNG HỢP NHANH ==================== */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Card 1: Tổng khoa phòng */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>{txt('Khoa, Phòng', 'Departments', '部署')}</span>
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {grandTotals.totalDepartments || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{txt('Đang có thiết bị', 'With equipment', '機器保有')}</div>
            </div>

            {/* Card 2: Tổng Máy tính (PC + Laptop) */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-2xs">
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider">
                <span>{txt('Máy Tính (PC + Laptop)', 'Computers', 'PC・ノート')}</span>
                <Monitor className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {(grandTotals.counts?.DESKTOP || 0) + (grandTotals.counts?.LAPTOP || 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {grandTotals.counts?.DESKTOP || 0} PC + {grandTotals.counts?.LAPTOP || 0} Laptop
              </div>
            </div>

            {/* Card 3: Tổng Máy in & Máy Scan */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                <span>{txt('Máy In & Máy Scan', 'Printers & Scanners', 'プリンタ・スキャナ')}</span>
                <Printer className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {(grandTotals.counts?.PRINTER || 0) + (grandTotals.counts?.SCANNER || 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {grandTotals.counts?.PRINTER || 0} In + {grandTotals.counts?.SCANNER || 0} Scan
              </div>
            </div>

            {/* Card 4: Tổng Màn hình */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-2xs">
              <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 text-[11px] font-bold uppercase tracking-wider">
                <span>{txt('Màn Hình Rời', 'Monitors', 'ディスプレイ')}</span>
                <Monitor className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                {grandTotals.counts?.MONITOR || 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{txt('Màn LCD / Monitor', 'LCD Monitors', '液晶モニター')}</div>
            </div>

            {/* Card 5: Tổng Tivi & Smart Phone */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-2xs">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-[11px] font-bold uppercase tracking-wider">
                <span>{txt('Tivi & Smart Phone', 'TVs & Phones', 'TV・スマホ')}</span>
                <Tv className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {(grandTotals.counts?.TV || 0) + (grandTotals.counts?.PHONE || 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {grandTotals.counts?.TV || 0} Tivi + {grandTotals.counts?.PHONE || 0} ĐT/Tablet
              </div>
            </div>

            {/* Card 6: Tổng tất cả thiết bị */}
            <div className="bg-gradient-to-tr from-indigo-600 to-blue-600 text-white p-3 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-indigo-100 text-[11px] font-bold uppercase tracking-wider">
                <span>{txt('Tổng Toàn Bộ Thiết Bị', 'Total Equipment', '総機器数')}</span>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black mt-1">{grandTotals.totalDevices || 0}</div>
              <div className="text-[10px] text-indigo-200 mt-0.5">{txt('Thiết bị ghi nhận', 'Total recorded', '登録総数')}</div>
            </div>
          </div>
        </div>

        {/* ==================== 3. THANH BỘ LỌC & TÌM KIẾM ==================== */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Ô tìm kiếm */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={txt('Tìm khoa, phòng...', 'Search department...', '部署名検索...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Nhóm theo: Khoa phòng vs Nơi sử dụng */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <span className="text-[11px] text-slate-500 px-1">{txt('Nhóm:', 'Group:', '集計軸:')}</span>
              <button
                type="button"
                onClick={() => setGroupBy('department')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  groupBy === 'department'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {txt('Khoa, Phòng', 'Department', '部署')}
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('usedLocation')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  groupBy === 'usedLocation'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {txt('Nơi Sử Dụng', 'Used Location', '使用場所')}
              </button>
            </div>

            {/* Lọc phạm vi tài sản: Chỉ CNTT vs Tất cả */}
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="IT_ONLY">{txt('⚡ Chỉ tài sản CNTT', '⚡ IT Assets Only', '⚡ IT資産のみ')}</option>
              <option value="ALL">{txt('📋 Toàn bộ tài sản cố định', '📋 All Fixed Assets', '📋 全固定資産')}</option>
            </select>

            {/* Lọc theo Kho */}
            {warehouses.length > 0 && (
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="ALL">{txt('Kho (Tất cả)', 'All Warehouses', '全倉庫')}</option>
                {warehouses.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Checkbox ẩn khoa phòng 0 thiết bị */}
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>{txt('Ẩn mục 0 thiết bị', 'Hide 0 devices', '0件を非表示')}</span>
            </label>

            {/* Sắp xếp */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSortBy('total')}
                className={`px-2 py-1 rounded-lg cursor-pointer ${
                  sortBy === 'total'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500'
                }`}
                title={txt('Sắp xếp theo tổng thiết bị nhiều nhất', 'Sort by total', '総数順')}
              >
                {txt('Nhiều nhất', 'Highest', '多い順')}
              </button>
              <button
                type="button"
                onClick={() => setSortBy('name')}
                className={`px-2 py-1 rounded-lg cursor-pointer ${
                  sortBy === 'name'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-500'
                }`}
                title={txt('Sắp xếp theo tên A-Z', 'Sort by name A-Z', '名前順')}
              >
                A-Z
              </button>
            </div>

            {/* Chuyển chế độ xem: Bảng vs Cards */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={txt('Bảng ma trận', 'Matrix table', 'マトリクス表')}
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'CARDS'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={txt('Dạng thẻ khoa phòng', 'Cards view', 'カード表示')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ==================== 4. NỘI DUNG CHÍNH (BẢNG MA TRẬN HOẶC DẠNG THẺ) ==================== */}
        <div className="flex-1 overflow-auto bg-slate-100/50 dark:bg-slate-950/40 p-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <div className="text-xs font-semibold">{txt('Đang tổng hợp dữ liệu thiết bị theo khoa phòng...', 'Aggregating equipment stats...', '集計中...')}</div>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
              <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {txt('Không tìm thấy dữ liệu khoa phòng nào phù hợp', 'No matching department found', '該当する部署が見つかりません')}
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                {txt(
                  'Hãy thử xóa từ khóa tìm kiếm hoặc bỏ chọn "Ẩn mục 0 thiết bị" để xem đầy đủ danh sách.',
                  'Try clearing the search or unchecking "Hide 0 devices".',
                  '検索キーワードをクリアするか、0件非表示を解除してください。'
                )}
              </p>
            </div>
          ) : viewMode === 'TABLE' ? (
            /* ==================== 4.1 BẢNG MA TRẬN (PIVOT TABLE MATRIX) ==================== */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  {/* Table Header */}
                  <thead className="bg-slate-900 text-white sticky top-0 z-10 select-none">
                    <tr>
                      <th className="px-3 py-3 text-center font-bold w-12 border-r border-slate-800">STT</th>
                      <th className="px-4 py-3 font-bold min-w-[200px] border-r border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                          <span>{groupBy === 'usedLocation' ? txt('Nơi Sử Dụng', 'Used Location', '使用場所') : txt('Khoa, Phòng', 'Department', '部署')}</span>
                        </div>
                      </th>
                      {DEVICE_CATEGORY_DEFS.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <th
                            key={cat.key}
                            className="px-2.5 py-3 text-center font-bold border-r border-slate-800 min-w-[95px] max-w-[120px]"
                            title={cat.labelVi}
                          >
                            <div className="flex flex-col items-center justify-center gap-1">
                              <Icon className="w-4 h-4 opacity-90" />
                              <span className="text-[11px] leading-tight font-medium text-slate-200">
                                {cat.shortLabelVi}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-center font-black bg-indigo-900/90 text-white min-w-[110px]">
                        {txt('TỔNG CỘNG', 'TOTAL', '合計')}
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredDepartments.map((dept, idx) => (
                      <tr
                        key={dept.departmentName}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                      >
                        {/* STT */}
                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 dark:border-slate-800">
                          {idx + 1}
                        </td>

                        {/* Tên Khoa Phòng */}
                        <td className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {dept.departmentName}
                            </span>
                            {/* Nút xem toàn bộ tài sản khoa này */}
                            <button
                              type="button"
                              onClick={() => {
                                const allDeptItems = Object.values(dept.itemsByCategory || {}).flat();
                                handleOpenDrillDown(
                                  dept.departmentName,
                                  'ALL',
                                  txt('Toàn bộ thiết bị khoa phòng', 'All department equipment', 'すべての機器'),
                                  allDeptItems
                                );
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md transition-all cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                              title={txt('Xem chi tiết tất cả tài sản của khoa này', 'View all department assets', '全機器詳細')}
                            >
                              <span>{txt('Chi tiết', 'Details', '詳細')}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        {/* Các cột thiết bị */}
                        {DEVICE_CATEGORY_DEFS.map((cat) => {
                          const count = dept.counts?.[cat.key] || 0;
                          const items = dept.itemsByCategory?.[cat.key] || [];
                          return (
                            <td
                              key={cat.key}
                              className="px-2 py-2 text-center border-r border-slate-100 dark:border-slate-800"
                            >
                              {count > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDrillDown(dept.departmentName, cat.key, cat.labelVi, items)}
                                  className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-2xs border ${cat.badgeBg} ${cat.badgeText}`}
                                  title={txt(
                                    `Bấm để xem danh sách ${count} ${cat.shortLabelVi}`,
                                    `Click to view ${count} ${cat.labelEn}`,
                                    `クリックして詳細表示`
                                  )}
                                >
                                  {count}
                                </button>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 text-xs select-none">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Cột Tổng Cộng Dòng */}
                        <td className="px-3 py-2.5 text-center font-black text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20">
                          {dept.totalDevices > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const allDeptItems = Object.values(dept.itemsByCategory || {}).flat();
                                handleOpenDrillDown(
                                  dept.departmentName,
                                  'ALL',
                                  txt('Toàn bộ thiết bị khoa phòng', 'All department equipment', 'すべての機器'),
                                  allDeptItems
                                );
                              }}
                              className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-2xs hover:scale-105 active:scale-95 cursor-pointer transition-all"
                            >
                              {dept.totalDevices}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Table Footer - Grand Totals */}
                  <tfoot className="bg-amber-100 dark:bg-amber-950/60 text-slate-900 dark:text-amber-100 font-extrabold sticky bottom-0 z-10 border-t-2 border-amber-300 dark:border-amber-700">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center uppercase tracking-wider text-xs border-r border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                        {txt('TỔNG CỘNG TOÀN VIỆN', 'GRAND TOTALS', '全院・全社合計')} ({filteredDepartments.length} {txt('khoa/phòng', 'depts', '部署')})
                      </td>
                      {DEVICE_CATEGORY_DEFS.map((cat) => {
                        const totalCat = currentFilteredTotals[cat.key] || 0;
                        return (
                          <td
                            key={cat.key}
                            className="px-2 py-3 text-center border-r border-amber-200 dark:border-amber-800 font-black text-xs"
                          >
                            {totalCat > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-black">
                                {totalCat}
                              </span>
                            ) : (
                              <span className="text-amber-700/50 dark:text-amber-400/50">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-black text-sm bg-indigo-700 text-white">
                        {currentFilteredTotals.totalDevices || 0}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* ==================== 4.2 DẠNG THẺ TỔNG HỢP KHOA PHÒNG (CARDS VIEW) ==================== */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredDepartments.map((dept) => {
                const allItems = Object.values(dept.itemsByCategory || {}).flat();
                return (
                  <div
                    key={dept.departmentName}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-400 transition-all"
                  >
                    <div>
                      {/* Tiêu đề thẻ */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                              {dept.departmentName}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {dept.totalDevices} {txt('thiết bị ghi nhận', 'recorded devices', '機器')}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-2xs">
                          {dept.totalDevices}
                        </span>
                      </div>

                      {/* Danh mục thiết bị thuộc khoa */}
                      <div className="grid grid-cols-2 gap-1.5 pt-3">
                        {DEVICE_CATEGORY_DEFS.map((cat) => {
                          const count = dept.counts?.[cat.key] || 0;
                          const items = dept.itemsByCategory?.[cat.key] || [];
                          if (count === 0) return null;
                          const Icon = cat.icon;
                          return (
                            <button
                              key={cat.key}
                              type="button"
                              onClick={() => handleOpenDrillDown(dept.departmentName, cat.key, cat.labelVi, items)}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer hover:scale-102 ${cat.badgeBg}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                <span className="text-[11px] font-medium truncate">{cat.shortLabelVi}</span>
                              </div>
                              <span className={`font-black text-xs px-1.5 rounded-md ${cat.badgeText}`}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Nút hành động xem chi tiết */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">
                        {txt('Bấm để xem danh sách', 'Click to view list', 'クリックして詳細')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDrillDown(
                            dept.departmentName,
                            'ALL',
                            txt('Toàn bộ thiết bị khoa phòng', 'All department equipment', 'すべての機器'),
                            allItems
                          )
                        }
                        className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{txt('Chi tiết', 'View all', '一覧')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================== 5. MODAL FOOTER ==================== */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              {txt(
                '💡 Mẹo: Nhấp trực tiếp vào bất kỳ con số nào trong bảng ma trận để xem ngay danh sách chi tiết các thiết bị tương ứng.',
                '💡 Tip: Click on any count cell in the table to view the underlying equipment list.',
                '💡 ヒント: 数字をクリックすると対象機器の詳細リストが表示されます。'
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              {txt('Đóng Báo Cáo', 'Close Report', '閉じる')}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 6. MODAL DRILL-DOWN (CHI TIẾT THIẾT BỊ THEO Ô CLICK) ==================== */}
      {drillDownData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-4 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 border border-indigo-500/40 rounded-xl">
                  <Laptop className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    {drillDownData.departmentName} - {drillDownData.categoryLabel}
                  </h4>
                  <div className="text-[11px] text-slate-300">
                    {txt('Tổng số lượng thiết bị ghi nhận:', 'Total devices recorded:', '登録機器合計:')}{' '}
                    <span className="font-bold text-white text-xs">
                      {drillDownData.items.reduce((sum, item) => sum + (item.effectiveQuantity || 1), 0)}
                    </span>{' '}
                    {txt('thiết bị', 'devices', '件')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrillDownData(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bảng danh sách chi tiết */}
            <div className="flex-1 overflow-auto p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10">STT</th>
                      <th className="px-3 py-2.5">Tên Tài Sản Cố Định</th>
                      <th className="px-3 py-2.5">Mã Số TSC</th>
                      <th className="px-3 py-2.5">Mã Quản Lý</th>
                      <th className="px-3 py-2.5">Hãng SX</th>
                      <th className="px-3 py-2.5 text-center">Năm SD</th>
                      <th className="px-3 py-2.5 text-center">SL</th>
                      <th className="px-3 py-2.5 text-right">Nguyên Giá Sổ</th>
                      <th className="px-3 py-2.5">Ghi Chú (Người Dùng)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {drillDownData.items.map((item, i) => (
                      <tr key={item.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">
                          {item.name}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {item.fixedAssetCode || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {item.managementCode || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {item.brand || '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">
                          {item.inUseDate || '—'}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {item.effectiveQuantity || 1}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                          {item.bookPrice ? new Intl.NumberFormat('vi-VN').format(item.bookPrice) + ' đ' : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate">
                          {item.noteUser || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
              <button
                type="button"
                onClick={() => setDrillDownData(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {txt('Đóng', 'Close', '閉じる')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

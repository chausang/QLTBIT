'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/context';
import {
  Laptop,
  Boxes,
  FileSpreadsheet,
  Filter,
  RotateCcw,
  Search,
  Building2,
  MapPin,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  Layers,
  ArrowUpDown,
  Download,
  Calendar,
  Sparkles,
  BarChart3,
  TrendingUp,
  Cpu,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  formatAssetSpecsForExport,
  formatDeviceNameAndModel,
  getAssetHardwareComponents,
  getAssetMonitorInfo,
  getAssetExtraHospitalFields,
} from '@/lib/asset-formatter';
import { TablePaginationBar } from '@/components/common/TablePaginationBar';

export default function AssetAndPartsReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const isEn = language === 'en';

  // Active Tab: 'assets' (Thiết bị) | 'parts' (Linh kiện)
  const initialTab = searchParams.get('tab') === 'parts' ? 'parts' : 'assets';
  const [activeTab, setActiveTab] = useState<'assets' | 'parts'>(initialTab);

  // Sync tab with URL
  const handleTabChange = (tab: 'assets' | 'parts') => {
    setActiveTab(tab);
    router.replace(`/assets/reports?tab=${tab}`);
  };

  // ==================== SHARED MASTER DATA ====================
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);

  useEffect(() => {
    // Load dropdown master data
    Promise.all([
      fetch('/api/locations').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/categories').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/vendors').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([locData, catData, venData]) => {
      setLocations(locData.data || []);
      setCategories(catData.data || []);
      setVendors(venData.data || []);
    });
  }, []);

  // ==================== TAB 1: ASSET REPORTS STATE ====================
  const [assetLoading, setAssetLoading] = useState(true);
  const [rawAssets, setRawAssets] = useState<any[]>([]);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(25);

  // Asset Custom Filters
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssetLocation, setSelectedAssetLocation] = useState('');
  const [selectedAssetCategory, setSelectedAssetCategory] = useState('');
  const [selectedAssetCompany, setSelectedAssetCompany] = useState('');
  const [selectedAssetStatus, setSelectedAssetStatus] = useState('');
  const [selectedAssetCondition, setSelectedAssetCondition] = useState('');
  const [selectedAssetBrand, setSelectedAssetBrand] = useState('');
  const [selectedAssetYear, setSelectedAssetYear] = useState('');
  const [selectedAssetReissue, setSelectedAssetReissue] = useState('');

  // Asset Breakdown View mode: 'location' | 'category' | 'condition'
  const [assetBreakdownMode, setAssetBreakdownMode] = useState<'location' | 'category' | 'condition'>('location');

  // Fetch all assets once for fast interactive client filtering and grouping
  const loadAssetsData = useCallback(async () => {
    setAssetLoading(true);
    try {
      const res = await fetch('/api/assets?pageSize=10000');
      const data = await res.json();
      if (data?.data) {
        setRawAssets(data.data);

        // Extract unique companies from assets
        const comps = Array.from(new Set(data.data.map((a: any) => a.companyName).filter(Boolean))) as string[];
        setCompanies(comps);
      }
    } catch (err) {
      console.error('Failed to load assets report data:', err);
    } finally {
      setAssetLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssetsData();
  }, [loadAssetsData]);

  // Extract available brands and manufacturing years from asset list
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    rawAssets.forEach((a) => {
      if (a.brand?.trim()) set.add(a.brand.trim());
    });
    return Array.from(set).sort();
  }, [rawAssets]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    rawAssets.forEach((a) => {
      const fields = getAssetExtraHospitalFields(a.specs, a);
      if (fields.manufacturingYear) set.add(fields.manufacturingYear);
    });
    return Array.from(set).sort().reverse();
  }, [rawAssets]);

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return rawAssets.filter((asset) => {
      // 1. Search keyword
      if (assetSearch.trim()) {
        const query = assetSearch.toLowerCase().trim();
        const hw = getAssetHardwareComponents(asset.specs);
        const mon = getAssetMonitorInfo(asset.specs);
        const ext = getAssetExtraHospitalFields(asset.specs, asset);
        const match =
          asset.name?.toLowerCase().includes(query) ||
          asset.assetTag?.toLowerCase().includes(query) ||
          asset.serialNumber?.toLowerCase().includes(query) ||
          asset.model?.toLowerCase().includes(query) ||
          asset.brand?.toLowerCase().includes(query) ||
          hw.cpu?.toLowerCase().includes(query) ||
          hw.ram?.toLowerCase().includes(query) ||
          hw.hdd?.toLowerCase().includes(query) ||
          mon.brand?.toLowerCase().includes(query) ||
          mon.model?.toLowerCase().includes(query) ||
          ext.oldAssetCode?.toLowerCase().includes(query);
        if (!match) return false;
      }

      // 2. Location
      if (selectedAssetLocation && asset.locationId !== selectedAssetLocation) {
        return false;
      }

      // 3. Category
      if (selectedAssetCategory && asset.categoryId !== selectedAssetCategory) {
        return false;
      }

      // 4. Company
      if (selectedAssetCompany && asset.companyName !== selectedAssetCompany) {
        return false;
      }

      // 5. Status
      if (selectedAssetStatus && asset.status !== selectedAssetStatus) {
        return false;
      }

      // 6. Condition
      if (selectedAssetCondition && asset.condition !== selectedAssetCondition) {
        return false;
      }

      // 7. Brand
      if (selectedAssetBrand && asset.brand?.toLowerCase() !== selectedAssetBrand.toLowerCase()) {
        return false;
      }

      // 8. Manufacturing Year
      if (selectedAssetYear) {
        const ext = getAssetExtraHospitalFields(asset.specs, asset);
        if (ext.manufacturingYear !== selectedAssetYear) return false;
      }

      // 9. Reissue status
      if (selectedAssetReissue) {
        const ext = getAssetExtraHospitalFields(asset.specs, asset);
        if (selectedAssetReissue === '0' && ext.reissueStatus !== '0') return false;
        if (selectedAssetReissue === 'REISSUED' && ext.reissueStatus === '0') return false;
      }

      return true;
    });
  }, [
    rawAssets,
    assetSearch,
    selectedAssetLocation,
    selectedAssetCategory,
    selectedAssetCompany,
    selectedAssetStatus,
    selectedAssetCondition,
    selectedAssetBrand,
    selectedAssetYear,
    selectedAssetReissue,
  ]);

  // Asset KPI Statistics
  const assetKpis = useMemo(() => {
    const total = filteredAssets.length;
    const inUse = filteredAssets.filter((a) => a.status === 'IN_USE').length;
    const available = filteredAssets.filter((a) => a.status === 'AVAILABLE').length;
    const maintenance = filteredAssets.filter((a) => a.status === 'MAINTENANCE' || a.condition === 'BROKEN').length;
    const totalCost = filteredAssets.reduce((sum, a) => sum + (Number(a.purchasePrice) || 0), 0);
    return { total, inUse, available, maintenance, totalCost };
  }, [filteredAssets]);

  // Asset Group Breakdown
  const assetGroupBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; count: number; inUse: number; available: number; maintenance: number }>();

    filteredAssets.forEach((a) => {
      let key = '';
      let label = '';

      if (assetBreakdownMode === 'location') {
        key = a.locationId || 'UNASSIGNED';
        label = a.location?.name || 'Kho IT / Chưa phân bổ';
      } else if (assetBreakdownMode === 'category') {
        key = a.categoryId || 'UNASSIGNED';
        label = a.category?.name || 'Chưa phân loại';
      } else {
        key = a.condition || 'UNKNOWN';
        const condMap: Record<string, string> = {
          NEW: 'Mới 100% (New)',
          GOOD: 'Tốt (Đang dùng tốt)',
          FAIR: 'Bình thường (Cũ)',
          POOR: 'Xuống cấp / Kém',
          BROKEN: 'Hỏng hóc',
        };
        label = condMap[a.condition] || a.condition;
      }

      if (!map.has(key)) {
        map.set(key, { label, count: 0, inUse: 0, available: 0, maintenance: 0 });
      }

      const item = map.get(key)!;
      item.count += 1;
      if (a.status === 'IN_USE') item.inUse += 1;
      if (a.status === 'AVAILABLE') item.available += 1;
      if (a.status === 'MAINTENANCE' || a.condition === 'BROKEN') item.maintenance += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredAssets, assetBreakdownMode]);

  // Paginated Assets
  const paginatedAssets = useMemo(() => {
    const start = (assetPage - 1) * assetPageSize;
    return filteredAssets.slice(start, start + assetPageSize);
  }, [filteredAssets, assetPage, assetPageSize]);

  // Reset Asset Filters
  const resetAssetFilters = () => {
    setAssetSearch('');
    setSelectedAssetLocation('');
    setSelectedAssetCategory('');
    setSelectedAssetCompany('');
    setSelectedAssetStatus('');
    setSelectedAssetCondition('');
    setSelectedAssetBrand('');
    setSelectedAssetYear('');
    setSelectedAssetReissue('');
    setAssetPage(1);
  };

  const hasActiveAssetFilters =
    Boolean(assetSearch) ||
    Boolean(selectedAssetLocation) ||
    Boolean(selectedAssetCategory) ||
    Boolean(selectedAssetCompany) ||
    Boolean(selectedAssetStatus) ||
    Boolean(selectedAssetCondition) ||
    Boolean(selectedAssetBrand) ||
    Boolean(selectedAssetYear) ||
    Boolean(selectedAssetReissue);

  // ==================== TAB 2: SPARE PARTS REPORTS STATE ====================
  const [partsLoading, setPartsLoading] = useState(true);
  const [rawParts, setRawParts] = useState<any[]>([]);
  const [partsPage, setPartsPage] = useState(1);
  const [partsPageSize, setPartsPageSize] = useState(25);

  // Parts Custom Filters
  const [partsSearch, setPartsSearch] = useState('');
  const [selectedPartCategory, setSelectedPartCategory] = useState('');
  const [selectedPartStockStatus, setSelectedPartStockStatus] = useState(''); // 'LOW' | 'OUT' | 'AVAILABLE'
  const [selectedPartLocation, setSelectedPartLocation] = useState('');
  const [selectedPartVendor, setSelectedPartVendor] = useState('');

  const loadPartsData = useCallback(async () => {
    setPartsLoading(true);
    try {
      const res = await fetch('/api/spare-parts');
      const data = await res.json();
      if (data?.spareParts) {
        setRawParts(data.spareParts);
      }
    } catch (err) {
      console.error('Failed to load spare parts report data:', err);
    } finally {
      setPartsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartsData();
  }, [loadPartsData]);

  // Filtered Parts
  const filteredParts = useMemo(() => {
    return rawParts.filter((part) => {
      // 1. Search
      if (partsSearch.trim()) {
        const query = partsSearch.toLowerCase().trim();
        const match =
          part.name?.toLowerCase().includes(query) ||
          part.sku?.toLowerCase().includes(query) ||
          part.notes?.toLowerCase().includes(query);
        if (!match) return false;
      }

      // 2. Category
      if (selectedPartCategory && part.categoryId !== selectedPartCategory) {
        return false;
      }

      // 3. Location
      if (selectedPartLocation && part.locationId !== selectedPartLocation) {
        return false;
      }

      // 4. Vendor
      if (selectedPartVendor && part.vendorId !== selectedPartVendor) {
        return false;
      }

      // 5. Stock Status
      if (selectedPartStockStatus === 'LOW' && part.quantity > part.minStock) {
        return false;
      }
      if (selectedPartStockStatus === 'OUT' && part.quantity > 0) {
        return false;
      }
      if (selectedPartStockStatus === 'AVAILABLE' && part.quantity === 0) {
        return false;
      }

      return true;
    });
  }, [rawParts, partsSearch, selectedPartCategory, selectedPartLocation, selectedPartVendor, selectedPartStockStatus]);

  // Parts KPI Statistics
  const partsKpis = useMemo(() => {
    const totalTypes = filteredParts.length;
    const totalQty = filteredParts.reduce((sum, p) => sum + p.quantity, 0);
    const lowStockCount = filteredParts.filter((p) => p.quantity <= p.minStock && p.quantity > 0).length;
    const outOfStockCount = filteredParts.filter((p) => p.quantity === 0).length;
    const totalValue = filteredParts.reduce((sum, p) => sum + p.quantity * (Number(p.unitPrice) || 0), 0);
    return { totalTypes, totalQty, lowStockCount, outOfStockCount, totalValue };
  }, [filteredParts]);

  // Parts Category Breakdown
  const partsCategoryBreakdown = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalQty: number; totalValue: number; lowStockCount: number }>();

    filteredParts.forEach((p) => {
      const key = p.categoryId || 'UNASSIGNED';
      const label = p.category?.name || 'Chưa phân loại';

      if (!map.has(key)) {
        map.set(key, { label, count: 0, totalQty: 0, totalValue: 0, lowStockCount: 0 });
      }

      const item = map.get(key)!;
      item.count += 1;
      item.totalQty += p.quantity;
      item.totalValue += p.quantity * (Number(p.unitPrice) || 0);
      if (p.quantity <= p.minStock) item.lowStockCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredParts]);

  // Paginated Parts
  const paginatedParts = useMemo(() => {
    const start = (partsPage - 1) * partsPageSize;
    return filteredParts.slice(start, start + partsPageSize);
  }, [filteredParts, partsPage, partsPageSize]);

  // Reset Parts Filters
  const resetPartsFilters = () => {
    setPartsSearch('');
    setSelectedPartCategory('');
    setSelectedPartStockStatus('');
    setSelectedPartLocation('');
    setSelectedPartVendor('');
    setPartsPage(1);
  };

  const hasActivePartsFilters =
    Boolean(partsSearch) ||
    Boolean(selectedPartCategory) ||
    Boolean(selectedPartStockStatus) ||
    Boolean(selectedPartLocation) ||
    Boolean(selectedPartVendor);

  // ==================== EXCEL EXPORT HANDLERS ====================
  // 1. Export Asset Report to Excel (Exact 21-column Hospital & Corporate standard)
  const handleExportAssetExcel = async () => {
    if (filteredAssets.length === 0) {
      alert('Không có thiết bị nào phù hợp với bộ lọc để xuất báo cáo.');
      return;
    }

    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();

      // SHEET 1: TỔNG HỢP BÁO CÁO (Summary)
      const summarySheet = workbook.addWorksheet('Tổng Hợp Thống Kê', {
        views: [{ showGridLines: true }],
      });

      summarySheet.mergeCells('A1:F1');
      const sTitle = summarySheet.getCell('A1');
      sTitle.value = 'BÁO CÁO TỔNG HỢP SỐ LƯỢNG THIẾT BỊ THEO BỘ LỌC TÙY CHỌN';
      sTitle.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      sTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      summarySheet.getRow(1).height = 28;

      summarySheet.addRow([
        'Thời gian xuất:',
        new Date().toLocaleString('vi-VN'),
        'Tổng số thiết bị lọc:',
        filteredAssets.length,
        'Đang dùng:',
        assetKpis.inUse,
      ]);
      summarySheet.addRow([]);

      // Bảng tổng hợp theo Khoa phòng / Vị trí
      summarySheet.addRow(['STT', 'Khoa Phòng / Đơn Vị', 'Tổng Số Lượng', 'Đang Dùng', 'Sẵn Sàng Kho', 'Cần Sửa / Hỏng']);
      const sHead = summarySheet.getRow(4);
      sHead.eachCell((c) => {
        c.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      assetGroupBreakdown.forEach((group, idx) => {
        summarySheet.addRow([idx + 1, group.label, group.count, group.inUse, group.available, group.maintenance]);
      });

      summarySheet.columns = [{ width: 8 }, { width: 32 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 16 }];

      // SHEET 2: BẢNG KÊ CHI TIẾT 21 CỘT (A đến U) CHUẨN XÁC THEO ẢNH
      const detailSheet = workbook.addWorksheet('Danh Sách Chi Tiết', {
        views: [{ showGridLines: true }],
      });

      // Hàng 1
      detailSheet.mergeCells('A1:U1');
      const dTitle = detailSheet.getCell('A1');
      dTitle.value = 'DANH SÁCH THỐNG KÊ CHI TIẾT THIẾT BỊ CNTT (THEO BỘ LỌC)';
      dTitle.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      dTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      detailSheet.getRow(1).height = 30;

      // Hàng 2 & 3: Multi-row Headers
      const r2 = detailSheet.getRow(2);
      r2.values = [
        'STT',
        'QR',
        'Tên khoa phòng',
        'Tên loại thiết bị',
        'Mã thiết bị',
        'Tên thiết bị',
        'Tên hãng sản xuất',
        'Năm sản xuất',
        'Model',
        'Số seri',
        'CPU',
        'RAM',
        'HDD',
        'Màn hình',
        '',
        '',
        '',
        'Tình trạng',
        'Mã thiết bị cũ',
        'Tính cấp lại',
        'Ghi chú',
      ];
      r2.height = 24;

      const r3 = detailSheet.getRow(3);
      r3.values = [
        '', '', '', '', '', '', '', '', '', '', '', '', '',
        'Hãng sx',
        'Năm sx',
        'Model',
        'Số seri',
        '', '', '', '',
      ];
      r3.height = 22;

      // Merge cells header
      detailSheet.mergeCells('A2:A3');
      detailSheet.mergeCells('B2:B3');
      detailSheet.mergeCells('C2:C3');
      detailSheet.mergeCells('D2:D3');
      detailSheet.mergeCells('E2:E3');
      detailSheet.mergeCells('F2:F3');
      detailSheet.mergeCells('G2:G3');
      detailSheet.mergeCells('H2:H3');
      detailSheet.mergeCells('I2:I3');
      detailSheet.mergeCells('J2:J3');
      detailSheet.mergeCells('K2:K3');
      detailSheet.mergeCells('L2:L3');
      detailSheet.mergeCells('M2:M3');
      detailSheet.mergeCells('N2:Q2');
      detailSheet.mergeCells('R2:R3');
      detailSheet.mergeCells('S2:S3');
      detailSheet.mergeCells('T2:T3');
      detailSheet.mergeCells('U2:U3');

      [r2, r3].forEach((r) => {
        r.eachCell((cell) => {
          cell.font = { name: 'Times New Roman', size: 10, bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };
        });
      });

      // Data Rows
      filteredAssets.forEach((asset, idx) => {
        const assignedUser = asset.assignments?.[0]?.user;
        const locName = asset.location?.name || assignedUser?.department || 'Kho IT';
        const catName = asset.category?.name || 'Máy tính';
        const hw = getAssetHardwareComponents(asset.specs);
        const mon = getAssetMonitorInfo(asset.specs);
        const ext = getAssetExtraHospitalFields(asset.specs, asset);

        let condText = 'D';
        if (asset.condition === 'BROKEN' || asset.status === 'MAINTENANCE') condText = 'H';
        else if (asset.condition === 'NEW') condText = 'M';

        const row = detailSheet.addRow([
          idx + 1,
          'In',
          locName,
          catName,
          asset.assetTag,
          asset.name,
          asset.brand || '—',
          ext.manufacturingYear || '—',
          asset.model || '—',
          asset.serialNumber || '—',
          hw.cpu !== '—' ? hw.cpu : '',
          hw.ram !== '—' ? hw.ram : '',
          hw.hdd !== '—' ? hw.hdd : '',
          mon.brand || '',
          mon.year || '',
          mon.model || '',
          mon.serial || '',
          condText,
          ext.oldAssetCode || '',
          ext.reissueStatus || '0',
          asset.notes || '',
        ]);

        row.height = 22;
        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Times New Roman', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          };

          if ([1, 2, 5, 8, 10, 12, 15, 17, 18, 19, 20].includes(colNum)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          }
        });
      });

      detailSheet.columns = [
        { width: 6 },  // A: STT
        { width: 6 },  // B: QR
        { width: 22 }, // C: Khoa phòng
        { width: 16 }, // D: Loại TB
        { width: 15 }, // E: Mã TB
        { width: 20 }, // F: Tên TB
        { width: 14 }, // G: Hãng SX
        { width: 12 }, // H: Năm SX
        { width: 18 }, // I: Model
        { width: 18 }, // J: Serial
        { width: 14 }, // K: CPU
        { width: 10 }, // L: RAM
        { width: 15 }, // M: HDD
        { width: 14 }, // N: Màn hình Hãng
        { width: 12 }, // O: Màn hình Năm
        { width: 16 }, // P: Màn hình Model
        { width: 18 }, // Q: Màn hình SN
        { width: 12 }, // R: Tình trạng
        { width: 14 }, // S: Mã cũ
        { width: 12 }, // T: Cấp lại
        { width: 22 }, // U: Ghi chú
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Bao_Cao_Thong_Ke_Thiet_Bi_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Lỗi xuất báo cáo Excel: ' + (err?.message || err));
    }
  };

  // 2. Export Spare Parts Report to Excel
  const handleExportPartsExcel = async () => {
    if (filteredParts.length === 0) {
      alert('Không có phụ tùng linh kiện nào phù hợp để xuất báo cáo.');
      return;
    }

    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();

      const sheet = workbook.addWorksheet('Báo Cáo Tồn Kho Linh Kiện', {
        views: [{ showGridLines: true }],
      });

      // Title
      sheet.mergeCells('A1:J1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'BÁO CÁO THỐNG KÊ TỒN KHO PHỤ TÙNG & LINH KIỆN CNTT';
      titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 30;

      // Subtitle
      sheet.mergeCells('A2:J2');
      const subCell = sheet.getCell('A2');
      subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số loại: ${filteredParts.length} | Tổng tồn: ${partsKpis.totalQty} cái | Tổng giá trị: ${formatCurrency(partsKpis.totalValue)}`;
      subCell.font = { name: 'Times New Roman', size: 10, italic: true };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;

      sheet.addRow([]);

      // Headers
      const headers = [
        'STT',
        'Mã SKU / Linh Kiện',
        'Tên Phụ Tùng Linh Kiện',
        'Danh Mục',
        'Kho Lưu Trữ',
        'Đơn Vị',
        'Đơn Giá (VND)',
        'Số Lượng Tồn',
        'Định Mức Tối Thiểu',
        'Trạng Thái Tồn Kho',
      ];

      const headerRow = sheet.addRow(headers);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      filteredParts.forEach((part, idx) => {
        let statusText = 'Đủ hàng';
        if (part.quantity === 0) statusText = 'HẾT HÀNG';
        else if (part.quantity <= part.minStock) statusText = 'CẢNH BÁO TỒN THẤP';

        const row = sheet.addRow([
          idx + 1,
          part.sku || '—',
          part.name,
          part.category?.name || 'Chưa phân loại',
          part.location?.name || 'Kho IT',
          part.unit || 'cái',
          part.unitPrice ? Number(part.unitPrice) : 0,
          part.quantity,
          part.minStock,
          statusText,
        ]);

        row.height = 22;
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(7).numFmt = '#,##0 "₫"';
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };

        // Highlight cảnh báo tồn thấp / hết hàng
        if (part.quantity === 0) {
          row.getCell(10).font = { name: 'Times New Roman', bold: true, color: { argb: 'FFDC2626' } };
        } else if (part.quantity <= part.minStock) {
          row.getCell(10).font = { name: 'Times New Roman', bold: true, color: { argb: 'FFD97706' } };
        }
      });

      sheet.columns = [
        { width: 6 },
        { width: 18 },
        { width: 36 },
        { width: 20 },
        { width: 20 },
        { width: 10 },
        { width: 16 },
        { width: 14 },
        { width: 18 },
        { width: 22 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Bao_Cao_Ton_Kho_Linh_Kien_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Lỗi xuất báo cáo Excel: ' + (err?.message || err));
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/assets"
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              {isEn ? 'Assets Management' : 'Quản Lý Tài Sản'}
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold text-blue-600">
              {isEn ? 'Reports & Statistics' : 'Báo Cáo & Thống Kê'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            <span>{isEn ? 'Asset & Spare Parts Reports' : 'Báo Cáo Thống Kê Thiết Bị & Phụ Tùng Linh Kiện'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEn
              ? 'Multi-dimensional statistics, custom filters, and Excel reports matching official department templates.'
              : 'Thống kê số lượng đa chiều, bộ lọc tùy chỉnh chuyên sâu và xuất Excel theo chuẩn biểu mẫu khoa phòng.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={activeTab === 'assets' ? handleExportAssetExcel : handleExportPartsExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{activeTab === 'assets' ? 'Xuất Báo Cáo Thiết Bị' : 'Xuất Báo Cáo Kho Linh Kiện'}</span>
          </button>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => handleTabChange('assets')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'assets'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>{isEn ? 'IT Devices & Assets Report' : 'Báo Cáo Thống Kê Thiết Bị IT'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {filteredAssets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('parts')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'parts'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{isEn ? 'Spare Parts & Inventory Report' : 'Báo Cáo Thống Kê Kho Phụ Tùng Linh Kiện'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
            {filteredParts.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BÁO CÁO THỐNG KÊ THIẾT BỊ IT */}
      {/* ========================================================================= */}
      {activeTab === 'assets' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isEn ? 'Total Filtered Devices' : 'Tổng Số Thiết Bị (Lọc)'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{assetKpis.total}</span>
                <span className="text-xs text-slate-400">thiết bị</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                {isEn ? 'Currently In Use' : 'Đang Cấp Phát Sử Dụng'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 font-mono">{assetKpis.inUse}</span>
                <span className="text-xs text-slate-400">
                  ({assetKpis.total > 0 ? Math.round((assetKpis.inUse / assetKpis.total) * 100) : 0}%)
                </span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                {isEn ? 'Available in IT Stock' : 'Sẵn Sàng Trong Kho'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 font-mono">{assetKpis.available}</span>
                <span className="text-xs text-slate-400">dự phòng</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                {isEn ? 'Maintenance / Broken' : 'Đang Sửa Chữa / Hỏng'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600 font-mono">{assetKpis.maintenance}</span>
                <span className="text-xs text-slate-400">cần xử lý</span>
              </div>
            </div>
          </div>

          {/* BỘ LỌC TÙY CHỈNH RIÊNG CHO THIẾT BỊ */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  {isEn ? 'Custom Asset Filters' : 'Bộ Lọc Báo Cáo Thiết Bị Tùy Chỉnh'}
                </h3>
              </div>
              {hasActiveAssetFilters && (
                <button
                  type="button"
                  onClick={resetAssetFilters}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Reset Filters' : 'Xóa bộ lọc'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search keyword */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Keyword Search' : 'Từ khóa tìm kiếm'}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Mã, tên, CPU, RAM, Model..."
                    value={assetSearch}
                    onChange={(e) => {
                      setAssetSearch(e.target.value);
                      setAssetPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Khoa phòng / Vị trí */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Location / Department' : 'Khoa phòng / Vị trí'}
                </label>
                <select
                  value={selectedAssetLocation}
                  onChange={(e) => {
                    setSelectedAssetLocation(e.target.value);
                    setAssetPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả khoa phòng / vị trí --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loại thiết bị / Danh mục */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Device Category' : 'Tên loại thiết bị'}
                </label>
                <select
                  value={selectedAssetCategory}
                  onChange={(e) => {
                    setSelectedAssetCategory(e.target.value);
                    setAssetPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả loại thiết bị --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      📦 {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Công ty quản lý */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Company' : 'Công ty quản lý'}
                </label>
                <select
                  value={selectedAssetCompany}
                  onChange={(e) => {
                    setSelectedAssetCompany(e.target.value);
                    setAssetPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả công ty --</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      🏢 {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trạng thái hoạt động */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Status' : 'Trạng thái hoạt động'}
                </label>
                <select
                  value={selectedAssetStatus}
                  onChange={(e) => {
                    setSelectedAssetStatus(e.target.value);
                    setAssetPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả trạng thái --</option>
                  <option value="IN_USE">🔵 Đang sử dụng (IN_USE)</option>
                  <option value="AVAILABLE">🟢 Sẵn sàng trong kho (AVAILABLE)</option>
                  <option value="MAINTENANCE">🟡 Đang bảo trì (MAINTENANCE)</option>
                  <option value="RETIRED">⚪ Đã thanh lý (RETIRED)</option>
                  <option value="LOST">🔴 Mất / Thất lạc (LOST)</option>
                </select>
              </div>

              {/* Tình trạng vật lý */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Condition' : 'Tình trạng vật lý'}
                </label>
                <select
                  value={selectedAssetCondition}
                  onChange={(e) => {
                    setSelectedAssetCondition(e.target.value);
                    setAssetPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả tình trạng --</option>
                  <option value="NEW">Mới 100% (New)</option>
                  <option value="GOOD">Tốt (Good / D)</option>
                  <option value="FAIR">Bình thường (Fair)</option>
                  <option value="POOR">Cũ / Xuống cấp (Poor)</option>
                  <option value="BROKEN">Hỏng hóc (Broken)</option>
                </select>
              </div>

              {/* Năm sản xuất */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Manufacturing Year' : 'Năm sản xuất'}
                </label>
                <select
                  value={selectedAssetYear}
                  onChange={(e) => {
                    setSelectedAssetYear(e.target.value);
                    setAssetPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả năm sản xuất --</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      📅 Năm {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tính cấp lại */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Reissue Status' : 'Tính cấp lại'}
                </label>
                <select
                  value={selectedAssetReissue}
                  onChange={(e) => {
                    setSelectedAssetReissue(e.target.value);
                    setAssetPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả --</option>
                  <option value="0">0: Chưa cấp lại (Cấp ban đầu)</option>
                  <option value="REISSUED">&gt;0: Đã từng cấp lại</option>
                </select>
              </div>
            </div>
          </div>

          {/* BẢNG TỔNG HỢP SỐ LƯỢNG THEO NHÓM */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Bảng Tổng Hợp Số Lượng Thiết Bị Theo Nhóm</span>
                </h4>
                <p className="text-xs text-slate-400">Thống kê số lượng máy tính, thiết bị theo từng tiêu chí</p>
              </div>

              <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAssetBreakdownMode('location')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    assetBreakdownMode === 'location' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Theo Khoa Phòng
                </button>
                <button
                  type="button"
                  onClick={() => setAssetBreakdownMode('category')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    assetBreakdownMode === 'category' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Theo Loại Thiết Bị
                </button>
                <button
                  type="button"
                  onClick={() => setAssetBreakdownMode('condition')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    assetBreakdownMode === 'condition' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Theo Tình Trạng
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 w-12 text-center">STT</th>
                    <th className="py-2.5 px-4">{assetBreakdownMode === 'location' ? 'Khoa Phòng / Vị Trí' : assetBreakdownMode === 'category' ? 'Loại Thiết Bị' : 'Tình Trạng Vật Lý'}</th>
                    <th className="py-2.5 px-4 text-center">Tổng Số Lượng</th>
                    <th className="py-2.5 px-4 text-center">Tỷ Lệ %</th>
                    <th className="py-2.5 px-4 text-center text-blue-600">Đang Sử Dụng</th>
                    <th className="py-2.5 px-4 text-center text-emerald-600">Sẵn Sàng Kho</th>
                    <th className="py-2.5 px-4 text-center text-amber-600">Bảo Trì / Hỏng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assetGroupBreakdown.map((row, idx) => {
                    const pct = assetKpis.total > 0 ? Math.round((row.count / assetKpis.total) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{row.label}</td>
                        <td className="py-2.5 px-4 text-center font-black font-mono text-slate-900 dark:text-white">{row.count}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                          <span className="inline-block w-12">{pct}%</span>
                          <span className="inline-block w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden align-middle ml-1">
                            <span className="block h-full bg-blue-600" style={{ width: `${pct}%` }} />
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-blue-700 dark:text-blue-400">{row.inUse}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-emerald-700 dark:text-emerald-400">{row.available}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-amber-700 dark:text-amber-400">{row.maintenance}</td>
                      </tr>
                    );
                  })}
                  {assetGroupBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không có dữ liệu phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BẢNG CHI TIẾT THIẾT BỊ THEO MẪU 21 CỘT */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-2">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>Danh Sách Chi Tiết Thiết Bị (Theo Mẫu Biểu Bệnh Viện / Cơ Quan)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Hiển thị {paginatedAssets.length} trên tổng số {filteredAssets.length} thiết bị phù hợp
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-2.5 text-center w-10">STT</th>
                    <th className="py-2.5 px-2 text-center w-10">QR</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Tên Khoa Phòng</th>
                    <th className="py-2.5 px-2.5 min-w-[110px]">Loại Thiết Bị</th>
                    <th className="py-2.5 px-2.5 min-w-[100px]">Mã Thiết Bị</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Tên Thiết Bị</th>
                    <th className="py-2.5 px-2.5 min-w-[90px]">Hãng SX</th>
                    <th className="py-2.5 px-2 text-center min-w-[70px]">Năm SX</th>
                    <th className="py-2.5 px-2.5 min-w-[120px]">Model & Số Seri</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Cấu Hình (CPU / RAM / HDD)</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Màn Hình Đi Kèm</th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">Tình Trạng</th>
                    <th className="py-2.5 px-2 text-center min-w-[70px]">Mã Cũ</th>
                    <th className="py-2.5 px-2 text-center min-w-[60px]">Cấp Lại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedAssets.map((asset, idx) => {
                    const globalIdx = (assetPage - 1) * assetPageSize + idx + 1;
                    const assignedUser = asset.assignments?.[0]?.user;
                    const locName = asset.location?.name || assignedUser?.department || 'Kho IT';
                    const catName = asset.category?.name || 'Máy tính';
                    const hw = getAssetHardwareComponents(asset.specs);
                    const mon = getAssetMonitorInfo(asset.specs);
                    const ext = getAssetExtraHospitalFields(asset.specs, asset);

                    return (
                      <tr key={asset.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">{globalIdx}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            In
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{locName}</td>
                        <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300">{catName}</td>
                        <td className="py-2.5 px-2.5 font-mono font-bold text-blue-700 dark:text-blue-400">{asset.assetTag}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{asset.name}</td>
                        <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300">{asset.brand || '—'}</td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">{ext.manufacturingYear || '—'}</td>
                        <td className="py-2.5 px-2.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{asset.model || '—'}</div>
                          {asset.serialNumber && <div className="text-[10px] font-mono text-slate-400">SN: {asset.serialNumber}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] space-y-0.5">
                          {hw.cpu !== '—' && <div className="text-slate-700 dark:text-slate-300"><span className="font-bold">CPU:</span> {hw.cpu}</div>}
                          {hw.ram !== '—' && <div className="text-slate-700 dark:text-slate-300"><span className="font-bold">RAM:</span> {hw.ram}</div>}
                          {hw.hdd !== '—' && <div className="text-slate-700 dark:text-slate-300"><span className="font-bold">Ổ cứng:</span> {hw.hdd}</div>}
                          {hw.cpu === '—' && hw.ram === '—' && hw.hdd === '—' && <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {mon.brand || mon.model ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-indigo-700 dark:text-indigo-400">
                                {mon.brand} {mon.model} {mon.year ? `(${mon.year})` : ''}
                              </div>
                              {mon.serial && <div className="text-[10px] font-mono text-slate-400">SN: {mon.serial}</div>}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            asset.condition === 'BROKEN' || asset.status === 'MAINTENANCE'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {asset.condition === 'BROKEN' || asset.status === 'MAINTENANCE' ? 'H' : 'D'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[10.5px] text-slate-500">{ext.oldAssetCode || '—'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{ext.reissueStatus || '0'}</td>
                      </tr>
                    );
                  })}
                  {paginatedAssets.length === 0 && (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        Không có thiết bị nào phù hợp với các bộ lọc đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <TablePaginationBar
                page={assetPage}
                pageSize={assetPageSize}
                total={filteredAssets.length}
                onPageChange={setAssetPage}
                onPageSizeChange={(newSize) => {
                  setAssetPageSize(newSize);
                  setAssetPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BÁO CÁO THỐNG KÊ KHO PHỤ TÙNG & LINH KIỆN */}
      {/* ========================================================================= */}
      {activeTab === 'parts' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 KPI CARDS LINH KIỆN */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isEn ? 'Total Part Types' : 'Tổng Chủng Loại Linh Kiện'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{partsKpis.totalTypes}</span>
                <span className="text-xs text-slate-400">mã linh kiện</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                {isEn ? 'Total In Stock Quantity' : 'Tổng Số Lượng Tồn Kho'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 font-mono">{partsKpis.totalQty}</span>
                <span className="text-xs text-slate-400">chiếc / cái</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                {isEn ? 'Low Stock Warning' : 'Cảnh Báo Tồn Thấp'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600 font-mono">{partsKpis.lowStockCount}</span>
                <span className="text-xs text-slate-400">dưới định mức</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                {isEn ? 'Total Inventory Value' : 'Tổng Giá Trị Tồn Kho'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-emerald-600 font-mono">{formatCurrency(partsKpis.totalValue)}</span>
              </div>
            </div>
          </div>

          {/* BỘ LỌC TÙY CHỈNH RIÊNG CHO PHỤ TÙNG LINH KIỆN */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  {isEn ? 'Custom Spare Parts Filters' : 'Bộ Lọc Báo Cáo Linh Kiện Tùy Chỉnh'}
                </h3>
              </div>
              {hasActivePartsFilters && (
                <button
                  type="button"
                  onClick={resetPartsFilters}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Reset Filters' : 'Xóa bộ lọc'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Search */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Search Part Name or SKU' : 'Tên phụ tùng hoặc mã SKU'}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="RAM, SSD, nguồn, chuột..."
                    value={partsSearch}
                    onChange={(e) => {
                      setPartsSearch(e.target.value);
                      setPartsPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Danh mục */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Part Category' : 'Nhóm / Danh mục linh kiện'}
                </label>
                <select
                  value={selectedPartCategory}
                  onChange={(e) => {
                    setSelectedPartCategory(e.target.value);
                    setPartsPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả nhóm linh kiện --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      📦 {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trạng thái tồn kho */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Stock Status' : 'Tình trạng tồn kho'}
                </label>
                <select
                  value={selectedPartStockStatus}
                  onChange={(e) => {
                    setSelectedPartStockStatus(e.target.value);
                    setPartsPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả tình trạng tồn --</option>
                  <option value="AVAILABLE">🟢 Còn hàng (&gt; 0)</option>
                  <option value="LOW">🟡 Cảnh báo tồn thấp (≤ mức tối thiểu)</option>
                  <option value="OUT">🔴 Đã hết hàng (= 0)</option>
                </select>
              </div>

              {/* Kho lưu trữ */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {isEn ? 'Storage Location' : 'Kho / Vị trí lưu trữ'}
                </label>
                <select
                  value={selectedPartLocation}
                  onChange={(e) => {
                    setSelectedPartLocation(e.target.value);
                    setPartsPage(1);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Tất cả kho lưu trữ --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BẢNG TỔNG HỢP THEO DANH MỤC LINH KIỆN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Bảng Thống Kê Số Lượng & Giá Trị Tồn Kho Theo Nhóm Linh Kiện</span>
              </h4>
              <p className="text-xs text-slate-400">Tổng hợp tổng tồn và cảnh báo thiếu hụt của từng chủng loại</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 w-12 text-center">STT</th>
                    <th className="py-2.5 px-4">Nhóm Phụ Tùng Linh Kiện</th>
                    <th className="py-2.5 px-4 text-center">Số Loại Mã (SKU)</th>
                    <th className="py-2.5 px-4 text-center">Tổng Số Lượng Tồn</th>
                    <th className="py-2.5 px-4 text-right">Tổng Giá Trị Tồn (VND)</th>
                    <th className="py-2.5 px-4 text-center text-amber-600">Linh Kiện Sắp Hết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {partsCategoryBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{row.label}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">{row.count}</td>
                      <td className="py-2.5 px-4 text-center font-black font-mono text-blue-600">{row.totalQty}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(row.totalValue)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-amber-600">{row.lowStockCount}</td>
                    </tr>
                  ))}
                  {partsCategoryBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Không có dữ liệu linh kiện phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BẢNG CHI TIẾT DANH SÁCH LINH KIỆN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-2">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-600" />
                  <span>Danh Sách Chi Tiết Phụ Tùng Linh Kiện Sau Khi Lọc</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Hiển thị {paginatedParts.length} trên tổng số {filteredParts.length} linh kiện phù hợp
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 text-center w-12">STT</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Mã SKU</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Tên Phụ Tùng Linh Kiện</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Nhóm Danh Mục</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Kho Lưu Trữ</th>
                    <th className="py-2.5 px-3 text-center">Đơn Vị</th>
                    <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                    <th className="py-2.5 px-3 text-center">Tồn Kho</th>
                    <th className="py-2.5 px-3 text-center">Định Mức</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    <th className="py-2.5 px-3 text-right">Tổng Tiền Tồn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedParts.map((part, idx) => {
                    const globalIdx = (partsPage - 1) * partsPageSize + idx + 1;
                    const totalVal = part.quantity * (Number(part.unitPrice) || 0);

                    return (
                      <tr key={part.id} className="hover:bg-purple-50/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{globalIdx}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-700 dark:text-purple-400">
                          {part.sku || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{part.name}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{part.category?.name || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{part.location?.name || 'Kho IT'}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{part.unit || 'cái'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {part.unitPrice ? formatCurrency(part.unitPrice) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 dark:text-white">
                          <span
                            className={`px-2 py-0.5 rounded-lg ${
                              part.quantity === 0
                                ? 'bg-rose-100 text-rose-700'
                                : part.quantity <= part.minStock
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {part.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{part.minStock}</td>
                        <td className="py-2.5 px-3 text-center">
                          {part.quantity === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                              Hết hàng
                            </span>
                          ) : part.quantity <= part.minStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 border border-amber-200">
                              Tồn thấp
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Đủ hàng
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {totalVal > 0 ? formatCurrency(totalVal) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedParts.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        Không có linh kiện nào phù hợp với các bộ lọc đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <TablePaginationBar
                page={partsPage}
                pageSize={partsPageSize}
                total={filteredParts.length}
                onPageChange={setPartsPage}
                onPageSizeChange={(newSize) => {
                  setPartsPageSize(newSize);
                  setPartsPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

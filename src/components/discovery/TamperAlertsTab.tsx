'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Package,
  History,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle2,
  Building2,
  User as UserIcon,
  Laptop,
  Cpu,
  HardDrive,
  Eye,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Calendar,
  XCircle,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useQuickViewStore } from '@/lib/quick-view-store';
import { TablePaginationBar } from '@/components/common/TablePaginationBar';
import ModuleDataToolbar from '@/components/common/ModuleDataToolbar';
import ExcelJS from 'exceljs';

interface ChangeRecord {
  id: string;
  timestamp: string;
  category: 'HARDWARE' | 'SOFTWARE' | string;
  action: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'ACKNOWLEDGED' | string;
  component: string;
  oldValue: string;
  newValue: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  description: string;
  // Augmented properties for flat audit table
  assetId?: string;
  assetTag?: string;
  assetName?: string;
  department?: string;
  assignedTo?: string;
  hostname?: string;
}

interface AlertAsset {
  assetId: string;
  assetTag: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  categoryName: string;
  assignedTo: string | null;
  department: string | null;
  hostname: string;
  ipAddress: string | null;
  macAddress: string | null;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  os: string | null;
  lastScannedAt: string;
  hardwareChangeAlert: string | null;
  softwareChangeAlert: string | null;
  crackDetection: {
    hasSuspect: boolean;
    warnings?: string[];
    detectedTools?: string[];
  } | null;
  changeHistory: ChangeRecord[];
  lastChangeDetectedAt?: string | null;
  specs?: any;
}

export function TamperAlertsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { openQuickView } = useQuickViewStore();

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AlertAsset[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'HARDWARE' | 'CRACK' | 'SOFTWARE'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE_ALERTS' | 'AUDIT_LOG'>('ACTIVE_ALERTS');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination for Audit Log
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/discovery/agents');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAssets(json.data);
      }
    } catch (err) {
      console.error('Failed to load discovery agent reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Filtered active alerts (devices currently flagged)
  const activeAlertDevices = useMemo(() => {
    return assets.filter((a) => {
      const hasHw = !!a.hardwareChangeAlert;
      const hasCrack = !!a.crackDetection?.hasSuspect || (Array.isArray(a.crackDetection?.detectedTools) && a.crackDetection.detectedTools.length > 0);
      const hasSw = !!a.softwareChangeAlert;

      if (!hasHw && !hasCrack && !hasSw) return false;

      if (filterType === 'HARDWARE' && !hasHw) return false;
      if (filterType === 'CRACK' && !hasCrack) return false;
      if (filterType === 'SOFTWARE' && !hasSw) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTag = a.assetTag?.toLowerCase().includes(q);
        const matchName = a.name?.toLowerCase().includes(q);
        const matchHost = a.hostname?.toLowerCase().includes(q);
        const matchIp = a.ipAddress?.toLowerCase().includes(q);
        const matchDept = a.department?.toLowerCase().includes(q);
        const matchUser = a.assignedTo?.toLowerCase().includes(q);
        const matchAlert =
          (a.hardwareChangeAlert || '').toLowerCase().includes(q) ||
          (a.softwareChangeAlert || '').toLowerCase().includes(q) ||
          (a.crackDetection?.warnings || []).join(' ').toLowerCase().includes(q);

        return matchTag || matchName || matchHost || matchIp || matchDept || matchUser || matchAlert;
      }

      return true;
    });
  }, [assets, filterType, search]);

  // 2. Flattened change history for master audit log
  const flattenedHistory: ChangeRecord[] = useMemo(() => {
    const list: ChangeRecord[] = [];
    assets.forEach((a) => {
      if (Array.isArray(a.changeHistory) && a.changeHistory.length > 0) {
        a.changeHistory.forEach((rec) => {
          list.push({
            ...rec,
            assetId: a.assetId,
            assetTag: a.assetTag,
            assetName: a.name,
            department: a.department || 'Chưa gán khoa phòng',
            assignedTo: a.assignedTo || 'Chưa cấp phát',
            hostname: a.hostname,
          });
        });
      }
    });

    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter
    return list.filter((item) => {
      if (filterType === 'HARDWARE' && item.category !== 'HARDWARE') return false;
      if (filterType === 'SOFTWARE' && item.category !== 'SOFTWARE') return false;
      if (filterType === 'CRACK' && item.category !== 'CRACK' && !item.description?.includes('crack') && !item.component?.includes('KMS')) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchText =
          (item.assetTag || '').toLowerCase().includes(q) ||
          (item.assetName || '').toLowerCase().includes(q) ||
          (item.department || '').toLowerCase().includes(q) ||
          (item.assignedTo || '').toLowerCase().includes(q) ||
          (item.hostname || '').toLowerCase().includes(q) ||
          (item.component || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.oldValue || '').toLowerCase().includes(q) ||
          (item.newValue || '').toLowerCase().includes(q);
        return matchText;
      }

      return true;
    });
  }, [assets, filterType, search]);

  // KPI counts
  const kpiStats = useMemo(() => {
    let hwCount = 0;
    let crackCount = 0;
    let swCount = 0;
    let totalEvents = 0;

    assets.forEach((a) => {
      if (a.hardwareChangeAlert) hwCount++;
      if (a.crackDetection?.hasSuspect || (a.crackDetection?.detectedTools && a.crackDetection.detectedTools.length > 0)) crackCount++;
      if (a.softwareChangeAlert) swCount++;
      if (Array.isArray(a.changeHistory)) totalEvents += a.changeHistory.length;
    });

    return { hwCount, crackCount, swCount, totalEvents, totalActive: hwCount + crackCount + swCount };
  }, [assets]);

  // Acknowledge / Clear alert
  const handleClearAlert = async (assetId: string, alertType: 'HARDWARE' | 'SOFTWARE' | 'CRACK' | 'ALL') => {
    try {
      setActionLoadingId(assetId);
      const res = await fetch('/api/assets/clear-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, alertType }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.message || 'Đã xác nhận kiểm tra và xóa cảnh báo!'}`);
        await fetchData();
      } else {
        showToast(`❌ Lỗi: ${data.error || 'Không thể xóa cảnh báo'}`);
      }
    } catch (err: any) {
      showToast(`❌ Lỗi mạng: ${err.message || 'Không thể kết nối'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Simply IT Asset Management';
      workbook.created = new Date();

      // Sheet 1: Active Alerts
      const sheetAlerts = workbook.addWorksheet('Cảnh Báo Đang Hoạt Động', {
        views: [{ showGridLines: true }],
      });
      sheetAlerts.addRow([
        'STT',
        'Mã Thiết Bị',
        'Tên Thiết Bị',
        'Khoa / Phòng Ban',
        'Người Sử Dụng',
        'Hostname',
        'Địa Chỉ IP',
        'Loại Cảnh Báo',
        'Chi Tiết Can Thiệp / Cảnh Báo',
        'Thời Gian Quét Gần Nhất',
      ]);
      const headerRow1 = sheetAlerts.getRow(1);
      headerRow1.height = 26;
      headerRow1.eachCell((cell) => {
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      activeAlertDevices.forEach((dev, idx) => {
        const alertTypes: string[] = [];
        const alertDescs: string[] = [];

        if (dev.hardwareChangeAlert) {
          alertTypes.push('THÁO/ĐỔI LINH KIỆN PHẦN CỨNG');
          alertDescs.push(`[Phần cứng] ${dev.hardwareChangeAlert}`);
        }
        if (dev.crackDetection?.hasSuspect || (dev.crackDetection?.detectedTools && dev.crackDetection.detectedTools.length > 0)) {
          alertTypes.push('PHÁT HIỆN CRACK / BẺ KHÓA');
          alertDescs.push(`[Crack] ${(dev.crackDetection.detectedTools || []).join(', ')} ${(dev.crackDetection.warnings || []).join('; ')}`);
        }
        if (dev.softwareChangeAlert) {
          alertTypes.push('CÀI ĐẶT / GỠ BỎ PHẦN MỀM');
          alertDescs.push(`[Phần mềm] ${dev.softwareChangeAlert}`);
        }

        const r = sheetAlerts.addRow([
          idx + 1,
          dev.assetTag,
          dev.name,
          dev.department || 'Chưa gán',
          dev.assignedTo || 'Chưa cấp phát',
          dev.hostname,
          dev.ipAddress || '',
          alertTypes.join(' | '),
          alertDescs.join(' --- '),
          dev.lastScannedAt ? new Date(dev.lastScannedAt).toLocaleString('vi-VN') : '',
        ]);
        r.height = 22;
      });

      sheetAlerts.columns = [
        { width: 6 },
        { width: 16 },
        { width: 28 },
        { width: 24 },
        { width: 22 },
        { width: 20 },
        { width: 16 },
        { width: 26 },
        { width: 45 },
        { width: 22 },
      ];

      // Sheet 2: Master Audit Log
      const sheetAudit = workbook.addWorksheet('Nhật Ký Thay Đổi Cấu Hình', {
        views: [{ showGridLines: true }],
      });
      sheetAudit.addRow([
        'STT',
        'Thời Gian',
        'Mã Thiết Bị',
        'Tên Thiết Bị',
        'Khoa / Phòng Quản Lý',
        'Người Giữ Máy',
        'Phân Loại',
        'Hành Động',
        'Linh Kiện / Phần Mềm',
        'Giá Trị Trước Đó',
        'Giá Trị Sau Khi Thay Đổi',
        'Mức Độ',
        'Mô Tả Chi Tiết',
      ]);
      const headerRow2 = sheetAudit.getRow(1);
      headerRow2.height = 26;
      headerRow2.eachCell((cell) => {
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      flattenedHistory.forEach((log, idx) => {
        const r = sheetAudit.addRow([
          idx + 1,
          log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '',
          log.assetTag || '',
          log.assetName || '',
          log.department || '',
          log.assignedTo || '',
          log.category === 'HARDWARE' ? 'Phần cứng' : 'Phần mềm',
          log.action === 'ADDED' ? 'Cài đặt mới' : log.action === 'REMOVED' ? 'Đã gỡ bỏ' : 'Thay đổi cấu hình',
          log.component,
          log.oldValue || '-',
          log.newValue || '-',
          log.severity || 'INFO',
          log.description || '',
        ]);
        r.height = 20;
      });

      sheetAudit.columns = [
        { width: 6 },
        { width: 20 },
        { width: 16 },
        { width: 26 },
        { width: 24 },
        { width: 20 },
        { width: 14 },
        { width: 16 },
        { width: 26 },
        { width: 22 },
        { width: 22 },
        { width: 12 },
        { width: 40 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `Bao-Cao-Canh-Bao-Va-Nhat-Ky-Thay-Doi-${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('✅ Đã xuất báo cáo cảnh báo và nhật ký ra file Excel thành công!');
    } catch (err) {
      console.error('Export Error:', err);
      showToast('❌ Lỗi khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination slice for Audit Log
  const totalAuditPages = Math.ceil(flattenedHistory.length / auditPageSize) || 1;
  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return flattenedHistory.slice(start, start + auditPageSize);
  }, [flattenedHistory, auditPage, auditPageSize]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-white rounded-3xl border border-slate-200 shadow-2xs">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-bold">
          {isEn ? 'Loading tamper alerts & hardware change history...' : 'Đang tải danh sách cảnh báo tháo linh kiện & nhật ký thay đổi...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Hardware Tamper */}
        <div
          onClick={() => {
            setFilterType('HARDWARE');
            setActiveSubTab('ACTIVE_ALERTS');
          }}
          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs ${
            filterType === 'HARDWARE'
              ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              {isEn ? 'Hardware Tamper' : 'Tháo / Đổi Linh Kiện'}
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 font-mono">{kpiStats.hwCount}</span>
            <span className="text-xs text-amber-600 font-semibold">{isEn ? 'machines' : 'máy bị cảnh báo'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">RAM giảm, tráo đổi ổ cứng, CPU, mainboard</p>
        </div>

        {/* Card 2: Crack & HackTools */}
        <div
          onClick={() => {
            setFilterType('CRACK');
            setActiveSubTab('ACTIVE_ALERTS');
          }}
          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs ${
            filterType === 'CRACK'
              ? 'bg-rose-500/10 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
              {isEn ? 'Crack & HackTools' : 'Phần Mềm Lạ / Crack'}
            </span>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 font-mono">{kpiStats.crackCount}</span>
            <span className="text-xs text-rose-600 font-semibold">{isEn ? 'threats' : 'máy nguy hiểm'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Phát hiện KMSAuto, KMSPico, bẻ khóa độc hại</p>
        </div>

        {/* Card 3: Software Change */}
        <div
          onClick={() => {
            setFilterType('SOFTWARE');
            setActiveSubTab('ACTIVE_ALERTS');
          }}
          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs ${
            filterType === 'SOFTWARE'
              ? 'bg-blue-500/10 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
              {isEn ? 'Software Changes' : 'Cài / Gỡ Phần Mềm'}
            </span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 font-mono">{kpiStats.swCount}</span>
            <span className="text-xs text-blue-600 font-semibold">{isEn ? 'machines' : 'máy thay đổi app'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Phần mềm mới cài thêm hoặc bị gỡ bỏ</p>
        </div>

        {/* Card 4: Total Change History Records */}
        <div
          onClick={() => {
            setFilterType('ALL');
            setActiveSubTab('AUDIT_LOG');
          }}
          className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs ${
            activeSubTab === 'AUDIT_LOG'
              ? 'bg-indigo-500/10 border-indigo-400 ring-2 ring-indigo-400/20'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              {isEn ? 'Total Audit Events' : 'Mục Nhật Ký Thay Đổi'}
            </span>
            <History className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 font-mono">{kpiStats.totalEvents}</span>
            <span className="text-xs text-indigo-600 font-semibold">{isEn ? 'events' : 'sự kiện ghi nhận'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Xem dòng thời gian can thiệp chi tiết</p>
        </div>
      </div>

      {/* Control Bar: Subtabs, Filter, Search, Export */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sub-tabs buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveSubTab('ACTIVE_ALERTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'ACTIVE_ALERTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEn ? 'Active Alerts' : 'Thiết Bị Đang Có Cảnh Báo'}</span>
              {activeAlertDevices.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black font-mono">
                  {activeAlertDevices.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('AUDIT_LOG')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'AUDIT_LOG'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isEn ? 'Change Audit Log' : 'Mục Nhật Ký Thay Đổi (Toàn Hệ Thống)'}</span>
              {flattenedHistory.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black font-mono">
                  {flattenedHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Action buttons: Export Excel, JSON Backup / Restore & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <ModuleDataToolbar
              moduleKey="tamper-alerts"
              moduleName={isEn ? 'Hardware Tamper Alerts & Audit' : 'Cảnh Báo Linh Kiện & Nhật Ký'}
              currentData={activeSubTab === 'ACTIVE_ALERTS' ? activeAlertDevices : flattenedHistory}
              onDataRefresh={fetchData}
              isEn={isEn}
            />

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang xuất Excel...' : 'Xuất Báo Cáo Excel'}</span>
            </button>

            <button
              type="button"
              onClick={fetchData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Lọc:</span>
            </span>
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất Cả
            </button>
            <button
              type="button"
              onClick={() => setFilterType('HARDWARE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'HARDWARE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              ⚠️ Tháo Linh Kiện
            </button>
            <button
              type="button"
              onClick={() => setFilterType('CRACK')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'CRACK'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              🛡️ Phần Mềm Lạ / Crack
            </button>
            <button
              type="button"
              onClick={() => setFilterType('SOFTWARE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'SOFTWARE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              📦 Cài / Gỡ Phần Mềm
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo Mã máy, Hostname, Khoa phòng, Người dùng, Tên phần mềm hoặc linh kiện..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: ACTIVE ALERTS (THIẾT BỊ ĐANG CÓ CẢNH BÁO)        */}
      {/* ======================================================== */}
      {activeSubTab === 'ACTIVE_ALERTS' && (
        <div className="space-y-3">
          {activeAlertDevices.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-black text-sm text-slate-800">
                {isEn ? 'All Machines Secure - No Active Tamper Alerts!' : 'Hệ Thống An Toàn - Không Có Cảnh Báo Bất Thường Nào!'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isEn
                  ? 'No hardware disassembly, unauthorized software changes, or crack tools detected.'
                  : 'Tất cả máy trạm đều giữ nguyên vẹn cấu hình ban đầu (RAM, Ổ cứng, CPU) và không phát hiện phần mềm bẻ khóa độc hại.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlertDevices.map((dev) => {
                const isWorking = actionLoadingId === dev.assetId;

                return (
                  <div
                    key={dev.assetId}
                    className="p-4 bg-white rounded-3xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-3 transition-all"
                  >
                    {/* Header: Device Name & Department */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 shrink-0">
                          <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                              {dev.assetTag}
                            </span>
                            <h3 className="font-black text-xs sm:text-sm text-slate-900">{dev.name}</h3>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({dev.hostname || 'Chưa có hostname'})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              <span>{dev.department || 'Chưa gán khoa phòng'}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-600">
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              <span>{dev.assignedTo || 'Chưa cấp phát'}</span>
                            </span>
                            {dev.ipAddress && (
                              <span className="text-slate-400 font-mono text-[10.5px]">
                                IP: {dev.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => openQuickView('asset', dev.assetId)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Nhanh</span>
                        </button>

                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleClearAlert(dev.assetId, 'ALL')}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="Xác nhận IT đã kiểm tra thực tế và xóa cờ cảnh báo này"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isWorking ? 'Đang xử lý...' : '✓ Đã Kiểm Tra & Xóa Cảnh Báo'}</span>
                        </button>
                      </div>
                    </div>

                    {/* ALERTS BLOCK */}
                    <div className="space-y-2.5">
                      {/* 1. Hardware Tamper Box */}
                      {dev.hardwareChangeAlert && (
                        <div className="p-3.5 bg-amber-500/10 border-2 border-amber-400/80 rounded-2xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-black text-xs text-amber-900 uppercase tracking-wide">
                              <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                              <span>⚠️ PHÁT HIỆN THAY ĐỔI CẤU HÌNH PHẦN CỨNG (THÁO TRỘM / TRÁO ĐỔI)!</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                              Mức độ: Nghiêm trọng
                            </span>
                          </div>
                          <p className="text-xs font-bold text-amber-950 bg-white/80 p-2 rounded-xl border border-amber-200 font-mono">
                            {dev.hardwareChangeAlert}
                          </p>
                          <p className="text-[10.5px] text-amber-800">
                            Cảnh báo: Linh kiện thực tế hiện tại của máy khác với thông số ban đầu đã lưu trong hồ sơ tài sản (Ví dụ: RAM giảm, thay đổi ổ cứng, thay CPU).
                          </p>
                        </div>
                      )}

                      {/* 2. Crack / KMS Detection Box */}
                      {(dev.crackDetection?.hasSuspect || (dev.crackDetection?.detectedTools && dev.crackDetection.detectedTools.length > 0)) && (
                        <div className="p-3.5 bg-rose-500/10 border-2 border-rose-400/80 rounded-2xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-black text-xs text-rose-900 uppercase tracking-wide">
                              <ShieldAlert className="w-4 h-4 text-rose-600" />
                              <span>🛡️ CẢNH BÁO AN NINH: PHÁT HIỆN PHẦN MỀM BẺ KHÓA / CRACK / KMS ĐỘC HẠI!</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                              Vi phạm chính sách
                            </span>
                          </div>
                          {Array.isArray(dev.crackDetection?.detectedTools) && dev.crackDetection.detectedTools.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-rose-800">Công cụ phát hiện:</span>
                              {dev.crackDetection.detectedTools.map((t, idx) => (
                                <span key={idx} className="font-mono text-[11px] font-black bg-white text-rose-700 px-2 py-0.5 rounded-lg border border-rose-300">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {Array.isArray(dev.crackDetection?.warnings) && dev.crackDetection.warnings.length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 text-xs text-rose-900 font-medium">
                              {dev.crackDetection.warnings.map((w, wIdx) => (
                                <li key={wIdx}>{w}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* 3. Software Change Box */}
                      {dev.softwareChangeAlert && (
                        <div className="p-3.5 bg-blue-500/10 border-2 border-blue-400/80 rounded-2xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-black text-xs text-blue-900 uppercase tracking-wide">
                              <Package className="w-4 h-4 text-blue-600" />
                              <span>📦 CẢNH BÁO THAY ĐỔI PHẦN MỀM (CÀI ĐẶT MỚI / ĐÃ GỠ BỎ)!</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                              Biến động phần mềm
                            </span>
                          </div>
                          <p className="text-xs font-bold text-blue-950 bg-white/80 p-2 rounded-xl border border-blue-200 font-mono">
                            {dev.softwareChangeAlert}
                          </p>
                          <p className="text-[10.5px] text-blue-800">
                            Phát hiện người dùng vừa cài thêm ứng dụng mới hoặc vừa gỡ bỏ ứng dụng ra khỏi máy tính.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Inline Change History Mini Preview */}
                    {Array.isArray(dev.changeHistory) && dev.changeHistory.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                          <span className="font-bold flex items-center gap-1 text-slate-700">
                            <History className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Nhật ký thay đổi gần nhất ({dev.changeHistory.length} lần can thiệp):</span>
                          </span>
                          <span>Quét lúc: {dev.lastScannedAt ? new Date(dev.lastScannedAt).toLocaleString('vi-VN') : '—'}</span>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {dev.changeHistory.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded-xl text-xs flex items-center justify-between gap-2 border border-slate-100">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={`px-1.5 py-0.2 rounded font-black text-[9px] ${
                                  item.category === 'HARDWARE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {item.category === 'HARDWARE' ? 'Phần cứng' : 'Phần mềm'}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded font-black text-[9px] ${
                                  item.action === 'ADDED' ? 'bg-emerald-100 text-emerald-800' : item.action === 'REMOVED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {item.action === 'ADDED' ? '+ Cài đặt' : item.action === 'REMOVED' ? '- Gỡ bỏ' : '⚡ Thay đổi'}
                                </span>
                                <span className="font-bold text-slate-800 truncate" title={item.description || item.component}>
                                  {item.description || item.component}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {item.timestamp ? new Date(item.timestamp).toLocaleDateString('vi-VN') : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: MASTER AUDIT LOG TABLE (MỤC NHẬT KÝ THAY ĐỔI)    */}
      {/* ======================================================== */}
      {activeSubTab === 'AUDIT_LOG' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden space-y-3">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Mục 'Nhật Ký Thay Đổi' Cấu Hình Phần Cứng & Phần Mềm</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ghi chép chi tiết từng sự kiện: RAM giảm/tăng, thay đổi ổ cứng, cài đặt mới hoặc gỡ bỏ ứng dụng trên toàn bộ máy tính trong đơn vị.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
              Tổng cộng: {flattenedHistory.length} sự kiện
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-3">Thời Gian Ghi Nhận</th>
                  <th className="p-3">Mã & Tên Thiết Bị</th>
                  <th className="p-3">Khoa / Phòng Quản Lý</th>
                  <th className="p-3">Phân Loại</th>
                  <th className="p-3">Hành Động</th>
                  <th className="p-3">Linh Kiện / Ứng Dụng</th>
                  <th className="p-3">Thay Đổi Cụ Thể (Cũ ➔ Mới)</th>
                  <th className="p-3 text-right">Xem Máy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-slate-600">Chưa có bản ghi nhật ký thay đổi nào</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Khi agent quét định kỳ và phát hiện bất kỳ sự can thiệp phần cứng hoặc cài/gỡ phần mềm, lịch sử sẽ tự động hiển thị tại đây.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedAuditLogs.map((log, idx) => {
                    const isHw = log.category === 'HARDWARE';
                    const isCrack = log.category === 'CRACK' || log.description?.includes('crack') || log.component?.includes('KMS');
                    const isAdd = log.action === 'ADDED';
                    const isRem = log.action === 'REMOVED';

                    return (
                      <tr key={log.id || idx} className="hover:bg-indigo-50/30 transition-colors">
                        {/* 1. Timestamp */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-mono text-slate-800 font-bold block">
                            {log.timestamp ? new Date(log.timestamp).toLocaleDateString('vi-VN') : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </td>

                        {/* 2. Device */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                              {log.assetTag || 'N/A'}
                            </span>
                            <span className="font-bold text-slate-900 truncate max-w-[160px]" title={log.assetName}>
                              {log.assetName || log.hostname}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Host: {log.hostname || '—'}
                          </span>
                        </td>

                        {/* 3. Department & User */}
                        <td className="p-3">
                          <div className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]" title={log.department}>
                            {log.department}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                            👤 {log.assignedTo}
                          </div>
                        </td>

                        {/* 4. Category */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg font-black text-[9.5px] uppercase ${
                            isCrack
                              ? 'bg-rose-100 text-rose-800'
                              : isHw
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isCrack ? '🛡️ An Ninh' : isHw ? '⚙️ Phần Cứng' : '📦 Phần Mềm'}
                          </span>
                        </td>

                        {/* 5. Action */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9.5px] inline-flex items-center gap-1 ${
                            isAdd
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRem
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isAdd ? '+ Cài đặt mới' : isRem ? '- Đã gỡ bỏ' : '⚡ Thay đổi'}
                          </span>
                        </td>

                        {/* 6. Component */}
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block truncate max-w-[180px]" title={log.component}>
                            {log.component}
                          </span>
                          {log.description && (
                            <span className="text-[10px] text-slate-500 line-clamp-1 truncate max-w-[200px]" title={log.description}>
                              {log.description}
                            </span>
                          )}
                        </td>

                        {/* 7. Value diff */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-fit">
                            <span className="text-slate-500 line-through truncate max-w-[120px]" title={log.oldValue}>
                              {log.oldValue || '—'}
                            </span>
                            <span className="text-indigo-600 font-black">➔</span>
                            <span className="text-slate-900 font-bold truncate max-w-[150px]" title={log.newValue}>
                              {log.newValue || '—'}
                            </span>
                          </div>
                        </td>

                        {/* 8. Action view */}
                        <td className="p-3 text-right">
                          {log.assetId && (
                            <button
                              type="button"
                              onClick={() => openQuickView('asset', log.assetId!)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                              title="Xem nhanh thông tin chi tiết thiết bị"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="p-3 border-t border-slate-100">
            <TablePaginationBar
              currentPage={auditPage}
              totalPages={totalAuditPages}
              totalCount={flattenedHistory.length}
              pageSize={auditPageSize}
              onPageChange={setAuditPage}
              onPageSizeChange={setAuditPageSize}
              storageKey="simply_it_audit_log_page_size"
              itemName="sự kiện thay đổi"
            />
          </div>
        </div>
      )}
    </div>
  );
}

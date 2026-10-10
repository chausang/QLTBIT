'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Laptop,
  Boxes,
  Loader2,
  RefreshCw,
  X,
  Save,
  Layers,
  Building,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { TablePaginationBar } from '@/components/common/TablePaginationBar';

interface LinkedItem {
  id: string;
  name: string;
  managementCode: string;
  [key: string]: any;
}

export interface DepartmentFixedAssetItem {
  id: string;
  orderIndex?: number | null;
  name: string;
  fixedAssetCode?: string | null;
  managementCode?: string | null;
  usedLocation?: string | null;
  brand?: string | null;
  originCountry?: string | null;
  inUseDate?: string | null;
  bookQuantity?: number | null;
  bookPrice?: number | null;
  bookRemainingValue?: number | null;
  actualQuantity?: number | null;
  actualPrice?: number | null;
  actualRemainingValue?: number | null;
  diffQuantity?: number | null;
  diffPrice?: number | null;
  diffRemainingValue?: number | null;
  noteUser?: string | null;
  department?: string | null;
  warehouse?: string | null;
  assetGroup?: string | null;
  bookAmount?: number | null;
  actualAmount?: number | null;
  depreciationRate?: number | null;
  depreciationDate?: string | null;
  depreciationPeriod?: string | null;
  notes?: string | null;
  notes1?: string | null;
  auditOrderIndex?: number | null;
  isGroupHeader: boolean;
  linkedAsset?: LinkedItem | null;
  linkedSparePart?: LinkedItem | null;
}

export default function DepartmentFixedAssetsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const txt = (vi: string, en: string, ja?: string) => (language === 'ja' ? ja || en : isEn ? en : vi);

  // Dữ liệu & State
  const [items, setItems] = useState<DepartmentFixedAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');

  // Bộ lọc có sẵn từ backend
  const [filterOptions, setFilterOptions] = useState<{
    departments: string[];
    warehouses: string[];
    assetGroups: string[];
  }>({ departments: [], warehouses: [], assetGroups: [] });

  // Thống kê
  const [stats, setStats] = useState({
    totalItems: 0,
    totalBookPrice: 0,
    totalBookRemaining: 0,
    totalActualPrice: 0,
    totalActualRemaining: 0,
    totalDiffPrice: 0,
  });

  // Chọn dòng để xóa hàng loạt
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<DepartmentFixedAssetItem> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [autoGenMgmtCodeOnImport, setAutoGenMgmtCodeOnImport] = useState(true);
  const [clearExistingOnImport, setClearExistingOnImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Tải dữ liệu
  const loadData = async (page: any = currentPage, limit: any = pageSize) => {
    const targetPage = typeof page === 'number' ? page : currentPage;
    const targetLimit = typeof limit === 'number' ? limit : pageSize;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (departmentFilter !== 'ALL') params.set('department', departmentFilter);
      if (warehouseFilter !== 'ALL') params.set('warehouse', warehouseFilter);
      if (groupFilter !== 'ALL') params.set('assetGroup', groupFilter);
      params.set('page', String(targetPage));
      params.set('pageSize', String(targetLimit));

      const res = await fetch(`/api/department-fixed-assets?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
        if (data.stats) setStats(data.stats);
        if (data.filters) setFilterOptions(data.filters);
        if (data.total !== undefined) setTotalCount(data.total);
        if (data.totalPages !== undefined) setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Load department fixed assets error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData(1, pageSize);
  }, [departmentFilter, warehouseFilter, groupFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadData(1, pageSize);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Format tiền tệ
  const fmtMoney = (val?: number | null) => {
    if (val === null || val === undefined || val === 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // Chọn tất cả (bao gồm cả dòng tiêu đề nhóm nếu có)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Xóa mục
  const handleDeleteItem = async (id: string) => {
    if (!confirm(txt('Bạn có chắc chắn muốn xóa tài sản này?', 'Are you sure you want to delete this asset?', 'この資産を削除しますか？'))) return;
    try {
      const res = await fetch(`/api/department-fixed-assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
        setSelectedIds((prev) => prev.filter((i) => i !== id));
      }
    } catch (err) {
      alert(txt('Lỗi khi xóa tài sản', 'Failed to delete asset', '削除に失敗しました'));
    }
  };

  // Xóa hàng loạt
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(txt(`Xác nhận xóa ${selectedIds.length} tài sản đã chọn?`, `Confirm deleting ${selectedIds.length} selected assets?`, `選択した${selectedIds.length}件の資産を削除しますか？`))) return;
    try {
      const res = await fetch('/api/department-fixed-assets/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        loadData();
        setSelectedIds([]);
      }
    } catch (err) {
      alert(txt('Lỗi khi xóa hàng loạt', 'Failed to bulk delete', '一括削除に失敗しました'));
    }
  };

  // Xóa toàn bộ dữ liệu bảng
  const handleClearAll = async () => {
    if (!confirm(txt('CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ danh sách tài sản cố định trong bảng không? Thao tác này không thể hoàn tác!', 'WARNING: Are you sure you want to delete ALL assets in the list? This action cannot be undone!', '警告: すべての資産を削除してもよろしいですか？'))) return;
    if (!confirm(txt('Xác nhận lần 2: Bấm OK để xóa sạch toàn bộ danh sách tài sản cố định.', 'Second confirmation: Click OK to completely wipe all fixed assets.', '再確認: すべての固定資産を完全に消去するには [OK] をクリックしてください。'))) return;
    try {
      setLoading(true);
      const res = await fetch('/api/department-fixed-assets/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setSelectedIds([]);
        loadData(1, pageSize);
      } else {
        alert(txt('Lỗi khi xóa toàn bộ dữ liệu', 'Failed to clear all assets', '全削除に失敗しました'));
      }
    } catch {
      alert(txt('Lỗi kết nối khi xóa dữ liệu', 'Connection error', '接続エラー'));
    } finally {
      setLoading(false);
    }
  };

  // Lưu tạo mới / cập nhật
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name?.trim()) {
      alert(txt('Vui lòng nhập tên tài sản', 'Please enter asset name', '資産名を入力してください'));
      return;
    }

    try {
      setIsSaving(true);
      const isCreate = !editingItem.id;
      const url = isCreate ? '/api/department-fixed-assets' : `/api/department-fixed-assets/${editingItem.id}`;
      const method = isCreate ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });

      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingItem(null);
        loadData();
      } else {
        alert(data.error || txt('Lưu thất bại', 'Save failed', '保存に失敗しました'));
      }
    } catch {
      alert(txt('Lỗi kết nối khi lưu', 'Connection error', '接続エラー'));
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý Import Excel
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      setIsImporting(true);
      setImportMessage(null);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('autoGenManagementCode', String(autoGenMgmtCodeOnImport));
      formData.append('clearExisting', String(clearExistingOnImport));

      const res = await fetch('/api/department-fixed-assets/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportMessage({ type: 'success', text: data.message || txt('Nhập Excel thành công!', 'Import successful!', 'インポート成功') });
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportMessage(null);
          setCurrentPage(1);
          loadData(1, pageSize);
        }, 1200);
      } else {
        setImportMessage({ type: 'error', text: data.error || txt('Nhập Excel thất bại', 'Import failed', 'インポート失敗') });
      }
    } catch {
      setImportMessage({ type: 'error', text: txt('Lỗi kết nối khi nhập file', 'Connection error', '接続エラー') });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. THANH TỔNG HỢP KPI TÀI CHÍNH KIỂM KÊ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{txt('Tổng số TSCĐ', 'Total Assets', '総資産数')}</div>
          <div className="text-xl font-black text-slate-800 dark:text-white mt-1">{stats.totalItems}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{txt('Tài sản ghi nhận', 'Recorded items', '登録資産')}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{txt('Nguyên giá sổ sách', 'Book Value', '帳簿原価')}</div>
          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{fmtMoney(stats.totalBookPrice)} đ</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{txt('Theo sổ kế toán', 'Book price', '会計帳簿')}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{txt('Còn lại sổ sách', 'Book Remaining', '帳簿残存価値')}</div>
          <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">{fmtMoney(stats.totalBookRemaining)} đ</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{txt('Giá trị còn lại sổ', 'Remaining value', '残存価値')}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{txt('Nguyên giá kiểm kê', 'Actual Value', '実地棚卸原価')}</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{fmtMoney(stats.totalActualPrice)} đ</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{txt('Theo kiểm kê thực tế', 'Physical audit price', '実地棚卸')}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{txt('Còn lại kiểm kê', 'Actual Remaining', '実地残存価値')}</div>
          <div className="text-lg font-black text-teal-600 dark:text-teal-400 mt-1">{fmtMoney(stats.totalActualRemaining)} đ</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{txt('Thực tế hiện hữu', 'Actual remaining', '現存価値')}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{txt('Chênh lệch giá trị', 'Value Diff', '差額')}</div>
          <div className={`text-lg font-black mt-1 ${stats.totalDiffPrice === 0 ? 'text-slate-700 dark:text-slate-300' : stats.totalDiffPrice > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {fmtMoney(stats.totalDiffPrice)} đ
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {stats.totalDiffPrice === 0 ? txt('Khớp sổ sách 100%', 'Fully matched', '一致') : txt('Chênh lệch thực tế vs sổ', 'Audit diff', '実地差額')}
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, LỌC VÀ THAO TÁC */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={txt('Tìm kiếm tên TSCĐ, mã TSC, mã quản lý, người dùng...', 'Search asset name, code, management code, user...', '資産名、コード、管理コードで検索...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Lọc Khoa phòng */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">{txt('📍 Khoa, phòng (Tất cả)', 'Department (All)', '所属部署 (すべて)')}</option>
              {filterOptions.departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Lọc Kho */}
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">{txt('🏢 Kho (Tất cả)', 'Warehouse (All)', '倉庫 (すべて)')}</option>
              {filterOptions.warehouses.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Lọc Nhóm */}
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">{txt('📦 Nhóm TSCĐ (Tất cả)', 'Asset Group (All)', '資産グループ (すべて)')}</option>
              {filterOptions.assetGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Nút Thêm mới */}
            <button
              type="button"
              onClick={() => {
                setEditingItem({
                  bookQuantity: 1,
                  actualQuantity: 1,
                  bookPrice: 0,
                  actualPrice: 0,
                  department: 'BGĐ',
                  warehouse: 'CNTT',
                  assetGroup: 'Máy móc',
                });
                setIsEditModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{txt('Thêm TSCĐ', 'Add Asset', '資産追加')}</span>
            </button>

            {/* Tải Mẫu Excel */}
            <a
              href="/api/department-fixed-assets/export?template=true"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title={txt('Tải mẫu Excel đúng chuẩn cột như hình', 'Download template matching columns', 'テンプレートダウンロード')}
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>{txt('Tải Mẫu Excel', 'Download Template', 'テンプレート')}</span>
            </a>

            {/* Nhập Excel */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{txt('Nhập Excel', 'Import Excel', 'Excel取込')}</span>
            </button>

            {/* Xuất Excel */}
            <a
              href={`/api/department-fixed-assets/export?department=${departmentFilter}&warehouse=${warehouseFilter}&assetGroup=${groupFilter}&search=${encodeURIComponent(search)}`}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{txt('Xuất Excel', 'Export Excel', 'Excel出力')}</span>
            </a>

            {/* Nút Xóa hàng loạt */}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs animate-in fade-in"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{txt(`Xóa (${selectedIds.length})`, `Delete (${selectedIds.length})`, `削除 (${selectedIds.length})`)}</span>
              </button>
            )}

            {/* Nút Xóa tất cả dữ liệu bảng */}
            {(totalCount > 0 || items.length > 0) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title={txt('Xóa sạch toàn bộ tài sản cố định trong bảng', 'Delete all fixed assets in list', 'すべての固定資産を削除')}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>{txt('Xóa tất cả', 'Clear All', '全件削除')}</span>
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={() => loadData(currentPage, pageSize)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU ĐÚNG CHUẨN MẪU EXCEL HÌNH ẢNH */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-xs text-left border-collapse">
            {/* Header 2 tầng ghép ô theo mẫu Excel */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 select-none shadow-xs text-center font-bold">
              {/* Tầng 1 */}
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={items.length > 0 && selectedIds.length === items.length}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 w-12">{txt('STT', 'No.', 'STT')}</th>
                
                {/* CỘT MÃ QUẢN LÝ (NẰM TRƯỚC TÊN TSCĐ, SAU CỘT STT) */}
                <th rowSpan={2} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[130px] bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                  <div className="flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>{txt('Mã quản lý', 'Mgmt Code', '管理コード')}</span>
                  </div>
                </th>

                <th rowSpan={2} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[220px] text-left">{txt('Tên tài sản cố định', 'Asset Name', '資産名')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[120px]">{txt('Mã số TSC', 'Asset Code', '資産コード')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[90px]">{txt('Nơi sử dụng', 'Location', '使用場所')}</th>
                
                {/* 3 Cột màu vàng theo hình */}
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[90px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">{txt('Hãng SX', 'Brand', 'メーカー')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[90px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">{txt('Nước SX', 'Origin', '原産国')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[110px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">{txt('Năm đưa vào SD', 'In-Use Year', '使用開始年')}</th>

                {/* Nhóm Theo sổ kế toán */}
                <th colSpan={3} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 font-black">
                  {txt('Theo sổ kế toán', 'Book Value', '会計帳簿')}
                </th>

                {/* Nhóm Theo kiểm kê */}
                <th colSpan={3} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-black">
                  {txt('Theo kiểm kê', 'Actual Audit', '実地棚卸')}
                </th>

                {/* Nhóm Chênh lệch */}
                <th colSpan={3} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-black">
                  {txt('Chênh lệch', 'Difference', '差額')}
                </th>

                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[120px]">{txt('Ghi chú (Người dùng)', 'User Note', '担当者備考')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[90px]">{txt('Khoa, phòng', 'Dept', '部署')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[80px]">{txt('Kho', 'Warehouse', '倉庫')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[90px]">{txt('Nhóm', 'Group', '区分')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[110px]">{txt('Thành tiền sổ', 'Book Total', '帳簿合計')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[110px]">{txt('Thành tiền KK', 'Actual Total', '棚卸合計')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[80px]">{txt('Tỷ lệ % KH', 'Depr. %', '償却率')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[100px]">{txt('Ngày tính KH', 'Depr. Date', '償却起算日')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[80px]">{txt('Năm KH', 'Depr. Period', '耐用年数')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[110px]">{txt('GHI CHÚ', 'Note', '備考')}</th>
                <th rowSpan={2} className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[90px]">{txt('STT KK', 'Audit No.', '棚卸番号')}</th>
                <th rowSpan={2} className="px-2 py-2 min-w-[70px] sticky right-0 bg-slate-100 dark:bg-slate-800">{txt('Thao tác', 'Action', '操作')}</th>
              </tr>

              {/* Tầng 2 */}
              <tr className="border-b border-slate-300 dark:border-slate-700 text-[11px]">
                {/* Sổ kế toán */}
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-950/20">{txt('SL (1)', 'Qty (1)', '数量 (1)')}</th>
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-950/20">{txt('Nguyên giá (2)', 'Cost (2)', '原価 (2)')}</th>
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-950/20">{txt('Còn lại (3)', 'Rem (3)', '残高 (3)')}</th>

                {/* Kiểm kê */}
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20">{txt('SL (4)', 'Qty (4)', '数量 (4)')}</th>
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20">{txt('Nguyên giá (5)', 'Cost (5)', '原価 (5)')}</th>
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20">{txt('Còn lại (6)', 'Rem (6)', '残高 (6)')}</th>

                {/* Chênh lệch */}
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-950/20">{txt('SL (7)', 'Qty (7)', '数量 (7)')}</th>
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-950/20">{txt('Nguyên giá (8)', 'Cost (8)', '原価 (8)')}</th>
                <th className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-950/20">{txt('Còn lại (9)', 'Rem (9)', '残高 (9)')}</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={29} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>{txt('Đang tải dữ liệu kiểm kê TSCĐ...', 'Loading fixed assets audit data...', 'データ読み込み中...')}</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={29} className="py-12 text-center text-slate-400">
                    {txt('Chưa có dữ liệu tài sản cố định nào', 'No fixed assets recorded', 'データがありません')}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  if (item.isGroupHeader) {
                    const isGroupSelected = selectedIds.includes(item.id);
                    return (
                      <tr key={item.id} className={`font-bold border-y transition-colors ${isGroupSelected ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700' : 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'}`}>
                        <td className="px-2 py-2 text-center border-r border-indigo-200/50">
                          <input
                            type="checkbox"
                            checked={isGroupSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-2 py-2 text-center border-r border-indigo-200/50">—</td>
                        <td colSpan={26} className="px-3 py-2 text-left font-black tracking-wide">
                          <span className="inline-flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-500 inline" />
                            <span>📌 {item.name} {item.warehouse ? `(${item.warehouse})` : ''} {item.department ? `• ${item.department}` : ''}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center sticky right-0 bg-indigo-50 dark:bg-indigo-950">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tiêu đề nhóm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* STT */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500">
                        {item.orderIndex || idx + 1}
                      </td>

                      {/* CỘT MÃ QUẢN LÝ (NẰM TRƯỚC TÊN TSCĐ, SAU CỘT STT) */}
                      <td className="px-2.5 py-2 text-center border-r border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                        {item.managementCode ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-100/60 dark:bg-indigo-900/60 rounded-md border border-indigo-200 dark:border-indigo-800 text-[11px]">
                              {item.managementCode}
                            </span>
                            {/* Liên kết Thiết bị */}
                            {item.linkedAsset && (
                              <span
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/50"
                                title={`Đã liên kết Thiết bị: [${item.linkedAsset.assetTag}] ${item.linkedAsset.name}`}
                              >
                                <Laptop className="w-2.5 h-2.5" />
                                <span>{item.linkedAsset.assetTag}</span>
                              </span>
                            )}
                            {/* Liên kết Phụ tùng */}
                            {item.linkedSparePart && (
                              <span
                                className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/50"
                                title={`Đã liên kết Phụ tùng: [${item.linkedSparePart.sku || item.linkedSparePart.name}]`}
                              >
                                <Boxes className="w-2.5 h-2.5" />
                                <span>{item.linkedSparePart.sku || 'Linh kiện'}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Tên TSCĐ */}
                      <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100">
                        {item.name}
                      </td>

                      {/* Mã số TSC */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
                        {item.fixedAssetCode || '—'}
                      </td>

                      {/* Nơi sử dụng */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-medium">
                        {item.usedLocation || '—'}
                      </td>

                      {/* 3 Cột màu vàng theo hình */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20 text-slate-700 dark:text-slate-300">
                        {item.brand || '—'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20 text-slate-700 dark:text-slate-300">
                        {item.originCountry || '—'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20 text-slate-700 dark:text-slate-300">
                        {item.inUseDate || '—'}
                      </td>

                      {/* Sổ kế toán */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono bg-blue-50/30 dark:bg-blue-950/10">
                        {item.bookQuantity || 0}
                      </td>
                      <td className="px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-200 bg-blue-50/30 dark:bg-blue-950/10">
                        {fmtMoney(item.bookPrice)}
                      </td>
                      <td className="px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400 bg-blue-50/30 dark:bg-blue-950/10">
                        {fmtMoney(item.bookRemainingValue)}
                      </td>

                      {/* Kiểm kê */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono bg-emerald-50/30 dark:bg-emerald-950/10">
                        {item.actualQuantity || 0}
                      </td>
                      <td className="px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10">
                        {fmtMoney(item.actualPrice)}
                      </td>
                      <td className="px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                        {fmtMoney(item.actualRemainingValue)}
                      </td>

                      {/* Chênh lệch */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono bg-rose-50/30 dark:bg-rose-950/10">
                        {item.diffQuantity || 0}
                      </td>
                      <td className={`px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono bg-rose-50/30 dark:bg-rose-950/10 ${item.diffPrice && item.diffPrice !== 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                        {fmtMoney(item.diffPrice)}
                      </td>
                      <td className={`px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono bg-rose-50/30 dark:bg-rose-950/10 ${item.diffRemainingValue && item.diffRemainingValue !== 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                        {fmtMoney(item.diffRemainingValue)}
                      </td>

                      {/* Ghi chú người dùng */}
                      <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {item.noteUser || '—'}
                      </td>

                      {/* Khoa phòng, Kho, Nhóm */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">{item.department || '—'}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-semibold">{item.warehouse || '—'}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">{item.assetGroup || '—'}</td>

                      {/* Thành tiền, Khấu hao */}
                      <td className="px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono">{fmtMoney(item.bookAmount)}</td>
                      <td className="px-2 py-2 text-right border-r border-slate-200 dark:border-slate-800 font-mono">{fmtMoney(item.actualAmount)}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono">{item.depreciationRate ? `${item.depreciationRate}%` : '—'}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">{item.depreciationDate || '—'}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono">{item.depreciationPeriod || '—'}</td>
                      <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 text-slate-500">{item.notes || '—'}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-600">{item.auditOrderIndex || '—'}</td>

                      {/* Thao tác */}
                      <td className="px-2 py-2 text-center sticky right-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Phân Trang */}
        <TablePaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            loadData(page, pageSize);
          }}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
            loadData(1, newSize);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          itemName={txt('tài sản', 'assets', '件')}
        />
      </div>

      {/* 4. MODAL THÊM / CHỈNH SỬA TSCĐ KHOA PHÒNG */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>{editingItem?.id ? txt('Chỉnh sửa tài sản cố định', 'Edit Fixed Asset', '固定資産編集') : txt('Thêm mới tài sản cố định kiểm kê', 'Add New Fixed Asset', '固定資産新規登録')}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tên TSCĐ */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Tên tài sản cố định (*)', 'Asset Name (*)', '資産名 (*)')}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem?.name || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Máy Laptop HP ProBook 440-G5..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {/* Mã số TSC */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Mã số TSC', 'Asset Code', '資産番号')}
                  </label>
                  <input
                    type="text"
                    value={editingItem?.fixedAssetCode || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, fixedAssetCode: e.target.value }))}
                    placeholder="VD: PCKH-HP-440..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                {/* CỘT MÃ QUẢN LÝ (CÓ NÚT TỰ SINH) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{txt('Mã quản lý (Liên kết thiết bị / phụ tùng)', 'Management Code', '管理コード')}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const autoCode = `MQL-${Date.now().toString().slice(-6)}`;
                        setEditingItem((prev) => ({ ...prev, managementCode: autoCode }));
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>⚡ {txt('Tự sinh mã', 'Auto generate', '自動生成')}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editingItem?.managementCode || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, managementCode: e.target.value }))}
                    placeholder="VD: MQL-00032 (hoặc để trống)..."
                    className="w-full p-2 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700 dark:text-indigo-300"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {txt('Dùng mã này để liên kết tự động với Thiết bị hoặc Phụ tùng linh kiện cùng mã.', 'Links to equipment/spare parts with same code.', '同コードの機器・予備品と自動紐付け')}
                  </span>
                </div>

                {/* Nơi sử dụng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Nơi sử dụng', 'Used Location', '使用場所')}</label>
                  <input
                    type="text"
                    value={editingItem?.usedLocation || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, usedLocation: e.target.value }))}
                    placeholder="VD: BGĐ, Khoa Nhi..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Hãng SX */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Hãng SX', 'Brand', 'メーカー')}</label>
                  <input
                    type="text"
                    value={editingItem?.brand || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, brand: e.target.value }))}
                    placeholder="VD: HP, Canon, Sharp..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Nước SX */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Nước SX', 'Origin Country', '原産国')}</label>
                  <input
                    type="text"
                    value={editingItem?.originCountry || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, originCountry: e.target.value }))}
                    placeholder="VD: Mỹ, Nhật Bản, Việt Nam..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Năm đưa vào SD */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Năm đưa vào sử dụng', 'In-Use Year/Date', '使用開始年')}</label>
                  <input
                    type="text"
                    value={editingItem?.inUseDate || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, inUseDate: e.target.value }))}
                    placeholder="VD: 2015 hoặc 07/06/2024..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Khoa, phòng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Khoa, phòng', 'Department', '部署')}</label>
                  <input
                    type="text"
                    value={editingItem?.department || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="VD: BGĐ, Khoa Khám Bệnh..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Kho */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Kho quản lý', 'Warehouse', '倉庫')}</label>
                  <input
                    type="text"
                    value={editingItem?.warehouse || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, warehouse: e.target.value }))}
                    placeholder="VD: CNTT, HCQT, Dược..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Nhóm */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Nhóm tài sản', 'Asset Group', '区分')}</label>
                  <input
                    type="text"
                    value={editingItem?.assetGroup || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, assetGroup: e.target.value }))}
                    placeholder="VD: Máy móc, Thiết bị..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Ghi chú người dùng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Ghi chú người dùng (Cột E)', 'User Note', '担当者備考')}</label>
                  <input
                    type="text"
                    value={editingItem?.noteUser || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, noteUser: e.target.value }))}
                    placeholder="VD: Bs Hồng, Bs Hùng, Giám đốc..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Phần số liệu sổ sách vs kiểm kê */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>📊 {txt('Số liệu sổ sách & Kiểm kê thực tế:', 'Book vs Audit Figures:', '帳簿および実地棚卸数値:')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-1">{txt('Nguyên giá sổ sách (đ)', 'Book Price', '帳簿原価')}</label>
                    <input
                      type="number"
                      value={editingItem?.bookPrice ?? ''}
                      onChange={(e) => setEditingItem((prev) => ({ ...prev, bookPrice: Number(e.target.value) || 0 }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-1">{txt('Giá trị còn lại sổ sách (đ)', 'Book Remaining', '帳簿残高')}</label>
                    <input
                      type="number"
                      value={editingItem?.bookRemainingValue ?? ''}
                      onChange={(e) => setEditingItem((prev) => ({ ...prev, bookRemainingValue: Number(e.target.value) || 0 }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">{txt('Nguyên giá kiểm kê (đ)', 'Actual Price', '実地原価')}</label>
                    <input
                      type="number"
                      value={editingItem?.actualPrice ?? ''}
                      onChange={(e) => setEditingItem((prev) => ({ ...prev, actualPrice: Number(e.target.value) || 0 }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">{txt('Giá trị còn lại kiểm kê (đ)', 'Actual Remaining', '実地残高')}</label>
                    <input
                      type="number"
                      value={editingItem?.actualRemainingValue ?? ''}
                      onChange={(e) => setEditingItem((prev) => ({ ...prev, actualRemainingValue: Number(e.target.value) || 0 }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{txt('Tỷ lệ % Khấu hao', 'Depreciation %', '償却率')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem?.depreciationRate ?? ''}
                      onChange={(e) => setEditingItem((prev) => ({ ...prev, depreciationRate: Number(e.target.value) || 0 }))}
                      placeholder="VD: 14.29 hoặc 12.5..."
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{txt('STT Kiểm kê', 'Audit Order No.', '棚卸番号')}</label>
                    <input
                      type="number"
                      value={editingItem?.auditOrderIndex ?? ''}
                      onChange={(e) => setEditingItem((prev) => ({ ...prev, auditOrderIndex: Number(e.target.value) || 0 }))}
                      placeholder="VD: 2, 3, 4..."
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {txt('Hủy', 'Cancel', 'キャンセル')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{txt('Lưu Tài Sản', 'Save Asset', '保存')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL NHẬP EXCEL (IMPORT) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-900 text-white rounded-t-3xl">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{txt('Nhập Dữ Liệu TSCĐ Từ File Excel', 'Import Fixed Assets from Excel', 'Excelから固定資産インポート')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {importFile ? importFile.name : txt('Kéo thả file Excel vào đây hoặc bấm để chọn', 'Drag & drop Excel file here or click to browse', 'Excelファイルをここにドロップ')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {txt('Hỗ trợ định dạng .xlsx, .xls có các cột chuẩn y hệt mẫu', 'Supports .xlsx matching template columns', '.xlsx形式対応')}
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {/* Tùy chọn */}
              <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoGenMgmtCodeOnImport}
                    onChange={(e) => setAutoGenMgmtCodeOnImport(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>⚡ {txt('Tự động sinh Mã quản lý (MQL-...) nếu dòng chưa có mã', 'Auto generate Management Code if empty', '空欄の場合に管理コードを自動生成')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-rose-600 dark:text-rose-400">
                  <input
                    type="checkbox"
                    checked={clearExistingOnImport}
                    onChange={(e) => setClearExistingOnImport(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>⚠️ {txt('Xóa toàn bộ dữ liệu TSCĐ hiện tại trước khi nhập mới', 'Clear all existing records before import', '既存データを全削除して新規取込')}</span>
                </label>

                <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{txt('Chỉ nhập tài sản thuộc CNTT quản lý; STT được hệ thống tự động đánh số tăng dần chuẩn xác.', 'Only imports IT-managed assets; numbering is automatically generated.', 'IT管理資産のみ取り込み、連番は自動付与されます。')}</span>
                </div>
              </div>

              {/* Trạng thái đang import */}
              {isImporting && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                  <span className="font-semibold">
                    {txt('Hệ thống đang đọc tệp và lưu dữ liệu Excel theo lô cực nhanh... Vui lòng đợi trong giây lát.', 'Processing and batch saving Excel records... Please wait.', 'Excelデータをバッチ処理中... 少々お待ちください。')}
                  </span>
                </div>
              )}

              {/* Thông báo kết quả */}
              {importMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    importMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200'
                  }`}
                >
                  {importMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{importMessage.text}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <a
                  href="/api/department-fixed-assets/export?template=true"
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{txt('Tải file mẫu Excel chuẩn', 'Download standard template', '標準テンプレート')}</span>
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {txt('Đóng', 'Close', '閉じる')}
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || !importFile}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{txt('Tiến Hành Nhập File', 'Import Now', 'インポート実行')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Building2,
  CheckCircle2,
  Sparkles,
  Layers,
  Laptop,
  Boxes,
  Loader2,
  Link as LinkIcon,
  Filter,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface SelectedFixedAsset {
  fixedAssetCode: string;
  fixedAssetName: string;
  managementCode: string;
  department?: string;
  usedLocation?: string;
}

interface DepartmentFixedAssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SelectedFixedAsset) => void;
  onUnlink?: () => void;
  defaultDepartment?: string;
  selectedFixedAssetCode?: string;
  selectedManagementCode?: string;
  title?: string;
}

export default function DepartmentFixedAssetSelectorModal({
  isOpen,
  onClose,
  onSelect,
  onUnlink,
  defaultDepartment = '',
  selectedFixedAssetCode = '',
  selectedManagementCode = '',
  title,
}: DepartmentFixedAssetSelectorModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const txt = (vi: string, en: string, ja?: string) => (language === 'ja' ? ja || en : isEn ? en : vi);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(defaultDepartment || 'ALL');
  const [search, setSearch] = useState('');

  // Cập nhật selectedDept khi defaultDepartment thay đổi và mở modal
  useEffect(() => {
    if (isOpen) {
      if (defaultDepartment && defaultDepartment.trim() !== '') {
        setSelectedDept(defaultDepartment.trim());
      } else {
        setSelectedDept('ALL');
      }
      setSearch('');
    }
  }, [isOpen, defaultDepartment]);

  // Tải danh sách khoa phòng và danh sách tài sản cố định
  const loadData = async (dept = selectedDept, q = search) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dept && dept !== 'ALL') {
        params.set('department', dept);
      }
      if (q && q.trim()) {
        params.set('search', q.trim());
      }
      params.set('all', 'true'); // Lấy tất cả theo bộ lọc để chọn dễ dàng

      const res = await fetch(`/api/department-fixed-assets?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
        if (data.filters?.departments) {
          setDepartments(data.filters.departments);
        }
      }
    } catch (err) {
      console.error('Error loading department fixed assets for selector:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData(selectedDept, search);
    }
  }, [isOpen, selectedDept]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadData(selectedDept, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  if (!isOpen) return null;

  const handleSelectItem = (item: any) => {
    // Nếu chưa có managementCode, tự động sinh mã MQL
    const mgmtCode = item.managementCode?.trim() || `MQL-${Date.now().toString().slice(-6)}`;
    const faCode = item.fixedAssetCode?.trim() || '';
    const faName = item.name?.trim() || '';

    onSelect({
      fixedAssetCode: faCode,
      fixedAssetName: faName,
      managementCode: mgmtCode,
      department: item.department || '',
      usedLocation: item.usedLocation || '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {title || txt('Danh Mục Tài Sản Cố Định Khoa Phòng', 'Department Fixed Asset Catalog', '部署固定資産台帳')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {txt('Liên kết kiểm kê', 'Audit Linking', '棚卸連携')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {txt(
                  'Chọn tài sản cố định từ danh sách khoa phòng để tự động liên kết Mã TSCĐ, Tên TSCĐ và Mã Quản Lý',
                  'Select fixed asset from department list to link Fixed Asset Code, Name and Management Code',
                  '固定資産台帳から選択してコードと名称を自動連携します'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Lọc Khoa/Phòng */}
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{txt('Khoa phòng đang sử dụng:', 'Department in use:', '使用部署:')}</span>
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{txt('-- Tất cả khoa phòng --', '-- All departments --', '-- すべての部署 --')}</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Ô tìm kiếm */}
          <div className="sm:col-span-7">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>{txt('Tìm kiếm tài sản:', 'Search asset:', '資産を検索:')}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={txt('🔍 Tên tài sản, Mã TSCĐ, Mã MQL, Nơi sử dụng, Hãng SX...', 'Search name, code, mgmt code...', '資産名、コード等で検索...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[55vh]">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold">{txt('Đang tải danh mục tài sản cố định...', 'Loading fixed asset list...', '固定資産一覧を読み込み中...')}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <span className="text-xs font-semibold">
                {txt('Không tìm thấy tài sản cố định nào phù hợp', 'No matching fixed assets found', '該当する固定資産が見つかりません')}
              </span>
              <p className="text-[11px] text-slate-400 max-w-sm text-center">
                {txt(
                  'Vui lòng thử chọn khoa phòng khác hoặc nhập từ khóa tìm kiếm khác.',
                  'Please try selecting another department or change search terms.',
                  '別の部署を選択するか、検索条件を変更してください。'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items
                .filter((item) => !item.isGroupHeader)
                .map((item) => {
                  const isCurrent =
                    (selectedFixedAssetCode && item.fixedAssetCode === selectedFixedAssetCode) ||
                    (selectedManagementCode && item.managementCode === selectedManagementCode);

                  const linkedCount = item.totalLinkedItemsCount || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/80 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Mã TSCĐ */}
                          {item.fixedAssetCode ? (
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              🏷️ {item.fixedAssetCode}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 italic">
                              (Chưa có mã TSC)
                            </span>
                          )}

                          {/* Mã Quản lý */}
                          {item.managementCode ? (
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ⚡ {item.managementCode}
                            </span>
                          ) : null}

                          {/* Khoa phòng */}
                          {item.department && (
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              🏢 {item.department}
                            </span>
                          )}

                          {/* Nơi sử dụng */}
                          {item.usedLocation && (
                            <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                              📍 {item.usedLocation}
                            </span>
                          )}
                        </div>

                        {/* Tên TSCĐ */}
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.name}
                        </div>

                        {/* Hãng, nước, năm, SL sổ sách */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {item.brand && <span>Hãng: <strong className="text-slate-700 dark:text-slate-300">{item.brand}</strong></span>}
                          {item.inUseDate && <span>Năm SD: <strong className="text-slate-700 dark:text-slate-300">{item.inUseDate}</strong></span>}
                          <span>SL Sổ sách: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.bookQuantity || 1}</strong></span>
                          
                          {/* Trạng thái liên kết kiểm kê hiện thời */}
                          {linkedCount > 0 ? (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded font-semibold border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Đã gắn: {item.totalLinkedAssetsCount || 0} thiết bị, {item.totalLinkedSparePartsCount || 0} linh kiện</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                              (Chưa liên kết thiết bị/linh kiện nào)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nút hành động */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isCurrent ? (
                          <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                            <span>{txt('Đang liên kết', 'Linked', '連携中')}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectItem(item);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 dark:bg-slate-700 dark:hover:bg-indigo-600 text-slate-700 hover:text-white dark:text-slate-200 dark:hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>{txt('Chọn liên kết', 'Select to Link', '連携を選択')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            {txt('Tổng cộng:', 'Total:', '合計:')} <strong className="text-slate-800 dark:text-white">{items.filter((i) => !i.isGroupHeader).length}</strong> {txt('tài sản cố định', 'fixed assets', '固定資産')}
          </div>

          <div className="flex items-center gap-2">
            {onUnlink && (selectedFixedAssetCode || selectedManagementCode) && (
              <button
                type="button"
                onClick={() => {
                  onUnlink();
                  onClose();
                }}
                className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold transition-colors cursor-pointer"
              >
                {txt('Bỏ liên kết TSCĐ', 'Unlink Fixed Asset', '連携解除')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer"
            >
              {txt('Đóng', 'Close', '閉じる')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

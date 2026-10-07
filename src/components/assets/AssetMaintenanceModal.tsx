'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  X,
  Plus,
  Save,
  History,
  Trash2,
  Package,
  FileText,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Layers,
  Search,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/context';
import { MaintenanceHandoverModal } from './MaintenanceHandoverModal';
import { MaintenanceQrModal } from './MaintenanceQrModal';

interface AssetMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any | null;
  users: any[];
  currencies: any[];
  onSuccess?: () => void;
}

export const AssetMaintenanceModal: React.FC<AssetMaintenanceModalProps> = ({
  isOpen,
  onClose,
  asset,
  users,
  currencies,
  onSuccess,
}) => {
  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { language, isEn, isJa } = useLanguage();
  const txt = (vi: string, en: string, ja?: string) => (isJa && ja ? ja : isEn ? en : vi);

  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Spare parts state
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loadingSpareParts, setLoadingSpareParts] = useState(false);
  const [partSearch, setPartSearch] = useState('');

  // Modals state
  const [handoverModalLog, setHandoverModalLog] = useState<any | null>(null);
  const [qrModalLog, setQrModalLog] = useState<any | null>(null);

  // Form State
  const [maintenanceForm, setMaintenanceForm] = useState<any>({
    type: 'UPGRADE',
    title: '',
    description: '',
    cost: '',
    costCurrency: 'VND',
    performedAt: new Date().toISOString().split('T')[0],
    performedById: '',
    vendorId: '',
    notes: '',
    // Spare part integration fields
    useSparePart: false,
    sparePartId: '',
    sparePartQuantity: 1,
    partActionType: 'ADD_ON', // 'ADD_ON' (Gắn thêm) | 'REPLACE' (Thay thế)
    returnOldPart: true,
    oldPartName: '',
    oldPartCondition: 'BROKEN', // 'BROKEN' | 'NEED_REPAIR' | 'REUSABLE'
    oldPartAction: 'SCRAP_DISPOSAL', // 'SCRAP_DISPOSAL' | 'REPAIR_SPARE' | 'RESTOCK'
    hasHandoverDoc: true,
  });

  const formatPrice = (amount: number, currencyCode: string = 'VND') => {
    return formatCurrency(amount, currencyCode);
  };

  const fetchLogs = async (assetId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/assets/${assetId}/maintenance`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMaintenanceLogs(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử bảo trì:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpareParts = async () => {
    try {
      setLoadingSpareParts(true);
      const res = await fetch('/api/spare-parts');
      const data = await res.json();
      if (data.success && Array.isArray(data.spareParts)) {
        setSpareParts(data.spareParts);
      }
    } catch (err) {
      console.error('Lỗi khi tải kho phụ tùng:', err);
    } finally {
      setLoadingSpareParts(false);
    }
  };

  useEffect(() => {
    if (isOpen && asset?.id) {
      setMaintenanceForm({
        type: 'UPGRADE',
        title: '',
        description: '',
        cost: '',
        costCurrency: asset.purchaseCurrency || 'VND',
        performedAt: new Date().toISOString().split('T')[0],
        performedById: '',
        vendorId: '',
        notes: '',
        useSparePart: false,
        sparePartId: '',
        sparePartQuantity: 1,
        partActionType: 'ADD_ON',
        returnOldPart: true,
        oldPartName: '',
        oldPartCondition: 'BROKEN',
        oldPartAction: 'SCRAP_DISPOSAL',
        hasHandoverDoc: true,
      });
      fetchLogs(asset.id);
      fetchSpareParts();
    }
  }, [isOpen, asset?.id]);

  // Selected spare part helper
  const selectedPart = useMemo(() => {
    if (!maintenanceForm.sparePartId) return null;
    return spareParts.find((p) => p.id === maintenanceForm.sparePartId) || null;
  }, [spareParts, maintenanceForm.sparePartId]);

  // Filtered spare parts for select
  const filteredParts = useMemo(() => {
    if (!partSearch.trim()) return spareParts;
    const q = partSearch.toLowerCase();
    return spareParts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
    );
  }, [spareParts, partSearch]);

  // Auto-fill title & cost when spare part or action type changes
  const handleSelectSparePart = (partId: string) => {
    const part = spareParts.find((p) => p.id === partId);
    if (!part) {
      setMaintenanceForm((prev: any) => ({
        ...prev,
        sparePartId: '',
      }));
      return;
    }

    const qty = Number(maintenanceForm.sparePartQuantity) || 1;
    const costVal = part.unitPrice ? String(Number(part.unitPrice) * qty) : '';
    const actionLabel = maintenanceForm.partActionType === 'ADD_ON' ? 'Gắn thêm nâng cấp' : 'Thay thế linh kiện';
    const autoTitle = `${actionLabel}: ${part.name} (x${qty} ${part.unit || 'cái'})`;

    setMaintenanceForm((prev: any) => ({
      ...prev,
      sparePartId: partId,
      cost: prev.cost ? prev.cost : costVal,
      costCurrency: part.currency || prev.costCurrency || 'VND',
      title: prev.title ? prev.title : autoTitle,
    }));
  };

  const handleActionTypeChange = (newActionType: 'ADD_ON' | 'REPLACE') => {
    setMaintenanceForm((prev: any) => {
      const part = spareParts.find((p) => p.id === prev.sparePartId);
      const qty = Number(prev.sparePartQuantity) || 1;
      const actionLabel = newActionType === 'ADD_ON' ? 'Gắn thêm nâng cấp' : 'Thay thế linh kiện';
      const newTitle = part ? `${actionLabel}: ${part.name} (x${qty} ${part.unit || 'cái'})` : prev.title;

      return {
        ...prev,
        partActionType: newActionType,
        type: newActionType === 'ADD_ON' ? 'UPGRADE' : 'REPAIR',
        title: newTitle,
        returnOldPart: newActionType === 'REPLACE',
      };
    });
  };

  if (!isOpen || !asset) return null;

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset?.id) return;

    if (maintenanceForm.useSparePart && maintenanceForm.sparePartId) {
      if (selectedPart && selectedPart.quantity < Number(maintenanceForm.sparePartQuantity)) {
        alert(
          txt(
            `❌ Số lượng tồn kho không đủ! Hiện tại kho chỉ còn ${selectedPart.quantity} ${selectedPart.unit}.`,
            `❌ Insufficient stock! Currently only ${selectedPart.quantity} ${selectedPart.unit} available.`
          )
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        type: maintenanceForm.type,
        title: maintenanceForm.title,
        description: maintenanceForm.description,
        cost: maintenanceForm.cost,
        costCurrency: maintenanceForm.costCurrency,
        performedAt: maintenanceForm.performedAt,
        performedById: maintenanceForm.performedById || undefined,
        vendorId: maintenanceForm.vendorId || undefined,
        notes: maintenanceForm.notes,
      };

      if (maintenanceForm.useSparePart && maintenanceForm.sparePartId) {
        payload.sparePartId = maintenanceForm.sparePartId;
        payload.sparePartQuantity = Number(maintenanceForm.sparePartQuantity) || 1;
        payload.partActionType = maintenanceForm.partActionType;
        payload.returnOldPart = maintenanceForm.partActionType === 'REPLACE' ? maintenanceForm.returnOldPart : false;
        payload.oldPartName = maintenanceForm.oldPartName;
        payload.oldPartCondition = maintenanceForm.oldPartCondition;
        payload.oldPartAction = maintenanceForm.oldPartAction;
        payload.hasHandoverDoc = maintenanceForm.hasHandoverDoc;
      }

      const res = await fetch(`/api/assets/${asset.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json();
        // Reset form
        setMaintenanceForm({
          type: 'UPGRADE',
          title: '',
          description: '',
          cost: '',
          costCurrency: asset.purchaseCurrency || 'VND',
          performedAt: new Date().toISOString().split('T')[0],
          performedById: '',
          vendorId: '',
          notes: '',
          useSparePart: false,
          sparePartId: '',
          sparePartQuantity: 1,
          partActionType: 'ADD_ON',
          returnOldPart: true,
          oldPartName: '',
          oldPartCondition: 'BROKEN',
          oldPartAction: 'SCRAP_DISPOSAL',
          hasHandoverDoc: true,
        });

        await fetchLogs(asset.id);
        await fetchSpareParts(); // Refresh stock
        onSuccess?.();

        // If user requested handover doc and part was used, offer to preview immediately
        if (maintenanceForm.hasHandoverDoc && savedData?.data) {
          if (
            confirm(
              txt(
                '✅ Đã lưu phiếu bảo trì và cập nhật kho thành công!\n\nBạn có muốn mở xem và in Biên Bản Bàn Giao & Thay Thế Linh Kiện ngay bây giờ không?',
                '✅ Maintenance record saved and stock updated!\n\nWould you like to open and print the Handover Report now?'
              )
            )
          ) {
            setHandoverModalLog(savedData.data);
          }
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(
          txt(
            `❌ ${errorData.error || 'Lỗi khi lưu bảo trì'}`,
            `❌ ${errorData.error || 'Failed to save maintenance log'}`
          )
        );
      }
    } catch {
      alert(
        txt(
          '❌ Lỗi kết nối khi lưu bảo trì',
          '❌ Connection error while saving maintenance'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaintenance = async (logId: string) => {
    if (
      !confirm(
        txt(
          'Bạn có chắc muốn xóa bản ghi bảo trì này?\n(Nếu có linh kiện xuất từ kho, số lượng sẽ được tự động hoàn trả lại kho phụ tùng)',
          'Are you sure you want to delete this maintenance record?\n(If spare parts were used, stock will be automatically restored)'
        )
      )
    )
      return;

    try {
      const res = await fetch(`/api/assets/${asset.id}/maintenance?logId=${logId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchLogs(asset.id);
        await fetchSpareParts(); // Refresh stock after refund
        onSuccess?.();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(
          txt(
            `❌ ${errorData.error || 'Lỗi khi xóa bảo trì'}`,
            `❌ ${errorData.error || 'Failed to delete maintenance log'}`
          )
        );
      }
    } catch {
      alert(
        txt(
          '❌ Lỗi kết nối khi xóa bảo trì',
          '❌ Connection error while deleting maintenance'
        )
      );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[94vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs shrink-0">
                <Wrench className="w-4 h-4 font-bold" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>{txt('Nhật Ký Bảo Trì & Sửa Chữa', 'Maintenance & Repair Log')}</span>
                  <span className="font-mono text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-md">
                    [{asset.assetTag}]
                  </span>
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {asset.name} {asset.brand ? `• ${asset.brand}` : ''} {asset.model ? `• ${asset.model}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Split-View Body (2 Columns) */}
          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
            {/* Left Column (5/12): Add Maintenance Log Form */}
            <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 pb-6 lg:pb-0 lg:pr-6 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="p-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    {txt('Ghi nhận bảo dưỡng / Sửa chữa mới', 'Record New Maintenance / Repair')}
                  </h4>
                </div>

                <form id="maintenance-form" onSubmit={handleSaveMaintenance} className="space-y-3">
                  {/* Loại can thiệp */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {txt('Loại can thiệp / dịch vụ (*)', 'Service / Action Type (*)')}
                    </label>
                    <select
                      value={maintenanceForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setMaintenanceForm({
                          ...maintenanceForm,
                          type: newType,
                          useSparePart:
                            newType === 'UPGRADE' || newType === 'REPAIR' || newType === 'REPLACEMENT'
                              ? true
                              : maintenanceForm.useSparePart,
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="UPGRADE">🚀 {txt('Nâng cấp phần cứng (RAM/SSD/...)', 'Hardware Upgrade (RAM/SSD/...)')}</option>
                      <option value="REPAIR">🔧 {txt('Sửa chữa hỏng hóc', 'Repair / Fix')}</option>
                      <option value="REPLACEMENT">🔄 {txt('Thay thế linh kiện', 'Component Replacement')}</option>
                      <option value="CLEANING">🧼 {txt('Vệ sinh, tra keo tản nhiệt', 'Cleaning & Maintenance')}</option>
                      <option value="SOFTWARE_UPDATE">💻 {txt('Cài đặt lại OS / Phần mềm', 'Reinstall OS / Software')}</option>
                      <option value="INSPECTION">🔍 {txt('Kiểm tra định kỳ', 'Periodic Inspection')}</option>
                      <option value="OTHER">📝 {txt('Can thiệp khác', 'Other Action')}</option>
                    </select>
                  </div>

                  {/* ==================== KHỐI TÍCH HỢP KHO PHỤ TÙNG ==================== */}
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={maintenanceForm.useSparePart}
                          onChange={(e) =>
                            setMaintenanceForm({ ...maintenanceForm, useSparePart: e.target.checked })
                          }
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                        />
                        <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-600" />
                          <span>{txt('Lấy linh kiện từ Kho phụ tùng', 'Use Part from Spare Inventory')}</span>
                        </span>
                      </label>

                      {maintenanceForm.useSparePart && selectedPart && (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            selectedPart.quantity > 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          Tồn kho: {selectedPart.quantity} {selectedPart.unit}
                        </span>
                      )}
                    </div>

                    {maintenanceForm.useSparePart && (
                      <div className="space-y-2.5 pt-1 border-t border-amber-200/60 dark:border-amber-800/40 animate-in fade-in">
                        {/* 1. Chọn linh kiện */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                              {txt('Chọn linh kiện xuất kho (*)', 'Select Spare Part (*)')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {spareParts.length} {txt('mặt hàng', 'items')}
                            </span>
                          </div>

                          <select
                            value={maintenanceForm.sparePartId}
                            onChange={(e) => handleSelectSparePart(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-white"
                          >
                            <option value="">{txt('-- Chọn phụ tùng trong kho --', '-- Select Spare Part --')}</option>
                            {filteredParts.map((p) => (
                              <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                                {p.name} {p.sku ? `[${p.sku}]` : ''} - Tồn: {p.quantity} {p.unit}
                                {p.unitPrice ? ` • ${formatCurrency(Number(p.unitPrice), p.currency || 'VND')}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Số lượng và Hình thức can thiệp (Gắn thêm hay Thay thế) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              {txt('Số lượng xuất', 'Quantity')}
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={selectedPart ? selectedPart.quantity : 999}
                              value={maintenanceForm.sparePartQuantity}
                              onChange={(e) => {
                                const q = Math.max(1, Number(e.target.value) || 1);
                                setMaintenanceForm((prev: any) => ({
                                  ...prev,
                                  sparePartQuantity: q,
                                  cost: selectedPart?.unitPrice
                                    ? String(Number(selectedPart.unitPrice) * q)
                                    : prev.cost,
                                }));
                              }}
                              className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500 text-center"
                            />
                          </div>

                          <div>
                            <span className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              {txt('Hình thức', 'Action Type')}
                            </span>
                            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => handleActionTypeChange('ADD_ON')}
                                className={`py-1 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                                  maintenanceForm.partActionType === 'ADD_ON'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                              >
                                ➕ {txt('Gắn thêm', 'Add-on')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleActionTypeChange('REPLACE')}
                                className={`py-1 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                                  maintenanceForm.partActionType === 'REPLACE'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                              >
                                🔄 {txt('Thay thế', 'Replace')}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 3. Xử lý linh kiện cũ (khi thay thế) */}
                        {maintenanceForm.partActionType === 'REPLACE' && (
                          <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200/70 dark:border-amber-800/40 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={maintenanceForm.returnOldPart}
                                onChange={(e) =>
                                  setMaintenanceForm({ ...maintenanceForm, returnOldPart: e.target.checked })
                                }
                                className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300"
                              />
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                ♻️ {txt('Thu hồi linh kiện cũ / hư về kho IT', 'Return replaced part to IT inventory')}
                              </span>
                            </label>

                            {maintenanceForm.returnOldPart && (
                              <div className="space-y-1.5 pt-1 pl-1">
                                <input
                                  type="text"
                                  placeholder={txt('Tên linh kiện cũ (VD: RAM 4GB Hynix hỏng...)', 'Old part name (e.g. 4GB Hynix broken RAM...)')}
                                  value={maintenanceForm.oldPartName}
                                  onChange={(e) =>
                                    setMaintenanceForm({ ...maintenanceForm, oldPartName: e.target.value })
                                  }
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                />

                                <div className="grid grid-cols-2 gap-1.5">
                                  <select
                                    value={maintenanceForm.oldPartCondition}
                                    onChange={(e) =>
                                      setMaintenanceForm({ ...maintenanceForm, oldPartCondition: e.target.value })
                                    }
                                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-medium"
                                  >
                                    <option value="BROKEN">❌ {txt('Hỏng hoàn toàn / Thanh lý', 'Broken / For scrap')}</option>
                                    <option value="NEED_REPAIR">⚠️ {txt('Lỗi nhẹ / Cần kiểm tra', 'Glitchy / Needs test')}</option>
                                    <option value="REUSABLE">✅ {txt('Còn tốt / Tận dụng', 'Reusable / Working')}</option>
                                  </select>

                                  <select
                                    value={maintenanceForm.oldPartAction}
                                    onChange={(e) =>
                                      setMaintenanceForm({ ...maintenanceForm, oldPartAction: e.target.value })
                                    }
                                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-medium"
                                  >
                                    <option value="SCRAP_DISPOSAL">{txt('Kho chờ thanh lý', 'Scrap warehouse')}</option>
                                    <option value="REPAIR_SPARE">{txt('Kho dự phòng sửa', 'Spare for repair')}</option>
                                    <option value="RESTOCK">{txt('Nhập lại kho dùng tiếp', 'Restock to pool')}</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. Checkbox Biên bản bàn giao */}
                        <div className="pt-0.5">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={maintenanceForm.hasHandoverDoc}
                              onChange={(e) =>
                                setMaintenanceForm({ ...maintenanceForm, hasHandoverDoc: e.target.checked })
                              }
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                            />
                            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span>{txt('Lập Biên bản bàn giao thay thế linh kiện', 'Generate Handover Report')}</span>
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tiêu đề */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {txt('Tiêu đề / Nội dung vắn tắt (*)', 'Summary / Title (*)')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={txt('VD: Thay bàn phím mới, Nâng cấp 8GB RAM...', 'e.g. Replace keyboard, upgrade 8GB RAM...')}
                      value={maintenanceForm.title}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>

                  {/* Chi phí & Tiền tệ */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {txt('Chi phí linh kiện / DV', 'Cost')}
                      </label>
                      <input
                        type="number"
                        placeholder="VD: 850000"
                        value={maintenanceForm.cost}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {txt('Đơn vị tiền', 'Currency')}
                      </label>
                      <select
                        value={maintenanceForm.costCurrency || 'VND'}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, costCurrency: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ngày & Kỹ thuật viên */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {txt('Ngày thực hiện', 'Date Performed')}
                      </label>
                      <input
                        type="date"
                        value={maintenanceForm.performedAt}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedAt: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {txt('Kỹ thuật viên', 'Technician / Performed By')}
                      </label>
                      <select
                        value={maintenanceForm.performedById}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedById: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">{txt('-- Chọn nhân sự --', '-- Select Staff --')}</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ghi chú chi tiết */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {txt('Ghi chú chi tiết linh kiện / sửa chữa', 'Detailed Notes / Spare Parts Info')}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={txt('Ghi chú serial linh kiện mới, thông số kỹ thuật, tình trạng bàn giao...', 'Notes on serial numbers, specs, handover notes...')}
                      value={maintenanceForm.description}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-normal"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  form="maintenance-form"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? txt('Đang lưu...', 'Saving...') : txt('Lưu Phiếu Bảo Trì & Xuất Kho', 'Save & Update Stock')}</span>
                </button>
              </div>
            </div>

            {/* Right Column (7/12): History Timeline List with Handover Report & QR */}
            <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{txt('Lịch sử sửa chữa & bảo dưỡng', 'Maintenance History')} ({maintenanceLogs.length}):</span>
                  </h4>
                  {maintenanceLogs.length > 0 && (
                    <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg">
                      {txt('Tổng chi phí:', 'Total:')} {formatCurrency(maintenanceLogs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0))}
                    </span>
                  )}
                </div>

                {maintenanceLogs.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5 mt-3">
                    <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isLoading ? txt('Đang tải lịch sử bảo trì...', 'Loading history...') : txt('Chưa có lịch sử bảo trì nào', 'No maintenance records found')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {txt('Điền form bên trái để ghi nhận đợt bảo trì đầu tiên.', 'Fill out the form on the left to record maintenance.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 mt-3">
                    {maintenanceLogs.map((log) => {
                      const partUsage = log.attachmentUrls?.partUsage || null;

                      const logTypeConfig = (() => {
                        switch (log.type) {
                          case 'UPGRADE':
                            return { label: txt('Nâng cấp', 'Upgrade'), badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800', icon: '🚀' };
                          case 'REPAIR':
                            return { label: txt('Sửa chữa', 'Repair'), badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: '🔧' };
                          case 'REPLACEMENT':
                            return { label: txt('Thay thế', 'Replace'), badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: '🔄' };
                          case 'CLEANING':
                            return { label: txt('Bảo dưỡng', 'Cleaning'), badge: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800', icon: '🧼' };
                          case 'SOFTWARE_UPDATE':
                            return { label: txt('Cài phần mềm', 'Software'), badge: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800', icon: '💻' };
                          case 'INSPECTION':
                            return { label: txt('Kiểm tra', 'Inspect'), badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: '🔍' };
                          default:
                            return { label: txt('Ghi chú', 'Notes'), badge: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: '📝' };
                        }
                      })();

                      return (
                        <div
                          key={log.id}
                          className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xs space-y-2 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                        >
                          {/* Log Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${logTypeConfig.badge}`}>
                                <span>{logTypeConfig.icon}</span>
                                <span>{logTypeConfig.label}</span>
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{log.title}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10.5px] font-mono text-slate-400">
                                📅 {new Date(log.performedAt).toLocaleDateString('vi-VN')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaintenance(log.id)}
                                className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                title={txt('Xóa phiếu (hoàn trả tồn kho)', 'Delete record (restore stock)')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Thông tin phụ tùng thay thế / gắn thêm (nếu có) */}
                          {partUsage && (
                            <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-1.5 text-xs">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-amber-600" />
                                  <span>
                                    {partUsage.partActionType === 'ADD_ON' ? '➕ Gắn thêm mới:' : '🔄 Thay thế:'} {partUsage.sparePartName}
                                  </span>
                                </span>
                                <span className="font-mono font-bold text-amber-800 dark:text-amber-300 text-[11px] bg-amber-100 dark:bg-amber-900/60 px-2 py-0.2 rounded-md">
                                  SL: {partUsage.quantity} {partUsage.unit} {partUsage.sparePartSku ? `• SKU: ${partUsage.sparePartSku}` : ''}
                                </span>
                              </div>

                              {partUsage.returnOldPart && (
                                <div className="text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1 pt-0.5 border-t border-amber-200/50 dark:border-amber-800/30">
                                  <span>♻️ Thu hồi linh kiện cũ:</span>
                                  <strong>{partUsage.oldPartName || 'Linh kiện tháo ra'}</strong>
                                  <span className="italic">
                                    (
                                    {partUsage.oldPartCondition === 'BROKEN'
                                      ? 'Hỏng'
                                      : partUsage.oldPartCondition === 'NEED_REPAIR'
                                      ? 'Lỗi nhẹ'
                                      : 'Còn tốt'}
                                    )
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {log.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl">
                              {log.description}
                            </p>
                          )}

                          {/* Log Footer & Action Buttons */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span>
                                KTV: <strong className="text-slate-700 dark:text-slate-300">{log.performedBy?.fullName || 'IT'}</strong>
                              </span>
                              <span>•</span>
                              <span className="font-bold font-mono text-amber-700 dark:text-amber-400">
                                {log.cost ? formatPrice(Number(log.cost), log.costCurrency || 'VND') : txt('Miễn phí', 'Free')}
                              </span>
                            </div>

                            {/* Action Buttons: Biên Bản & Mã QR */}
                            <div className="flex items-center gap-1.5">
                              {/* Nút Xem & In Biên Bản Bàn Giao */}
                              <button
                                type="button"
                                onClick={() => setHandoverModalLog(log)}
                                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title={txt('Xem & in biên bản bàn giao thay thế linh kiện', 'View & Print Handover Report')}
                              >
                                <FileText className="w-3 h-3 text-blue-600" />
                                <span>{txt('In Biên Bản', 'Handover Doc')}</span>
                              </button>

                              {/* Nút Mã QR Theo Dõi Sửa Chữa */}
                              <button
                                type="button"
                                onClick={() => setQrModalLog(log)}
                                className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title={txt('Tạo & in mã QR theo dõi bảo trì', 'Generate Tracking QR Code')}
                              >
                                <QrCode className="w-3 h-3 text-amber-600" />
                                <span>{txt('Mã QR', 'QR Code')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Sticky Footer */}
          <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {txt('Đóng (Esc)', 'Close (Esc)')}
            </button>
          </div>
        </div>
      </div>

      {/* Handover Report Modal */}
      {handoverModalLog && (
        <MaintenanceHandoverModal
          isOpen={!!handoverModalLog}
          onClose={() => setHandoverModalLog(null)}
          asset={asset}
          log={handoverModalLog}
        />
      )}

      {/* Maintenance Tracking QR Modal */}
      {qrModalLog && (
        <MaintenanceQrModal
          isOpen={!!qrModalLog}
          onClose={() => setQrModalLog(null)}
          asset={asset}
          log={qrModalLog}
        />
      )}
    </>
  );
};
export default AssetMaintenanceModal;

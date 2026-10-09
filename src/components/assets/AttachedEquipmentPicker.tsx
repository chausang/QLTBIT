'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Laptop,
  Monitor,
  Package,
  Plus,
  Trash2,
  Search,
  Check,
  X,
  Layers,
  Sparkles,
  Loader2,
  Tag,
  Boxes,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface AttachedEquipmentItem {
  id: string;
  sparePartId?: string;
  name: string;
  sku?: string;
  type?: string;
  serialNumber?: string;
  quantity?: number;
  note?: string;
}

interface AttachedEquipmentPickerProps {
  specs: Record<string, any>;
  onChange: (updatedSpecs: Record<string, any>) => void;
}

export const AttachedEquipmentPicker: React.FC<AttachedEquipmentPickerProps> = ({
  specs = {},
  onChange,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const txt = (vi: string, en: string, ja?: string) => (language === 'ja' && ja ? ja : isEn ? en : vi);

  // Spare parts state
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loadingSpareParts, setLoadingSpareParts] = useState(false);
  const [hasLoadedSpareParts, setHasLoadedSpareParts] = useState(false);

  // Modal / Selector state
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'MONITOR' | 'ACCESSORY'>('MONITOR');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Manual accessory subform
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState('Phụ kiện');
  const [manualSerial, setManualSerial] = useState('');

  // Extract attached equipment list
  const attachedItems: AttachedEquipmentItem[] = useMemo(() => {
    if (Array.isArray(specs?.attachedEquipment)) {
      return specs.attachedEquipment;
    }
    return [];
  }, [specs?.attachedEquipment]);

  // Load spare parts from API
  const loadSpareParts = async () => {
    if (hasLoadedSpareParts && spareParts.length > 0) return;
    setLoadingSpareParts(true);
    try {
      const res = await fetch('/api/spare-parts');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.spareParts)) {
        setSpareParts(data.spareParts);
        setHasLoadedSpareParts(true);
      }
    } catch (e) {
      console.error('Lỗi tải kho linh kiện:', e);
    } finally {
      setLoadingSpareParts(false);
    }
  };

  // Open modal to pick monitor from inventory
  const handleOpenPickMonitor = () => {
    setPickerTarget('MONITOR');
    setSearchTerm('');
    setSelectedCategory('ALL');
    setIsPickerModalOpen(true);
    loadSpareParts();
  };

  // Open modal to pick general accessory from inventory
  const handleOpenPickAccessory = () => {
    setPickerTarget('ACCESSORY');
    setSearchTerm('');
    setSelectedCategory('ALL');
    setIsPickerModalOpen(true);
    loadSpareParts();
  };

  // Extract brand name from part name
  const guessBrand = (name: string): string => {
    const brands = ['Dell', 'HP', 'Samsung', 'LG', 'Asus', 'Acer', 'ViewSonic', 'AOC', 'Lenovo', 'BenQ', 'Gigabyte', 'MSI', 'Philips', 'Logitech', 'Kingston'];
    const found = brands.find((b) => new RegExp(`\\b${b}\\b`, 'i').test(name));
    return found || '';
  };

  // When a spare part is selected
  const handleSelectSparePart = (part: any) => {
    if (pickerTarget === 'MONITOR') {
      // Auto-fill monitor specs
      const detectedBrand = guessBrand(part.name) || part.vendor?.name || '';
      let detectedModel = part.name;
      if (detectedBrand) {
        detectedModel = detectedModel.replace(new RegExp(`^${detectedBrand}\\s*`, 'i'), '').trim();
      }

      const updated = {
        ...(specs || {}),
        monitorBrand: detectedBrand || specs.monitorBrand || '',
        monitorModel: detectedModel || part.name,
        monitorSerial: specs.monitorSerial || part.sku || '',
        monitorSparePartId: part.id,
      };
      onChange(updated);
    } else {
      // Add to attached equipment list
      const newItem: AttachedEquipmentItem = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sparePartId: part.id,
        name: part.name,
        sku: part.sku || '',
        type: part.category?.name || 'Linh kiện kho',
        quantity: 1,
        serialNumber: '',
        note: part.location?.name ? `Kho: ${part.location.name}` : '',
      };

      const updatedList = [...attachedItems, newItem];
      onChange({
        ...(specs || {}),
        attachedEquipment: updatedList,
      });
    }

    setIsPickerModalOpen(false);
  };

  // Remove attached item
  const handleRemoveAttachedItem = (id: string) => {
    const updatedList = attachedItems.filter((item) => item.id !== id);
    onChange({
      ...(specs || {}),
      attachedEquipment: updatedList,
    });
  };

  // Update serial or note for attached item
  const handleUpdateAttachedItem = (id: string, field: 'serialNumber' | 'name' | 'note', value: string) => {
    const updatedList = attachedItems.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange({
      ...(specs || {}),
      attachedEquipment: updatedList,
    });
  };

  // Add manual accessory
  const handleAddManualAccessory = () => {
    if (!manualName.trim()) return;
    const newItem: AttachedEquipmentItem = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: manualName.trim(),
      type: manualType.trim() || 'Phụ kiện',
      serialNumber: manualSerial.trim(),
      quantity: 1,
    };
    const updatedList = [...attachedItems, newItem];
    onChange({
      ...(specs || {}),
      attachedEquipment: updatedList,
    });
    setManualName('');
    setManualSerial('');
    setIsManualAddOpen(false);
  };

  // Filtered spare parts
  const filteredSpareParts = useMemo(() => {
    let list = spareParts;

    if (pickerTarget === 'MONITOR') {
      // Prioritize monitor parts
      list = [...spareParts].sort((a, b) => {
        const aIsMon = /màn hình|monitor|lcd|led|display/i.test(`${a.name} ${a.category?.name || ''}`);
        const bIsMon = /màn hình|monitor|lcd|led|display/i.test(`${b.name} ${b.category?.name || ''}`);
        if (aIsMon && !bIsMon) return -1;
        if (!aIsMon && bIsMon) return 1;
        return 0;
      });
    }

    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q) ||
          p.fixedAssetName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [spareParts, pickerTarget, selectedCategory, searchTerm]);

  // Unique categories for filter
  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    spareParts.forEach((p) => {
      if (p.category?.id && p.category?.name) {
        map.set(p.category.id, p.category.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [spareParts]);

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* 1. KHỐI THÔNG TIN MÀN HÌNH ĐI KÈM                        */}
      {/* ======================================================== */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-indigo-600" />
            <span>{txt('THÔNG TIN MÀN HÌNH ĐI KÈM (MONITOR SPECS)', 'ATTACHED MONITOR SPECIFICATIONS', '付属モニター仕様')}</span>
          </span>

          {/* Nút chọn màn hình từ kho */}
          <button
            type="button"
            onClick={handleOpenPickMonitor}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group"
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>{txt('Chọn từ kho linh kiện phụ tùng...', 'Pick monitor from inventory...', '在庫からモニターを選択...')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {txt('Màn hình - Hãng SX', 'Monitor Brand', 'モニターメーカー')}
            </label>
            <input
              type="text"
              placeholder="HP, Dell, Samsung, LG, AOC..."
              value={specs?.monitorBrand || ''}
              onChange={(e) => onChange({ ...specs, monitorBrand: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {txt('Màn hình - Model', 'Monitor Model', 'モニター型番')}
            </label>
            <input
              type="text"
              placeholder="P2419H, V190, 190V4L..."
              value={specs?.monitorModel || ''}
              onChange={(e) => onChange({ ...specs, monitorModel: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {txt('Màn hình - Số Seri', 'Monitor Serial Number', 'モニターSN')}
            </label>
            <input
              type="text"
              placeholder="3CQ60118YQ, CN0..."
              value={specs?.monitorSerial || ''}
              onChange={(e) => onChange({ ...specs, monitorSerial: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {txt('Màn hình - Năm SX', 'Monitor Year', 'モニター製造年')}
            </label>
            <input
              type="text"
              placeholder="2022, 2023..."
              value={specs?.monitorYear || ''}
              onChange={(e) => onChange({ ...specs, monitorYear: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. KHỐI CÁC THIẾT BỊ / PHỤ TÙNG ĐI KÈM KHÁC               */}
      {/* ======================================================== */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>{txt('THIẾT BỊ & LINH KIỆN ĐI KÈM KHÁC', 'ATTACHED EQUIPMENT & ACCESSORIES', '付属機器・部品一覧')}</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {txt(
                'Gắn kèm chuột, bàn phím, màn hình phụ, sạc, UPS... chọn trực tiếp từ kho hoặc nhập tự do.',
                'Attach mouse, keyboard, secondary monitor, charger, UPS... select from inventory or enter manually.',
                'マウス、キーボード、予備モニター、充電器などを在庫から選択または直接入力できます。'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPickAccessory}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group"
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>{txt('⊕ Chọn từ kho linh kiện', '⊕ Add from Inventory', '⊕ 在庫から追加')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManualAddOpen(!isManualAddOpen)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              <span>{isManualAddOpen ? txt('Đóng form', 'Close', '閉じる') : txt('+ Thêm thủ công', '+ Add Manually', '+ 手動追加')}</span>
            </button>
          </div>
        </div>

        {/* Form thêm thủ công */}
        {isManualAddOpen && (
          <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2.5 animate-in fade-in duration-150">
            <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
              {txt('Nhập thông tin thiết bị đi kèm thủ công:', 'Enter manual accessory details:', '手動で付属機器を入力:')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder={txt('Tên thiết bị (VD: Chuột Logitech B100, Bàn phím...)', 'Device name (e.g. Mouse, Keyboard...)', '機器名（例：マウス、キーボードなど）')}
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder={txt('Loại (Chuột, Phím, Sạc...)', 'Type (Mouse, Key, Charger...)', '分類（マウス、キーボード等）')}
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder={txt('Số Seri (nếu có)', 'Serial Number (optional)', 'シリアル番号')}
                  value={manualSerial}
                  onChange={(e) => setManualSerial(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="sm:col-span-1 flex items-center">
                <button
                  type="button"
                  onClick={handleAddManualAccessory}
                  disabled={!manualName.trim()}
                  className="w-full p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                  title="Thêm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Danh sách thiết bị đi kèm */}
        {attachedItems.length === 0 ? (
          <div className="p-4 bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
            <p className="text-xs text-slate-400">
              {txt('Chưa có thiết bị đi kèm nào. Bấm nút bên trên để chọn từ kho linh kiện.', 'No attached equipment. Click above to pick from inventory.', '付属機器はありません。上記ボタンから在庫を選択できます。')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-2xs group hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
                    <Package className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>
                      {item.sku && (
                        <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold rounded border border-slate-200 dark:border-slate-700">
                          {item.sku}
                        </span>
                      )}
                      {item.type && (
                        <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold rounded">
                          {item.type}
                        </span>
                      )}
                      {item.sparePartId && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                          <Boxes className="w-3 h-3" />
                          <span>Từ kho</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Số Seri riêng của linh kiện (nếu có)..."
                        value={item.serialNumber || ''}
                        onChange={(e) => handleUpdateAttachedItem(item.id, 'serialNumber', e.target.value)}
                        className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono outline-none focus:border-emerald-500 w-48"
                      />
                      {item.note && (
                        <span className="text-[10.5px] text-slate-400 truncate">{item.note}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAttachedItem(item.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Xóa thiết bị đi kèm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CHỌN PHỤ TÙNG TỪ KHO LINH KIỆN                    */}
      {/* ======================================================== */}
      {isPickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Boxes className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {pickerTarget === 'MONITOR'
                      ? txt('Chọn Màn Hình Từ Kho Phụ Tùng', 'Select Monitor from Inventory', '在庫からモニターを選択')
                      : txt('Chọn Thiết Bị / Phụ Tùng Đi Kèm Từ Kho', 'Select Attached Equipment from Inventory', '在庫から付属機器を選択')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {txt('Chọn linh kiện sẵn có trong kho để tự động gắn thông tin và liên kết', 'Select existing spare part to auto-fill details', '在庫内の既存部品を選択して自動入力します')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPickerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  autoFocus
                  placeholder={txt('Tìm kiếm theo tên phụ tùng, SKU, model...', 'Search by part name, SKU, model...', '部品名、SKU、型番で検索...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">{txt('Tất cả danh mục', 'All Categories', 'すべてのカテゴリ')}</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Parts list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {loadingSpareParts ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-400">{txt('Đang tải danh sách kho phụ tùng...', 'Loading spare parts...', '在庫データを読み込み中...')}</p>
                </div>
              ) : filteredSpareParts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">
                    {txt('Không tìm thấy phụ tùng phù hợp trong kho', 'No matching spare parts found', '該当する在庫部品が見つかりません')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {txt('Hãy thử đổi từ khóa tìm kiếm hoặc danh mục', 'Try changing search query or category', '検索キーワードまたはカテゴリを変更してください')}
                  </p>
                </div>
              ) : (
                filteredSpareParts.map((part) => {
                  const isMonitor = /màn hình|monitor|lcd|led|display/i.test(`${part.name} ${part.category?.name || ''}`);
                  return (
                    <div
                      key={part.id}
                      onClick={() => handleSelectSparePart(part)}
                      className={`p-3 bg-white dark:bg-slate-800/80 border rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] hover:shadow-md ${
                        isMonitor
                          ? 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {part.name}
                          </span>
                          {part.sku && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold rounded-md">
                              {part.sku}
                            </span>
                          )}
                          {isMonitor && (
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                              <Monitor className="w-3 h-3" />
                              <span>Màn hình</span>
                            </span>
                          )}
                          {part.category && !isMonitor && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded-md">
                              {part.category.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Tồn kho:{' '}
                            <strong className={part.quantity <= part.minStock ? 'text-rose-600' : 'text-emerald-600'}>
                              {part.quantity} {part.unit || 'cái'}
                            </strong>
                          </span>
                          {part.location?.name && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{part.location.name}</span>
                            </span>
                          )}
                          {part.fixedAssetName && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              TSCĐ: {part.fixedAssetName}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{txt('Chọn', 'Select', '選択')}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPickerModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {txt('Đóng', 'Close', '閉じる')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachedEquipmentPicker;

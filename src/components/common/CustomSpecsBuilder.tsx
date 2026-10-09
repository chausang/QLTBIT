'use client';

import React, { useState } from 'react';
import {
  Plus,
  PlusCircle,
  Trash2,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Lock,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface CustomSpecItem {
  id: string;
  key: string;
  label: string;
  value: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  placeholder?: string;
  isDefault?: boolean;
}

// Bảng các mã code, trường hệ thống, dữ liệu quét tự động (Auto-Scan / Telemetry) tuyệt đối không đưa vào Custom Specs
export const SYSTEM_EXCLUDE_KEYS = new Set([
  // Hardware baseline (đã có ô cấu hình riêng cố định)
  'os',
  'hostname',
  'motherboard',
  'cpu',
  'ram',
  'gpu',
  'storage',
  'ipAddress',
  'macAddress',
  'antivirus',
  'screen',
  'display',
  'refreshrate',
  'resolution',
  // Màn hình đi kèm (đã có ô riêng & kho linh kiện)
  'monitorBrand',
  'monitorYear',
  'monitorModel',
  'monitorSerial',
  'monitorSparePartId',
  // Asset metadata
  'manufacturingYear',
  'oldAssetCode',
  'reissueStatus',
  'assignedLicenseIds',
  'depreciationMonths',
  'exchangeRate',
  'contractNumber',
  'invoiceNumber',
  'invoiceUrl',
  // Auto-scan / Agent PS1 / Telemetry / Internal code
  'osLicense',
  'officeLicense',
  'crackDetection',
  'installedSoftware',
  'unmanagedCommercialApps',
  'changeHistory',
  'softwareChangeAlert',
  'lastScannedAt',
  'lastScannedHost',
  'autoDiscovered',
  'deviceType',
  'hasBattery',
  'loggedUser',
  'chassisTypes',
  'lastChangeDetectedAt',
  'licenseMatches',
  'disks',
  'monitors',
  'networkAdapters',
  'ramSticks',
  'biosVersion',
  'systemFamily',
  'skuNumber',
  'autoScanned',
  'autoScanVersion',
  'agentVersion',
  'installedPrinters',
  'rawWmi',
  'hwAlert',
  'hardwareTamperAlert',
  'batteryHealth',
  'networkSpeed',
  'source',
  'isAutoScanned',
  // Attached equipment & internal containers
  'attachedEquipment',
  'attachedPeripherals',
  'customSpecs',
  'customFields',
]);

interface CustomSpecsBuilderProps {
  specs: Record<string, any>;
  onChange: (updatedSpecs: Record<string, any>) => void;
  excludeKeys?: string[];
  defaultKeys?: string[];
  suggestions?: string[];
  title?: string;
  subtitle?: string;
}

export const CustomSpecsBuilder: React.FC<CustomSpecsBuilderProps> = ({
  specs = {},
  onChange,
  excludeKeys = [],
  defaultKeys = [],
  suggestions = [],
  title,
  subtitle,
}) => {
  const { language, isEn, isJa } = useLanguage();
  const txt = (vi: string, en: string, ja?: string) => (isJa && ja ? ja : isEn ? en : vi);

  const [isOpenAddForm, setIsOpenAddForm] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'boolean'>('text');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');

  // Tập hợp các key loại trừ
  const excludeSet = new Set([...Array.from(SYSTEM_EXCLUDE_KEYS), ...excludeKeys]);
  const defaultKeySet = new Set(defaultKeys);

  // Nguồn dữ liệu custom specs sạch
  const sourceCustomSpecs: Record<string, any> =
    specs?.customSpecs && typeof specs.customSpecs === 'object' && !Array.isArray(specs.customSpecs)
      ? specs.customSpecs
      : specs?.customFields && typeof specs.customFields === 'object' && !Array.isArray(specs.customFields)
      ? specs.customFields
      : {};

  // Trích xuất các entry tùy chỉnh thực sự (lọc sạch 100% mã code, object, array, system telemetry)
  const customEntries: Array<{ key: string; value: any; isDefault: boolean }> = [];

  // 1. Thêm từ container customSpecs/customFields nếu có
  if (Object.keys(sourceCustomSpecs).length > 0) {
    Object.entries(sourceCustomSpecs).forEach(([key, value]) => {
      if (excludeSet.has(key)) return;
      if (typeof value === 'object' && value !== null) return;
      customEntries.push({
        key,
        value: typeof value === 'boolean' ? (value ? 'Có' : 'Không') : value,
        isDefault: defaultKeySet.has(key),
      });
    });
  } else {
    // 2. Fallback quét từ root specs nhưng lọc cực kỳ nghiêm ngặt
    Object.entries(specs || {}).forEach(([key, value]) => {
      if (excludeSet.has(key)) return;
      // Bỏ qua object, array, function
      if (typeof value === 'object' && value !== null) return;
      // Bỏ qua chuỗi JSON thô
      if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) return;
      // Bỏ qua key hệ thống nội bộ
      if (key.startsWith('_') || key.startsWith('is') || key.startsWith('has') || key.startsWith('last') || key.startsWith('auto')) return;
      if (/license|alert|history|scanned|wmi|telemetry|agent/i.test(key)) return;

      customEntries.push({
        key,
        value: typeof value === 'boolean' ? (value ? 'Có' : 'Không') : value,
        isDefault: defaultKeySet.has(key),
      });
    });
  }

  // Cập nhật specs an toàn và sạch sẽ
  const updateCustomMap = (newMap: Record<string, any>) => {
    const updated = { ...(specs || {}) };
    updated.customSpecs = newMap;
    // Đồng bộ các key tùy chỉnh vào root (loại bỏ key cũ nếu đã xóa)
    onChange(updated);
  };

  // Lấy map hiện tại
  const getCurrentMap = (): Record<string, any> => {
    const map: Record<string, any> = {};
    customEntries.forEach((e) => {
      map[e.key] = e.value;
    });
    return map;
  };

  // Thêm trường tùy chỉnh mới
  const handleAddField = () => {
    const trimmedLabel = newFieldLabel.trim();
    if (!trimmedLabel) return;

    const current = getCurrentMap();
    current[trimmedLabel] = '';
    updateCustomMap(current);

    setNewFieldLabel('');
    setNewFieldPlaceholder('');
    setIsOpenAddForm(false);
  };

  // Đổi tên trường (chỉ áp dụng cho trường tùy chỉnh, không cho đổi thông số mặc định)
  const handleRenameKey = (oldKey: string, newKeyName: string) => {
    const trimmed = newKeyName.trim();
    if (!trimmed || trimmed === oldKey) return;
    if (defaultKeySet.has(oldKey)) return; // Không cho đổi tên trường mặc định

    const current = getCurrentMap();
    const val = current[oldKey] ?? '';
    delete current[oldKey];
    current[trimmed] = val;

    updateCustomMap(current);
  };

  // Sửa giá trị của trường
  const handleChangeValue = (key: string, value: any) => {
    const current = getCurrentMap();
    current[key] = value;
    updateCustomMap(current);
  };

  // Xóa trường (chỉ cho xóa trường tùy chỉnh, KHÔNG cho xóa thông số mặc định)
  const handleRemoveField = (key: string) => {
    if (defaultKeySet.has(key)) return; // Không cho xóa trường mặc định

    const current = getCurrentMap();
    delete current[key];
    updateCustomMap(current);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3.5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl">
            <SlidersHorizontal className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {title || txt('Thông số kỹ thuật tùy chỉnh (Custom Specs)', 'Custom Specifications', 'カスタム技術仕様')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {subtitle ||
                txt(
                  'Thêm các trường thông số mở rộng riêng biệt. Thông số mặc định được khóa cố định, chỉ thêm/xóa các trường tùy chỉnh.',
                  'Add custom specification fields. Default specs are locked, only add or delete custom fields.',
                  '拡張仕様項目を追加します。デフォルト項目は保護され、追加項目のみ編集・削除できます。'
                )}
            </p>
          </div>
        </div>

        <span className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          {customEntries.length} {txt('trường mở rộng', 'fields', '項目')}
        </span>
      </div>

      {/* Danh sách các trường thông số */}
      {customEntries.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {customEntries.map(({ key, value, isDefault }, index) => (
              <div
                key={`${key}-${index}`}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 shadow-2xs group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-1">
                  {/* Nhãn trường: Nếu là trường mặc định thì hiển thị cố định + biểu tượng khóa, nếu là trường tùy chỉnh thì cho sửa tên */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Tag className="w-3 h-3 text-indigo-500 shrink-0" />
                    {isDefault ? (
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate py-0.5 flex items-center gap-1">
                        <span>{key}</span>
                        <span className="text-[9.5px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{txt('Mặc định', 'Default', 'デフォルト')}</span>
                        </span>
                      </span>
                    ) : (
                      <input
                        type="text"
                        defaultValue={key}
                        onBlur={(e) => handleRenameKey(key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRenameKey(key, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        title={txt('Bấm để đổi tên trường tùy chỉnh này', 'Click to rename this custom field', 'クリックして項目名を変更')}
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-500 focus:border-indigo-600 focus:outline-none w-full truncate transition-colors py-0.5 cursor-text"
                      />
                    )}
                  </div>

                  {/* Nút Xóa: CHỈ HIỂN THỊ cho trường tùy chỉnh do người dùng thêm, KHÔNG CHO XÓA thông số mặc định */}
                  {!isDefault ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveField(key)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title={txt('Xóa trường tùy chỉnh này', 'Delete custom field', 'この項目を削除')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span
                      className="text-slate-300 p-1 shrink-0"
                      title={txt('Thông số mặc định - Không thể xóa', 'Default parameter - Cannot be deleted', 'デフォルト項目のため削除不可')}
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Ô nhập giá trị */}
                <div>
                  <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => handleChangeValue(key, e.target.value)}
                    placeholder={txt(`Nhập ${key}...`, `Enter ${key}...`, `${key}を入力...`)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nút bấm: Thêm trường thông số mới */}
      {!isOpenAddForm && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsOpenAddForm(true)}
            className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-dashed border-indigo-300 dark:border-indigo-700/80 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group"
          >
            <PlusCircle className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>{txt('Thêm trường thông số mới...', 'Add new specification field...', '新しい仕様項目を追加...')}</span>
          </button>
        </div>
      )}

      {/* Sub-form: Thêm trường thông số mới (Chuẩn UI) */}
      {isOpenAddForm && (
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-3 shadow-xs animate-in fade-in zoom-in-98 duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>{txt('Thêm trường thông số mới vào thiết bị / linh kiện:', 'Add new spec field:', '新しい仕様項目を追加:')}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenAddForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Tên trường */}
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {txt('Tên trường (*)', 'Field Name (*)', '項目名 (*)')}
              </label>
              <input
                type="text"
                autoFocus
                placeholder={txt('VD: Băng thông, IP Tĩnh, SLA...', 'e.g. Bandwidth, Static IP, SLA...', '例：帯域幅、固定IP、SLA...')}
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddField();
                  }
                }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            {/* Kiểu dữ liệu */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {txt('Kiểu dữ liệu', 'Data Type', 'データ型')}
              </label>
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as any)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="text">{txt('Văn bản (text)', 'Text (text)', 'テキスト (text)')}</option>
                <option value="number">{txt('Số (number)', 'Number (number)', '数値 (number)')}</option>
                <option value="date">{txt('Ngày tháng (date)', 'Date (date)', '日付 (date)')}</option>
                <option value="boolean">{txt('Có / Không (boolean)', 'Yes / No (boolean)', '真偽値 (boolean)')}</option>
              </select>
            </div>

            {/* Gợi ý / Placeholder */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {txt('Gợi ý / Placeholder', 'Placeholder', 'プレースホルダー')}
              </label>
              <input
                type="text"
                placeholder="VD: 16GB, E3, 500Mbps..."
                value={newFieldPlaceholder}
                onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddField();
                  }
                }}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          {suggestions && suggestions.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{txt('Gợi ý nhanh (nhấp để chọn):', 'Quick suggestions (click to use):', 'クイック候補（クリックして適用）:')}</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setNewFieldLabel(sug);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 rounded-md text-[10.5px] font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpenAddForm(false)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {txt('Hủy', 'Cancel', 'キャンセル')}
            </button>
            <button
              type="button"
              onClick={handleAddField}
              disabled={!newFieldLabel.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{txt('Thêm trường', 'Add Field', '項目を追加')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSpecsBuilder;

'use client';

import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import ExcelJS from 'exceljs';

export interface ModuleDataToolbarProps {
  moduleKey: string; // 'asset-categories' | 'license-categories' | 'service-categories' | 'vendors' | 'companies' | 'locations' | 'assets' | 'spare-parts'
  moduleName: string; // 'Danh Mục Thiết Bị', ...
  excelType?: string; // 'assets' | 'licenses' | 'services' | 'vendors' | 'companies' | 'locations'
  currentData: any[]; // Dữ liệu hiện tại hiển thị trên bảng để xuất Excel nhanh
  onDataRefresh: () => void | Promise<void>;
  excelColumns?: { header: string; key: string; width?: number; format?: (val: any, row: any) => any }[];
  isEn?: boolean;
}

export default function ModuleDataToolbar({
  moduleKey,
  moduleName,
  excelType,
  currentData,
  onDataRefresh,
  excelColumns,
  isEn = false,
}: ModuleDataToolbarProps) {
  // Modal states
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isExportLoading, setIsExportLoading] = useState(false);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreParsedData, setRestoreParsedData] = useState<{
    meta?: any;
    data?: any;
    totalCount?: number;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'upsert' | 'replace'>('upsert');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // Import Excel Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success?: boolean; message?: string; count?: number } | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // 1. BACKUP JSON HANDLER
  const handleBackupJson = async () => {
    setIsBackupLoading(true);
    try {
      const res = await fetch(`/api/system/backup/scoped?module=${encodeURIComponent(moduleKey)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi sao lưu');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `SimplyIT_Backup_${moduleKey}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi sao lưu dữ liệu');
    } finally {
      setIsBackupLoading(false);
    }
  };

  // 2. EXPORT EXCEL HANDLER
  const handleExportExcel = async () => {
    if (!currentData || currentData.length === 0) {
      alert(isEn ? 'No data available to export' : 'Không có dữ liệu để xuất Excel');
      return;
    }
    setIsExportLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Simply IT';
      const sheet = workbook.addWorksheet(moduleName.slice(0, 31));

      // Columns config
      if (excelColumns && excelColumns.length > 0) {
        sheet.columns = excelColumns.map((c) => ({
          header: c.header,
          key: c.key,
          width: c.width || 25,
        }));

        currentData.forEach((row) => {
          const rowData: Record<string, any> = {};
          excelColumns.forEach((c) => {
            const rawVal = row[c.key];
            rowData[c.key] = c.format ? c.format(rawVal, row) : (rawVal ?? '');
          });
          sheet.addRow(rowData);
        });
      } else {
        // Fallback auto detect keys
        const first = currentData[0];
        const keys = Object.keys(first).filter(
          (k) => !['createdAt', 'updatedAt', 'customFields', 'contacts'].includes(k)
        );
        sheet.columns = keys.map((k) => ({
          header: k.toUpperCase(),
          key: k,
          width: 25,
        }));
        currentData.forEach((row) => {
          const r: Record<string, any> = {};
          keys.forEach((k) => {
            r[k] = typeof row[k] === 'object' ? JSON.stringify(row[k]) : (row[k] ?? '');
          });
          sheet.addRow(r);
        });
      }

      // Styling header row
      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E40AF' },
        };
        cell.font = {
          name: 'Segoe UI',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `SimplyIT_${moduleKey}_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export excel error:', err);
      alert(err.message || 'Lỗi khi xuất file Excel');
    } finally {
      setIsExportLoading(false);
    }
  };

  // 3. FILE PARSE FOR RESTORE
  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setRestoreError(isEn ? 'Please select a valid .json backup file' : 'Vui lòng chọn file sao lưu định dạng .json');
      return;
    }

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Check if format has { meta, data }
        if (parsed.data !== undefined) {
          const count = Array.isArray(parsed.data)
            ? parsed.data.length
            : (parsed.data.companies ? parsed.data.companies.length : 1);
          setRestoreParsedData({
            meta: parsed.meta,
            data: parsed.data,
            totalCount: count,
          });
        } else if (Array.isArray(parsed)) {
          setRestoreParsedData({
            meta: null,
            data: parsed,
            totalCount: parsed.length,
          });
        } else {
          setRestoreParsedData({
            meta: null,
            data: parsed,
            totalCount: 1,
          });
        }
      } catch (err: any) {
        setRestoreError(isEn ? 'Invalid JSON file syntax' : 'Cú pháp file JSON không hợp lệ hoặc bị lỗi');
      }
    };
    reader.readAsText(file);
  };

  // 4. RESTORE EXECUTION
  const handleExecuteRestore = async () => {
    if (!restoreParsedData) return;
    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      const res = await fetch('/api/system/backup/scoped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: moduleKey,
          mode: restoreMode,
          data: restoreParsedData.data,
          meta: restoreParsedData.meta,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Lỗi khi phục hồi dữ liệu');
      }

      setRestoreSuccess(result.message || 'Phục hồi dữ liệu thành công!');
      await onDataRefresh();
      setTimeout(() => {
        setIsRestoreModalOpen(false);
        setRestoreFile(null);
        setRestoreParsedData(null);
        setRestoreSuccess(null);
      }, 1500);
    } catch (err: any) {
      setRestoreError(err.message || 'Lỗi khi phục hồi dữ liệu');
    } finally {
      setIsRestoring(false);
    }
  };

  // 5. IMPORT EXCEL EXECUTION
  const handleExecuteImportExcel = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const targetType = excelType || (moduleKey.replace('-categories', 's') as string);
      let res: Response;

      if (moduleKey === 'assets' || targetType === 'assets' || targetType === 'asset') {
        formData.append('importType', 'ASSET');
        res = await fetch('/api/import', {
          method: 'POST',
          body: formData,
        });
      } else if (moduleKey === 'licenses' || targetType === 'licenses' || targetType === 'license') {
        formData.append('importType', 'LICENSE');
        res = await fetch('/api/import', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`/api/categories/excel?type=${encodeURIComponent(targetType)}`, {
          method: 'POST',
          body: formData,
        });
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Lỗi khi nhập Excel');
      }

      const count = result.importedCount ?? result.data?.successRows ?? result.count;
      setImportResult({ success: true, message: result.message, count });
      await onDataRefresh();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportResult(null);
      }, 1500);
    } catch (err: any) {
      setImportResult({ success: false, message: err.message || 'Lỗi khi xử lý file Excel' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      {/* TOOLBAR BUTTONS */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Button 1: Nhập Excel */}
        {excelType && (
          <button
            type="button"
            onClick={() => {
              setIsImportModalOpen(true);
              setImportFile(null);
              setImportResult(null);
            }}
            className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title={isEn ? 'Import data from Excel' : `Nhập ${moduleName} từ file Excel`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isEn ? 'Import Excel' : 'Nhập Excel'}</span>
          </button>
        )}

        {/* Button 2: Xuất Excel */}
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExportLoading}
          className="px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          title={isEn ? 'Export data to Excel' : `Xuất ${moduleName} ra file Excel`}
        >
          {isExportLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span>{isEn ? 'Export Excel' : 'Xuất Excel'}</span>
        </button>

        {/* Button 3: Sao lưu Dữ liệu (JSON) */}
        <button
          type="button"
          onClick={handleBackupJson}
          disabled={isBackupLoading}
          className="px-3 py-2 bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-200 hover:border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          title={isEn ? 'Backup module raw JSON' : `Tải file sao lưu dữ liệu (.JSON) cho riêng ${moduleName}`}
        >
          {isBackupLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
          ) : (
            <Database className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{isEn ? 'Backup JSON' : 'Sao Lưu Dữ Liệu'}</span>
        </button>

        {/* Button 4: Phục hồi Dữ liệu (JSON) */}
        <button
          type="button"
          onClick={() => {
            setIsRestoreModalOpen(true);
            setRestoreFile(null);
            setRestoreParsedData(null);
            setRestoreError(null);
            setRestoreSuccess(null);
          }}
          className="px-3 py-2 bg-white hover:bg-purple-50 text-purple-700 hover:text-purple-800 border border-purple-200 hover:border-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          title={isEn ? 'Restore module data from JSON' : `Phục hồi dữ liệu ${moduleName} từ file sao lưu JSON`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
          <span>{isEn ? 'Restore JSON' : 'Phục Hồi Dữ Liệu'}</span>
        </button>
      </div>

      {/* ==================== MODAL PHỤC HỒI DỮ LIỆU CHỨC NĂNG ==================== */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {isEn ? 'Restore Module Data' : 'Phục Hồi Dữ Liệu Chức Năng'}
                  </h3>
                  <p className="text-xs text-purple-700 font-semibold mt-0.5">
                    {moduleName} ({moduleKey})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* File upload drag drop zone */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  {isEn ? 'Select .json backup file' : 'Chọn file sao lưu dữ liệu (.JSON)'}
                </label>
                <input
                  type="file"
                  ref={jsonFileInputRef}
                  accept=".json"
                  onChange={handleFileSelectForRestore}
                  className="hidden"
                />
                <div
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/70 rounded-xl p-5 text-center cursor-pointer transition-all"
                >
                  <FileCode className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  {restoreFile ? (
                    <div>
                      <p className="font-bold text-slate-800">{restoreFile.name}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {(restoreFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-purple-900">
                        {isEn ? 'Click to browse .json file' : 'Nhấp để chọn file sao lưu (.JSON)'}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {isEn ? 'Must be a valid Simply IT backup file' : 'Hỗ trợ các file sao lưu JSON được xuất từ hệ thống'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsed summary preview */}
              {restoreParsedData && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> File hợp lệ
                    </span>
                    <span>Số lượng: <strong className="text-purple-700 font-black">{restoreParsedData.totalCount} bản ghi</strong></span>
                  </div>
                  {restoreParsedData.meta && (
                    <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-200 pt-1.5">
                      <p>Hệ thống: {restoreParsedData.meta.system || 'Simply IT'}</p>
                      <p>Ngày sao lưu: {restoreParsedData.meta.exportedAt ? new Date(restoreParsedData.meta.exportedAt).toLocaleString('vi-VN') : 'N/A'}</p>
                      {restoreParsedData.meta.module && (
                        <p>Module gốc: <span className="font-semibold text-slate-700">{restoreParsedData.meta.module}</span></p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mode choice */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  {isEn ? 'Restore Mode' : 'Chế độ phục hồi dữ liệu'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('upsert')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      restoreMode === 'upsert'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-400/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isEn ? 'Upsert / Merge' : 'Bổ Sung & Cập Nhật'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {isEn ? 'Add missing items, update existing. Safe.' : 'Thêm mới mục chưa có, cập nhật mục trùng tên. An toàn nhất.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestoreMode('replace')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      restoreMode === 'replace'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-xs text-rose-700">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>{isEn ? 'Replace / Clean' : 'Ghi Đè Thay Thế'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {isEn ? 'Clean existing data and overwrite completely.' : 'Xóa dữ liệu cũ và thay thế bằng bản sao lưu.'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Error / Success Feedback */}
              {restoreError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}
              {restoreSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{restoreSuccess}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!restoreParsedData || isRestoring}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEn ? 'Restoring...' : 'Đang phục hồi...'}</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Start Restore' : 'Tiến Hành Phục Hồi'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL NHẬP DỮ LIỆU EXCEL ==================== */}
      {isImportModalOpen && excelType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {isEn ? 'Import Excel' : 'Nhập Dữ Liệu Từ Excel'}
                  </h3>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                    {moduleName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Template Download Alert */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-emerald-900">
                    {isEn ? 'Need standard Excel template?' : 'Chưa có file mẫu Excel?'}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    {isEn ? 'Download sample template with preconfigured columns.' : 'Tải file mẫu chuẩn có sẵn tiêu đề cột và ví dụ.'}
                  </p>
                </div>
                <a
                  href={
                    moduleKey === 'assets' || excelType === 'assets' || excelType === 'asset'
                      ? '/api/assets/export?template=true'
                      : `/api/categories/excel?action=template&type=${encodeURIComponent(excelType)}`
                  }
                  download
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Download Template' : 'Tải Mẫu Excel'}</span>
                </a>
              </div>

              {/* Upload file */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  {isEn ? 'Select Excel file (.xlsx)' : 'Chọn file Excel cần nhập (.xlsx)'}
                </label>
                <input
                  type="file"
                  ref={excelFileInputRef}
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div
                  onClick={() => excelFileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/70 rounded-xl p-5 text-center cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  {importFile ? (
                    <div>
                      <p className="font-bold text-slate-800">{importFile.name}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-emerald-900">
                        {isEn ? 'Click to browse Excel file' : 'Nhấp để chọn file Excel (.xlsx)'}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {isEn ? 'Files supported: .xlsx, .xls' : 'Định dạng hỗ trợ: Microsoft Excel (.xlsx)'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Result feedback */}
              {importResult && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 font-medium ${
                    importResult.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  {importResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{importResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={handleExecuteImportExcel}
                disabled={!importFile || isImporting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEn ? 'Importing...' : 'Đang nhập...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Start Import' : 'Bắt Đầu Nhập'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

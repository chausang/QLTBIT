'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  Copy,
  ExternalLink,
  QrCode,
  Laptop,
  CheckCircle,
  Calendar,
  Wrench,
  Package,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/context';

interface MaintenanceQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  log: any;
  companyName?: string;
}

export const MaintenanceQrModal: React.FC<MaintenanceQrModalProps> = ({
  isOpen,
  onClose,
  asset,
  log,
  companyName: propCompanyName,
}) => {
  const { language } = useLanguage();
  const txt = (vi: string, en: string, ja?: string) => {
    if (language === 'ja') return ja || en;
    if (language === 'en') return en;
    return vi;
  };

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [displayCompanyName, setDisplayCompanyName] = useState<string>(propCompanyName || 'SIMPLY IT');
  const [scanUrl, setScanUrl] = useState<string>('');
  const printStickerRef = useRef<HTMLDivElement>(null);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !asset || !log) return;

    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        let baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        if (res.success && Array.isArray(res.data)) {
          const compSetting = res.data.find((s: any) => s.key === 'app.company_name');
          const serverSetting = res.data.find((s: any) => s.key === 'app.server_url');
          if (compSetting?.value) setDisplayCompanyName(compSetting.value.trim().toUpperCase());
          if (serverSetting?.value) baseUrl = serverSetting.value.trim().replace(/\/+$/, '');
        }

        const targetUrl = `${baseUrl}/scan/${encodeURIComponent(asset.assetTag)}?logId=${encodeURIComponent(log.id)}`;
        setScanUrl(targetUrl);

        QRCode.toDataURL(
          targetUrl,
          {
            width: 320,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
            errorCorrectionLevel: 'H',
          },
          (err, url) => {
            if (!err && url) setQrDataUrl(url);
          }
        );
      })
      .catch(() => {});
  }, [isOpen, asset, log]);

  if (!isOpen || !asset || !log) return null;

  const partUsage = log.attachmentUrls?.partUsage || null;

  const handleCopyLink = () => {
    if (!scanUrl) return;
    navigator.clipboard.writeText(scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-MAINTENANCE-${asset.assetTag}-${log.id.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrintSticker = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
              <QrCode className="w-4 h-4 font-bold" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>{txt('Mã QR Theo Dõi Lịch Sử Sửa Chữa', 'Maintenance Tracking QR Code')}</span>
                <span className="font-mono text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded">
                  [{asset.assetTag}]
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {asset.name} • {formatDate(log.performedAt)}
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

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* QR Display Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Maintenance QR" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  {txt('Đang tạo mã QR...', 'Generating QR...')}
                </div>
              )}
            </div>

            <div className="text-center space-y-1 max-w-sm">
              <p className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>{log.title}</span>
              </p>
              {partUsage && (
                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>
                    {partUsage.partActionType === 'ADD_ON' ? 'Gắn thêm:' : 'Thay thế:'} {partUsage.sparePartName} (x{partUsage.quantity})
                  </span>
                </p>
              )}
              <p className="text-[10px] text-slate-500 font-mono break-all pt-1">
                KTV: {log.performedBy?.fullName || 'IT Staff'} • Ngày: {formatDate(log.performedAt)}
              </p>
            </div>
          </div>

          {/* Quick Info & Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{txt('Tải Ảnh QR (PNG)', 'Download QR')}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? txt('Đã Sao Chép Link', 'Copied Link') : txt('Sao Chép Liên Kết', 'Copy Link')}</span>
            </button>
          </div>

          {/* Sticker Label Preview for Direct Printing */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                🏷️ {txt('Tem nhãn dán thiết bị / linh kiện (50x30mm):', 'Hardware Sticker Label (50x30mm):')}
              </span>
              <button
                type="button"
                onClick={handlePrintSticker}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Printer className="w-3 h-3" />
                <span>{txt('In Tem Dán', 'Print Sticker')}</span>
              </button>
            </div>

            {/* Sticker Preview */}
            <div className="flex justify-center">
              <div
                ref={printStickerRef}
                id="printable-maintenance-sticker"
                className="w-72 border-2 border-slate-900 rounded-lg p-2.5 bg-white text-slate-900 flex items-center gap-2.5 shadow-2xs text-[10px] leading-tight"
              >
                {qrDataUrl && <img src={qrDataUrl} alt="QR Mini" className="w-14 h-14 shrink-0" />}
                <div className="space-y-0.5 overflow-hidden">
                  <p className="font-extrabold text-[9px] uppercase tracking-wider text-slate-500 truncate">
                    {displayCompanyName}
                  </p>
                  <p className="font-black text-[11px] text-slate-950 truncate font-mono">
                    [{asset.assetTag}] {asset.name}
                  </p>
                  <p className="font-bold text-slate-800 truncate">
                    🔧 {log.title}
                  </p>
                  {partUsage && (
                    <p className="text-[9px] text-indigo-700 font-semibold truncate">
                      📦 {partUsage.sparePartName}
                    </p>
                  )}
                  <p className="text-[8.5px] text-slate-500 font-mono">
                    📅 {formatDate(log.performedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-2xl">
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
  );
};

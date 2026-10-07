'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  FileText,
  Building,
  Laptop,
  User,
  Calendar,
  CheckCircle2,
  QrCode,
  ShieldAlert,
  ArrowRight,
  Package,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/context';

interface MaintenanceHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  log: any;
  companyName?: string;
}

export const MaintenanceHandoverModal: React.FC<MaintenanceHandoverModalProps> = ({
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

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [displayCompanyName, setDisplayCompanyName] = useState<string>(propCompanyName || 'CÔNG TY TNHH HỆ THỐNG CÔNG NGHỆ');
  const printRef = useRef<HTMLDivElement>(null);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load Company Name & Generate QR Code
  useEffect(() => {
    if (!isOpen || !asset || !log) return;

    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        let baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        if (res.success && Array.isArray(res.data)) {
          const compSetting = res.data.find((s: any) => s.key === 'app.company_name');
          const serverSetting = res.data.find((s: any) => s.key === 'app.server_url');
          if (compSetting?.value) setDisplayCompanyName(compSetting.value.trim());
          if (serverSetting?.value) baseUrl = serverSetting.value.trim().replace(/\/+$/, '');
        }

        const targetUrl = `${baseUrl}/scan/${encodeURIComponent(asset.assetTag)}?logId=${encodeURIComponent(log.id)}`;
        QRCode.toDataURL(
          targetUrl,
          {
            width: 200,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
            errorCorrectionLevel: 'M',
          },
          (err, url) => {
            if (!err && url) setQrCodeUrl(url);
          }
        );
      })
      .catch(() => {});
  }, [isOpen, asset, log]);

  if (!isOpen || !asset || !log) return null;

  // Extract part usage details
  const partUsage = log.attachmentUrls?.partUsage || null;
  const isAddOn = partUsage?.partActionType === 'ADD_ON';
  const handoverCode =
    partUsage?.handoverCode ||
    `BBBG-${asset.assetTag}-${new Date(log.performedAt || Date.now()).getFullYear()}${String(
      new Date(log.performedAt || Date.now()).getMonth() + 1
    ).padStart(2, '0')}${String(new Date(log.performedAt || Date.now()).getDate()).padStart(2, '0')}`;

  const assignedHolder = asset.assignments?.[0]?.user || null;
  const technicianName = log.performedBy?.fullName || 'Kỹ thuật viên IT';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[96vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Toolbar (Screen only) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white rounded-t-2xl shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-blue-500 text-white rounded-xl shadow-xs">
              <FileText className="w-4 h-4 font-bold" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>{txt('Biên Bản Bàn Giao & Thay Thế Linh Kiện', 'Hardware Replacement & Handover Report')}</span>
                <span className="font-mono text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md">
                  {handoverCode}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {asset.name} • [{asset.assetTag}]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{txt('In Biên Bản (A4)', 'Print Report (A4)')}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4 Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            ref={printRef}
            id="printable-handover-document"
            className="w-full max-w-[210mm] min-h-[280mm] bg-white text-slate-900 p-8 sm:p-12 shadow-md rounded-lg print:shadow-none print:m-0 print:p-8 print:w-full print:max-w-none text-[13px] leading-relaxed font-sans"
          >
            {/* Header: Quốc hiệu hoặc Công ty */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-slate-600">{displayCompanyName}</p>
                <p className="font-extrabold text-sm uppercase text-slate-900">PHÒNG CÔNG NGHỆ THÔNG TIN (IT DEPARTMENT)</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Số BB: {handoverCode}</p>
              </div>

              <div className="text-center">
                <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-semibold text-xs text-slate-700 underline decoration-slate-400 underline-offset-4">
                  Độc lập - Tự do - Hạnh phúc
                </p>
                <p className="text-[11px] text-slate-500 italic mt-1">
                  Ngày {new Date(log.performedAt || Date.now()).getDate()} tháng{' '}
                  {new Date(log.performedAt || Date.now()).getMonth() + 1} năm{' '}
                  {new Date(log.performedAt || Date.now()).getFullYear()}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6 space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-950">
                BIÊN BẢN BÀN GIAO & THAY THẾ LINH KIỆN
              </h1>
              <p className="text-xs italic text-slate-600">
                (V/v: {log.title || 'Sửa chữa, nâng cấp và thay thế linh kiện thiết bị CNTT'})
              </p>
            </div>

            {/* Mục 1: Thông tin thiết bị */}
            <div className="mb-5">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-l-4 border-slate-900 pl-2 mb-2 bg-slate-50 py-1">
                I. THÔNG TIN THIẾT BỊ ĐƯỢC CAN THIỆP
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pl-2 text-xs">
                <div>
                  <span className="text-slate-500">Tên thiết bị: </span>
                  <strong className="text-slate-900">{asset.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Mã tài sản (Asset Tag): </span>
                  <strong className="font-mono text-slate-900">{asset.assetTag}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Hãng sản xuất / Model: </span>
                  <strong className="text-slate-900">
                    {asset.brand || '—'} {asset.model ? `/ ${asset.model}` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Số Serial (S/N): </span>
                  <strong className="font-mono text-slate-900">{asset.serialNumber || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Vị trí lắp đặt: </span>
                  <strong className="text-slate-900">{asset.location?.name || 'Kho IT'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Người đang sử dụng: </span>
                  <strong className="text-slate-900">
                    {assignedHolder ? `${assignedHolder.fullName} (${assignedHolder.department || 'Nhân viên'})` : 'Chưa bàn giao cá nhân (Lưu kho)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Mục 2: Chi tiết linh kiện can thiệp */}
            <div className="mb-5">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-l-4 border-slate-900 pl-2 mb-2 bg-slate-50 py-1">
                II. CHI TIẾT LINH KIỆN LẮP ĐẶT / THAY THẾ (XUẤT KHO PHỤ TÙNG)
              </h2>

              {partUsage ? (
                <div className="overflow-x-auto pl-2">
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-2 text-center w-10">STT</th>
                        <th className="border border-slate-300 p-2">Tên phụ tùng / Linh kiện mới</th>
                        <th className="border border-slate-300 p-2 text-center">Mã SKU</th>
                        <th className="border border-slate-300 p-2 text-center">Hình thức</th>
                        <th className="border border-slate-300 p-2 text-center">SL</th>
                        <th className="border border-slate-300 p-2 text-right">Đơn giá / Trị giá</th>
                        <th className="border border-slate-300 p-2 text-center">Tình trạng</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2 text-center font-bold">1</td>
                        <td className="border border-slate-300 p-2 font-semibold text-slate-900">
                          {partUsage.sparePartName}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono">
                          {partUsage.sparePartSku || '—'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isAddOn ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {isAddOn ? 'Gắn thêm mới' : 'Thay thế linh kiện'}
                          </span>
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {partUsage.quantity} {partUsage.unit}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                          {partUsage.unitPrice ? formatCurrency(partUsage.unitPrice * partUsage.quantity, partUsage.currency) : 'Theo định mức'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-semibold text-emerald-700">
                          Mới 100%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="pl-2 text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                  {log.description || 'Thực hiện bảo dưỡng, khắc phục sự cố kỹ thuật không xuất kho phụ tùng độc lập.'}
                </div>
              )}

              {/* Bảng linh kiện cũ tháo ra (nếu có) */}
              {partUsage?.returnOldPart && (
                <div className="mt-3 pl-2">
                  <p className="font-bold text-xs text-rose-800 mb-1 flex items-center gap-1">
                    <span>♻️ Thu hồi linh kiện cũ tháo ra khỏi máy:</span>
                  </p>
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-rose-50/70 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-2">Tên linh kiện cũ tháo ra</th>
                        <th className="border border-slate-300 p-2 text-center">Tình trạng thực tế</th>
                        <th className="border border-slate-300 p-2 text-center">Phương án xử lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2 font-semibold">
                          {partUsage.oldPartName || 'Linh kiện tháo từ máy'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-rose-700 font-bold">
                          {partUsage.oldPartCondition === 'BROKEN'
                            ? 'Hỏng không sử dụng được'
                            : partUsage.oldPartCondition === 'NEED_REPAIR'
                            ? 'Lỗi chập chờn / Cần sửa'
                            : 'Còn hoạt động'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {partUsage.oldPartAction === 'RESTOCK'
                            ? 'Nhập lại kho phụ tùng'
                            : partUsage.oldPartAction === 'REPAIR_SPARE'
                            ? 'Lưu kho dự phòng sửa chữa'
                            : 'Thu hồi về kho chờ thanh lý'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Mục 3: Tình trạng kiểm tra sau khi lắp */}
            <div className="mb-5">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-l-4 border-slate-900 pl-2 mb-2 bg-slate-50 py-1">
                III. KẾT QUẢ KIỂM TRA VÀ NGHIỆM THU HOẠT ĐỘNG
              </h2>
              <ul className="list-disc list-inside space-y-1 pl-3 text-xs text-slate-800">
                <li>Thiết bị đã được kỹ thuật viên lắp đặt đúng quy trình kỹ thuật, nhận diện đầy đủ phần cứng.</li>
                <li>Đã chạy kiểm tra tải (burn-in / benchmark), nhiệt độ và độ ổn định đạt tiêu chuẩn vận hành.</li>
                <li>Linh kiện hoạt động bình thường, không phát sinh xung đột phần mềm hay lỗi hệ điều hành.</li>
                <li>Đã vệ sinh sạch sẽ vị trí làm việc và bàn giao lại nguyên vẹn cho người sử dụng.</li>
              </ul>
            </div>

            {/* QR Tra Cứu và Cam kết */}
            <div className="my-6 p-3 bg-slate-50 border border-slate-300 rounded-lg flex items-center justify-between">
              <div className="space-y-1 max-w-[70%]">
                <p className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-slate-700" />
                  <span>MÃ QR TRA CỨU HỒ SƠ BẢO TRÌ ĐIỆN TỬ</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Quét mã QR bằng camera điện thoại để đối soát toàn bộ lịch sử thay thế linh kiện, thời hạn bảo hành và thông số kỹ thuật trực tuyến của thiết bị này trên hệ thống Simply IT.
                </p>
              </div>

              {qrCodeUrl && (
                <div className="shrink-0 text-center">
                  <img src={qrCodeUrl} alt="Maintenance QR" className="w-20 h-20 border border-slate-300 rounded bg-white p-1 inline-block" />
                  <p className="text-[9px] font-mono text-slate-500 mt-0.5">[{asset.assetTag}]</p>
                </div>
              )}
            </div>

            {/* Chữ ký 3 bên */}
            <div className="mt-8 pt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-bold text-xs uppercase text-slate-900">KỸ THUẬT VIÊN THỰC HIỆN</p>
                <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center">
                  <p className="font-bold text-xs text-slate-900">{technicianName}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-slate-900">ĐẠI DIỆN BỘ PHẬN IT</p>
                <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center">
                  <p className="font-bold text-xs text-slate-400 italic">Quản lý / Thủ kho IT</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-slate-900">NGƯỜI NHẬN BÀN GIAO</p>
                <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-20 flex items-end justify-center">
                  <p className="font-bold text-xs text-slate-900">
                    {assignedHolder?.fullName || 'Người sử dụng thiết bị'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer (Screen only) */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 rounded-b-2xl shrink-0 print:hidden">
          <span className="text-xs text-slate-500">
            Khổ in khuyến nghị: A4 • Portrait (Dọc) • Tỷ lệ 100%
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{txt('In Biên Bản', 'Print')}</span>
            </button>
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
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Edit3, Check, RotateCcw } from 'lucide-react';
import { MinuteType } from '@/app/api/minutes/route';

export interface MinuteEquipmentItem {
  id?: string;
  name: string;
  code?: string;
  serial?: string;
  model?: string;
  quantity: number;
  unit?: string;
  usageYear?: string;
  originalPrice?: string;
  condition?: string;
  notes?: string;
  qrData?: string;
}

export interface MinuteDetailProps {
  id: string;
  title: string;
  minuteType: MinuteType;
  minuteCode: string;
  hospitalName?: string;
  department: string;
  location?: string;
  locationCity?: string;
  recipients?: string;
  legalBasis?: string;
  handoverCommitment?: string;
  copiesCount?: string | number;
  companyName?: string;
  documentDate: string;
  status: string;
  isBasedOnProposal?: boolean;
  relatedProposalId?: string;
  relatedProposalCode?: string;
  relatedProposalTitle?: string;
  sender: {
    name?: string;
    title?: string;
    department?: string;
  };
  receiver1?: {
    name?: string;
    title?: string;
    department?: string;
  };
  receiver2?: {
    name?: string;
    title?: string;
    department?: string;
  };
  receiver?: {
    name?: string;
    title?: string;
    department?: string;
  };
  equipmentList: MinuteEquipmentItem[];
  reason?: string;
  signers?: {
    senderSignerTitle?: string;
    senderSignerName?: string;
    receiver1Title?: string;
    receiver1Name?: string;
    receiver2Title?: string;
    receiver2Name?: string;
    creator?: string;
    deptRep?: string;
    itLead?: string;
    director?: string;
  };
  extraNotes?: string;
}

interface MinutePrintViewProps {
  minute: MinuteDetailProps;
  onClose: () => void;
  onEdit?: (minute: MinuteDetailProps) => void;
}

export default function MinutePrintView({ minute: initialMinute, onClose, onEdit }: MinutePrintViewProps) {
  const [data, setData] = useState<MinuteDetailProps>(initialMinute);
  const [isLiveEdit, setIsLiveEdit] = useState<boolean>(false);
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});

  // Generate QR codes for equipment items
  useEffect(() => {
    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      if (data.equipmentList && data.equipmentList.length > 0) {
        for (const item of data.equipmentList) {
          const qrText = item.code || item.serial || item.name || 'ASSET';
          try {
            const url = await QRCode.toDataURL(qrText, {
              width: 140,
              margin: 1,
              errorCorrectionLevel: 'M',
            });
            urls[qrText] = url;
          } catch (e) {
            console.error('Error generating QR code:', e);
          }
        }
      }
      setQrCodeUrls(urls);
    };

    generateQRs();
  }, [data.equipmentList]);

  const dateObj = new Date(data.documentDate || Date.now());
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const dateFormatted = `${day}/${month}/${year}`;

  const handlePrint = () => {
    window.print();
  };

  const totalQuantity = (data.equipmentList || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  const totalQuantityStr = String(totalQuantity).padStart(2, '0');

  // Helper to update inline text
  const updateField = (field: keyof MinuteDetailProps, val: any) => {
    setData((prev) => ({ ...prev, [field]: val }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container A4 standard width: ~820px */}
      <div className="relative w-full max-w-[850px] bg-white rounded-2xl shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Top Control Bar - Hidden when printing */}
        <div className="p-4 bg-slate-800 text-white rounded-t-2xl flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
              <span>📄 Mẫu in chuẩn khổ A4:</span>
              <span className="text-amber-400">
                {data.minuteType === 'REVOCATION' ? 'Biên Bản Thu Hồi Tài Sản' : 'Biên Bản Bàn Giao Tài Sản, Công Cụ'}
              </span>
            </span>
            <span className="text-xs bg-slate-700 px-2.5 py-0.5 rounded-full text-slate-300 font-mono">
              {data.minuteCode}
            </span>
            {data.isBasedOnProposal && (
              <span className="text-[10.5px] bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-medium">
                Theo đề nghị: {data.relatedProposalCode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLiveEdit(!isLiveEdit)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                isLiveEdit
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-300'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
              title="Bật/Tắt chế độ gõ sửa trực tiếp trên trang A4"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isLiveEdit ? '✓ Đang bật sửa chữ' : 'Sửa chữ trực tiếp'}</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(data)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Mở Form Sửa</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay (Ctrl + P)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Edit Banner notice */}
        {isLiveEdit && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900 flex items-center justify-between print:hidden">
            <span>
              💡 <strong>Chế độ sửa trực tiếp đang BẬT:</strong> Bạn có thể nhấp chuột vào bất kỳ đoạn chữ nào trên văn bản để sửa trước khi in!
            </span>
            <button
              type="button"
              onClick={() => setData(initialMinute)}
              className="text-[11px] underline text-amber-700 hover:text-amber-900 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục gốc</span>
            </button>
          </div>
        )}

        {/* PRINTABLE A4 CONTENT (Standard Vietnamese Administrative Layout) */}
        <div
          contentEditable={isLiveEdit}
          suppressContentEditableWarning
          className="p-8 sm:p-14 text-black font-serif leading-relaxed text-[13.5px] print:p-6 print:text-[12.5px] flex-1 select-text"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          {/* ========================================================= */}
          {/* MẪU 1: BIÊN BẢN THU HỒI TÀI SẢN (CHUẨN 100% NHƯ HÌNH 1) */}
          {/* ========================================================= */}
          {data.minuteType === 'REVOCATION' ? (
            <div className="space-y-4">
              {/* Header: Left hospital & department, Right National Emblem */}
              <div className="flex justify-between items-start pb-2">
                {/* Left */}
                <div className="text-center w-[48%] leading-tight">
                  <p className="font-bold text-[13px] uppercase tracking-wide">
                    {data.hospitalName || 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC'}
                  </p>
                  <p className="font-bold text-[13.5px] uppercase mt-1">
                    <span>KHOA </span>
                    <span className="text-red-600 font-extrabold print:text-red-600">
                      {data.department || 'DƯỢC'}
                    </span>
                  </p>
                </div>

                {/* Right */}
                <div className="text-center w-[52%] leading-tight">
                  <p className="font-bold text-[13px] uppercase tracking-wider">
                    CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="font-bold text-[13px] mt-1 relative inline-block">
                    <span>Độc lập - Tự do - Hạnh phúc</span>
                    <span className="block w-28 h-[1px] bg-black mx-auto mt-0.5"></span>
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center pt-3 pb-2">
                <h1 className="text-[17px] font-bold uppercase tracking-wide">
                  BIÊN BẢN THU HỒI TÀI SẢN
                </h1>
              </div>

              {/* Kính gửi */}
              <div className="flex pl-8 text-[13px] leading-relaxed">
                <div className="font-bold italic w-24 shrink-0">Kính gửi:</div>
                <div className="space-y-0.5 font-medium">
                  <p>- Ban Giám Đốc</p>
                  <p>- Phòng Công Nghệ Thông Tin</p>
                </div>
              </div>

              {/* Căn cứ */}
              <div className="text-justify indent-8 text-[13px] leading-relaxed pt-1">
                {data.legalBasis || (
                  <>
                    Căn cứ tình hình thực tế của Khoa <strong className="text-red-600 print:text-red-600">{data.department || 'Dược'}</strong>, tài sản hiện tại khoa không có nhu cầu sử dụng nên cần trả lại Phòng Công Nghệ Thông Tin như sau:
                  </>
                )}
              </div>

              {/* Bảng danh mục thu hồi */}
              <div className="pt-2">
                <p className="text-center font-bold text-[13.5px] uppercase mb-2">
                  DANH MỤC TÀI SẢN ĐỀ NGHỊ THU HỒI
                </p>

                <table className="w-full text-[12px] border-collapse border border-black text-center">
                  <thead>
                    <tr className="bg-slate-50 print:bg-white font-bold">
                      <th className="border border-black p-1.5 w-8">TT</th>
                      <th className="border border-black p-1.5 text-center min-w-[120px]">
                        Tên, đặc điểm, ký hiệu TSCĐ
                      </th>
                      <th className="border border-black p-1.5 w-12">ĐVT</th>
                      <th className="border border-black p-1.5 w-12">Số lượng</th>
                      <th className="border border-black p-1.5 w-28">Số Serinumber</th>
                      <th className="border border-black p-1.5 w-20">Model</th>
                      <th className="border border-black p-1.5 w-16">Năm sử dụng</th>
                      <th className="border border-black p-1.5 w-20">Nguyên giá (đồng)</th>
                      <th className="border border-black p-1.5 w-24">Tình trạng</th>
                      <th className="border border-black p-1.5 w-14">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.equipmentList && data.equipmentList.length > 0 ? (
                      data.equipmentList.map((item, idx) => (
                        <tr key={idx} className="leading-tight">
                          <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                          <td className="border border-black p-1.5 text-left font-medium">{item.name}</td>
                          <td className="border border-black p-1.5 text-center">{item.unit || 'Cái'}</td>
                          <td className="border border-black p-1.5 text-center font-bold">
                            {String(item.quantity || 1).padStart(2, '0')}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono text-[11px]">
                            {item.serial || item.code || '—'}
                          </td>
                          <td className="border border-black p-1.5 text-center">{item.model || '—'}</td>
                          <td className="border border-black p-1.5 text-center">{item.usageYear || 'Không rõ'}</td>
                          <td className="border border-black p-1.5 text-center">{item.originalPrice || 'Không rõ'}</td>
                          <td className="border border-black p-1.5 text-center text-[11.5px] leading-tight">
                            {item.condition || 'Hư không sửa được'}
                          </td>
                          <td className="border border-black p-1.5 text-center">{item.notes || ''}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="border border-black p-4 text-center italic text-slate-500">
                          (Chưa có danh mục tài sản)
                        </td>
                      </tr>
                    )}

                    {/* Dòng Tổng cộng */}
                    <tr className="font-bold">
                      <td colSpan={3} className="border border-black p-1.5 text-center font-bold">
                        Tổng cộng
                      </td>
                      <td className="border border-black p-1.5 text-center font-bold">
                        {totalQuantityStr}
                      </td>
                      <td className="border border-black p-1.5"></td>
                      <td className="border border-black p-1.5"></td>
                      <td className="border border-black p-1.5"></td>
                      <td className="border border-black p-1.5"></td>
                      <td className="border border-black p-1.5"></td>
                      <td className="border border-black p-1.5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lời kết */}
              <div className="pt-2 text-[13px] leading-relaxed space-y-1">
                <p>
                  Biên bản được lập thành {data.copiesCount || '03'} bản, mỗi bên giữ 01 bản.
                </p>
                <p>
                  Xin trân trọng cảm ơn./.
                </p>
              </div>

              {/* Ngày tháng địa danh (căn phải) */}
              <div className="pt-2 text-right text-[13px] italic pr-4">
                {data.locationCity || 'Châu Đốc'}, ngày {day} tháng {month} năm {year}
              </div>

              {/* Chữ ký 2 bên (Bên Giao & Bên Nhận) */}
              <div className="grid grid-cols-2 gap-4 text-center text-[13px] pt-2">
                <div className="space-y-16">
                  <p className="font-bold uppercase">
                    {data.signers?.senderSignerTitle || 'Bên Giao'}
                  </p>
                  <p className="font-bold pt-4">
                    {data.signers?.senderSignerName || data.sender?.name || ''}
                  </p>
                </div>

                <div className="space-y-16">
                  <p className="font-bold uppercase">
                    {data.signers?.receiver1Title || 'Bên Nhận'}
                  </p>
                  <p className="font-bold pt-4">
                    {data.signers?.receiver1Name || data.receiver1?.name || data.receiver?.name || ''}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* MẪU 2: BIÊN BẢN BÀN GIAO TÀI SẢN (CHUẨN 100% NHƯ HÌNH 2)  */
            /* ========================================================= */
            <div className="space-y-3.5">
              {/* Header: National Emblem Centered */}
              <div className="text-center leading-tight">
                <p className="font-bold text-[14px] uppercase tracking-wide">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </p>
                <p className="font-bold text-[13.5px] mt-1 relative inline-block">
                  <span>Độc lập – Tự do – Hạnh phúc</span>
                  <span className="block w-32 h-[1px] bg-black mx-auto mt-0.5"></span>
                </p>
              </div>

              {/* Title */}
              <div className="text-center pt-3 pb-1">
                <h1 className="text-[17px] font-bold uppercase tracking-tight">
                  BIÊN BẢN BÀN GIAO TÀI SẢN, CÔNG CỤ
                </h1>
              </div>

              {/* Thời gian và địa điểm */}
              <div className="text-[13px] leading-relaxed">
                Hôm nay, ngày {day} tháng {month} năm {year}, tại: {data.location || data.department || 'Phòng Hành Chính Quản trị'}, chúng tôi gồm:
              </div>

              {/* Bên bàn giao */}
              <div className="text-[13px] space-y-1">
                <p className="font-bold">Bên bàn giao:</p>
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <p>Họ và tên: <strong>{data.sender?.name || ''}</strong></p>
                  <p>Bộ phận: {data.sender?.department || data.sender?.title || ''}</p>
                </div>
              </div>

              {/* Bên nhận */}
              <div className="text-[13px] space-y-1">
                <p className="font-bold">Bên nhận:</p>
                <div className="space-y-1 pl-4">
                  {/* Người nhận 1 (Trưởng Khoa/Phòng) */}
                  <div className="grid grid-cols-2 gap-4">
                    <p>Họ và tên: <strong>{data.receiver1?.name || data.receiver?.name || ''}</strong></p>
                    <p>Bộ phận: {data.receiver1?.department || data.receiver1?.title || ''}</p>
                  </div>

                  {/* Người nhận 2 (Nhân viên Khoa/Phòng - Nếu có) */}
                  {(data.receiver2?.name || isLiveEdit) && (
                    <div className="grid grid-cols-2 gap-4">
                      <p>Họ và tên: <strong>{data.receiver2?.name || ''}</strong></p>
                      <p>Bộ phận: {data.receiver2?.department || data.receiver2?.title || ''}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lý do bàn giao */}
              <div className="text-[13px] leading-relaxed pt-1">
                <p>
                  <strong>Lý do bàn giao:</strong>{' '}
                  {data.reason || (
                    data.isBasedOnProposal && data.relatedProposalCode
                      ? `Cấp mới thiết bị theo đề nghị số ${data.relatedProposalCode} của ${data.department}.`
                      : ''
                  )}
                </p>
                <p className="pt-1">Cùng bàn giao tài sản, công cụ với nội dung như sau:</p>
              </div>

              {/* Bảng Bàn Giao Thiết Bị (Kèm Mã QR như hình 2) */}
              <div className="pt-1">
                <table className="w-full text-[12.5px] border-collapse border border-black text-center">
                  <thead>
                    <tr className="bg-slate-50 print:bg-white font-bold">
                      <th className="border border-black p-2 w-12 text-center">Stt</th>
                      <th className="border border-black p-2 text-center">Tên tài sản, công cụ</th>
                      <th className="border border-black p-2 w-16 text-center">Đơn vị</th>
                      <th className="border border-black p-2 w-16 text-center">Số lượng</th>
                      <th className="border border-black p-2 w-28 text-center">Tình trạng</th>
                      <th className="border border-black p-2 w-36 text-center">Mã Qr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.equipmentList && data.equipmentList.length > 0 ? (
                      data.equipmentList.map((item, idx) => {
                        const qrKey = item.code || item.serial || item.name || 'ASSET';
                        const qrSrc = qrCodeUrls[qrKey];

                        return (
                          <tr key={idx} className="leading-tight">
                            <td className="border border-black p-2 text-center">{idx + 1}</td>
                            <td className="border border-black p-2 text-left font-medium">{item.name}</td>
                            <td className="border border-black p-2 text-center">{item.unit || 'Cái'}</td>
                            <td className="border border-black p-2 text-center font-bold">
                              {String(item.quantity || 1).padStart(2, '0')}
                            </td>
                            <td className="border border-black p-2 text-center font-medium">
                              {item.condition || 'Mới 100%'}
                            </td>
                            <td className="border border-black p-2 text-center">
                              <div className="flex flex-col items-center justify-center p-0.5">
                                {qrSrc ? (
                                  <img
                                    src={qrSrc}
                                    alt="QR Code"
                                    className="w-16 h-16 object-contain border border-slate-300 rounded bg-white p-0.5"
                                  />
                                ) : (
                                  <div className="w-16 h-16 border border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                                    QR
                                  </div>
                                )}
                                <span className="text-[10.5px] font-mono font-bold tracking-wider mt-1 text-black">
                                  {item.code || item.serial || 'PCKH31450'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-black p-4 text-center italic text-slate-500">
                          (Chưa có danh mục thiết bị bàn giao)
                        </td>
                      </tr>
                    )}

                    {/* Dòng Tổng cộng */}
                    <tr className="font-bold text-left">
                      <td colSpan={2} className="border border-black p-2 font-bold pl-4">
                        Tổng cộng: {totalQuantityStr}
                      </td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cam kết bàn giao */}
              <div className="pt-2 text-[13px] leading-relaxed">
                <p>
                  {data.handoverCommitment || (
                    <>
                      Kể từ ngày {dateFormatted} số tài sản trên bên giao đã bàn giao lại hết cho bên nhận đầy đủ. Biên bản được lập thành {data.copiesCount || '03'} bản, mỗi bên giữ 01 bản.
                    </>
                  )}
                </p>
              </div>

              {/* Chữ ký 2 bên (Bên bàn giao bên trái, Bên nhận có 2 cấp xếp dọc bên phải) */}
              <div className="grid grid-cols-2 gap-4 text-center text-[13px] pt-4">
                {/* Trái: Bên bàn giao */}
                <div className="space-y-16">
                  <div>
                    <p className="font-bold">Bên bàn giao</p>
                    <p className="italic text-[12px] text-slate-700">(Ký ghi rõ họ tên)</p>
                  </div>
                  <p className="font-bold pt-6">
                    {data.signers?.senderSignerName || data.sender?.name || ''}
                  </p>
                </div>

                {/* Phải: Bên nhận (Trưởng Khoa/Phòng + Nhân viên Khoa/Phòng) */}
                <div className="space-y-8">
                  <div>
                    <p className="font-bold">Bên nhận</p>
                    <p className="font-bold">{data.signers?.receiver1Title || 'Trưởng Khoa/Phòng'}</p>
                    <p className="italic text-[12px] text-slate-700">(Ký ghi rõ họ tên)</p>
                    <p className="font-bold pt-12">
                      {data.signers?.receiver1Name || data.receiver1?.name || data.receiver?.name || ''}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold">{data.signers?.receiver2Title || 'Nhân viên Khoa/Phòng'}</p>
                    <p className="italic text-[12px] text-slate-700">(Ký ghi rõ họ tên)</p>
                    <p className="font-bold pt-12">
                      {data.signers?.receiver2Name || data.receiver2?.name || ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer print note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 print:hidden rounded-b-2xl">
          <span>SIMPLY IT Platform • Mẫu văn bản in A4 tiêu chuẩn theo quy định</span>
          <span>Hỗ trợ in trực tiếp hoặc xuất PDF qua hộp thoại in</span>
        </div>
      </div>
    </div>
  );
}

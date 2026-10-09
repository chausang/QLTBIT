'use client';

import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import { MinuteType } from '@/app/api/minutes/route';

interface EquipmentItem {
  id?: string;
  name: string;
  code?: string;
  serial?: string;
  quantity: number;
  unit?: string;
  condition?: string;
  notes?: string;
}

export interface MinuteDetailProps {
  id: string;
  title: string;
  minuteType: MinuteType;
  minuteCode: string;
  department: string;
  companyName?: string;
  documentDate: string;
  status: string;
  sender: {
    name?: string;
    title?: string;
    department?: string;
  };
  receiver: {
    name?: string;
    title?: string;
    department?: string;
  };
  equipmentList: EquipmentItem[];
  reason?: string;
  signers?: {
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
}

export default function MinutePrintView({ minute, onClose }: MinutePrintViewProps) {
  const dateObj = new Date(minute.documentDate || Date.now());
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  const getMinuteHeading = () => {
    switch (minute.minuteType) {
      case 'HANDOVER':
        return {
          title: 'BIÊN BẢN BÀN GIAO THIẾT BỊ CNTT',
          sub: 'V/v bàn giao, cấp phát trang thiết bị máy tính, vật tư CNTT',
          leftRole: 'ĐẠI DIỆN BÊN GIAO (BÊN A)',
          rightRole: 'ĐẠI DIỆN BÊN NHẬN (BÊN B)',
        };
      case 'REVOCATION':
        return {
          title: 'BIÊN BẢN THU HỒI THIẾT BỊ CNTT',
          sub: 'V/v thu hồi tài sản, thiết bị tin học về kho quản lý CNTT',
          leftRole: 'ĐẠI DIỆN ĐƠN VỊ THU HỒI (IT)',
          rightRole: 'NGƯỜI BÀN GIAO LẠI (KHOA PHÒNG)',
        };
      case 'MAINTENANCE':
        return {
          title: 'BIÊN BẢN KẾ HOẠCH BẢO TRÌ & NÂNG CẤP',
          sub: 'V/v kiểm tra kỹ thuật, bảo dưỡng định kỳ và thay thế linh kiện',
          leftRole: 'ĐƠN VỊ KỸ THUẬT THỰC HIỆN',
          rightRole: 'ĐẠI DIỆN KHOA PHÒNG XÁC NHẬN',
        };
      case 'PROPOSAL':
        return {
          title: 'GIẤY ĐỀ NGHỊ CẤP TRANG THIẾT BỊ CNTT',
          sub: 'Kính gửi: Ban Giám Đốc - Phòng Công Nghệ Thông Tin',
          leftRole: 'KHOA PHÒNG ĐỀ NGHỊ',
          rightRole: 'BỘ PHẬN TIẾP NHẬN XỬ LÝ',
        };
      default:
        return {
          title: 'BIÊN BẢN XÁC NHẬN THIẾT BỊ',
          sub: 'Văn bản ghi nhận tình trạng trang thiết bị',
          leftRole: 'BÊN GIAO',
          rightRole: 'BÊN NHẬN',
        };
    }
  };

  const info = getMinuteHeading();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container A4 standard width: ~800px */}
      <div className="relative w-full max-w-[850px] bg-white rounded-2xl shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Top Control Bar - Hidden when printing */}
        <div className="p-4 bg-slate-800 text-white rounded-t-2xl flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">📄 Xem trước mẫu in chuẩn A4 (Print Preview)</span>
            <span className="text-xs bg-slate-700 px-2.5 py-0.5 rounded-full text-slate-300 font-mono">
              {minute.minuteCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Biên Bản (Ctrl + P)</span>
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

        {/* PRINTABLE A4 CONTENT */}
        <div className="p-8 sm:p-12 text-slate-900 font-serif leading-relaxed text-[13.5px] print:p-6 print:text-[12.5px] flex-1">
          {/* Header standard: National header & Org name */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-6">
            <div className="text-center w-1/2 pr-3">
              <p className="font-bold text-xs uppercase tracking-wide text-slate-700">
                {minute.companyName || 'BỆNH VIỆN / DOANH NGHIỆP'}
              </p>
              <p className="font-extrabold text-sm uppercase text-slate-900 mt-0.5">
                PHÒNG CÔNG NGHỆ THÔNG TIN
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Số: {minute.minuteCode}
              </p>
            </div>

            <div className="text-center w-1/2 pl-3">
              <p className="font-bold text-xs uppercase tracking-wider text-slate-900">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="font-bold text-xs underline underline-offset-4 text-slate-800 mt-0.5">
                Độc lập - Tự do - Hạnh phúc
              </p>
              <p className="text-xs italic text-slate-600 mt-2">
                Hà Nội, ngày {day} tháng {month} năm {year}
              </p>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center my-6 space-y-1">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
              {info.title}
            </h1>
            <p className="text-xs italic text-slate-600">
              {info.sub}
            </p>
            {minute.department && (
              <p className="text-xs font-bold text-slate-800">
                Khoa / Phòng: <span className="underline">{minute.department}</span>
              </p>
            )}
          </div>

          {/* Time & Place statement */}
          <div className="mb-4 text-xs space-y-1">
            <p>
              Hôm nay, ngày <strong>{day}</strong> tháng <strong>{month}</strong> năm <strong>{year}</strong>, tại{' '}
              <strong>{minute.department || 'Văn phòng đơn vị'}</strong>. Chúng tôi gồm có:
            </p>
          </div>

          {/* Parties information */}
          <div className="grid grid-cols-2 gap-6 my-4 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs print:bg-white print:border-slate-300">
            {/* Party A */}
            <div className="space-y-1">
              <p className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1">
                1. {info.leftRole}:
              </p>
              <p>
                - Ông/Bà: <strong>{minute.sender?.name || '...................................................'}</strong>
              </p>
              <p>
                - Chức vụ: {minute.sender?.title || 'Kỹ thuật viên CNTT'}
              </p>
              <p>
                - Bộ phận: {minute.sender?.department || 'Phòng Công Nghệ Thông Tin'}
              </p>
            </div>

            {/* Party B */}
            <div className="space-y-1">
              <p className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1">
                2. {info.rightRole}:
              </p>
              <p>
                - Ông/Bà: <strong>{minute.receiver?.name || '...................................................'}</strong>
              </p>
              <p>
                - Chức vụ: {minute.receiver?.title || 'Đại diện tiếp nhận'}
              </p>
              <p>
                - Khoa / Phòng: {minute.receiver?.department || minute.department || '....................................'}
              </p>
            </div>
          </div>

          {/* Reason / Purpose */}
          {minute.reason && (
            <div className="my-3 text-xs">
              <p>
                <strong>Mục đích / Lý do:</strong> {minute.reason}
              </p>
            </div>
          )}

          {/* Equipment Table */}
          <div className="my-5">
            <p className="text-xs font-bold mb-2">
              Danh mục trang thiết bị, vật tư bàn giao chi tiết:
            </p>
            <table className="w-full text-xs border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-900 print:bg-slate-200">
                  <th className="border border-slate-400 p-2 text-center w-10">STT</th>
                  <th className="border border-slate-400 p-2 text-left">Tên thiết bị / Chủng loại</th>
                  <th className="border border-slate-400 p-2 text-center w-28">Mã TS / Serial</th>
                  <th className="border border-slate-400 p-2 text-center w-14">SL</th>
                  <th className="border border-slate-400 p-2 text-center w-14">ĐVT</th>
                  <th className="border border-slate-400 p-2 text-left w-36">Hiện trạng kỹ thuật</th>
                  <th className="border border-slate-400 p-2 text-left w-28">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {minute.equipmentList && minute.equipmentList.length > 0 ? (
                  minute.equipmentList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="border border-slate-400 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-400 p-2 font-semibold">{item.name}</td>
                      <td className="border border-slate-400 p-2 text-center font-mono text-[11px]">
                        {item.code || item.serial || '—'}
                      </td>
                      <td className="border border-slate-400 p-2 text-center font-bold">{item.quantity || 1}</td>
                      <td className="border border-slate-400 p-2 text-center">{item.unit || 'Cái'}</td>
                      <td className="border border-slate-400 p-2 text-[11.5px]">{item.condition || 'Hoạt động bình thường'}</td>
                      <td className="border border-slate-400 p-2 text-[11px] text-slate-600">{item.notes || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-slate-400 p-4 text-center italic text-slate-500">
                      (Không có danh sách thiết bị đi kèm trong biên bản này)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Terms & Commitments */}
          <div className="my-4 text-xs space-y-1.5 text-slate-700">
            <p className="font-bold text-slate-900">Cam kết và trách nhiệm các bên:</p>
            <ul className="list-disc pl-5 space-y-1 text-[12px]">
              <li>Bên nhận đã kiểm tra thực tế, xác nhận thiết bị đúng chủng loại, số lượng và tình trạng hoạt động như mô tả.</li>
              <li>Khoa phòng / Cán bộ tiếp nhận có trách nhiệm quản lý, bảo quản tài sản đúng quy định, không tự ý tháo dỡ hoặc di dời khi chưa có sự đồng ý của Phòng CNTT.</li>
              <li>Biên bản được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để theo dõi và đối soát tài sản.</li>
            </ul>
          </div>

          {/* Signature Grid (4 columns) */}
          <div className="mt-8 pt-4 grid grid-cols-4 gap-2 text-center text-xs print:mt-6">
            <div className="space-y-16">
              <p className="font-bold uppercase text-[11.5px]">ĐẠI DIỆN KHOA PHÒNG</p>
              <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
              <p className="font-bold pt-4 text-slate-800">{minute.signers?.deptRep || minute.receiver?.name || ''}</p>
            </div>

            <div className="space-y-16">
              <p className="font-bold uppercase text-[11.5px]">NGƯỜI TIẾP NHẬN</p>
              <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
              <p className="font-bold pt-4 text-slate-800">{minute.receiver?.name || ''}</p>
            </div>

            <div className="space-y-16">
              <p className="font-bold uppercase text-[11.5px]">NGƯỜI BÀN GIAO / KTV</p>
              <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
              <p className="font-bold pt-4 text-slate-800">{minute.signers?.creator || minute.sender?.name || ''}</p>
            </div>

            <div className="space-y-16">
              <p className="font-bold uppercase text-[11.5px]">LÃNH ĐẠO DUYỆT</p>
              <p className="italic text-[11px] text-slate-500">(Ký và ghi rõ họ tên)</p>
              <p className="font-bold pt-4 text-slate-800">{minute.signers?.director || 'Trưởng Phòng CNTT'}</p>
            </div>
          </div>
        </div>

        {/* Footer print note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400 print:hidden rounded-b-2xl">
          SIMPLY IT ITSM Platform • Mẫu in hành chính khổ A4 chuẩn hóa Bệnh viện & Doanh nghiệp
        </div>
      </div>
    </div>
  );
}

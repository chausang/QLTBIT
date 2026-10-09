'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  FileCheck,
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  Eye,
  Download,
  Upload,
  Calendar,
  Building2,
  User,
  Layers,
  ArrowRightLeft,
  Wrench,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  X,
  PlusCircle,
  Paperclip,
  Loader2,
  RefreshCw,
  FileUp,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import ModuleDataToolbar from '@/components/common/ModuleDataToolbar';
import MinutePrintView, { MinuteDetailProps } from '@/components/minutes/MinutePrintView';
import { MinuteType, MinuteStatus, MinuteEquipmentItem, MinutePayload } from '@/app/api/minutes/route';

export default function MinutesManagementPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState<MinuteDetailProps[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    handover: 0,
    revocation: 0,
    maintenance: 0,
    proposal: 0,
  });

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | MinuteType>('ALL');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Locations / Departments list for dropdown
  const [departments, setDepartments] = useState<string[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);

  // Print view state
  const [printingMinute, setPrintingMinute] = useState<MinuteDetailProps | null>(null);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form state
  const [formData, setFormData] = useState<MinutePayload>({
    title: '',
    minuteType: 'HANDOVER',
    minuteCode: '',
    department: '',
    companyName: '',
    documentDate: new Date().toISOString().split('T')[0],
    status: 'APPROVED',
    sender: { name: '', title: 'Kỹ thuật viên CNTT', department: 'Phòng CNTT' },
    receiver: { name: '', title: '', department: '' },
    equipmentList: [],
    reason: '',
    signers: { creator: '', deptRep: '', itLead: 'Trưởng phòng CNTT', director: 'Ban Giám Đốc' },
    fileUrl: '',
    fileName: '',
    attachments: [],
    extraNotes: '',
  });

  // Load Minutes & Departments
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/minutes');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMinutes(data.data);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error loading minutes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load locations for department list & assets for picking
  useEffect(() => {
    loadData();

    // Fetch locations
    fetch('/api/locations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const names = data.data.map((l: any) => l.name);
          setDepartments(names);
        }
      })
      .catch(() => {});

    // Fetch quick assets
    fetch('/api/assets?pageSize=200')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAvailableAssets(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Compute list of unique departments from minutes if locations list empty
  const allDepartments = useMemo(() => {
    const set = new Set<string>(departments);
    minutes.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [departments, minutes]);

  // Filtered list
  const filteredMinutes = useMemo(() => {
    return minutes.filter((m) => {
      if (activeTab !== 'ALL' && m.minuteType !== activeTab) return false;
      if (selectedDept !== 'ALL' && m.department !== selectedDept) return false;
      if (selectedStatus !== 'ALL' && m.status !== selectedStatus) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const text = `${m.minuteCode} ${m.title} ${m.department} ${m.sender?.name} ${m.receiver?.name} ${m.reason} ${m.equipmentList?.map((e) => e.name + ' ' + (e.serial || '')).join(' ')}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [minutes, activeTab, selectedDept, selectedStatus, search]);

  // Handle open create modal
  const handleOpenCreate = (defaultType?: MinuteType) => {
    const type = defaultType || (activeTab !== 'ALL' ? activeTab : 'HANDOVER');
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    let codePrefix = 'BB-BG';
    if (type === 'REVOCATION') codePrefix = 'BB-TH';
    if (type === 'MAINTENANCE') codePrefix = 'BB-BT';
    if (type === 'PROPOSAL') codePrefix = 'DN-TB';

    let defaultTitle = 'Biên bản bàn giao thiết bị CNTT';
    if (type === 'REVOCATION') defaultTitle = 'Biên bản thu hồi thiết bị CNTT';
    if (type === 'MAINTENANCE') defaultTitle = 'Kế hoạch bảo trì & nâng cấp phần cứng';
    if (type === 'PROPOSAL') defaultTitle = 'Tờ đề nghị xin cấp mới trang thiết bị';

    setFormData({
      title: defaultTitle,
      minuteType: type,
      minuteCode: `${codePrefix}-${year}-${randomSuffix}`,
      department: '',
      companyName: '',
      documentDate: new Date().toISOString().split('T')[0],
      status: type === 'PROPOSAL' ? 'PENDING' : 'APPROVED',
      sender: { name: '', title: 'Kỹ thuật viên CNTT', department: 'Phòng CNTT' },
      receiver: { name: '', title: '', department: '' },
      equipmentList: [
        {
          name: '',
          code: '',
          serial: '',
          quantity: 1,
          unit: 'Bộ',
          condition: 'Hoạt động tốt 100%',
          notes: '',
        },
      ],
      reason: '',
      signers: { creator: '', deptRep: '', itLead: 'Trưởng phòng CNTT', director: 'Ban Giám Đốc' },
      fileUrl: '',
      fileName: '',
      attachments: [],
      extraNotes: '',
    });
    setEditingId(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (item: MinuteDetailProps) => {
    setFormData({
      title: item.title,
      minuteType: item.minuteType,
      minuteCode: item.minuteCode,
      department: item.department,
      companyName: item.companyName,
      documentDate: item.documentDate ? item.documentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      status: item.status as MinuteStatus,
      sender: item.sender || {},
      receiver: item.receiver || {},
      equipmentList: item.equipmentList && item.equipmentList.length > 0 ? [...item.equipmentList] : [],
      reason: item.reason || '',
      signers: item.signers || {},
      extraNotes: item.extraNotes || '',
    });
    setEditingId(item.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa biên bản [${code}] không?`)) return;
    try {
      const res = await fetch(`/api/minutes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMinutes((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert(data.error || 'Lỗi khi xóa biên bản');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối khi xóa');
    }
  };

  // Handle Save (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const url = modalMode === 'create' ? '/api/minutes' : `/api/minutes/${editingId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        loadData();
      } else {
        alert(data.error || 'Có lỗi xảy ra khi lưu biên bản');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const data = new FormData();
      data.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: data });
      const resData = await res.json();
      if (resData.url) {
        setFormData((prev) => ({
          ...prev,
          fileUrl: resData.url,
          fileName: file.name,
        }));
      }
    } catch (err) {
      alert('Tải tệp đính kèm thất bại');
    } finally {
      setUploadingFile(false);
    }
  };

  // Dynamic row manipulation
  const handleAddEquipmentRow = () => {
    setFormData((prev) => ({
      ...prev,
      equipmentList: [
        ...(prev.equipmentList || []),
        { name: '', code: '', serial: '', quantity: 1, unit: 'Bộ', condition: 'Mới / Tốt', notes: '' },
      ],
    }));
  };

  const handleRemoveEquipmentRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      equipmentList: prev.equipmentList?.filter((_, i) => i !== index),
    }));
  };

  const handleEquipmentFieldChange = (index: number, field: keyof MinuteEquipmentItem, value: any) => {
    setFormData((prev) => {
      const list = [...(prev.equipmentList || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, equipmentList: list };
    });
  };

  // Quick picker from Assets
  const handleSelectAssetForEquipment = (index: number, assetId: string) => {
    const asset = availableAssets.find((a) => a.id === assetId);
    if (!asset) return;
    setFormData((prev) => {
      const list = [...(prev.equipmentList || [])];
      list[index] = {
        ...list[index],
        name: asset.name,
        code: asset.assetTag,
        serial: asset.serialNumber || '',
        unit: 'Bộ',
        condition: 'Hoạt động tốt',
      };
      return { ...prev, equipmentList: list };
    });
  };

  // Type Badge Renderer
  const renderTypeBadge = (type: MinuteType) => {
    switch (type) {
      case 'HANDOVER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bàn Giao Thiết Bị</span>
          </span>
        );
      case 'REVOCATION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-rose-600" />
            <span>Thu Hồi Thiết Bị</span>
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span>Bảo Trì & Nâng Cấp</span>
          </span>
        );
      case 'PROPOSAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tờ Đề Nghị Xin Cấp</span>
          </span>
        );
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
            ✓ Đã Ký Duyệt
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
            ★ Đã Hoàn Tất
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
            ⏳ Chờ Ký Duyệt
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
            ✎ Bản Nháp
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
            ✕ Từ Chối
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  // ModuleDataToolbar export columns config
  const excelColumns = [
    { header: 'Mã Biên Bản', key: 'minuteCode', width: 22 },
    { header: 'Loại Biên Bản', key: 'minuteType', width: 20 },
    { header: 'Tiêu Đề', key: 'title', width: 35 },
    { header: 'Khoa Phòng / Bộ Phận', key: 'department', width: 25 },
    { header: 'Ngày Lập', key: 'documentDate', width: 18 },
    { header: 'Trạng Thái', key: 'status', width: 18 },
    { header: 'Lý Do / Nội Dung', key: 'reason', width: 35 },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xs">
              <FileCheck className="w-5 h-5" />
            </span>
            <span>Quản Lý Biên Bản & Đề Nghị Thiết Bị</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Quản lý biên bản bàn giao, thu hồi, kế hoạch bảo trì, nâng cấp & các tờ đề nghị xin cấp thiết bị của khoa phòng
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Module Data Toolbar (Excel, JSON Backup & Restore) */}
          <ModuleDataToolbar
            moduleKey="minutes"
            moduleName="Biên Bản & Đề Nghị Thiết Bị"
            excelType="minutes"
            currentData={minutes}
            onDataRefresh={loadData}
            excelColumns={excelColumns}
            isEn={isEn}
          />

          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Biên Bản / Đề Nghị Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500">Tất Cả Biên Bản</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
        </div>

        <div
          onClick={() => setActiveTab('HANDOVER')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'HANDOVER'
              ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700">Bàn Giao Thiết Bị</span>
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{stats.handover}</p>
        </div>

        <div
          onClick={() => setActiveTab('REVOCATION')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'REVOCATION'
              ? 'bg-rose-50/80 border-rose-400 shadow-sm ring-1 ring-rose-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700">Thu Hồi Thiết Bị</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-extrabold text-rose-700 mt-1">{stats.revocation}</p>
        </div>

        <div
          onClick={() => setActiveTab('MAINTENANCE')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'MAINTENANCE'
              ? 'bg-amber-50/80 border-amber-400 shadow-sm ring-1 ring-amber-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700">Bảo Trì & Nâng Cấp</span>
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{stats.maintenance}</p>
        </div>

        <div
          onClick={() => setActiveTab('PROPOSAL')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'PROPOSAL'
              ? 'bg-indigo-50/80 border-indigo-400 shadow-sm ring-1 ring-indigo-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700">Tờ Đề Nghị Xin Cấp</span>
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">{stats.proposal}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm mã biên bản, tên thiết bị, khoa phòng, người nhận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Department & Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">Khoa phòng:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Tất cả khoa phòng</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">Trạng thái:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="APPROVED">Đã ký duyệt</option>
                <option value="PENDING">Chờ ký duyệt</option>
                <option value="COMPLETED">Đã hoàn tất</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Minutes Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Đang tải danh sách biên bản & tờ đề nghị...</span>
          </div>
        ) : filteredMinutes.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500 space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">Chưa có biên bản hoặc tờ đề nghị nào phù hợp bộ lọc</p>
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              + Tạo biên bản đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5">Mã & Tiêu Đề Biên Bản</th>
                  <th className="p-3.5">Loại Biên Bản</th>
                  <th className="p-3.5">Khoa Phòng / Bộ Phận</th>
                  <th className="p-3.5">Bên Giao / Nhận</th>
                  <th className="p-3.5 text-center">Số Thiết Bị</th>
                  <th className="p-3.5">Ngày Lập</th>
                  <th className="p-3.5 text-center">Trạng Thái</th>
                  <th className="p-3.5 text-center w-36">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMinutes.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-xs hover:text-blue-600 cursor-pointer" onClick={() => setPrintingMinute(item)}>
                        {item.title}
                      </div>
                      <div className="text-[11px] font-mono text-blue-600 font-semibold mt-0.5">
                        {item.minuteCode}
                      </div>
                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600 mt-1 font-sans"
                        >
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          <span>File đính kèm ({item.fileName || 'Xem tệp'})</span>
                        </a>
                      )}
                    </td>

                    <td className="p-3.5">
                      {renderTypeBadge(item.minuteType)}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.department || '—'}</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-[11px] space-y-0.5">
                      <div className="text-slate-600">
                        <span className="text-slate-400">Giao:</span> <strong>{item.sender?.name || '—'}</strong>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Nhận:</span> <strong>{item.receiver?.name || '—'}</strong>
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full font-mono text-[11px]">
                        {item.equipmentList?.length || 0}
                      </span>
                    </td>

                    <td className="p-3.5 text-[11.5px] font-mono text-slate-600 whitespace-nowrap">
                      {item.documentDate ? new Date(item.documentDate).toLocaleDateString('vi-VN') : '—'}
                    </td>

                    <td className="p-3.5 text-center">
                      {renderStatusBadge(item.status)}
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPrintingMinute(item)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="In / Xem trước mẫu in A4"
                        >
                          <Printer className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa biên bản"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.minuteCode)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa biên bản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREATE / EDIT MINUTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col my-8 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {modalMode === 'create' ? '➕ Tạo Mới Biên Bản / Tờ Đề Nghị' : '✏️ Chỉnh Sửa Biên Bản / Tờ Đề Nghị'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Type, Code, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại biên bản (*)</label>
                  <select
                    value={formData.minuteType}
                    onChange={(e) => {
                      const newType = e.target.value as MinuteType;
                      setFormData({
                        ...formData,
                        minuteType: newType,
                        title:
                          newType === 'HANDOVER'
                            ? 'Biên bản bàn giao thiết bị CNTT'
                            : newType === 'REVOCATION'
                            ? 'Biên bản thu hồi thiết bị CNTT'
                            : newType === 'MAINTENANCE'
                            ? 'Kế hoạch bảo trì & nâng cấp phần cứng'
                            : 'Tờ đề nghị xin cấp mới trang thiết bị',
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="HANDOVER">Biên bản bàn giao thiết bị</option>
                    <option value="REVOCATION">Biên bản thu hồi thiết bị</option>
                    <option value="MAINTENANCE">Kế hoạch bảo trì & nâng cấp</option>
                    <option value="PROPOSAL">Tờ đề nghị xin cấp thiết bị</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã số biên bản (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.minuteCode}
                    onChange={(e) => setFormData({ ...formData, minuteCode: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái phê duyệt</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as MinuteStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="APPROVED">✓ Đã ký duyệt (Bàn giao xong)</option>
                    <option value="PENDING">⏳ Chờ ký duyệt</option>
                    <option value="COMPLETED">★ Đã hoàn tất</option>
                    <option value="DRAFT">✎ Dự thảo / Bản nháp</option>
                    <option value="REJECTED">✕ Từ chối</option>
                  </select>
                </div>
              </div>

              {/* Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề biên bản (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Biên bản bàn giao máy tính để bàn cho Khoa Cấp Cứu..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khoa Phòng / Bộ phận (*)</label>
                  <input
                    type="text"
                    required
                    list="deptSuggestions"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="VD: Khoa Khám Bệnh, Khoa Hồi Sức, Phòng Kế Toán..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="deptSuggestions">
                    {allDepartments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Date & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày lập văn bản</label>
                  <input
                    type="date"
                    value={formData.documentDate}
                    onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lý do / Căn cứ / Mục đích thực hiện</label>
                  <input
                    type="text"
                    value={formData.reason || ''}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="VD: Cấp phát trang thiết bị cho nhân sự mới / Đề nghị thay thế màn hình hỏng..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sender & Receiver Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bên Giao / Đơn vị thực hiện */}
                <div className="space-y-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Đại diện Bên Giao / Đơn vị thực hiện:</span>
                  </span>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Họ và tên</label>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Văn A (KTV IT)"
                      value={formData.sender?.name || ''}
                      onChange={(e) => setFormData({ ...formData, sender: { ...formData.sender, name: e.target.value } })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Chức danh / Bộ phận</label>
                    <input
                      type="text"
                      placeholder="VD: Kỹ sư phần cứng - Phòng CNTT"
                      value={formData.sender?.title || ''}
                      onChange={(e) => setFormData({ ...formData, sender: { ...formData.sender, title: e.target.value } })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Bên Nhận / Đại diện Khoa phòng */}
                <div className="space-y-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đại diện Bên Nhận / Đại diện Khoa Phòng:</span>
                  </span>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Họ và tên người nhận</label>
                    <input
                      type="text"
                      placeholder="VD: Trần Thị B"
                      value={formData.receiver?.name || ''}
                      onChange={(e) => setFormData({ ...formData, receiver: { ...formData.receiver, name: e.target.value } })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Chức danh / Khoa phòng</label>
                    <input
                      type="text"
                      placeholder="VD: Điều dưỡng trưởng - Khoa Khám Bệnh"
                      value={formData.receiver?.title || ''}
                      onChange={(e) => setFormData({ ...formData, receiver: { ...formData.receiver, title: e.target.value } })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Equipment Items List Table */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Danh mục Trang Thiết Bị / Vật Tư trong biên bản ({formData.equipmentList?.length || 0})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Có thể gõ trực tiếp hoặc chọn nhanh từ danh mục Thiết bị / Tài sản đã lưu
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddEquipmentRow}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Thiết Bị</span>
                  </button>
                </div>

                <div className="space-y-2.5 pt-1">
                  {formData.equipmentList && formData.equipmentList.length > 0 ? (
                    formData.equipmentList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs relative"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                          <span className="font-bold text-slate-700 text-[11px]">
                            Thiết bị #{idx + 1}
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Quick Select from Asset */}
                            {availableAssets.length > 0 && (
                              <select
                                onChange={(e) => handleSelectAssetForEquipment(idx, e.target.value)}
                                className="text-[10.5px] p-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium cursor-pointer"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Chọn nhanh từ Tài sản...
                                </option>
                                {availableAssets.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.assetTag} - {a.name} ({a.serialNumber || 'N/A'})
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveEquipmentRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tên thiết bị (*)</label>
                            <input
                              type="text"
                              required
                              placeholder="VD: Máy tính Dell OptiPlex 7090..."
                              value={item.name}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'name', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Mã TS / Serial</label>
                            <input
                              type="text"
                              placeholder="VD: TS-2026-001..."
                              value={item.code || item.serial || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'code', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Số lượng</label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity || 1}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Hiện trạng kỹ thuật</label>
                            <input
                              type="text"
                              placeholder="VD: Mới 100%, Hoạt động tốt..."
                              value={item.condition || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'condition', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ghi chú kèm theo</label>
                            <input
                              type="text"
                              placeholder="Kèm bàn phím, chuột..."
                              value={item.notes || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'notes', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                      Chưa có thiết bị nào trong danh mục. Nhấn nút <strong>+ Thêm Thiết Bị</strong> ở trên!
                    </div>
                  )}
                </div>
              </div>

              {/* File Attachment / Scan Upload */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đính kèm tệp Scan / Ảnh có chữ ký tươi / Văn bản PDF:</span>
                </span>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                    {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5 text-blue-600" />}
                    <span>{uploadingFile ? 'Đang tải lên...' : 'Chọn file tải lên'}</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {formData.fileUrl && (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã đính kèm: {formData.fileName || 'bien-ban-signed.pdf'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? '💾 Lưu & Tạo Biên Bản' : '💾 Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT VIEW PREVIEW MODAL */}
      {printingMinute && (
        <MinutePrintView
          minute={printingMinute}
          onClose={() => setPrintingMinute(null)}
        />
      )}
    </div>
  );
}

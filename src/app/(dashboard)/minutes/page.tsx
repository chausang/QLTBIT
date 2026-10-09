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
  Link2,
  Copy,
  QrCode,
  Sparkles,
  Package,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import ModuleDataToolbar from '@/components/common/ModuleDataToolbar';
import MinutePrintView, { MinuteDetailProps, MinuteEquipmentItem } from '@/components/minutes/MinutePrintView';
import { MinuteType, MinuteStatus, MinutePayload } from '@/app/api/minutes/route';

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
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [isSparePartsModalOpen, setIsSparePartsModalOpen] = useState(false);
  const [sparePartSearch, setSparePartSearch] = useState('');
  const [showAllAssetsForRevocation, setShowAllAssetsForRevocation] = useState(false);

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
    hospitalName: 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
    department: '',
    location: '',
    locationCity: 'Châu Đốc',
    recipients: '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin',
    legalBasis: '',
    handoverCommitment: '',
    copiesCount: '03',
    companyName: '',
    documentDate: new Date().toISOString().split('T')[0],
    status: 'APPROVED',
    isBasedOnProposal: false,
    relatedProposalId: '',
    relatedProposalCode: '',
    relatedProposalTitle: '',
    sender: { name: '', title: '', department: '' },
    receiver1: { name: '', title: 'Trưởng Khoa/Phòng', department: '' },
    receiver2: { name: '', title: 'Nhân viên Khoa/Phòng', department: '' },
    receiver: { name: '', title: '', department: '' },
    equipmentList: [],
    reason: '',
    signers: {
      senderSignerTitle: 'Bên bàn giao',
      senderSignerName: '',
      receiver1Title: 'Trưởng Khoa/Phòng',
      receiver1Name: '',
      receiver2Title: 'Nhân viên Khoa/Phòng',
      receiver2Name: '',
    },
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

    // Fetch spare parts from warehouse
    fetch('/api/spare-parts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSpareParts(data);
        } else if (data.data && Array.isArray(data.data)) {
          setSpareParts(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // List of all proposal minutes to link with
  const proposalsList = useMemo(() => {
    return minutes.filter((m) => m.minuteType === 'PROPOSAL');
  }, [minutes]);

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
        const text = `${m.minuteCode} ${m.title} ${m.department} ${m.sender?.name} ${m.receiver1?.name} ${m.receiver2?.name} ${m.relatedProposalCode} ${m.reason} ${m.equipmentList?.map((e) => e.name + ' ' + (e.serial || '') + ' ' + (e.model || '')).join(' ')}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [minutes, activeTab, selectedDept, selectedStatus, search]);

  // Helper to check if asset belongs to department
  const isAssetInDepartment = (asset: any, dept: string): boolean => {
    if (!dept || !dept.trim()) return false;
    const clean = (s: string) =>
      s
        .toLowerCase()
        .replace(/^(khoa|phòng|ban|trung tâm|bộ phận)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    const target = clean(dept);
    if (!target) return false;

    // 1. Check asset location
    const locName = clean(asset.location?.name || '');
    if (locName && (locName.includes(target) || target.includes(locName))) {
      return true;
    }

    // 2. Check assignments
    if (Array.isArray(asset.assignments)) {
      for (const assign of asset.assignments) {
        const userDept = clean(assign.user?.department || '');
        if (userDept && (userDept.includes(target) || target.includes(userDept))) {
          return true;
        }
      }
    }

    // 3. Direct department on asset if any
    const directDept = clean(asset.department || '');
    if (directDept && (directDept.includes(target) || target.includes(directDept))) {
      return true;
    }

    return false;
  };

  // Quick select assets list - for REVOCATION, filter by current department
  const quickSelectAssets = useMemo(() => {
    if (formData.minuteType === 'REVOCATION' && !showAllAssetsForRevocation) {
      if (!formData.department?.trim()) return [];
      return availableAssets.filter((a) => isAssetInDepartment(a, formData.department));
    }
    return availableAssets;
  }, [availableAssets, formData.minuteType, formData.department, showAllAssetsForRevocation]);

  // Filtered spare parts for modal search
  const filteredSpareParts = useMemo(() => {
    if (!sparePartSearch.trim()) return spareParts;
    const q = sparePartSearch.toLowerCase();
    return spareParts.filter(
      (sp) =>
        (sp.name || '').toLowerCase().includes(q) ||
        (sp.sku || '').toLowerCase().includes(q) ||
        (sp.category?.name || '').toLowerCase().includes(q) ||
        (sp.location?.name || '').toLowerCase().includes(q)
    );
  }, [spareParts, sparePartSearch]);

  // Handle open create modal
  const handleOpenCreate = (defaultType?: MinuteType) => {
    const type = defaultType || (activeTab !== 'ALL' ? activeTab : 'HANDOVER');
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    let codePrefix = 'BB-BG';
    if (type === 'REVOCATION') codePrefix = 'BB-TH';
    if (type === 'MAINTENANCE') codePrefix = 'BB-BT';
    if (type === 'PROPOSAL') codePrefix = 'DN-TB';

    let defaultTitle = 'Biên bản bàn giao tài sản, công cụ';
    if (type === 'REVOCATION') defaultTitle = 'Biên bản thu hồi tài sản';
    if (type === 'MAINTENANCE') defaultTitle = 'Kế hoạch bảo trì & nâng cấp phần cứng';
    if (type === 'PROPOSAL') defaultTitle = 'Tờ đề nghị xin cấp trang thiết bị CNTT';

    const defaultSigners = {
      senderSignerTitle: type === 'REVOCATION' ? 'Bên Giao' : 'Bên bàn giao',
      senderSignerName: '',
      receiver1Title: type === 'REVOCATION' ? 'Bên Nhận' : 'Trưởng Khoa/Phòng',
      receiver1Name: '',
      receiver2Title: type === 'REVOCATION' ? '' : 'Nhân viên Khoa/Phòng',
      receiver2Name: '',
    };

    setShowAllAssetsForRevocation(false);
    setFormData({
      title: defaultTitle,
      minuteType: type,
      minuteCode: `${codePrefix}-${year}-${randomSuffix}`,
      hospitalName: 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
      department: '',
      location: '',
      locationCity: 'Châu Đốc',
      recipients: '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin',
      legalBasis: 'Căn cứ tình hình thực tế của Khoa/Phòng, tài sản hiện tại không có nhu cầu sử dụng nên cần bàn giao lại cho Phòng Công Nghệ Thông Tin như sau:',
      handoverCommitment: 'Kể từ ngày ký số tài sản trên bên giao đã bàn giao lại hết cho bên nhận đầy đủ. Biên bản được lập thành 03 bản, mỗi bên giữ 01 bản.',
      copiesCount: '03',
      companyName: '',
      documentDate: new Date().toISOString().split('T')[0],
      status: type === 'PROPOSAL' ? 'PENDING' : 'APPROVED',
      isBasedOnProposal: false,
      relatedProposalId: '',
      relatedProposalCode: '',
      relatedProposalTitle: '',
      sender: { name: '', title: '', department: '' },
      receiver1: { name: '', title: type === 'REVOCATION' ? 'Bên Nhận' : 'Trưởng Khoa/Phòng', department: '' },
      receiver2: { name: '', title: type === 'REVOCATION' ? '' : 'Nhân viên Khoa/Phòng', department: '' },
      receiver: { name: '', title: '', department: '' },
      equipmentList: [],
      reason: '',
      signers: defaultSigners,
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
      hospitalName: item.hospitalName || 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
      department: item.department,
      location: item.location || item.department,
      locationCity: item.locationCity || 'Châu Đốc',
      recipients: item.recipients || '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin',
      legalBasis: item.legalBasis || '',
      handoverCommitment: item.handoverCommitment || '',
      copiesCount: item.copiesCount || '03',
      companyName: item.companyName,
      documentDate: item.documentDate ? item.documentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      status: item.status as MinuteStatus,
      isBasedOnProposal: !!item.isBasedOnProposal,
      relatedProposalId: item.relatedProposalId || '',
      relatedProposalCode: item.relatedProposalCode || '',
      relatedProposalTitle: item.relatedProposalTitle || '',
      sender: item.sender || {},
      receiver1: item.receiver1 || item.receiver || {},
      receiver2: item.receiver2 || {},
      receiver: item.receiver1 || item.receiver || {},
      equipmentList: item.equipmentList && item.equipmentList.length > 0 ? [...item.equipmentList] : [],
      reason: item.reason || '',
      signers: item.signers || {},
      extraNotes: item.extraNotes || '',
    });
    setShowAllAssetsForRevocation(false);
    setEditingId(item.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Select Proposal Handler
  const handleSelectProposal = (proposalCode: string) => {
    const prop = proposalsList.find((p) => p.minuteCode === proposalCode);
    if (!prop) {
      setFormData((prev) => ({
        ...prev,
        isBasedOnProposal: false,
        relatedProposalId: '',
        relatedProposalCode: '',
        relatedProposalTitle: '',
      }));
      return;
    }

    const propDateStr = prop.documentDate ? new Date(prop.documentDate).toLocaleDateString('vi-VN') : '';
    const autoReason =
      formData.minuteType === 'HANDOVER'
        ? `Cấp mới thiết bị theo đề nghị số ${prop.minuteCode} ngày ${propDateStr} của ${prop.department}.`
        : `Thu hồi thiết bị theo đề nghị số ${prop.minuteCode} ngày ${propDateStr} của Khoa ${prop.department}.`;

    setFormData((prev) => ({
      ...prev,
      isBasedOnProposal: true,
      relatedProposalId: prop.id,
      relatedProposalCode: prop.minuteCode,
      relatedProposalTitle: prop.title,
      department: prev.department || prop.department,
      location: prev.location || prop.department,
      reason: prev.reason || autoReason,
    }));
  };

  // Copy equipment items directly from Proposal
  const handleCopyEquipmentFromProposal = () => {
    if (!formData.relatedProposalCode) return;
    const prop = proposalsList.find((p) => p.minuteCode === formData.relatedProposalCode);
    if (!prop || !prop.equipmentList || prop.equipmentList.length === 0) {
      alert('Tờ đề nghị này không có danh mục thiết bị để sao chép.');
      return;
    }

    const copied = prop.equipmentList.map((item) => ({
      name: item.name,
      code: item.code || '',
      serial: item.serial || '',
      model: item.model || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'Cái',
      usageYear: item.usageYear || 'Không rõ',
      originalPrice: item.originalPrice || 'Không rõ',
      condition: formData.minuteType === 'REVOCATION' ? 'Hư không sửa được' : 'Mới 100%',
      notes: item.notes || '',
    }));

    setFormData((prev) => ({
      ...prev,
      equipmentList: copied,
    }));
    alert(`Đã sao chép thành công ${copied.length} thiết bị từ tờ đề nghị [${prop.minuteCode}]!`);
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
        {
          name: '',
          code: '',
          serial: '',
          model: '',
          quantity: 1,
          unit: 'Cái',
          usageYear: 'Không rõ',
          originalPrice: 'Không rõ',
          condition: prev.minuteType === 'REVOCATION' ? 'Hư không sửa được' : 'Mới 100%',
          notes: '',
        },
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
        model: asset.model || '',
        unit: 'Cái',
        usageYear: asset.purchaseDate ? new Date(asset.purchaseDate).getFullYear().toString() : 'Không rõ',
        originalPrice: asset.purchasePrice ? Number(asset.purchasePrice).toLocaleString('vi-VN') : 'Không rõ',
        condition: prev.minuteType === 'REVOCATION' ? 'Hư không sửa được' : 'Hoạt động tốt',
      };
      return { ...prev, equipmentList: list };
    });
  };

  // Quick select spare part for an existing row
  const handleSelectSparePartForEquipment = (index: number, partId: string) => {
    const part = spareParts.find((p) => p.id === partId);
    if (!part) return;
    setFormData((prev) => {
      const list = [...(prev.equipmentList || [])];
      list[index] = {
        ...list[index],
        name: part.name,
        code: part.sku || `LK-${part.id.substring(0, 6).toUpperCase()}`,
        serial: part.sku || '',
        model: part.category?.name || 'Linh kiện phụ tùng',
        quantity: 1,
        unit: part.unit || 'Cái',
        usageYear: new Date().getFullYear().toString(),
        originalPrice: part.unitCost ? Number(part.unitCost).toLocaleString('vi-VN') : 'Không rõ',
        condition: 'Mới 100%',
        notes: `Lấy từ kho linh kiện (Tồn: ${part.quantity} ${part.unit || 'cái'})`,
      };
      return { ...prev, equipmentList: list };
    });
  };

  // Add spare part directly from modal
  const handleAddSparePartDirect = (part: any, qty: number = 1) => {
    setFormData((prev) => ({
      ...prev,
      equipmentList: [
        ...(prev.equipmentList || []),
        {
          name: part.name,
          code: part.sku || `LK-${part.id.substring(0, 6).toUpperCase()}`,
          serial: part.sku || '',
          model: part.category?.name || 'Linh kiện phụ tùng',
          quantity: qty || 1,
          unit: part.unit || 'Cái',
          usageYear: new Date().getFullYear().toString(),
          originalPrice: part.unitCost ? Number(part.unitCost).toLocaleString('vi-VN') : 'Không rõ',
          condition: 'Mới 100%',
          notes: `Lấy từ kho linh kiện (Tồn: ${part.quantity} ${part.unit || 'cái'})`,
        },
      ],
    }));
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
            <span>Thu Hồi Tài Sản</span>
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
    { header: 'Mã Đề Nghị Liên Kết', key: 'relatedProposalCode', width: 22 },
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
            Quản lý biên bản bàn giao (kèm mã QR), biên bản thu hồi, bảo trì nâng cấp & liên kết tờ đề nghị cấp thiết bị
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
            onClick={() => handleOpenCreate('HANDOVER')}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>+ Bàn Giao</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreate('REVOCATION')}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>+ Thu Hồi</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Biên Bản Mới</span>
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
            <span className="text-[11px] font-bold text-rose-700">Thu Hồi Tài Sản</span>
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
              placeholder="Tìm kiếm mã biên bản, tờ đề nghị, tên thiết bị, khoa phòng..."
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
                  <th className="p-3.5">Liên Kết Đề Nghị</th>
                  <th className="p-3.5">Bên Giao / Nhận</th>
                  <th className="p-3.5 text-center">Thiết Bị</th>
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
                      <div
                        className="font-bold text-slate-900 text-xs hover:text-blue-600 cursor-pointer"
                        onClick={() => setPrintingMinute(item)}
                      >
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
                          <span>File scan ({item.fileName || 'Xem tệp'})</span>
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

                    {/* Proposal Connection Column */}
                    <td className="p-3.5">
                      {item.isBasedOnProposal && item.relatedProposalCode ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/90 rounded-lg text-[11px] font-medium font-mono">
                          <Link2 className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>{item.relatedProposalCode}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Trực tiếp</span>
                      )}
                    </td>

                    <td className="p-3.5 text-[11px] space-y-0.5">
                      <div className="text-slate-600">
                        <span className="text-slate-400">Giao:</span> <strong>{item.sender?.name || '—'}</strong>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Nhận:</span> <strong>{item.receiver1?.name || item.receiver?.name || '—'}</strong>
                        {item.receiver2?.name && (
                          <span className="text-[10px] text-slate-500">, {item.receiver2.name}</span>
                        )}
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
              
              {/* SECTION: LIÊN KẾT TỜ ĐỀ NGHỊ (THEO YÊU CẦU NGƯỜI DÙNG) */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-xs text-purple-950">
                      Liên kết với Tờ Đề Nghị xin cấp thiết bị của Khoa/Phòng
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isBasedOnProposal}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          isBasedOnProposal: checked,
                          relatedProposalCode: checked ? prev.relatedProposalCode : '',
                          relatedProposalId: checked ? prev.relatedProposalId : '',
                        }));
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-purple-900">
                      Thiết bị cấp mới / thu hồi theo tờ đề nghị
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  <div className="sm:col-span-8">
                    <select
                      value={formData.relatedProposalCode || ''}
                      onChange={(e) => handleSelectProposal(e.target.value)}
                      className="w-full p-2 bg-white border border-purple-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="">-- Chọn Tờ Đề Nghị từ danh sách đã lập --</option>
                      {proposalsList.map((p) => (
                        <option key={p.id} value={p.minuteCode}>
                          [{p.minuteCode}] {p.title} - {p.department} ({p.documentDate ? new Date(p.documentDate).toLocaleDateString('vi-VN') : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleCopyEquipmentFromProposal}
                      disabled={!formData.relatedProposalCode}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>📥 Sao chép thiết bị từ Tờ đề nghị</span>
                    </button>
                  </div>
                </div>
              </div>

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
                            ? 'Biên bản bàn giao tài sản, công cụ'
                            : newType === 'REVOCATION'
                            ? 'Biên bản thu hồi tài sản'
                            : newType === 'MAINTENANCE'
                            ? 'Kế hoạch bảo trì & nâng cấp phần cứng'
                            : 'Tờ đề nghị xin cấp trang thiết bị CNTT',
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="HANDOVER">Biên bản bàn giao tài sản, công cụ</option>
                    <option value="REVOCATION">Biên bản thu hồi tài sản</option>
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

              {/* Title & Organization Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề biên bản (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên Bệnh viện / Cơ quan (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.hospitalName || ''}
                    onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                    placeholder="VD: BỆNH VIỆN ĐA KHOA CHÂU ĐỐC..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Department, Location, Location City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khoa / Phòng ban (*)</label>
                  <input
                    type="text"
                    required
                    list="deptSuggestions"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="VD: Dược, Khám Bệnh, Phòng HCQT..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="deptSuggestions">
                    {allDepartments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa điểm lập (Tại:...)</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="VD: Phòng Hành Chính Quản trị"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa danh & Ngày lập</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Châu Đốc"
                      value={formData.locationCity || ''}
                      onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                      className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    />
                    <input
                      type="date"
                      value={formData.documentDate}
                      onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                      className="w-1/2 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Sections Based on Type */}
              {formData.minuteType === 'REVOCATION' ? (
                /* SECTION CHO BIÊN BẢN THU HỒI */
                <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-3">
                  <span className="font-bold text-xs text-rose-950 flex items-center gap-1.5 pb-1 border-b border-rose-200">
                    <ArrowRightLeft className="w-4 h-4 text-rose-600" />
                    <span>Cấu hình nội dung Biên bản Thu hồi tài sản</span>
                  </span>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Căn cứ thu hồi tài sản:</label>
                    <textarea
                      rows={2}
                      value={formData.legalBasis || ''}
                      onChange={(e) => setFormData({ ...formData, legalBasis: e.target.value })}
                      placeholder="Căn cứ tình hình thực tế của Khoa Dược, tài sản hiện tại khoa không có nhu cầu sử dụng nên cần trả lại Phòng Công Nghệ Thông Tin như sau:"
                      className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              ) : (
                /* SECTION CHO BIÊN BẢN BÀN GIAO */
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                  <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5 pb-1 border-b border-emerald-200">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <span>Cấu hình nội dung Biên bản Bàn giao tài sản, công cụ</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Lý do bàn giao (*):</label>
                      <input
                        type="text"
                        value={formData.reason || ''}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Nhập lý do bàn giao (hoặc chọn tờ đề nghị)..."
                        className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Lời cam kết bàn giao:</label>
                      <input
                        type="text"
                        value={formData.handoverCommitment || ''}
                        onChange={(e) => setFormData({ ...formData, handoverCommitment: e.target.value })}
                        placeholder="Kể từ ngày ... số tài sản trên bên giao đã bàn giao lại hết cho bên nhận đầy đủ."
                        className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SENDER & RECEIVERS CARD */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bên Giao */}
                <div className="space-y-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bên bàn giao / Bên giao:</span>
                  </span>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Họ và tên (*)</label>
                    <input
                      type="text"
                      placeholder="Họ và tên bên giao..."
                      value={formData.sender?.name || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender: { ...formData.sender, name: e.target.value },
                          signers: { ...formData.signers, senderSignerName: e.target.value },
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Bộ phận / Chức danh</label>
                    <input
                      type="text"
                      placeholder="Bộ phận / chức danh bên giao..."
                      value={formData.sender?.department || formData.sender?.title || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender: { ...formData.sender, department: e.target.value, title: e.target.value },
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Bên Nhận: Cho phép 2 người nhận */}
                <div className="space-y-2">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bên nhận (Trưởng Khoa & Nhân viên):</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Người 1 (Trưởng Khoa/Phòng)</label>
                      <input
                        type="text"
                        placeholder="Họ và tên người nhận 1..."
                        value={formData.receiver1?.name || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver1: { ...formData.receiver1, name: e.target.value },
                            signers: { ...formData.signers, receiver1Name: e.target.value },
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Bộ phận / Chức vụ 1</label>
                      <input
                        type="text"
                        placeholder="Bộ phận / chức danh 1..."
                        value={formData.receiver1?.department || formData.receiver1?.title || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver1: { ...formData.receiver1, department: e.target.value, title: e.target.value },
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Người 2 (Nhân viên nhận máy)</label>
                      <input
                        type="text"
                        placeholder="Họ và tên người nhận 2 (nếu có)..."
                        value={formData.receiver2?.name || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver2: { ...formData.receiver2, name: e.target.value },
                            signers: { ...formData.signers, receiver2Name: e.target.value },
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Bộ phận / Chức vụ 2</label>
                      <input
                        type="text"
                        placeholder="Bộ phận / chức danh 2..."
                        value={formData.receiver2?.department || formData.receiver2?.title || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver2: { ...formData.receiver2, department: e.target.value, title: e.target.value },
                          })
                        }
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* EQUIPMENT LIST TABLE */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Danh mục Thiết Bị / Tài Sản ({formData.equipmentList?.length || 0})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Đầy đủ các trường: Model, Serinumber, Mã QR, Năm sử dụng, Nguyên giá, Tình trạng kỹ thuật
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSparePartsModalOpen(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Chọn linh kiện phụ tùng từ kho vật tư"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>+ Thêm từ Kho Linh Kiện</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddEquipmentRow}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Thêm Thiết Bị</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {formData.equipmentList && formData.equipmentList.length > 0 ? (
                    formData.equipmentList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs relative"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 flex-wrap gap-2">
                          <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-[11px] flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>Mục #{idx + 1}</span>
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Quick Select from Asset (Filtered by department for REVOCATION) */}
                            <select
                              onChange={(e) => {
                                if (e.target.value === '__SHOW_ALL__') {
                                  setShowAllAssetsForRevocation(true);
                                } else {
                                  handleSelectAssetForEquipment(idx, e.target.value);
                                }
                              }}
                              className={`text-[10.5px] p-1 border rounded-lg font-medium cursor-pointer max-w-[210px] truncate ${
                                formData.minuteType === 'REVOCATION'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                              defaultValue=""
                            >
                              <option value="" disabled>
                                {formData.minuteType === 'REVOCATION'
                                  ? formData.department
                                    ? `Tài sản ${formData.department} (${quickSelectAssets.length})...`
                                    : 'Chọn Khoa/Phòng trước...'
                                  : 'Chọn nhanh từ Tài sản...'}
                              </option>
                              {quickSelectAssets.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.assetTag} - {a.name} ({a.serialNumber || 'N/A'})
                                </option>
                              ))}
                              {formData.minuteType === 'REVOCATION' && !showAllAssetsForRevocation && (
                                <option value="__SHOW_ALL__" className="text-slate-500 italic">
                                  ↳ Xem tất cả tài sản ({availableAssets.length})
                                </option>
                              )}
                            </select>

                            {/* Quick Select from Spare Part */}
                            {spareParts.length > 0 && (
                              <select
                                onChange={(e) => handleSelectSparePartForEquipment(idx, e.target.value)}
                                className="text-[10.5px] p-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-medium cursor-pointer max-w-[170px] truncate"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Kho Linh kiện...
                                </option>
                                {spareParts.map((sp) => (
                                  <option key={sp.id} value={sp.id}>
                                    📦 {sp.name} ({sp.sku || 'N/A'} - Tồn: {sp.quantity})
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

                        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tên thiết bị, công cụ (*)</label>
                            <input
                              type="text"
                              required
                              placeholder="Nhập tên thiết bị, công cụ..."
                              value={item.name}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'name', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Model</label>
                            <input
                              type="text"
                              placeholder="Model..."
                              value={item.model || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'model', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Số Serinumber</label>
                            <input
                              type="text"
                              placeholder="Số Serial..."
                              value={item.serial || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'serial', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Mã TS / Mã QR (*)</label>
                            <input
                              type="text"
                              placeholder="Mã TS / Mã QR..."
                              value={item.code || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'code', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ĐVT</label>
                            <input
                              type="text"
                              placeholder="Cái"
                              value={item.unit || 'Cái'}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'unit', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">SL (*)</label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity || 1}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-bold"
                            />
                          </div>
                        </div>

                        {/* Extra columns for Revocation / Handover: Năm sử dụng, Nguyên giá, Tình trạng */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Năm sử dụng</label>
                            <input
                              type="text"
                              placeholder="Không rõ / 2022..."
                              value={item.usageYear || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'usageYear', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nguyên giá (đồng)</label>
                            <input
                              type="text"
                              placeholder="Không rõ / 15.000.000..."
                              value={item.originalPrice || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'originalPrice', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tình trạng kỹ thuật</label>
                            <input
                              type="text"
                              placeholder="Hư không sửa được / Mới 100%..."
                              value={item.condition || ''}
                              onChange={(e) => handleEquipmentFieldChange(idx, 'condition', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-rose-700"
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

      {/* MODAL: CHỌN LINH KIỆN PHỤ TÙNG TỪ KHO */}
      {isSparePartsModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-sm">Kho Linh Kiện & Phụ Tùng</h3>
                  <p className="text-[11px] text-amber-100">Chọn linh kiện để thêm vào danh mục biên bản</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSparePartsModalOpen(false)}
                className="p-1 text-amber-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo tên linh kiện, mã SKU, danh mục, vị trí..."
                  value={sparePartSearch}
                  onChange={(e) => setSparePartSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {filteredSpareParts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  Không tìm thấy linh kiện nào trong kho.
                </div>
              ) : (
                filteredSpareParts.map((part) => (
                  <div
                    key={part.id}
                    className="p-3 border border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{part.name}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          Mã: {part.sku || 'N/A'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>Loại: <strong>{part.category?.name || 'Khác'}</strong></span>
                        <span>Vị trí: <strong>{part.location?.name || 'Kho chính'}</strong></span>
                        <span>
                          Tồn kho:{' '}
                          <strong className={part.quantity > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {part.quantity} {part.unit || 'cái'}
                          </strong>
                        </span>
                        {part.unitCost && (
                          <span>Đơn giá: {Number(part.unitCost).toLocaleString('vi-VN')} đ</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleAddSparePartDirect(part, 1);
                        setIsSparePartsModalOpen(false);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Chọn</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSparePartsModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW PREVIEW MODAL */}
      {printingMinute && (
        <MinutePrintView
          minute={printingMinute}
          onClose={() => setPrintingMinute(null)}
          onEdit={(min) => {
            setPrintingMinute(null);
            handleOpenEdit(min);
          }}
        />
      )}
    </div>
  );
}

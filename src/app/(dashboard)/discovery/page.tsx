'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TablePaginationBar } from '@/components/common/TablePaginationBar';
import { useLanguage } from '@/lib/i18n/context';
import {
  Wifi,
  Search,
  RefreshCw,
  Plus,
  Server,
  Laptop,
  Printer,
  Camera,
  Network,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Copy,
  Download,
  Terminal,
  Cpu,
  HardDrive,
  ShieldCheck,
  Activity,
  ExternalLink,
  ChevronRight,
  Zap,
  Eye,
  X,
  Loader2,
  HelpCircle,
  FileCode,
  Radio,
  Boxes,
  ScanLine,
  ShieldAlert,
  Key,
  Check,
  FileSpreadsheet,
  Building2,
  User as UserIcon,
  MapPin,
  Tag,
  Calendar,
  Info,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Settings2,
  Trash2,
} from 'lucide-react';
import { HealthOverviewTab } from '@/components/discovery/HealthOverviewTab';
import { TamperAlertsTab } from '@/components/discovery/TamperAlertsTab';
import { useQuickViewStore } from '@/lib/quick-view-store';
import ExcelJS from 'exceljs';

export interface VlanConfig {
  id: string;
  name: string;
  subnet: string;
  ipStart: string;
  ipEnd: string;
  description?: string;
  enabled: boolean;
  isDefault?: boolean;
}

interface DiscoveredDevice {
  ipAddress: string;
  macAddress: string;
  hostname: string;
  vendor: string;
  model?: string;
  os?: string;
  openPorts: number[];
  deviceType: string;
  responseTimeMs: number;
  status: string;
  lastSeen: string;
  vlanId?: string;
  vlanName?: string;
  subnet?: string;
  matchedAsset?: {
    id: string;
    assetTag: string;
    name: string;
    status: string;
    condition?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    categoryName?: string;
    locationName?: string;
    department?: string;
    assignedTo?: string;
    assignedUserEmail?: string;
    assignedUserPhone?: string;
    assignedUserPosition?: string;
    assignedAt?: string | null;
    specs?: any;
  } | null;
}

interface AgentReport {
  assetId: string;
  assetTag: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  categoryName?: string;
  assignedTo?: string;
  department?: string;
  hostname: string;
  ipAddress?: string;
  macAddress?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  lastScannedAt: string;
  hardwareChangeAlert?: string;
  installedSoftwareCount: number;
  installedSoftware: Array<{
    name: string;
    version?: string;
    publisher?: string;
    installDate?: string;
  }>;
  osLicense?: {
    name?: string;
    status?: string;
    statusCode?: number;
    channel?: string;
    partialKey?: string;
    isKms?: boolean;
    isKmsCrack?: boolean;
    kmsHost?: string;
  } | null;
  officeLicense?: {
    name?: string;
    status?: string;
    statusCode?: number;
    channel?: string;
    partialKey?: string;
    isKms?: boolean;
  } | null;
  crackDetection?: {
    hasSuspect: boolean;
    warnings: string[];
  } | null;
  licenseMatches?: Array<{
    softwareName: string;
    licenseId: string;
    licenseName: string;
    licenseKey?: string;
    seats: number;
    availableSeats: number;
    matchStatus: 'ASSIGNED_MATCH' | 'UNASSIGNED_MATCH';
    message: string;
  }>;
  unmanagedCommercialApps?: Array<{
    name: string;
    version?: string;
    publisher?: string;
    message: string;
  }>;
}

export default function DiscoveryPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [isEnterprise, setIsEnterprise] = useState<boolean | null>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const isModActive = (mod: string) => Boolean(isEnterprise) && (activeModules.length === 0 || activeModules.includes(mod) || activeModules.includes('*'));

  const fetchLicense = () => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isEnterprise) {
          setIsEnterprise(true);
          setActiveModules(Array.isArray(data.modules) ? data.modules : []);
        } else {
          setIsEnterprise(false);
          setActiveModules([]);
        }
      })
      .catch(() => setIsEnterprise(false));
  };

  useEffect(() => {
    fetchLicense();
    const handleUpdate = () => fetchLicense();
    window.addEventListener('simply:license-updated', handleUpdate);
    return () => window.removeEventListener('simply:license-updated', handleUpdate);
  }, []);

  const [activeTab, setActiveTab] = useState<'SCAN' | 'ALERTS' | 'HEALTH' | 'AI_ENRICH' | 'GUIDE'>('SCAN');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'ALERTS' || tabParam === 'alerts') {
        setActiveTab('ALERTS');
      } else if (tabParam === 'HEALTH' || tabParam === 'health') {
        setActiveTab('HEALTH');
      }
    }
  }, []);

  // TAB 1: Network Scanner State & Multi-VLAN Management
  const { openQuickView } = useQuickViewStore();
  const [scanMode, setScanMode] = useState<'SINGLE' | 'MULTI_VLAN'>('MULTI_VLAN');
  const [subnetInput, setSubnetInput] = useState('192.168.1.0/24');
  const [ipStart, setIpStart] = useState('192.168.1.1');
  const [ipEnd, setIpEnd] = useState('192.168.1.254');
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [searchDevice, setSearchDevice] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedVlanFilter, setSelectedVlanFilter] = useState('ALL');
  const [detectedInterface, setDetectedInterface] = useState<any>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<any[]>([]);

  // Default VLAN list
  const DEFAULT_VLANS: VlanConfig[] = [
    { id: 'vlan_1', name: 'VLAN 1 - Mạng Trụ Sở & Văn Phòng', subnet: '192.168.1.0/24', ipStart: '192.168.1.1', ipEnd: '192.168.1.254', description: 'Máy trạm văn phòng, kế toán, ban giám đốc', enabled: true },
    { id: 'vlan_10', name: 'VLAN 10 - Khoa Khám Bệnh & Cấp Cứu', subnet: '192.168.10.0/24', ipStart: '192.168.10.1', ipEnd: '192.168.10.254', description: 'Máy tính khu khám bệnh, tiếp đón bệnh nhân', enabled: true },
    { id: 'vlan_20', name: 'VLAN 20 - Máy In & Ngoại Vi', subnet: '192.168.20.0/24', ipStart: '192.168.20.1', ipEnd: '192.168.20.254', description: 'Máy in Canon/HP, máy quét mã vạch, POS', enabled: false },
    { id: 'vlan_30', name: 'VLAN 30 - Camera An Ninh & IoT', subnet: '192.168.30.0/24', ipStart: '192.168.30.1', ipEnd: '192.168.30.254', description: 'Hệ thống camera Dahua/Hikvision, IoT', enabled: false },
    { id: 'vlan_50', name: 'VLAN 50 - Máy Chủ & Thiết Bị Mạng', subnet: '10.0.1.0/24', ipStart: '10.0.1.1', ipEnd: '10.0.1.254', description: 'Máy chủ dữ liệu, Router, Firewall, Core Switch', enabled: false },
  ];

  const [vlanList, setVlanList] = useState<VlanConfig[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('simply_it_discovery_vlans');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_VLANS;
  });

  const [isVlanModalOpen, setIsVlanModalOpen] = useState(false);
  const [newVlanForm, setNewVlanForm] = useState({
    name: '',
    subnet: '192.168.100.0/24',
    ipStart: '192.168.100.1',
    ipEnd: '192.168.100.254',
    description: '',
  });

  const [quickViewDevice, setQuickViewDevice] = useState<DiscoveredDevice | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const saveVlanList = (list: VlanConfig[]) => {
    setVlanList(list);
    if (typeof window !== 'undefined') {
      localStorage.setItem('simply_it_discovery_vlans', JSON.stringify(list));
    }
  };

  const handleToggleVlan = (id: string) => {
    const updated = vlanList.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v));
    saveVlanList(updated);
  };

  const handleSelectAllVlans = (select: boolean) => {
    const updated = vlanList.map((v) => ({ ...v, enabled: select }));
    saveVlanList(updated);
  };

  const handleDeleteVlan = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa cấu hình VLAN này?')) {
      const updated = vlanList.filter((v) => v.id !== id);
      saveVlanList(updated);
      showToast('Đã xóa VLAN khỏi danh sách');
    }
  };

  const handleAddVlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVlanForm.name.trim() || !newVlanForm.subnet.trim()) {
      showToast('Vui lòng nhập đầy đủ tên và dải subnet');
      return;
    }
    const newVlan: VlanConfig = {
      id: `vlan_custom_${Date.now()}`,
      name: newVlanForm.name.trim(),
      subnet: newVlanForm.subnet.trim(),
      ipStart: newVlanForm.ipStart.trim(),
      ipEnd: newVlanForm.ipEnd.trim(),
      description: newVlanForm.description.trim() || 'VLAN cấu hình tùy chỉnh',
      enabled: true,
    };
    saveVlanList([...vlanList, newVlan]);
    setIsVlanModalOpen(false);
    setNewVlanForm({
      name: '',
      subnet: '192.168.100.0/24',
      ipStart: '192.168.100.1',
      ipEnd: '192.168.100.254',
      description: '',
    });
    showToast(`✅ Đã thêm ${newVlan.name} vào danh sách quét!`);
  };

  // TAB 2: Agent Reports State
  const [agentReports, setAgentReports] = useState<AgentReport[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentReport | null>(null);
  const [searchSoftware, setSearchSoftware] = useState('');
  const [assigningLicenseId, setAssigningLicenseId] = useState<string | null>(null);

  const handleQuickAssignLicense = async (licenseId: string, assetId: string, licenseName: string) => {
    try {
      setAssigningLicenseId(licenseId);
      const res = await fetch(`/api/licenses/${licenseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          notes: `Gán License từ Discovery cho ${selectedAgent?.assetTag || 'thiết bị'}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Đã gán License "${licenseName}" cho thiết bị!`);
        if (selectedAgent) {
          const updatedMatches = (selectedAgent.licenseMatches || []).map((m) =>
            m.licenseId === licenseId
              ? { ...m, matchStatus: 'ASSIGNED_MATCH' as const, availableSeats: Math.max(0, m.availableSeats - 1) }
              : m
          );
          setSelectedAgent({ ...selectedAgent, licenseMatches: updatedMatches });
        }
        loadAgentReports();
      } else {
        showToast(`❌ Không thể gán: ${data.error || 'Lỗi hệ thống'}`);
      }
    } catch (err: any) {
      showToast(`❌ Lỗi kết nối: ${err?.message || err}`);
    } finally {
      setAssigningLicenseId(null);
    }
  };

  // TAB 3: AI Spec Enrichment State
  const [aiModelInput, setAiModelInput] = useState('');
  const [aiBrandInput, setAiBrandInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Quick Modal: Add Discovered Device to Assets
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [addingDevice, setAddingDevice] = useState<DiscoveredDevice | null>(null);
  const [addAssetForm, setAddAssetForm] = useState<any>({
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    deviceType: 'Laptop',
    ipAddress: '',
    macAddress: '',
    cpu: '',
    ram: '',
    storage: '',
  });

  // ESC key listener to close active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (quickViewDevice) setQuickViewDevice(null);
        else if (isVlanModalOpen) setIsVlanModalOpen(false);
        else if (isAddAssetModalOpen) setIsAddAssetModalOpen(false);
        else if (selectedAgent) setSelectedAgent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddAssetModalOpen, selectedAgent, quickViewDevice, isVlanModalOpen]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const safeText = (val: any, fallback = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.filter(Boolean).map(String).join(', ') || fallback;
    if (typeof val === 'object') {
      if (typeof val.ip === 'string') return val.ip;
      if (typeof val.IPv4 === 'string') return val.IPv4;
      const values = Object.values(val).filter((v) => typeof v === 'string' || typeof v === 'number');
      return values.length > 0 ? values.join(', ') : fallback;
    }
    return String(val);
  };

  // Auto-detect local network configuration
  const loadNetworkConfig = async () => {
    try {
      const res = await fetch('/api/discovery/scan');
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.primaryInterface) {
          const iface = json.data.primaryInterface;
          setDetectedInterface(iface);
          setSubnetInput(iface.subnet);
          setIpStart(iface.ipStart);
          setIpEnd(iface.ipEnd);

          // Auto-sync physical interface to VLAN list if not exists
          setVlanList((prev) => {
            const exists = prev.some((v) => v.subnet === iface.subnet);
            if (!exists) {
              const updated = [
                {
                  id: `vlan_server_${Date.now()}`,
                  name: `VLAN Card Mạng Máy Chủ (${iface.name})`,
                  subnet: iface.subnet,
                  ipStart: iface.ipStart,
                  ipEnd: iface.ipEnd,
                  description: `Dải mạng card mạng thực tế máy chủ ${iface.name} IP ${iface.ip}`,
                  enabled: true,
                  isDefault: true,
                },
                ...prev,
              ];
              if (typeof window !== 'undefined') {
                localStorage.setItem('simply_it_discovery_vlans', JSON.stringify(updated));
              }
              return updated;
            }
            return prev;
          });
        }
        if (json.data.interfaces) {
          setAvailableInterfaces(json.data.interfaces);
        }
      }
    } catch (err) {
      console.error('Failed to load network config:', err);
    }
  };

  // Load Agent Reports
  const loadAgentReports = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/discovery/agents');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAgentReports(json.data);
        if (json.data.length > 0) {
          setSelectedAgent((prev) => {
            if (prev) {
              return json.data.find((d: any) => d.assetId === prev.assetId) || json.data[0];
            }
            return json.data[0];
          });
        }
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    loadAgentReports();
    loadNetworkConfig();
  }, []);

  // Run Network Discovery Scan (Multi-VLAN or Single)
  const handleStartScan = async () => {
    setScanning(true);
    try {
      let bodyPayload: any = {};
      if (scanMode === 'MULTI_VLAN') {
        const activeVlans = vlanList.filter((v) => v.enabled);
        if (activeVlans.length === 0) {
          showToast('⚠️ Vui lòng tích chọn ít nhất 1 VLAN để quét!');
          setScanning(false);
          return;
        }
        bodyPayload = {
          vlans: activeVlans.map((v) => ({
            id: v.id,
            name: v.name,
            subnet: v.subnet,
            ipStart: v.ipStart,
            ipEnd: v.ipEnd,
          })),
        };
      } else {
        bodyPayload = {
          subnet: subnetInput,
          ipStart,
          ipEnd,
          vlanName: 'Dải Mạng Hiện Tại',
        };
      }

      const res = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDevices(json.data.devices || []);
        showToast(json.message || 'Quét mạng hoàn tất!');
      } else {
        showToast(json.error || 'Lỗi quét mạng');
      }
    } catch (err: any) {
      showToast('Lỗi kết nối API quét mạng');
    } finally {
      setScanning(false);
    }
  };

  // Run AI Spec Enrichment
  const handleRunAiEnrich = async (modelQuery?: string, brandQuery?: string) => {
    const queryModel = modelQuery || aiModelInput;
    const queryBrand = brandQuery || aiBrandInput;

    if (!queryModel.trim()) {
      showToast('Vui lòng nhập Model thiết bị');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/discovery/ai-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: queryModel,
          brand: queryBrand,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAiResult(json.data);
        showToast(json.message || '✨ AI đã tìm thấy thông số kỹ thuật!');
      } else {
        showToast(json.error || 'AI không tìm thấy thông số cho model này');
      }
    } catch (err) {
      showToast('Lỗi kết nối AI Engine');
    } finally {
      setAiLoading(false);
    }
  };

  // Open Add to Assets modal with AI pre-fill
  const handleOpenAddToAsset = async (dev: DiscoveredDevice) => {
    setAddingDevice(dev);
    setAddAssetForm({
      name: dev.hostname ? `Máy tính ${dev.hostname}` : `Thiết bị ${dev.model || dev.vendor}`,
      brand: dev.vendor || '',
      model: dev.model || '',
      serialNumber: `SN-${dev.macAddress.replace(/:/g, '').slice(-8)}`,
      deviceType: dev.deviceType || 'Laptop',
      ipAddress: dev.ipAddress,
      macAddress: dev.macAddress,
      cpu: '',
      ram: '',
      storage: '',
    });

    setIsAddAssetModalOpen(true);

    // Auto enrich if model available
    if (dev.model) {
      try {
        const res = await fetch('/api/discovery/ai-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: dev.model, brand: dev.vendor }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setAddAssetForm((prev: any) => ({
            ...prev,
            cpu: json.data.cpu || prev.cpu,
            ram: json.data.ram || prev.ram,
            storage: json.data.storage || prev.storage,
            deviceType: json.data.categoryName || prev.deviceType,
          }));
        }
      } catch {}
    }
  };

  // Submit new Asset from Discovery
  const handleSaveDiscoveredAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/auto-scan/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: addAssetForm.name,
          serialNumber: addAssetForm.serialNumber,
          brand: addAssetForm.brand,
          model: addAssetForm.model,
          scannedAt: new Date().toISOString(),
          specs: {
            cpu: addAssetForm.cpu,
            ram: addAssetForm.ram,
            storage: addAssetForm.storage,
            ipAddress: addAssetForm.ipAddress,
            macAddress: addAssetForm.macAddress,
            autoEnrichedByAI: true,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Đã thêm thiết bị vào kho thành công!');
        setIsAddAssetModalOpen(false);
        if (devices.length > 0) {
          handleStartScan();
        }
        loadAgentReports();
      } else {
        showToast(json.error || 'Lỗi thêm tài sản');
      }
    } catch (err: any) {
      showToast('Lỗi lưu tài sản');
    }
  };

  // Copy powershell command
  const copyPowerShellCmd = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const cmd = `powershell -ExecutionPolicy Bypass -Command "iex (irm '${origin}/api/scripts/agent')"`;
    navigator.clipboard.writeText(cmd);
    showToast('📋 Đã sao chép lệnh PowerShell vào Clipboard!');
  };

  // Filtered devices with VLAN and text search
  const filteredDevices = devices.filter((d) => {
    const matchSearch =
      !searchDevice ||
      d.ipAddress.includes(searchDevice) ||
      d.hostname.toLowerCase().includes(searchDevice.toLowerCase()) ||
      d.vendor.toLowerCase().includes(searchDevice.toLowerCase()) ||
      d.macAddress.toLowerCase().includes(searchDevice.toLowerCase()) ||
      (d.matchedAsset?.name || '').toLowerCase().includes(searchDevice.toLowerCase()) ||
      (d.matchedAsset?.assetTag || '').toLowerCase().includes(searchDevice.toLowerCase()) ||
      (d.matchedAsset?.department || '').toLowerCase().includes(searchDevice.toLowerCase());

    if (!matchSearch) return false;

    // Filter by VLAN
    if (selectedVlanFilter !== 'ALL') {
      const matchVlan =
        d.vlanId === selectedVlanFilter ||
        d.vlanName === selectedVlanFilter ||
        d.subnet === selectedVlanFilter;
      if (!matchVlan) return false;
    }

    if (filterType === 'ALL') return true;
    if (filterType === 'NEW') return d.matchedAsset === null;
    if (filterType === 'MATCHED') return d.matchedAsset !== null;
    return d.deviceType === filterType;
  });

  // Export Discovered Devices to Excel
  const handleExportExcel = async (exportScope: 'CURRENT_FILTER' | 'ALL_VLANS') => {
    const listToExport = exportScope === 'CURRENT_FILTER' ? filteredDevices : devices;
    if (listToExport.length === 0) {
      showToast('⚠️ Không có thiết bị nào để xuất Excel!');
      return;
    }

    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QLTBIT Asset Management';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Thiết Bị Khám Phá Mạng', {
        views: [{ showGridLines: true }],
      });

      // Dòng 1: Tiêu đề lớn
      sheet.mergeCells('A1:Q1');
      const titleCell = sheet.getCell('A1');
      const vlanInfo =
        selectedVlanFilter !== 'ALL' && exportScope === 'CURRENT_FILTER'
          ? ` - THEO VLAN: ${selectedVlanFilter.toUpperCase()}`
          : ' - TOÀN BỘ CÁC VLAN';
      titleCell.value = `DANH SÁCH THIẾT BỊ KHÁM PHÁ MẠNG & THÔNG TIN QUẢN LÝ TÀI SẢN CNTT${vlanInfo}`;
      titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 34;

      // Dòng 2: Phụ đề thống kê
      sheet.mergeCells('A2:Q2');
      const subCell = sheet.getCell('A2');
      const matchedCount = listToExport.filter((d) => d.matchedAsset).length;
      const newCount = listToExport.length - matchedCount;
      subCell.value = `Ngày xuất: ${new Date().toLocaleString('vi-VN')} | Tổng thiết bị: ${listToExport.length} | Đã quản lý: ${matchedCount} | Thiết bị mới: ${newCount}`;
      subCell.font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF334155' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;

      // Dòng 3: Header cột
      const headerRow = sheet.getRow(3);
      headerRow.values = [
        'STT',
        'VLAN / Phân Đoạn',
        'Dải Subnet',
        'Địa Chỉ IP',
        'Tên Máy (Hostname)',
        'Địa Chỉ MAC',
        'Hãng Sản Xuất (OUI)',
        'Model / Hệ Điều Hành',
        'Loại Thiết Bị',
        'Cổng Mở (Open Ports)',
        'Trạng Thái Hệ Thống',
        'Mã Tài Sản (Asset Tag)',
        'Tên Tài Sản Quản Lý',
        'KHOA / PHÒNG QUẢN LÝ',
        'NGƯỜI PHỤ TRÁCH / SỬ DỤNG',
        'VỊ TRÍ THIẾT BỊ',
        'Tình Trạng Thiết Bị',
      ];
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Điền dữ liệu
      listToExport.forEach((dev, idx) => {
        const row = sheet.addRow([
          idx + 1,
          dev.vlanName || 'VLAN Mặc Định',
          dev.subnet || 'N/A',
          dev.ipAddress,
          dev.hostname,
          dev.macAddress,
          dev.vendor,
          dev.model || dev.os || 'N/A',
          dev.deviceType,
          dev.openPorts.map((p) => ':' + p).join(' '),
          dev.matchedAsset ? 'ĐÃ QUẢN LÝ' : 'THIẾT BỊ MỚI',
          dev.matchedAsset?.assetTag || '',
          dev.matchedAsset?.name || '',
          dev.matchedAsset?.department || 'Chưa gán khoa phòng',
          dev.matchedAsset?.assignedTo || 'Chưa cấp phát',
          dev.matchedAsset?.locationName || 'Chưa gán vị trí',
          dev.matchedAsset?.condition || 'Mới',
        ]);
        row.height = 22;

        const isMatched = !!dev.matchedAsset;
        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Times New Roman', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          if ([1, 4, 6, 9, 10, 11, 12].includes(colNum)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }

          // Highlight KHOA / PHÒNG QUẢN LÝ (cột 14)
          if (colNum === 14 && isMatched) {
            cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
          }

          // Highlight Trạng Thái (cột 11)
          if (colNum === 11) {
            if (isMatched) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
              cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF166534' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
              cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF92400E' } };
            }
          }
        });
      });

      sheet.columns = [
        { width: 6 },  // STT
        { width: 30 }, // VLAN
        { width: 16 }, // Subnet
        { width: 16 }, // IP
        { width: 22 }, // Hostname
        { width: 18 }, // MAC
        { width: 20 }, // Vendor
        { width: 24 }, // Model
        { width: 14 }, // Loại
        { width: 18 }, // Cổng
        { width: 16 }, // Trạng Thái
        { width: 16 }, // Tag
        { width: 26 }, // Tên
        { width: 26 }, // Khoa/Phòng
        { width: 22 }, // Phụ Trách
        { width: 22 }, // Vị Trí
        { width: 14 }, // Tình Trạng
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      const scopeSlug =
        exportScope === 'CURRENT_FILTER' && selectedVlanFilter !== 'ALL'
          ? `-${selectedVlanFilter.replace(/[\s/]/g, '-')}`
          : '-Tat-Ca-VLAN';
      link.download = `Danh-Sach-Thiet-Bi-Kham-Pha${scopeSlug}-${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('✅ Đã xuất file Excel danh sách thiết bị thành công!');
    } catch (err: any) {
      console.error('Export Excel error:', err);
      showToast('❌ Lỗi khi xuất file Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Pagination state with localStorage persistence
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simply_it_discovery_page_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([15, 25, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 25;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchDevice]);

  const totalPages = Math.ceil(filteredDevices.length / pageSize) || 1;
  const paginatedDevices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, currentPage, pageSize]);

  return (
    <div className="space-y-4 pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                {isEn ? 'Device Discovery & Network Scanner' : 'Scan Thiết Bị & Khám Phá Mạng'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Network & AI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isEn ? 'Scan live IP subnets, collect workstation hardware/software inventories & AI spec lookups' : 'Quét dải mạng IP thực tế, thu thập cấu hình máy trạm & AI tra cứu thông số kỹ thuật chuẩn hãng'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={copyPowerShellCmd}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Sao chép lệnh PowerShell thu thập 1-click"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isEn ? 'Copy Workstation Scan Script' : 'Copy Lệnh Scan Máy Trạm'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SCAN')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isEn ? 'Scan Subnet Now' : 'Quét Dải Mạng Ngay'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isEn ? "Discovered Devices" : "Thiết bị quét thấy"}</span>
            <ScanLine className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{devices.length}</span>
            <span className="text-xs text-indigo-600 font-bold">Online</span>
          </div>
          <span className="text-[10.5px] text-slate-400">{isEn ? "On current subnet" : "Trên dải mạng hiện tại"}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isEn ? "New Devices (Pending)" : "Thiết bị mới (Chờ thêm)"}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-600">
              {devices.filter((d) => d.matchedAsset === null).length}
            </span>
            <span className="text-xs text-amber-700 font-semibold">{isEn ? "Pending" : "Chờ thêm"}</span>
          </div>
          <span className="text-[10.5px] text-slate-400">{isEn ? "Not yet in asset inventory" : "Chưa có trong kho tài sản"}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isEn ? "AI Spec Lookup" : "AI Tra Cứu Model"}</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-600">{isEn ? "Ready" : "Sẵn Sàng"}</span>
            <span className="text-xs text-purple-700 font-bold">100%</span>
          </div>
          <span className="text-[10.5px] text-slate-400">{isEn ? "Automated spec enrichment" : "Tự động bổ sung thông số"}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-1.5 rounded-2xl shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('SCAN')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'SCAN'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isEn ? '1. IP Network Scanner' : '1. Quét Dải Mạng IP'}</span>
          {devices.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
              {devices.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ALERTS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ALERTS'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'ALERTS' ? 'text-white' : 'text-rose-500'}`} />
          <span>{isEn ? '2. Tamper Alerts & Audit Log' : '2. Cảnh Báo Tháo Linh Kiện & Nhật Ký'}</span>
          {agentReports.filter(a => a.hardwareChangeAlert || a.crackDetection?.hasSuspect || a.softwareChangeAlert).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black font-mono animate-pulse">
              {agentReports.filter(a => a.hardwareChangeAlert || a.crackDetection?.hasSuspect || a.softwareChangeAlert).length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HEALTH')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'HEALTH'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{isEn ? '3. IT Health Fleet Monitor' : '3. Giám Sát Sức Khỏe IT Health'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AI_ENRICH')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'AI_ENRICH'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{isEn ? '4. AI Spec Lookup' : '4. Tra Cứu Thông Số Model (AI)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GUIDE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'GUIDE'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{isEn ? '5. PowerShell & Deployment Guide' : '5. Script PowerShell & Hướng Dẫn'}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: NETWORK SUBNET & MULTI-VLAN SCANNER */}
      {/* ======================================================== */}
      {activeTab === 'SCAN' && (
        <div className="space-y-4">
          {/* Scan Control Panel */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            {/* Real Network Adapter Bar */}
            {detectedInterface && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-100 rounded-2xl px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold text-slate-700">Card mạng máy chủ:</span>
                  <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                    {detectedInterface.name} ({detectedInterface.ip})
                  </span>
                  <span className="text-slate-500 text-[11px]">Subnet thực tế: {detectedInterface.subnet}</span>
                </div>
                <div className="flex items-center gap-2">
                  {availableInterfaces.length > 1 && (
                    <select
                      onChange={(e) => {
                        const iface = availableInterfaces.find((i) => i.name === e.target.value);
                        if (iface) {
                          setDetectedInterface(iface);
                          setSubnetInput(iface.subnet);
                          setIpStart(iface.ipStart);
                          setIpEnd(iface.ipEnd);
                        }
                      }}
                      className="px-2 py-1 bg-white border border-indigo-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none"
                    >
                      {availableInterfaces.map((i, idx) => (
                        <option key={idx} value={i.name}>
                          {i.name} - {i.ip}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={loadNetworkConfig}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-indigo-200 rounded-lg text-[11px] font-bold text-indigo-600 transition-colors cursor-pointer"
                  >
                    🔄 Dò Lại Card Mạng
                  </button>
                </div>
              </div>
            )}

            {/* Mode Switcher: Single Subnet vs Multi-VLAN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Chế độ quét mạng:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setScanMode('MULTI_VLAN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      scanMode === 'MULTI_VLAN'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Quét Nhiều VLAN ({vlanList.filter((v) => v.enabled).length}/{vlanList.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('SINGLE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      scanMode === 'SINGLE'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Quét Dải Mạng Đơn</span>
                  </button>
                </div>
              </div>

              {scanMode === 'MULTI_VLAN' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllVlans(true)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                  >
                    ✓ Chọn Tất Cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllVlans(false)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                  >
                    ✕ Bỏ Chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVlanModalOpen(true)}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm VLAN Mới</span>
                  </button>
                </div>
              )}
            </div>

            {/* MODE 1: MULTI-VLAN LIST CONFIGURATION */}
            {scanMode === 'MULTI_VLAN' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {vlanList.map((vlan) => (
                    <div
                      key={vlan.id}
                      onClick={() => handleToggleVlan(vlan.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        vlan.enabled
                          ? 'bg-indigo-50/50 border-indigo-300 shadow-xs'
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 opacity-70'
                      }`}
                    >
                      <div className="pt-0.5">
                        {vlan.enabled ? (
                          <div className="w-4 h-4 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-md border-2 border-slate-300 bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-slate-900 truncate">{vlan.name}</span>
                          {!vlan.isDefault && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVlan(vlan.id);
                              }}
                              className="text-slate-400 hover:text-red-600 p-0.5 transition-colors"
                              title="Xóa VLAN"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          <span className="font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                            {vlan.subnet}
                          </span>
                          <span className="font-mono text-slate-500">
                            {vlan.ipStart.split('.')[3]} → {vlan.ipEnd.split('.')[3]}
                          </span>
                        </div>
                        {vlan.description && (
                          <p className="text-[10.5px] text-slate-500 mt-1 truncate">{vlan.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Đã chọn <strong className="text-indigo-700">{vlanList.filter((v) => v.enabled).length}</strong> VLAN để quét đồng thời.
                  </div>
                  <button
                    type="button"
                    onClick={handleStartScan}
                    disabled={scanning || vlanList.filter((v) => v.enabled).length === 0}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang Quét {vlanList.filter((v) => v.enabled).length} VLAN...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Bắt Đầu Quét {vlanList.filter((v) => v.enabled).length} VLAN Đã Chọn</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* MODE 2: SINGLE SUBNET CONFIGURATION */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap flex-1">
                  <div className="w-48">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Dải Mạng (Subnet):</label>
                    <input
                      type="text"
                      value={subnetInput}
                      onChange={(e) => setSubnetInput(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                      placeholder="192.168.1.0/24"
                    />
                  </div>

                  <div className="w-36">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">IP Bắt Đầu:</label>
                    <input
                      type="text"
                      value={ipStart}
                      onChange={(e) => setIpStart(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="w-36">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">IP Kết Thúc:</label>
                    <input
                      type="text"
                      value={ipEnd}
                      onChange={(e) => setIpEnd(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleStartScan}
                      disabled={scanning}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang Quét Dải IP...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Bắt Đầu Quét Mạng</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Table Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Toolbar: Title, Filters & Excel Export */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Radio className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Danh Sách Thiết Bị Khám Phá ({filteredDevices.length})
                </h3>
                {selectedVlanFilter !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    VLAN: {selectedVlanFilter}
                  </span>
                )}
              </div>

              {/* Filters & Export Excel */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* VLAN Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">VLAN:</span>
                  <select
                    value={selectedVlanFilter}
                    onChange={(e) => setSelectedVlanFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="ALL">🌐 Tất Cả VLAN</option>
                    {Array.from(new Set(devices.map((d) => d.vlanName).filter(Boolean))).map((vName, idx) => (
                      <option key={idx} value={vName}>
                        {vName}
                      </option>
                    ))}
                    {/* Fallback to vlanList if no scanned devices yet */}
                    {devices.length === 0 &&
                      vlanList.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Device Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="MATCHED">🟢 Đã quản lý trong hệ thống</option>
                  <option value="NEW">🟡 Chỉ thiết bị mới (Chưa có trong kho)</option>
                  <option value="LAPTOP">💻 Máy tính / Laptop</option>
                  <option value="PRINTER">🖨️ Máy in</option>
                  <option value="CAMERA">📷 Camera</option>
                  <option value="SERVER">🖥️ Máy chủ</option>
                  <option value="SWITCH">🔌 Switch / Router</option>
                </select>

                {/* Export Excel Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isExportingExcel || filteredDevices.length === 0}
                    onClick={() => handleExportExcel('CURRENT_FILTER')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Xuất Excel theo bộ lọc / VLAN đang chọn"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{selectedVlanFilter !== 'ALL' ? 'Xuất VLAN Đang Chọn' : 'Xuất Excel Danh Sách'}</span>
                  </button>

                  {devices.length > 0 && selectedVlanFilter !== 'ALL' && (
                    <button
                      type="button"
                      disabled={isExportingExcel || devices.length === 0}
                      onClick={() => handleExportExcel('ALL_VLANS')}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Xuất toàn bộ thiết bị thuộc tất cả các VLAN"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Xuất Tất Cả</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Search Bar */}
            <div className="p-3 bg-slate-50/50 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm kết quả quét theo IP, Hostname, MAC, Hãng, Mã tài sản hoặc Khoa phòng quản lý..."
                  value={searchDevice}
                  onChange={(e) => setSearchDevice(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none text-slate-800 placeholder:text-slate-400 focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-3 w-12 text-center text-slate-500 font-bold">STT</th>
                    <th className="p-3">Địa Chỉ IP & Hostname</th>
                    <th className="p-3">VLAN / Dải Mạng</th>
                    <th className="p-3">Hãng (OUI) & Model</th>
                    <th className="p-3">Địa Chỉ MAC</th>
                    <th className="p-3">Loại Thiết Bị</th>
                    <th className="p-3">Cổng Mở</th>
                    <th className="p-3">Trạng Thái & Khoa Phòng</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        <Wifi className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-xs text-slate-600">Chưa có kết quả quét nào</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Tích chọn các VLAN mong muốn ở trên và bấm <strong>"Bắt Đầu Quét Mạng"</strong> để tự động dò tìm máy tính, máy in, camera trong mạng nội bộ.
                        </p>
                      </td>
                    </tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400 text-xs">
                        Không tìm thấy thiết bị phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedDevices.map((dev, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-indigo-50/40 transition-colors ${
                          dev.matchedAsset ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (dev.matchedAsset) {
                            setQuickViewDevice(dev);
                          }
                        }}
                      >
                        <td className="p-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-indigo-600 block hover:underline">
                                {dev.ipAddress}
                              </span>
                              <span className="font-semibold text-slate-800 text-[11px] block">{dev.hostname}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-indigo-700 text-[10.5px] font-bold block truncate max-w-[150px]">
                            {dev.vlanName || 'VLAN Mặc Định'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {dev.subnet || 'N/A'}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-900">{dev.vendor}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {dev.model || dev.os || 'Chưa rõ Model'}
                          </div>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-slate-600">{dev.macAddress}</td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-bold">
                            {dev.deviceType}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap max-w-[130px]">
                            {dev.openPorts.map((p) => (
                              <span key={p} className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9.5px] font-mono">
                                :{p}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-3">
                          {dev.matchedAsset ? (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>[{dev.matchedAsset.assetTag}] Đã Quản Lý</span>
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                                <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="font-bold text-slate-800 truncate max-w-[160px]" title={dev.matchedAsset.department}>
                                  {dev.matchedAsset.department || 'Chưa gán khoa phòng'}
                                </span>
                              </div>
                              {dev.matchedAsset.assignedTo && dev.matchedAsset.assignedTo !== 'Chưa cấp phát' && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                  👤 {dev.matchedAsset.assignedTo}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Thiết Bị Mới</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {dev.matchedAsset ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQuickViewDevice(dev)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Xem nhanh thông tin thiết bị và khoa phòng quản lý ngay tại đây"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem Nhanh</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAddToAsset(dev)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>+ Thêm Với AI</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <TablePaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={filteredDevices.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              storageKey="simply_it_discovery_page_size"
              itemName={isEn ? 'devices' : 'thiết bị'}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TAMPER ALERTS & MASTER CHANGE AUDIT LOG */}
      {/* ======================================================== */}
      {activeTab === 'ALERTS' && (
        <TamperAlertsTab />
      )}

      {/* ======================================================== */}
      {/* TAB 3: IT HEALTH FLEET MONITOR */}
      {/* ======================================================== */}
      {activeTab === 'HEALTH' && (
        <HealthOverviewTab />
      )}

      {/* ======================================================== */}
      {/* TAB 3: AI SPEC ENRICHMENT TOOL */}
      {/* ======================================================== */}
      {activeTab === 'AI_ENRICH' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                AI Tra Cứu Thông Số Phần Cứng Theo Model
              </h2>
              <p className="text-xs text-slate-500">
                Nhập tên model máy tính, máy chủ, switch hoặc máy in — AI sẽ tự động điền đầy đủ cấu hình kỹ thuật chuẩn hãng.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Model Thiết Bị (*):</label>
              <input
                type="text"
                placeholder="VD: Dell Latitude 5540, MacBook Pro 14 M3, Cisco Catalyst 9200L, ThinkPad T14..."
                value={aiModelInput}
                onChange={(e) => setAiModelInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thương Hiệu (Tùy chọn):</label>
              <input
                type="text"
                placeholder="VD: Dell, Apple, Cisco, Lenovo..."
                value={aiBrandInput}
                onChange={(e) => setAiBrandInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-medium">Mẫu gợi ý:</span>
              {['Dell Latitude 5540', 'MacBook Pro 14 M3', 'Cisco Catalyst 9200L', 'Canon LBP226dw'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAiModelInput(m);
                    handleRunAiEnrich(m);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold transition-colors"
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleRunAiEnrich()}
              disabled={aiLoading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Đang Tra Cứu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tra Cứu Thông Số</span>
                </>
              )}
            </button>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-xs">
                    {aiResult.brand || 'Hardware'}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900">{aiResult.model}</h3>
                </div>
                <span className="text-[11px] text-purple-700 font-bold bg-white px-2 py-0.5 rounded-md border border-purple-200">
                  {aiResult.categoryName || 'Tài sản'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {aiResult.cpu && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Bộ Xử Lý (CPU)</span>
                    <span className="font-bold text-slate-800">{aiResult.cpu}</span>
                  </div>
                )}
                {aiResult.ram && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Bộ Nhớ RAM</span>
                    <span className="font-bold text-slate-800">{aiResult.ram}</span>
                  </div>
                )}
                {aiResult.storage && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Dung Lượng Ổ Cứng</span>
                    <span className="font-bold text-slate-800">{aiResult.storage}</span>
                  </div>
                )}
                {aiResult.screen && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Màn Hình</span>
                    <span className="font-bold text-slate-800">{aiResult.screen}</span>
                  </div>
                )}
                {aiResult.powerWatts && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Công Suất Tiêu Thụ</span>
                    <span className="font-bold text-amber-600">{aiResult.powerWatts} Watts</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddingDevice({
                      ipAddress: '',
                      macAddress: '',
                      hostname: aiResult.model,
                      vendor: aiResult.brand,
                      model: aiResult.model,
                      openPorts: [],
                      deviceType: aiResult.categoryName || 'Laptop',
                      responseTimeMs: 0,
                      status: 'AVAILABLE',
                      lastSeen: new Date().toISOString(),
                    });
                    setAddAssetForm({
                      name: `${aiResult.brand} ${aiResult.model}`,
                      brand: aiResult.brand,
                      model: aiResult.model,
                      serialNumber: `SN-${Math.floor(10000000 + Math.random() * 90000000)}`,
                      deviceType: aiResult.categoryName || 'Laptop',
                      ipAddress: '',
                      macAddress: '',
                      cpu: aiResult.cpu || '',
                      ram: aiResult.ram || '',
                      storage: aiResult.storage || '',
                    });
                    setIsAddAssetModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Tài Sản Mới Với Cấu Hình Này</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SCRIPT & DEPLOYMENT GUIDE */}
      {/* ======================================================== */}
      {activeTab === 'GUIDE' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Hướng Dẫn Triển Khai Agent Thu Thập Tự Động
              </h2>
              <p className="text-xs text-slate-500">
                Script PowerShell siêu nhẹ thu thập Serial bo mạch chủ, CPU, RAM, Ổ cứng và toàn bộ danh sách phần mềm đã cài đặt.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-xs">Cách 1: Chạy trực tiếp 1 dòng lệnh PowerShell trên máy tính người dùng</h3>
            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl flex items-center justify-between gap-2 overflow-x-auto">
              <code>
                powershell -ExecutionPolicy Bypass -Command &quot;iex (irm &apos;{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}/api/scripts/agent&apos;)&quot;
              </code>
              <button
                type="button"
                onClick={copyPowerShellCmd}
                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs shrink-0 hover:bg-emerald-500 cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs">Cách 2: Triển khai tự động hàng loạt qua Active Directory Group Policy (GPO)</h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Tải file script <a href={`/api/scripts/agent?serverUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')}`} className="text-indigo-600 font-bold underline" download="get_system_info.ps1">get_system_info.ps1</a> (hoặc <a href="/scripts/simply-it-collector.ps1" className="text-indigo-600 font-bold underline" download="simply-it-collector.ps1">simply-it-collector.ps1</a>) về máy chủ Domain Controller hoặc máy trạm.</li>
              <li>Mở <strong>Group Policy Management Console (gpmc.msc)</strong>.</li>
              <li>Tạo một GPO mới gán vào OU chứa các máy tính người dùng: <code>Computer Configuration &gt; Policies &gt; Windows Settings &gt; Scripts (Startup/Shutdown)</code>.</li>
              <li>Chạy trực tiếp file script hoặc cấu hình qua GPO khởi động máy tính với tham số <code>-ServerUrl &quot;{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}&quot;</code>.</li>
              <li>Mỗi khi người dùng bật máy tính, thông số phần cứng và danh sách phần mềm sẽ tự động cập nhật về hệ thống QLTBIT.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD DISCOVERED DEVICE TO ASSETS ==================== */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Thêm Thiết Bị Vào Kho Tài Sản</h3>
                  <span className="text-[11px] text-slate-500">
                    AI đã tự động trích xuất thông số kỹ thuật từ Model và địa chỉ mạng
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAssetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDiscoveredAsset} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Thiết Bị (*):</label>
                <input
                  type="text"
                  required
                  value={addAssetForm.name}
                  onChange={(e) => setAddAssetForm({ ...addAssetForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thương Hiệu:</label>
                  <input
                    type="text"
                    value={addAssetForm.brand}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model:</label>
                  <input
                    type="text"
                    value={addAssetForm.model}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, model: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Serial Number (*):</label>
                  <input
                    type="text"
                    required
                    value={addAssetForm.serialNumber}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, serialNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại Thiết Bị:</label>
                  <select
                    value={addAssetForm.deviceType}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, deviceType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Máy tính">Máy tính để bàn (PC)</option>
                    <option value="Server">Máy chủ (Server)</option>
                    <option value="Switch">Switch / Thiết bị mạng</option>
                    <option value="Máy in">Máy in</option>
                    <option value="Camera">Camera</option>
                    <option value="Thiết bị khác">Khác</option>
                  </select>
                </div>
              </div>

              {/* Specs by AI */}
              <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-indigo-700 text-[11px] block uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Thông Số Kỹ Thuật (Điền Tự Động Bởi AI)</span>
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">CPU:</label>
                  <input
                    type="text"
                    value={addAssetForm.cpu}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, cpu: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">RAM:</label>
                    <input
                      type="text"
                      value={addAssetForm.ram}
                      onChange={(e) => setAddAssetForm({ ...addAssetForm, ram: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Ổ Cứng (Storage):</label>
                    <input
                      type="text"
                      value={addAssetForm.storage}
                      onChange={(e) => setAddAssetForm({ ...addAssetForm, storage: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-500 pt-1">
                  <div>IP: <strong className="font-mono">{addAssetForm.ipAddress || 'None'}</strong></div>
                  <div>MAC: <strong className="font-mono">{addAssetForm.macAddress || 'None'}</strong></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Xác Nhận Lưu Vào Kho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD CUSTOM VLAN ==================== */}
      {isVlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Thêm Dải VLAN Quét Mới</h3>
                  <span className="text-[11px] text-slate-500">Cấu hình dải mạng / VLAN cần quét dò tìm</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVlan} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên VLAN (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: VLAN 40 - Phòng Kế Toán, VLAN 100 - Kho Dược..."
                  value={newVlanForm.name}
                  onChange={(e) => setNewVlanForm({ ...newVlanForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dải Mạng (Subnet CIDR) (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 192.168.40.0/24"
                  value={newVlanForm.subnet}
                  onChange={(e) => {
                    const sub = e.target.value;
                    const p = sub.split('/')[0].split('.');
                    if (p.length >= 3) {
                      setNewVlanForm({
                        ...newVlanForm,
                        subnet: sub,
                        ipStart: `${p[0]}.${p[1]}.${p[2]}.1`,
                        ipEnd: `${p[0]}.${p[1]}.${p[2]}.254`,
                      });
                    } else {
                      setNewVlanForm({ ...newVlanForm, subnet: sub });
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IP Bắt Đầu:</label>
                  <input
                    type="text"
                    required
                    value={newVlanForm.ipStart}
                    onChange={(e) => setNewVlanForm({ ...newVlanForm, ipStart: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IP Kết Thúc:</label>
                  <input
                    type="text"
                    required
                    value={newVlanForm.ipEnd}
                    onChange={(e) => setNewVlanForm({ ...newVlanForm, ipEnd: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô Tả / Ghi Chú:</label>
                <input
                  type="text"
                  placeholder="VD: Khu vực văn phòng lầu 3, Switch Cisco cổng G0/2..."
                  value={newVlanForm.description}
                  onChange={(e) => setNewVlanForm({ ...newVlanForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lưu VLAN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: INSTANT ASSET QUICK VIEW & DEPARTMENT ==================== */}
      {quickViewDevice && quickViewDevice.matchedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-blue-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-500 text-white shadow-xs">
                      {quickViewDevice.matchedAsset.assetTag}
                    </span>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {quickViewDevice.matchedAsset.categoryName || 'Thiết bị IT'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1">
                    {quickViewDevice.matchedAsset.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickViewDevice(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* NỔI BẬT: KHOA / PHÒNG QUẢN LÝ */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 border-2 border-indigo-200/80 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Đơn Vị & Khoa Phòng Quản Lý</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                    ✓ Đang Quản Lý
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Khoa / Phòng trực thuộc:</span>
                    <span className="text-sm font-black text-indigo-900 block mt-0.5">
                      {quickViewDevice.matchedAsset.department || 'Chưa gán khoa phòng'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Người phụ trách / Đang sử dụng:</span>
                    <span className="text-sm font-bold text-slate-800 block mt-0.5 flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                      {quickViewDevice.matchedAsset.assignedTo || 'Chưa cấp phát'}
                    </span>
                    {quickViewDevice.matchedAsset.assignedUserPhone && (
                      <span className="text-[11px] text-slate-500 block">
                        SĐT: {quickViewDevice.matchedAsset.assignedUserPhone}
                      </span>
                    )}
                  </div>

                  <div className="sm:col-span-2 pt-1 border-t border-indigo-100/60 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Vị trí: <strong>{quickViewDevice.matchedAsset.locationName || 'Chưa thiết lập'}</strong></span>
                    </div>
                    {quickViewDevice.matchedAsset.assignedAt && (
                      <span className="text-[11px] text-slate-400">
                        Bàn giao: {new Date(quickViewDevice.matchedAsset.assignedAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* THÔNG SỐ CƠ BẢN CỦA THIẾT BỊ */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thông Số Cơ Bản Tài Sản</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-400 block">Hãng sản xuất:</span>
                    <span className="font-bold text-slate-800">{quickViewDevice.matchedAsset.brand || quickViewDevice.vendor}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-400 block">Model:</span>
                    <span className="font-bold text-slate-800">{quickViewDevice.matchedAsset.model || quickViewDevice.model || 'Chưa rõ'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-400 block">Số Serial:</span>
                    <span className="font-mono font-bold text-indigo-600">{quickViewDevice.matchedAsset.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-400 block">Trạng thái kho:</span>
                    <span className="font-bold text-emerald-600">{quickViewDevice.matchedAsset.status}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-400 block">Tình trạng vật lý:</span>
                    <span className="font-bold text-slate-700">{quickViewDevice.matchedAsset.condition || 'Bình thường'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10.5px] text-slate-400 block">Phân loại:</span>
                    <span className="font-bold text-slate-700">{quickViewDevice.deviceType}</span>
                  </div>
                </div>
              </div>

              {/* THÔNG TIN PHÁT HIỆN MẠNG THỰC TẾ */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Thông Tin Mạng Thực Tế (Scan Discovery)</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>VLAN: <strong className="text-indigo-700">{quickViewDevice.vlanName || 'VLAN Mặc Định'}</strong></div>
                  <div>Subnet: <strong className="font-mono text-slate-700">{quickViewDevice.subnet || 'N/A'}</strong></div>
                  <div>Địa chỉ IP: <strong className="font-mono text-indigo-600">{quickViewDevice.ipAddress}</strong></div>
                  <div>Địa chỉ MAC: <strong className="font-mono text-slate-700">{quickViewDevice.macAddress}</strong></div>
                  <div className="col-span-2">Cổng mở phát hiện: <span className="font-mono text-slate-600">{quickViewDevice.openPorts.map(p => ':' + p).join(' ') || 'Không có cổng mở phổ biến'}</span></div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const assetId = quickViewDevice.matchedAsset?.id;
                  setQuickViewDevice(null);
                  if (assetId) openQuickView('asset', assetId);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Toàn Bộ Hồ Sơ Chi Tiết (Drawer)</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickViewDevice(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

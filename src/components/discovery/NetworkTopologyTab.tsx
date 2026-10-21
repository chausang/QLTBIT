'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Network,
  Server,
  Laptop,
  Printer,
  Camera,
  Wifi,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Download,
  Terminal,
  Activity,
  ChevronRight,
  Zap,
  Eye,
  X,
  Loader2,
  Building2,
  MapPin,
  Tag,
  SlidersHorizontal,
  Settings2,
  Trash2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Cpu,
  Radio,
  Share2,
  Sliders,
  Check,
  FileSpreadsheet,
  Globe,
  Sliders as SlidersIcon,
  Cable,
} from 'lucide-react';
import { useQuickViewStore } from '@/lib/quick-view-store';
import { TablePaginationBar } from '@/components/common/TablePaginationBar';
import ExcelJS from 'exceljs';

export interface ManagedSwitch {
  id: string;
  name: string;
  ip: string;
  model: string;
  vendor: string;
  location: string;
  building: string;
  tier: 'CORE' | 'DISTRIBUTION' | 'ACCESS';
  totalPorts: number;
  activePorts: number;
  mac: string;
  firmware: string;
  uptime: string;
  sshPort: number;
  snmpCommunity: string;
  status: 'ONLINE' | 'POLLING' | 'OFFLINE';
  vlans: number[];
  cpuUsage: number;
  memUsage: number;
  tempCelsius: number;
}

export interface ManagedVlan {
  vlanId: number;
  name: string;
  subnet: string;
  gateway: string;
  description: string;
  color: string;
  deviceCount: number;
  enabled: boolean;
}

export interface TopologyNode {
  id: string;
  label: string;
  subLabel?: string;
  type: 'GATEWAY' | 'CORE_SWITCH' | 'DIST_SWITCH' | 'ACCESS_SWITCH' | 'SERVER' | 'WORKSTATION' | 'MEDICAL' | 'PRINTER' | 'CAMERA' | 'WIFI_AP';
  ip: string;
  mac: string;
  vlanId: number;
  vlanName: string;
  location: string;
  building: string;
  status: 'ONLINE' | 'WARNING' | 'OFFLINE';
  switchId?: string;
  switchPort?: string;
  portSpeed?: string;
  duplex?: string;
  poeWatts?: number;
  matchedAssetId?: string;
  matchedAssetTag?: string;
  matchedAssetName?: string;
  matchedDepartment?: string;
  matchedAssignedTo?: string;
  x?: number;
  y?: number;
  specs?: any;
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
  linkType: 'FIBER_TRUNK_40G' | 'FIBER_TRUNK_10G' | 'COPPER_TRUNK_1G' | 'ACCESS_1G' | 'ACCESS_100M';
  status: 'UP' | 'DEGRADED' | 'DOWN';
  speed: string;
  vlanTag?: string;
}

export function NetworkTopologyTab() {
  const { openQuickView } = useQuickViewStore();

  // Sub-tabs
  const [subTab, setSubTab] = useState<'TOPOLOGY' | 'CONTROLLER' | 'RECONCILIATION' | 'TRACER'>('TOPOLOGY');

  // Loading & Data State
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [switches, setSwitches] = useState<ManagedSwitch[]>([]);
  const [vlans, setVlans] = useState<ManagedVlan[]>([]);
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [links, setLinks] = useState<TopologyLink[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Topology Canvas State
  const [viewMode, setViewMode] = useState<'PHYSICAL' | 'LOGICAL'>('PHYSICAL');
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterVlan, setFilterVlan] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPortLabels, setShowPortLabels] = useState<boolean>(true);
  const [showFlowAnimation, setShowFlowAnimation] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dragging Node State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected Node / Switch Inspector
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [selectedSwitchDetails, setSelectedSwitchDetails] = useState<ManagedSwitch | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Scan Controller State
  const [isScanning, setIsScanning] = useState(false);
  const [scanScope, setScanScope] = useState<'ALL' | 'SWITCH'>('ALL');
  const [selectedScanSwitch, setSelectedScanSwitch] = useState<string>('');
  const [scanTerminalLogs, setScanTerminalLogs] = useState<string[]>([]);

  // Switch Add / Edit Modal
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [switchForm, setSwitchForm] = useState({
    id: '',
    name: '',
    ip: '',
    model: '',
    vendor: 'Cisco Systems',
    location: '',
    building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
    tier: 'ACCESS' as 'CORE' | 'DISTRIBUTION' | 'ACCESS',
    totalPorts: 24,
    activePorts: 12,
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
  });

  // Reconciliation State
  const [reconFilter, setReconFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED' | 'ROGUE'>('ALL');
  const [reconSearch, setReconSearch] = useState('');
  const [reconPage, setReconPage] = useState(1);
  const [reconPageSize, setReconPageSize] = useState(15);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Add Asset Quick Modal
  const [quickAddDevice, setQuickAddDevice] = useState<TopologyNode | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({
    name: '',
    brand: '',
    model: '',
    deviceType: 'Laptop',
    department: '',
  });

  // Tracer State
  const [traceSearch, setTraceSearch] = useState('');
  const [selectedTraceNode, setSelectedTraceNode] = useState<TopologyNode | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [traceSteps, setTraceSteps] = useState<any[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Load Topology Data
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/discovery/topology');
      const json = await res.json();
      if (json.success && json.data) {
        setSwitches(json.data.switches || []);
        setVlans(json.data.vlans || []);
        setNodes(json.data.nodes || []);
        setLinks(json.data.links || []);
        setSummary(json.data.summary || null);

        // Pre-select first workstation for trace
        if (!selectedTraceNode && json.data.nodes.length > 0) {
          const firstWorkstation = json.data.nodes.find((n: TopologyNode) => n.type === 'WORKSTATION');
          if (firstWorkstation) {
            handleSelectTraceNode(firstWorkstation, json.data.nodes, json.data.switches);
          }
        }
      } else {
        showToast(json.error || 'Lỗi tải dữ liệu sơ đồ mạng');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Nodes for Topology Canvas
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (filterBuilding !== 'ALL' && n.building !== filterBuilding) return false;
      if (filterVlan !== 'ALL' && String(n.vlanId) !== filterVlan) return false;
      if (filterType !== 'ALL') {
        if (filterType === 'SWITCH' && !n.type.includes('SWITCH')) return false;
        if (filterType === 'SERVER' && n.type !== 'SERVER') return false;
        if (filterType === 'WORKSTATION' && n.type !== 'WORKSTATION') return false;
        if (filterType === 'MEDICAL' && n.type !== 'MEDICAL') return false;
        if (filterType === 'PRINTER' && n.type !== 'PRINTER') return false;
        if (filterType === 'ROGUE' && n.status !== 'WARNING' && n.type !== 'WIFI_AP') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          n.label.toLowerCase().includes(q) ||
          n.ip.includes(q) ||
          n.mac.toLowerCase().includes(q) ||
          (n.matchedAssetTag || '').toLowerCase().includes(q) ||
          (n.matchedDepartment || '').toLowerCase().includes(q) ||
          (n.matchedAssignedTo || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [nodes, filterBuilding, filterType, filterVlan, searchQuery]);

  // Filtered Links matching visible nodes
  const filteredLinks = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return links.filter((l) => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target));
  }, [links, filteredNodes]);

  // Handle Dragging Node
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setDragOffset({
        x: (e.clientX - panOffset.x) / zoomLevel - (node.x || 0),
        y: (e.clientY - panOffset.y) / zoomLevel - (node.y || 0),
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = (e.clientX - panOffset.x) / zoomLevel - dragOffset.x;
      const newY = (e.clientY - panOffset.y) / zoomLevel - dragOffset.y;
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.round(newX), y: Math.round(newY) } : n))
      );
    } else if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Pan Canvas
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
    }
  };

  // Zoom Controls
  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(2.5, Math.max(0.4, Number((prev + delta).toFixed(2)))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Node Inspector click
  const handleNodeClick = (node: TopologyNode) => {
    setSelectedNode(node);
    if (node.type.includes('SWITCH')) {
      const sw = switches.find((s) => s.id === node.id || s.name === node.label);
      setSelectedSwitchDetails(sw || null);
    } else {
      setSelectedSwitchDetails(null);
    }
    setIsInspectorOpen(true);
  };

  // Run Suzieq Scan
  const handleRunScan = async () => {
    setIsScanning(true);
    setScanTerminalLogs([
      `[${new Date().toLocaleTimeString('vi-VN')}] [Suzieq] Khởi tạo phiên quét an toàn hệ thống mạng Bệnh Viện...`,
      `[${new Date().toLocaleTimeString('vi-VN')}] [Suzieq] Đang kiểm tra danh sách Switch Core & Distribution qua SSH Read-Only...`,
    ]);

    try {
      const res = await fetch('/api/discovery/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SCAN',
          scope: scanScope,
          switchId: selectedScanSwitch,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setScanTerminalLogs(json.data.logs || []);
        showToast('✨ Quét hạ tầng mạng thành công!');
        await loadData();
      } else {
        showToast(json.error || 'Lỗi quét mạng');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ quét mạng');
    } finally {
      setIsScanning(false);
    }
  };

  // Single Asset Sync
  const handleSyncAsset = async (node: TopologyNode) => {
    if (!node.matchedAssetId) {
      showToast('⚠️ Thiết bị này chưa được liên kết với hồ sơ tài sản QLTBIT');
      return;
    }
    try {
      const parentSwitch = switches.find((s) => s.id === node.switchId);
      const res = await fetch('/api/discovery/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_ASSET',
          assetId: node.matchedAssetId,
          switchName: parentSwitch?.name || node.switchId,
          switchPort: node.switchPort,
          vlanId: node.vlanId,
          ipAddress: node.ip,
          macAddress: node.mac,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        loadData();
      } else {
        showToast(json.error || 'Lỗi đồng bộ tài sản');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ');
    }
  };

  // Bulk Sync All Matched Assets
  const handleBulkSyncAll = async () => {
    const matchedNodes = nodes.filter((n) => n.matchedAssetId);
    if (matchedNodes.length === 0) {
      showToast('⚠️ Không có thiết bị nào khớp hồ sơ để đồng bộ');
      return;
    }

    if (!confirm(`Bạn có chắc muốn tự động đồng bộ vị trí cổng switch & VLAN cho ${matchedNodes.length} tài sản QLTBIT?`)) {
      return;
    }

    setIsBulkSyncing(true);
    try {
      const payload = matchedNodes.map((n) => {
        const sw = switches.find((s) => s.id === n.switchId);
        return {
          assetId: n.matchedAssetId,
          switchName: sw?.name || n.switchId,
          switchPort: n.switchPort,
          vlanId: n.vlanId,
          ipAddress: n.ip,
          macAddress: n.mac,
        };
      });

      const res = await fetch('/api/discovery/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_ALL',
          items: payload,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        loadData();
      } else {
        showToast(json.error || 'Lỗi đồng bộ hàng loạt');
      }
    } catch (err) {
      showToast('Lỗi máy chủ khi đồng bộ');
    } finally {
      setIsBulkSyncing(false);
    }
  };

  // Quick Add Device to Asset
  const handleOpenQuickAdd = (node: TopologyNode) => {
    setQuickAddDevice(node);
    setQuickAddForm({
      name: node.label.replace(/^⚠️\s*/, ''),
      brand: node.subLabel?.split(' ')[0] || 'Generic',
      model: node.subLabel || '',
      deviceType: node.type === 'MEDICAL' ? 'Thiết bị y tế' : node.type === 'PRINTER' ? 'Máy in' : 'Laptop',
      department: node.location || '',
    });
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddDevice) return;

    try {
      const sw = switches.find((s) => s.id === quickAddDevice.switchId);
      const res = await fetch('/api/discovery/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_ASSET',
          name: quickAddForm.name,
          brand: quickAddForm.brand,
          model: quickAddForm.model,
          deviceType: quickAddForm.deviceType,
          ipAddress: quickAddDevice.ip,
          macAddress: quickAddDevice.mac,
          switchName: sw?.name || quickAddDevice.switchId,
          switchPort: quickAddDevice.switchPort,
          vlanId: quickAddDevice.vlanId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        setQuickAddDevice(null);
        loadData();
      } else {
        showToast(json.error || 'Lỗi thêm tài sản');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ');
    }
  };

  // Trace Path Computation
  const handleSelectTraceNode = (node: TopologyNode, nodeList = nodes, switchList = switches) => {
    setSelectedTraceNode(node);
    setIsTracing(true);

    const steps: any[] = [];
    // Hop 0: Device itself
    steps.push({
      hopNumber: 0,
      title: node.label,
      subTitle: `IP: ${node.ip} | MAC: ${node.mac}`,
      type: node.type,
      portInfo: 'Cổng LAN mạng máy trạm',
      cableType: 'Cáp mạng Cat6 RJ-45 (1 Gbps Full-Duplex)',
      latency: '0.2 ms',
      vlan: `VLAN ${node.vlanId} - ${node.vlanName}`,
    });

    // Hop 1: Connected Access Switch
    const accessSw = switchList.find((s) => s.id === node.switchId);
    if (accessSw) {
      steps.push({
        hopNumber: 1,
        title: accessSw.name,
        subTitle: `${accessSw.model} (${accessSw.ip})`,
        type: 'ACCESS_SWITCH',
        portInfo: `Cổng vào: ${node.switchPort || 'Gi1/0/1'} ──> Uplink: Gi1/0/49 (SFP+)`,
        cableType: 'Cáp quang Multimode OM4 10G SFP+ (Trunk)',
        latency: '0.4 ms',
        vlan: `Trunk VLAN ${node.vlanId}`,
        location: accessSw.location,
      });

      // Hop 2: Distribution Switch
      const distSw = switchList.find((s) => s.tier === 'DISTRIBUTION' && s.building === accessSw.building) ||
        switchList.find((s) => s.id === 'sw-dist-toanha-a');

      if (distSw) {
        steps.push({
          hopNumber: 2,
          title: distSw.name,
          subTitle: `${distSw.model} (${distSw.ip})`,
          type: 'DIST_SWITCH',
          portInfo: 'Cổng vào: Te1/0/1 ──> Core Uplink: Te1/0/24',
          cableType: 'Trục cáp quang chính Backbone 10G/40G',
          latency: '0.6 ms',
          vlan: 'Trunk Toàn Viện',
          location: distSw.location,
        });
      }
    }

    // Hop 3: Core Switch
    const coreSw = switchList.find((s) => s.tier === 'CORE') || switchList[0];
    if (coreSw) {
      steps.push({
        hopNumber: 3,
        title: coreSw.name,
        subTitle: `${coreSw.model} (${coreSw.ip})`,
        type: 'CORE_SWITCH',
        portInfo: 'Lõi chuyển mạch trung tâm Data Center (Routing L3)',
        cableType: 'Cáp quang 40G QSFP+ Core Stack',
        latency: '0.8 ms',
        vlan: 'Layer 3 Routing Core',
        location: coreSw.location,
      });
    }

    // Hop 4: Target Destination (HIS Server Cluster / Gateway)
    steps.push({
      hopNumber: 4,
      title: 'Cụm Máy Chủ Y Tế HIS / PACS & Internet Gateway',
      subTitle: 'HIS Master Database (10.10.10.15) & Firewall FortiGate 100F',
      type: 'SERVER',
      portInfo: 'Cổng đích: TenGigabitEthernet1/1/1 (10G Direct Attached)',
      cableType: 'Direct Attach Copper (DAC 10G)',
      latency: '1.1 ms',
      vlan: 'VLAN 10 - Máy Chủ Dữ Liệu',
      location: 'Tủ Rack DC-02, Trung Tâm CNTT',
    });

    setTraceSteps(steps);
    setTimeout(() => setIsTracing(false), 300);
  };

  // Export Topology to PNG
  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = '#0F172A'; // dark slate
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const a = document.createElement('a');
      a.download = `So_Do_Mang_Benh_Vien_QLTBIT_${new Date().toISOString().slice(0, 10)}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      showToast('📸 Đã xuất sơ đồ mạng thành ảnh PNG thành công!');
    };
    img.src = url;
  };

  // Export Reconciliation to Excel
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QLTBIT IT Asset Management';
      const sheet = workbook.addWorksheet('Đối Soát Thiết Bị Mạng & Tài Sản');

      sheet.mergeCells('A1:J1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'BÁO CÁO ĐỐI SOÁT THIẾT BỊ KHÁM PHÁ MẠNG & HỒ SƠ TÀI SẢN CNTT';
      titleCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 32;

      sheet.mergeCells('A2:J2');
      const subCell = sheet.getCell('A2');
      subCell.value = `Ngày lập: ${new Date().toLocaleString('vi-VN')} | Tổng thiết bị quét: ${nodes.length} | Đã khớp hồ sơ: ${nodes.filter((n) => n.matchedAssetId).length}`;
      subCell.font = { name: 'Times New Roman', size: 10, italic: true };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;

      const headers = [
        'STT',
        'Tên Thiết Bị',
        'Địa Chỉ IP',
        'Địa Chỉ MAC',
        'VLAN / Phân Đoạn',
        'Switch Kết Nối',
        'Cổng Switch',
        'Mã Tài Sản QLTBIT',
        'Khoa / Phòng Quản Lý',
        'Trạng Thái Đối Soát',
      ];
      const headerRow = sheet.getRow(3);
      headerRow.values = headers;
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      nodes.forEach((n, idx) => {
        const sw = switches.find((s) => s.id === n.switchId);
        const row = sheet.addRow([
          idx + 1,
          n.label,
          n.ip,
          n.mac,
          `VLAN ${n.vlanId}`,
          sw?.name || n.switchId || 'Chưa rõ',
          n.switchPort || 'N/A',
          n.matchedAssetTag || 'Chưa đăng ký',
          n.matchedDepartment || n.location || 'Chưa gán',
          n.matchedAssetId ? 'ĐÃ KHỚP HỒ SƠ' : n.status === 'WARNING' ? 'CẢNH BÁO: THIẾT BỊ LẠ' : 'CHƯA ĐĂNG KÝ',
        ]);
        row.height = 22;
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'center' };
      });

      sheet.columns.forEach((col) => {
        col.width = 20;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_Cao_Doi_Soat_Mang_QLTBIT_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📥 Đã xuất file Excel đối soát thành công!');
    } catch (err) {
      showToast('Lỗi xuất file Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Node Icon Helper
  const renderNodeIcon = (type: string) => {
    switch (type) {
      case 'GATEWAY':
        return <Globe className="w-5 h-5 text-amber-400" />;
      case 'CORE_SWITCH':
        return <Network className="w-5 h-5 text-cyan-300" />;
      case 'DIST_SWITCH':
      case 'ACCESS_SWITCH':
        return <Network className="w-4 h-4 text-indigo-300" />;
      case 'SERVER':
        return <Server className="w-4 h-4 text-emerald-400" />;
      case 'WORKSTATION':
        return <Laptop className="w-4 h-4 text-blue-400" />;
      case 'MEDICAL':
        return <Activity className="w-4 h-4 text-emerald-300" />;
      case 'PRINTER':
        return <Printer className="w-4 h-4 text-orange-400" />;
      case 'CAMERA':
        return <Camera className="w-4 h-4 text-purple-400" />;
      case 'WIFI_AP':
        return <Wifi className="w-4 h-4 text-rose-400" />;
      default:
        return <Laptop className="w-4 h-4 text-slate-300" />;
    }
  };

  // Filtered Reconciliation List
  const filteredReconNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (n.type === 'GATEWAY' || n.type.includes('SWITCH')) return false;
      if (reconFilter === 'MATCHED' && !n.matchedAssetId) return false;
      if (reconFilter === 'UNMATCHED' && n.matchedAssetId) return false;
      if (reconFilter === 'ROGUE' && n.status !== 'WARNING' && n.type !== 'WIFI_AP') return false;

      if (reconSearch.trim()) {
        const q = reconSearch.toLowerCase();
        return (
          n.label.toLowerCase().includes(q) ||
          n.ip.includes(q) ||
          n.mac.toLowerCase().includes(q) ||
          (n.matchedAssetTag || '').toLowerCase().includes(q) ||
          (n.matchedDepartment || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [nodes, reconFilter, reconSearch]);

  const reconTotalPages = Math.ceil(filteredReconNodes.length / reconPageSize) || 1;
  const paginatedReconNodes = useMemo(() => {
    const start = (reconPage - 1) * reconPageSize;
    return filteredReconNodes.slice(start, start + reconPageSize);
  }, [filteredReconNodes, reconPage, reconPageSize]);

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Banner / Metrics Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-inner">
              <Network className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Quét & Sơ Đồ Mạng Tô-Pô Bệnh Viện
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10.5px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Suzieq Passive Poller (100% Medical Safe)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10.5px] font-mono font-bold">
                  v1.2 Dual-Port
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Thu thập quan hệ liên kết Switch, ánh xạ cổng MAC/ARP, vẽ sơ đồ L2/L3 & đối soát hồ sơ tài sản QLTBIT tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRunScan}
              disabled={isScanning}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Đang Quét Hạ Tầng...' : 'Quét Mạng Ngay (Suzieq)'}</span>
            </button>

            <button
              type="button"
              onClick={handleBulkSyncAll}
              disabled={isBulkSyncing}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Đồng Bộ Cổng Vào Tài Sản</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Switch Quản Lý:</span>
            <div className="text-base font-black text-white mt-0.5 flex items-baseline gap-1">
              {switches.length}
              <span className="text-[10px] text-emerald-400 font-bold">100% Online</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">VLAN Đang Chạy:</span>
            <div className="text-base font-black text-white mt-0.5 flex items-baseline gap-1">
              {vlans.length}
              <span className="text-[10px] text-indigo-400 font-bold">Phân Đoạn</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Thiết Bị Đang Cắm:</span>
            <div className="text-base font-black text-white mt-0.5 flex items-baseline gap-1">
              {nodes.filter((n) => !n.type.includes('SWITCH') && n.type !== 'GATEWAY').length}
              <span className="text-[10px] text-blue-400 font-bold">Endpoints</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Khớp Hồ Sơ QLTBIT:</span>
            <div className="text-base font-black text-emerald-400 mt-0.5 flex items-baseline gap-1">
              {nodes.filter((n) => n.matchedAssetId).length}
              <span className="text-[10px] text-emerald-300 font-bold">Đã Quản Lý</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Cảnh Báo Thiết Bị Lạ:</span>
            <div className="text-base font-black text-rose-400 mt-0.5 flex items-baseline gap-1">
              {nodes.filter((n) => n.status === 'WARNING' || n.type === 'WIFI_AP').length}
              <span className="text-[10px] text-rose-300 font-bold">Cần Đối Soát</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Cơ Chế Quét:</span>
            <div className="text-xs font-bold text-indigo-300 mt-0.5 truncate" title="SSH Read-Only & ARP/LLDP">
              SSH & LLDP Thụ Động
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-2 rounded-2xl shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <button
            type="button"
            onClick={() => setSubTab('TOPOLOGY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'TOPOLOGY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>1. Sơ Đồ Tô-Pô Tương Tác</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('CONTROLLER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'CONTROLLER'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. Bảng Điều Khiển Quét & Switch</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('RECONCILIATION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'RECONCILIATION'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Đối Soát & Đồng Bộ Tài Sản</span>
            {nodes.filter((n) => n.status === 'WARNING').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {nodes.filter((n) => n.status === 'WARNING').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('TRACER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'TRACER'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>4. Truy Vết Cổng & Đường Đi (Path Trace)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
            title="Tải lại dữ liệu mạng"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: INTERACTIVE TOPOLOGY GRAPH */}
      {/* ========================================================================= */}
      {subTab === 'TOPOLOGY' && (
        <div className="space-y-3">
          {/* Canvas Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs text-xs">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Chế độ xem:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('PHYSICAL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'PHYSICAL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Cable className="w-3.5 h-3.5" />
                  <span>Vật Lý (L2 Topology)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('LOGICAL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'LOGICAL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Luận Lý (L3 / VLAN Cluster)</span>
                </button>
              </div>

              {/* Filters */}
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">🏢 Tất Cả Tòa Nhà</option>
                <option value="Tòa Nhà Trung Tâm">Tòa Nhà Trung Tâm</option>
                <option value="Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)">Tòa Nhà A (KKB & Cấp Cứu)</option>
                <option value="Tòa Nhà B (Khối Ngoại & Phòng Mổ)">Tòa Nhà B (Ngoại & Phòng Mổ)</option>
              </select>

              <select
                value={filterVlan}
                onChange={(e) => setFilterVlan(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">🌐 Tất Cả VLAN</option>
                {vlans.map((v) => (
                  <option key={v.vlanId} value={String(v.vlanId)}>
                    VLAN {v.vlanId} - {v.name.split('-')[1]?.trim() || v.name}
                  </option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">🖥️ Tất Cả Loại Node</option>
                <option value="SWITCH">Switch / Router</option>
                <option value="SERVER">Máy Chủ HIS / PACS</option>
                <option value="WORKSTATION">PC Bác Sĩ / Trạm Khám</option>
                <option value="MEDICAL">Thiết Bị Y Tế (CT/MRI/Siêu Âm)</option>
                <option value="PRINTER">Máy In Bệnh Án</option>
                <option value="ROGUE">⚠️ Cảnh Báo: Thiết Bị Lạ</option>
              </select>
            </div>

            {/* Canvas Actions & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm IP, MAC, tên máy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-44 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPortLabels(!showPortLabels)}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  showPortLabels ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}
                title="Bật/Tắt nhãn cổng"
              >
                <Tag className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Nhãn Cổng</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFlowAnimation(!showFlowAnimation)}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  showFlowAnimation ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
                title="Bật/Tắt xung luồng dữ liệu"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Luồng Xung</span>
              </button>

              <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => handleZoom(0.15)}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-[11px] font-mono font-bold text-slate-600">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleZoom(-0.15)}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer"
                  title="Đặt lại góc nhìn"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportPNG}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Xuất sơ đồ ra file ảnh PNG"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Xuất PNG</span>
              </button>
            </div>
          </div>

          {/* Interactive Topology SVG Canvas */}
          <div
            ref={containerRef}
            className={`relative bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden select-none transition-all ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[640px]'
            }`}
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Grid background effect */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle, #4F46E5 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Canvas Info HUD */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-white text-[11px] font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Đang hiển thị {filteredNodes.length} nodes & {filteredLinks.length} liên kết</span>
              </div>
            </div>

            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* SVG Elements */}
            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: '0 0',
              }}
            >
              <defs>
                {/* Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Animated dasharray styles */}
                <style>{`
                  @keyframes pulseFlow {
                    from { stroke-dashoffset: 40; }
                    to { stroke-dashoffset: 0; }
                  }
                  .flow-active {
                    animation: pulseFlow 1.2s linear infinite;
                  }
                `}</style>
              </defs>

              {/* Logical Mode: VLAN Cluster Background Zones */}
              {viewMode === 'LOGICAL' && (
                <g className="vlan-clusters">
                  {/* VLAN 10 Zone */}
                  <rect
                    x="860"
                    y="80"
                    width="260"
                    height="240"
                    rx="20"
                    fill="#3B82F6"
                    fillOpacity="0.08"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text x="880" y="110" fill="#60A5FA" fontSize="12" fontWeight="bold">
                    VLAN 10: Máy Chủ HIS / PACS (10.10.10.0/24)
                  </text>

                  {/* VLAN 20 Zone */}
                  <rect
                    x="30"
                    y="570"
                    width="240"
                    height="220"
                    rx="20"
                    fill="#8B5CF6"
                    fillOpacity="0.08"
                    stroke="#8B5CF6"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text x="50" y="600" fill="#A78BFA" fontSize="12" fontWeight="bold">
                    VLAN 20: Khoa Khám Bệnh (10.10.20.0/24)
                  </text>

                  {/* VLAN 40 Zone */}
                  <rect
                    x="290"
                    y="570"
                    width="220"
                    height="220"
                    rx="20"
                    fill="#10B981"
                    fillOpacity="0.08"
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text x="310" y="600" fill="#34D399" fontSize="12" fontWeight="bold">
                    VLAN 40: Thiết Bị Y Tế CĐHA (10.10.40.0/24)
                  </text>

                  {/* VLAN 30 Zone */}
                  <rect
                    x="530"
                    y="570"
                    width="210"
                    height="220"
                    rx="20"
                    fill="#EF4444"
                    fillOpacity="0.08"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text x="550" y="600" fill="#F87171" fontSize="12" fontWeight="bold">
                    VLAN 30: Khối Phòng Mổ & ICU (10.10.30.0/24)
                  </text>

                  {/* VLAN 20 / 60 Zone Kho Dược */}
                  <rect
                    x="750"
                    y="570"
                    width="220"
                    height="220"
                    rx="20"
                    fill="#F59E0B"
                    fillOpacity="0.08"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text x="770" y="600" fill="#FBBF24" fontSize="12" fontWeight="bold">
                    VLAN 50/60: Kho Dược & Camera
                  </text>
                </g>
              )}

              {/* Render Links */}
              <g className="links">
                {filteredLinks.map((link) => {
                  const srcNode = nodes.find((n) => n.id === link.source);
                  const tgtNode = nodes.find((n) => n.id === link.target);
                  if (!srcNode || !tgtNode) return null;

                  const x1 = srcNode.x || 0;
                  const y1 = srcNode.y || 0;
                  const x2 = tgtNode.x || 0;
                  const y2 = tgtNode.y || 0;

                  const isTrunk = link.linkType.includes('TRUNK');
                  const strokeColor = link.linkType.includes('40G')
                    ? '#F59E0B'
                    : isTrunk
                    ? '#6366F1'
                    : '#3B82F6';
                  const strokeWidth = isTrunk ? 3 : 1.5;

                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;

                  return (
                    <g key={link.id} className="transition-all">
                      {/* Background thicker line for hover */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeOpacity={isTrunk ? 0.9 : 0.6}
                        className={showFlowAnimation && isTrunk ? 'flow-active' : ''}
                        strokeDasharray={isTrunk ? '8 6' : undefined}
                      />

                      {/* Port Label Pills */}
                      {showPortLabels && (
                        <g>
                          {/* Near source */}
                          <rect
                            x={x1 + (x2 - x1) * 0.25 - 28}
                            y={y1 + (y2 - y1) * 0.25 - 9}
                            width="56"
                            height="18"
                            rx="5"
                            fill="#0F172A"
                            stroke={strokeColor}
                            strokeWidth="1"
                            opacity="0.9"
                          />
                          <text
                            x={x1 + (x2 - x1) * 0.25}
                            y={y1 + (y2 - y1) * 0.25 + 3.5}
                            fill="#E2E8F0"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {link.sourcePort.split('Ethernet')[1] || link.sourcePort}
                          </text>

                          {/* Link Speed at Midpoint for Trunks */}
                          {isTrunk && (
                            <g>
                              <rect
                                x={midX - 25}
                                y={midY - 8}
                                width="50"
                                height="16"
                                rx="4"
                                fill="#1E1B4B"
                                stroke="#818CF8"
                                strokeWidth="1"
                              />
                              <text
                                x={midX}
                                y={midY + 3.5}
                                fill="#C7D2FE"
                                fontSize="8.5"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {link.linkType.includes('40G') ? '40G SFP+' : '10G Fiber'}
                              </text>
                            </g>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Render Nodes */}
              <g className="nodes">
                {filteredNodes.map((node) => {
                  const nx = node.x || 0;
                  const ny = node.y || 0;
                  const isSwitch = node.type.includes('SWITCH') || node.type === 'GATEWAY';
                  const isCore = node.type === 'CORE_SWITCH' || node.type === 'GATEWAY';
                  const isSelected = selectedNode?.id === node.id;
                  const isWarning = node.status === 'WARNING' || node.type === 'WIFI_AP';

                  const boxWidth = isCore ? 140 : isSwitch ? 120 : 100;
                  const boxHeight = isCore ? 64 : isSwitch ? 58 : 50;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${nx - boxWidth / 2}, ${ny - boxHeight / 2})`}
                      onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeClick(node);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Selection Aura */}
                      {isSelected && (
                        <rect
                          x="-6"
                          y="-6"
                          width={boxWidth + 12}
                          height={boxHeight + 12}
                          rx="18"
                          fill="none"
                          stroke="#6366F1"
                          strokeWidth="2.5"
                          filter="url(#glow)"
                        />
                      )}

                      {/* Main Node Card */}
                      <rect
                        width={boxWidth}
                        height={boxHeight}
                        rx="14"
                        fill={isCore ? '#1E1B4B' : isSwitch ? '#0F172A' : '#090D16'}
                        stroke={
                          isWarning
                            ? '#EF4444'
                            : isSelected
                            ? '#818CF8'
                            : isCore
                            ? '#6366F1'
                            : isSwitch
                            ? '#334155'
                            : '#1E293B'
                        }
                        strokeWidth={isCore || isSelected || isWarning ? 2 : 1.2}
                        className="transition-colors group-hover:stroke-indigo-400 shadow-xl"
                      />

                      {/* Status indicator dot */}
                      <circle
                        cx={boxWidth - 10}
                        cy="10"
                        r="3.5"
                        fill={isWarning ? '#EF4444' : '#10B981'}
                        className={isWarning ? 'animate-ping' : ''}
                      />

                      {/* Matched Asset Tag Pill */}
                      {node.matchedAssetTag && (
                        <g transform={`translate(8, ${boxHeight - 14})`}>
                          <rect
                            width="52"
                            height="12"
                            rx="3"
                            fill="#065F46"
                            stroke="#10B981"
                            strokeWidth="0.8"
                          />
                          <text
                            x="26"
                            y="9"
                            fill="#A7F3D0"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {node.matchedAssetTag}
                          </text>
                        </g>
                      )}

                      {/* VLAN Tag Pill */}
                      <g transform={`translate(${boxWidth - 44}, ${boxHeight - 14})`}>
                        <rect width="36" height="12" rx="3" fill="#1E293B" />
                        <text
                          x="18"
                          y="9"
                          fill="#94A3B8"
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          VLAN {node.vlanId}
                        </text>
                      </g>

                      {/* Node Label Text */}
                      <text
                        x="10"
                        y="20"
                        fill="#F8FAFC"
                        fontSize={isCore ? '11' : isSwitch ? '10' : '9.5'}
                        fontWeight="bold"
                      >
                        {node.label.length > 18 ? node.label.slice(0, 16) + '...' : node.label}
                      </text>

                      {/* Node IP Text */}
                      <text
                        x="10"
                        y="34"
                        fill="#94A3B8"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="medium"
                      >
                        {node.ip}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Sơ đồ Ghi Chú & Hướng Dẫn Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-2xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-bold text-slate-800">Chú giải đường truyền:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-amber-500 rounded-full" />
                <span>Trunk 40G QSFP+ Core</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-indigo-500 rounded-full" />
                <span>Trunk 10G SFP+ Cáp Quang</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-blue-500 rounded-full" />
                <span>Access Link 1G Cat6 UTP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Online / Hoạt động tốt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Thiết bị lạ / Cảnh báo an ninh</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              💡 Kéo thả chuột để di chuyển canvas hoặc node. Click vào node để mở chi tiết cổng switch.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: SCAN CONTROLLER & SWITCH MANAGEMENT */}
      {/* ========================================================================= */}
      {subTab === 'CONTROLLER' && (
        <div className="space-y-4">
          {/* Scan Action Card with Live Terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <SlidersIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Bảng Điều Khiển Quét Mạng Suzieq</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Quét an toàn qua SSH Read-Only, cam kết 0% rủi ro treo thiết bị y tế
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phạm vi quét mạng:</label>
                  <select
                    value={scanScope}
                    onChange={(e: any) => setScanScope(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="ALL">Toàn Bộ Bệnh Viện (Tất Cả 7 Switches & 8 VLANs)</option>
                    <option value="SWITCH">Chỉ Quét Riêng Một Thiết Bị Switch Cụ Thể</option>
                  </select>
                </div>

                {scanScope === 'SWITCH' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chọn Switch Cần Quét:</label>
                    <select
                      value={selectedScanSwitch}
                      onChange={(e) => setSelectedScanSwitch(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="">-- Chọn Switch Quản Lý --</option>
                      {switches.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.ip} - {s.model})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Tiêu Chuẩn An Toàn Thiết Bị Y Tế:</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600">
                    Hệ thống không gửi gói tin SYN/Port Flood đến thiết bị y tế hay máy thở. Suzieq Poller chỉ đọc bảng
                    ARP và FDB MAC Table thụ động từ bộ chuyển mạch.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunScan}
                  disabled={isScanning}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Đang Thực Hiện Poller Mạng...' : '🚀 Bắt Đầu Quét Hạ Tầng & Sơ Đồ Mạng'}</span>
                </button>
              </div>
            </div>

            {/* Live Terminal Log */}
            <div className="lg:col-span-7 bg-slate-950 text-slate-200 p-4 rounded-3xl border border-slate-800 font-mono text-xs flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 pl-2">
                    Suzieq Engine Terminal Console (Live Poller)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                  READY
                </span>
              </div>

              <div className="space-y-1.5 overflow-y-auto max-h-64 font-mono text-[11px] leading-relaxed text-slate-300">
                {scanTerminalLogs.length === 0 ? (
                  <div className="text-slate-600 italic py-6 text-center">
                    Bấm &quot;Bắt Đầu Quét Hạ Tầng&quot; để theo dõi quá trình Poller SSH & phân giải sơ đồ mạng theo thời gian thực...
                  </div>
                ) : (
                  scanTerminalLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Thành công') || log.includes('Hoàn tất')
                          ? 'text-emerald-400'
                          : log.includes('An toàn')
                          ? 'text-cyan-300'
                          : log.includes('SSH-Poller')
                          ? 'text-indigo-300'
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-800 pt-2 mt-2 text-[10.5px] text-slate-500 flex items-center justify-between">
                <span>Protocol: SSH v2 / SNMPv2c / LLDP</span>
                <span>Dual-Port: :3001 (HTTP) & :3443 (HTTPS)</span>
              </div>
            </div>
          </div>

          {/* Managed Switches Table */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Danh Sách Thiết Bị Chuyển Mạch Managed Switch ({switches.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Quản lý IP, số cổng, vị trí lắp đặt và phân cấp mạng Core / Distribution / Access
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSwitchForm({
                    id: '',
                    name: '',
                    ip: '10.10.99.',
                    model: '',
                    vendor: 'Cisco Systems',
                    location: '',
                    building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
                    tier: 'ACCESS',
                    totalPorts: 24,
                    activePorts: 12,
                    sshPort: 22,
                    snmpCommunity: 'qltbit_ro',
                  });
                  setIsSwitchModalOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Switch Quản Lý</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3">Tên Switch</th>
                    <th className="p-3">IP Quản Trị</th>
                    <th className="p-3">Model / Hãng</th>
                    <th className="p-3">Phân Cấp (Tier)</th>
                    <th className="p-3">Số Cổng Hoạt Động</th>
                    <th className="p-3">Vị Trí Tủ Rack</th>
                    <th className="p-3">Tải CPU / RAM</th>
                    <th className="p-3">Trạng Thái</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {switches.map((sw) => (
                    <tr key={sw.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <Network className="w-4 h-4 text-indigo-600" />
                        <span>{sw.name}</span>
                      </td>
                      <td className="p-3 font-mono text-indigo-700 font-bold">{sw.ip}</td>
                      <td className="p-3 text-slate-700">
                        <div className="font-semibold">{sw.model}</div>
                        <div className="text-[10.5px] text-slate-400">{sw.vendor}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sw.tier === 'CORE'
                              ? 'bg-amber-100 text-amber-800'
                              : sw.tier === 'DISTRIBUTION'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sw.tier}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        {sw.activePorts} / {sw.totalPorts} ports ({Math.round((sw.activePorts / sw.totalPorts) * 100)}%)
                      </td>
                      <td className="p-3 text-slate-600 max-w-[200px] truncate" title={sw.location}>
                        {sw.location}
                      </td>
                      <td className="p-3">
                        <div className="text-[11px] font-mono">
                          CPU: {sw.cpuUsage}% | RAM: {sw.memUsage}%
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Online</span>
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNode({
                              id: sw.id,
                              label: sw.name,
                              type: sw.tier === 'CORE' ? 'CORE_SWITCH' : 'ACCESS_SWITCH',
                              ip: sw.ip,
                              mac: sw.mac,
                              vlanId: 99,
                              vlanName: 'Quản Trị IT',
                              location: sw.location,
                              building: sw.building,
                              status: 'ONLINE',
                            });
                            setSelectedSwitchDetails(sw);
                            setIsInspectorOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Xem Cổng
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: ASSET RECONCILIATION & SYNC */}
      {/* ========================================================================= */}
      {subTab === 'RECONCILIATION' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold">Tổng Thiết Bị Khám Phá Mạng:</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{filteredReconNodes.length}</div>
              <span className="text-[11px] text-slate-400">Thiết bị đang hoạt động</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold">Đã Khớp Với QLTBIT:</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {filteredReconNodes.filter((n) => n.matchedAssetId).length}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">Có hồ sơ quản lý tài sản</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold">Thiết Bị Mới Chưa Đăng Ký:</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {filteredReconNodes.filter((n) => !n.matchedAssetId).length}
              </div>
              <span className="text-[11px] text-amber-600 font-semibold">Chưa có mã tài sản</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold">Cảnh Báo An Ninh Mạng:</span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {filteredReconNodes.filter((n) => n.status === 'WARNING').length}
              </div>
              <span className="text-[11px] text-rose-600 font-semibold">Thiết bị lạ / Router phát sóng</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo IP, MAC, tên máy, khoa phòng..."
                    value={reconSearch}
                    onChange={(e) => setReconSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setReconFilter('ALL')}
                    className={`px-3 py-1 rounded-lg cursor-pointer ${
                      reconFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Tất Cả ({nodes.filter((n) => !n.type.includes('SWITCH') && n.type !== 'GATEWAY').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReconFilter('MATCHED')}
                    className={`px-3 py-1 rounded-lg cursor-pointer ${
                      reconFilter === 'MATCHED' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Đã Khớp Hồ Sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => setReconFilter('UNMATCHED')}
                    className={`px-3 py-1 rounded-lg cursor-pointer ${
                      reconFilter === 'UNMATCHED' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Chưa Có Hồ Sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => setReconFilter('ROGUE')}
                    className={`px-3 py-1 rounded-lg cursor-pointer ${
                      reconFilter === 'ROGUE' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Thiết Bị Lạ (⚠️)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất Excel Đối Soát</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3">Thiết Bị Quét Được</th>
                    <th className="p-3">Địa Chỉ IP / MAC</th>
                    <th className="p-3">Vị Trí Cắm (Switch & Cổng)</th>
                    <th className="p-3">Phân Đoạn VLAN</th>
                    <th className="p-3">Hồ Sơ QLTBIT Tương Ứng</th>
                    <th className="p-3">Khoa Phòng / Phụ Trách</th>
                    <th className="p-3">Trạng Thái</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReconNodes.map((dev) => {
                    const sw = switches.find((s) => s.id === dev.switchId);
                    return (
                      <tr key={dev.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {renderNodeIcon(dev.type)}
                            <div>
                              <div className="font-bold text-slate-900">{dev.label}</div>
                              <div className="text-[10.5px] text-slate-400">{dev.subLabel}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-mono text-indigo-700 font-bold">{dev.ip}</div>
                          <div className="font-mono text-[10.5px] text-slate-400">{dev.mac}</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-800">{sw?.name || dev.switchId}</div>
                          <div className="text-[10.5px] font-mono text-indigo-600 font-semibold">
                            Cổng: {dev.switchPort || 'Gi1/0/1'} ({dev.portSpeed || '1G'})
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-mono font-bold">
                            VLAN {dev.vlanId}
                          </span>
                        </td>

                        <td className="p-3">
                          {dev.matchedAssetId ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                [{dev.matchedAssetTag}]
                              </span>
                              <div className="text-[11px] text-slate-700 font-medium truncate max-w-[150px]">
                                {dev.matchedAssetName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa liên kết</span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-800 truncate max-w-[140px]">
                            {dev.matchedDepartment || dev.location}
                          </div>
                          {dev.matchedAssignedTo && (
                            <div className="text-[10.5px] text-slate-500 truncate max-w-[140px]">
                              👤 {dev.matchedAssignedTo}
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          {dev.matchedAssetId ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã Quản Lý</span>
                            </span>
                          ) : dev.status === 'WARNING' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10.5px] font-bold inline-flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Thiết Bị Lạ</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              <span>Thiết Bị Mới</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {dev.matchedAssetId ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSyncAsset(dev)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  title="Cập nhật vị trí Switch và Port vào hồ sơ tài sản"
                                >
                                  Đồng Bộ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openQuickView('asset', dev.matchedAssetId!)}
                                  className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                                  title="Xem nhanh hồ sơ tài sản"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickAdd(dev)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Tạo Tài Sản</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePaginationBar
              currentPage={reconPage}
              totalPages={reconTotalPages}
              totalCount={filteredReconNodes.length}
              pageSize={reconPageSize}
              onPageChange={setReconPage}
              onPageSizeChange={setReconPageSize}
              storageKey="qltbit_network_recon_page_size"
              itemName="thiết bị"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: PORT & PATH TRACING */}
      {/* ========================================================================= */}
      {subTab === 'TRACER' && (
        <div className="space-y-4">
          {/* Search Box */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Truy Vết Cổng Switch & Lộ Trình Mạng (Port & Hop Tracing)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tìm kiếm bất kỳ máy tính bác sĩ, mã tài sản, IP hoặc MAC để xác định ngay vị trí cắm vật lý & đường truyền về Server HIS
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Nhập tên bác sĩ, tên máy (vd: PC Phòng Khám Nội), mã tài sản (vd: AST-001), IP hoặc MAC..."
                  value={traceSearch}
                  onChange={(e) => setTraceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Suggestions Quick Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {nodes
                  .filter((n) => n.type === 'WORKSTATION' || n.type === 'MEDICAL')
                  .slice(0, 4)
                  .map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelectTraceNode(n)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        selectedTraceNode?.id === n.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {n.label.split('-')[0]?.trim()}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Tracer Result Card */}
          {selectedTraceNode && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              {/* Target Device Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                    {renderNodeIcon(selectedTraceNode.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900">{selectedTraceNode.label}</h4>
                      {selectedTraceNode.matchedAssetTag && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                          {selectedTraceNode.matchedAssetTag}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span className="font-mono text-indigo-700 font-bold">IP: {selectedTraceNode.ip}</span>
                      <span className="font-mono">MAC: {selectedTraceNode.mac}</span>
                      <span>📍 {selectedTraceNode.location}</span>
                    </div>
                  </div>
                </div>

                {/* Connection Box Highlight */}
                <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl text-xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-500">ĐANG CẮM VÀO THIẾT BỊ:</div>
                  <div className="font-black text-indigo-900 text-sm flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-indigo-600" />
                    <span>{selectedTraceNode.switchId?.toUpperCase()}</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-indigo-700">
                    Cổng: {selectedTraceNode.switchPort} (VLAN {selectedTraceNode.vlanId})
                  </div>
                </div>
              </div>

              {/* Hop-By-Hop Visual Flow */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Lộ Trình Gói Tin Mạng Đến Máy Chủ Lõi (Hop-By-Hop Trace):
                  </span>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    Tổng độ trễ: ~1.1 ms (Rất Tốt)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
                  {traceSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 hover:bg-indigo-50/50 p-4 rounded-2xl border border-slate-200 transition-all space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                          {step.hopNumber}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {step.latency}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-xs truncate" title={step.title}>
                          {step.title}
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">{step.subTitle}</div>
                      </div>

                      <div className="text-[10.5px] font-mono text-indigo-700 font-semibold bg-white p-2 rounded-xl border border-slate-200">
                        {step.portInfo}
                      </div>

                      <div className="text-[10px] text-slate-500 truncate" title={step.cableType}>
                        🔌 {step.cableType}
                      </div>

                      {/* Arrow to next hop */}
                      {idx < traceSteps.length - 1 && (
                        <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                          <div className="w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-600 flex items-center justify-center shadow-xs">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* NODE & SWITCH INSPECTOR SLIDE-OVER DRAWER */}
      {/* ========================================================================= */}
      {isInspectorOpen && selectedNode && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                    {renderNodeIcon(selectedNode.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{selectedNode.label}</h3>
                    <p className="text-xs text-slate-500">{selectedNode.subLabel || selectedNode.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hardware & Network Specs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Địa chỉ IP:</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedNode.ip}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Địa chỉ MAC:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedNode.mac}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Phân đoạn VLAN:</span>
                  <span className="font-bold text-slate-800">
                    VLAN {selectedNode.vlanId} ({selectedNode.vlanName})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Vị trí lắp đặt:</span>
                  <span className="font-semibold text-slate-800">{selectedNode.location}</span>
                </div>
                {selectedNode.switchId && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium">Cổng Switch kết nối:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {selectedNode.switchId} / {selectedNode.switchPort}
                    </span>
                  </div>
                )}
              </div>

              {/* If it's a Switch -> Show Visual Front-Panel 24/48 Port Matrix */}
              {selectedSwitchDetails && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase">
                      Bảng Cổng Switch ({selectedSwitchDetails.totalPorts} Ports Front Panel):
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">
                      {selectedSwitchDetails.activePorts} Cổng Đang Hoạt Động
                    </span>
                  </div>

                  {/* 2-row Port Matrix */}
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-800 pb-1">
                      <span>Cổng Lẻ (Hàng Trên): 1, 3, 5...</span>
                      <span>Xanh lá = 1Gbps | Vàng = 100M/PoE | Xanh dương = SFP+ Fiber</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1.5 pt-1">
                      {Array.from({ length: selectedSwitchDetails.totalPorts }).map((_, i) => {
                        const portNum = i + 1;
                        const isUp = portNum <= selectedSwitchDetails.activePorts;
                        const isFiber = portNum >= selectedSwitchDetails.totalPorts - 3;
                        return (
                          <div
                            key={i}
                            className={`h-7 rounded flex flex-col items-center justify-center font-mono text-[9px] font-bold border cursor-pointer transition-all ${
                              isFiber
                                ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                                : isUp
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                            title={`Port Gi1/0/${portNum} - ${isUp ? 'UP (1 Gbps Full Duplex)' : 'DOWN (Empty)'}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mb-0.5 ${
                                isFiber ? 'bg-indigo-400' : isUp ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                            />
                            <span>{portNum}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Matched Asset Info if available */}
              {selectedNode.matchedAssetId && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Hồ Sơ Tài Sản QLTBIT Đã Liên Kết:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11.5px] text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-500">Mã tài sản:</span>{' '}
                      <strong className="text-emerald-800">{selectedNode.matchedAssetTag}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Khoa phòng:</span>{' '}
                      <strong>{selectedNode.matchedDepartment || 'Chưa gán'}</strong>
                    </div>
                    {selectedNode.matchedAssignedTo && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Người sử dụng:</span>{' '}
                        <strong>{selectedNode.matchedAssignedTo}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              {selectedNode.matchedAssetId ? (
                <button
                  type="button"
                  onClick={() => openQuickView('asset', selectedNode.matchedAssetId!)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem Hồ Sơ Tài Sản</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsInspectorOpen(false);
                    handleOpenQuickAdd(selectedNode);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Đăng Ký Thành Tài Sản</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsInspectorOpen(false);
                  setSubTab('TRACER');
                  handleSelectTraceNode(selectedNode);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Truy Vết Đường Đi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ADD ASSET MODAL */}
      {/* ========================================================================= */}
      {quickAddDevice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Thêm Nhanh Thiết Bị Vào QLTBIT</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddDevice(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Thiết Bị (*):</label>
                <input
                  type="text"
                  value={quickAddForm.name}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hãng Sản Xuất:</label>
                  <input
                    type="text"
                    value={quickAddForm.brand}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model:</label>
                  <input
                    type="text"
                    value={quickAddForm.model}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, model: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div>IP: {quickAddDevice.ip}</div>
                <div>MAC: {quickAddDevice.mac}</div>
                <div>VLAN: {quickAddDevice.vlanId}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickAddDevice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Xác Nhận Tạo Tài Sản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

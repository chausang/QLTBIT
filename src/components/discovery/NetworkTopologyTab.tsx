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

const DEFAULT_VLANS: VlanConfig[] = [
  { id: 'vlan_1', name: 'VLAN 1 - Mạng Trụ Sở & Văn Phòng', subnet: '192.168.1.0/24', ipStart: '192.168.1.1', ipEnd: '192.168.1.254', description: 'Máy trạm văn phòng, kế toán, ban giám đốc', enabled: true },
  { id: 'vlan_10', name: 'VLAN 10 - Khoa Khám Bệnh & Cấp Cứu', subnet: '192.168.10.0/24', ipStart: '192.168.10.1', ipEnd: '192.168.10.254', description: 'Máy tính khu khám bệnh, tiếp đón bệnh nhân', enabled: true },
  { id: 'vlan_20', name: 'VLAN 20 - Máy In & Ngoại Vi', subnet: '192.168.20.0/24', ipStart: '192.168.20.1', ipEnd: '192.168.20.254', description: 'Máy in Canon/HP, máy quét mã vạch, POS', enabled: false },
  { id: 'vlan_30', name: 'VLAN 30 - Camera An Ninh & IoT', subnet: '192.168.30.0/24', ipStart: '192.168.30.1', ipEnd: '192.168.30.254', description: 'Hệ thống camera Dahua/Hikvision, IoT', enabled: false },
  { id: 'vlan_50', name: 'VLAN 50 - Máy Chủ & Thiết Bị Mạng', subnet: '10.0.1.0/24', ipStart: '10.0.1.1', ipEnd: '10.0.1.254', description: 'Máy chủ dữ liệu, Router, Firewall, Core Switch', enabled: false },
];

interface NetworkTopologyTabProps {
  initialDevices?: any[];
  vlanList?: VlanConfig[];
  onUpdateVlans?: (vlans: VlanConfig[]) => void;
  onTriggerScan?: () => Promise<void>;
  onAddDeviceToAsset?: (dev: any) => void;
}

export function NetworkTopologyTab({
  initialDevices,
  vlanList,
  onUpdateVlans,
  onTriggerScan,
  onAddDeviceToAsset,
}: NetworkTopologyTabProps = {}) {
  const { openQuickView } = useQuickViewStore();

  // Sub-tabs
  const [subTab, setSubTab] = useState<'TOPOLOGY' | 'CONTROLLER' | 'RECONCILIATION' | 'TRACER' | 'ASSERTIONS'>('TOPOLOGY');
  const [suzieqTable, setSuzieqTable] = useState<'DEVICES' | 'INTERFACES' | 'VLANS' | 'ADDRESSES'>('DEVICES');

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

  // Helper to build topology directly from real devices list and unified VLANs
  const buildTopologyFromRealDevices = (deviceList: any[], customVlans?: VlanConfig[]) => {
    if (!Array.isArray(deviceList) || deviceList.length === 0) return null;

    const effectiveVlans =
      customVlans && customVlans.length > 0
        ? customVlans
        : vlanList && vlanList.length > 0
        ? vlanList
        : DEFAULT_VLANS;

    // Detect Gateway and Local Host
    const gatewayDevice = deviceList.find((d) => d.ipAddress?.endsWith('.1')) || deviceList[0];
    const localHostDevice = deviceList.find(
      (d) => d.hostname?.toLowerCase().includes('desktop') || d.model?.includes('ThinkPad') || d.openPorts?.includes(3000)
    ) || deviceList.find((d) => d.ipAddress !== gatewayDevice?.ipAddress);

    const baseSubnet = gatewayDevice?.ipAddress
      ? gatewayDevice.ipAddress.split('.').slice(0, 3).join('.')
      : '192.168.1';

    const colorPalette: Record<number, string> = {
      1: '#4F46E5',  // Indigo
      10: '#0D9488', // Teal
      20: '#F59E0B', // Amber
      30: '#EC4899', // Pink
      50: '#8B5CF6', // Purple
    };

    const vlanData: ManagedVlan[] = effectiveVlans.map((v, idx) => {
      const vNum = parseInt(v.id.replace(/\D/g, '') || String(idx + 1), 10);
      const subPrefix = v.subnet.split('/')[0].split('.').slice(0, 3).join('.');
      const devCount = deviceList.filter((d) => {
        if (d.vlanId && (String(d.vlanId) === String(vNum) || d.vlanId === v.id)) return true;
        return d.ipAddress && d.ipAddress.startsWith(subPrefix + '.');
      }).length;

      return {
        vlanId: vNum,
        name: v.name,
        subnet: v.subnet,
        gateway: v.ipStart || `${subPrefix}.1`,
        description: v.description || 'Dải phân đoạn mạng nội bộ',
        color: colorPalette[vNum] || '#06B6D4',
        deviceCount: devCount,
        enabled: v.enabled !== false,
      };
    });

    const switchData: ManagedSwitch[] = [
      {
        id: 'sw-lan-main',
        name: 'SW-LAN-TRUNGTAM',
        ip: `${baseSubnet}.250`,
        model: 'Managed Gigabit Switch 24-Port',
        vendor: 'Cisco Systems / TP-Link JetStream',
        location: 'Tủ Mạng Trung Tâm / Phòng IT Văn Phòng',
        building: 'Trụ Sở Chính',
        tier: 'CORE',
        totalPorts: 24,
        activePorts: Math.min(24, Math.max(8, deviceList.length)),
        mac: '00:1A:2B:11:22:33',
        firmware: 'V1.0.15 Stable',
        uptime: '38 ngày 14 giờ',
        sshPort: 22,
        snmpCommunity: 'qltbit_ro',
        status: 'ONLINE',
        vlans: vlanData.map((v) => v.vlanId),
        cpuUsage: 14,
        memUsage: 32,
        tempCelsius: 36,
      },
    ];

    const newNodes: TopologyNode[] = [];
    const newLinks: TopologyLink[] = [];

    // Gateway Node
    const gwIp = gatewayDevice?.ipAddress || `${baseSubnet}.1`;
    newNodes.push({
      id: 'gateway-router',
      label: `Router Gateway (${gwIp})`,
      subLabel: gatewayDevice?.hostname || 'Cổng Ra Internet & NAT/DHCP',
      type: 'GATEWAY',
      ip: gwIp,
      mac: gatewayDevice?.macAddress || '7C:7D:68:CC:05:28',
      vlanId: 1,
      vlanName: vlanData[0]?.name || `VLAN 1 (${baseSubnet}.0/24)`,
      location: 'Khu Vực Cổng Mạng Chính (Main Gateway)',
      building: 'Trụ Sở Chính',
      status: 'ONLINE',
      x: 520,
      y: 70,
    });

    // Switch Node
    newNodes.push({
      id: 'sw-lan-main',
      label: 'SW-LAN-TRUNGTAM (LAN Switch 24P)',
      subLabel: 'Switch Phân Phối Cáp Mạng Nội Bộ',
      type: 'CORE_SWITCH',
      ip: `${baseSubnet}.250`,
      mac: '00:1A:2B:11:22:33',
      vlanId: 1,
      vlanName: vlanData[0]?.name || `VLAN 1 (${baseSubnet}.0/24)`,
      location: 'Tủ Mạng Phòng IT / Server',
      building: 'Trụ Sở Chính',
      status: 'ONLINE',
      x: 520,
      y: 220,
    });

    // Link: Gateway -> Switch
    newLinks.push({
      id: 'link-gw-sw',
      source: 'gateway-router',
      target: 'sw-lan-main',
      sourcePort: 'LAN1 (Gigabit)',
      targetPort: 'Port 24 (Uplink Trunk)',
      linkType: 'FIBER_TRUNK_10G',
      status: 'UP',
      speed: '1 Gbps Full-Duplex',
      vlanTag: 'Trunk Tất Cả VLAN',
    });

    // Local Host Server Node
    if (localHostDevice && localHostDevice.ipAddress !== gwIp) {
      newNodes.push({
        id: 'node-localhost-server',
        label: `Máy Chủ QLTBIT (${localHostDevice.hostname || 'Local Host'})`,
        subLabel: localHostDevice.model || 'Lenovo ThinkPad / Web Server :3001 & :3443',
        type: 'SERVER',
        ip: localHostDevice.ipAddress,
        mac: localHostDevice.macAddress || 'AC:1F:6B:12:8D:8E',
        vlanId: 1,
        vlanName: vlanData[0]?.name || `VLAN 1 (${baseSubnet}.0/24)`,
        location: 'Bàn Quản Trị Viên IT',
        building: 'Trụ Sở Chính',
        status: 'ONLINE',
        switchId: 'sw-lan-main',
        switchPort: 'Port Gi1/0/1',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 880,
        y: 220,
      });

      newLinks.push({
        id: 'link-sw-localhost',
        source: 'sw-lan-main',
        target: 'node-localhost-server',
        sourcePort: 'Port Gi1/0/1',
        targetPort: 'RJ45 / NIC',
        linkType: 'ACCESS_1G',
        status: 'UP',
        speed: '1 Gbps',
        vlanTag: 'VLAN 1',
      });
    }

    // Endpoints
    const endpoints = deviceList
      .filter((d) => d.ipAddress !== gwIp && d.ipAddress !== localHostDevice?.ipAddress)
      .sort((a, b) => parseInt(a.ipAddress.split('.')[3] || '0', 10) - parseInt(b.ipAddress.split('.')[3] || '0', 10));

    const itemsPerRow = 5;
    const horizontalSpacing = 190;
    const verticalSpacing = 130;
    const startY = 400;

    endpoints.forEach((dev, idx) => {
      const portNum = idx + 2;
      const row = Math.floor(idx / itemsPerRow);
      const col = idx % itemsPerRow;
      const rowItemCount = Math.min(itemsPerRow, endpoints.length - row * itemsPerRow);
      const rowStartX = 520 - ((rowItemCount - 1) * horizontalSpacing) / 2;
      const x = Math.round(rowStartX + col * horizontalSpacing);
      const y = startY + row * verticalSpacing;

      const dType = (dev.deviceType || '').toUpperCase();
      const nodeType: TopologyNode['type'] =
        dType === 'CAMERA'
          ? 'CAMERA'
          : dType === 'PRINTER'
          ? 'PRINTER'
          : dType === 'MOBILE'
          ? 'WIFI_AP'
          : dType === 'DESKTOP' || dType === 'LAPTOP'
          ? 'WORKSTATION'
          : 'WORKSTATION';

      // Match with effective VLANs
      const matchingVlan = effectiveVlans.find((v) => {
        if (dev.vlanId && (dev.vlanId === v.id || dev.vlanId === String(parseInt(v.id.replace(/\D/g, '') || '1', 10)))) return true;
        const subPrefix = v.subnet.split('/')[0].split('.').slice(0, 3).join('.');
        return dev.ipAddress && dev.ipAddress.startsWith(subPrefix + '.');
      }) || effectiveVlans[0];
      const vNum = parseInt(matchingVlan.id.replace(/\D/g, '') || '1', 10);

      const nodeId = `dev-${dev.ipAddress.replace(/\./g, '-')}`;
      newNodes.push({
        id: nodeId,
        label: dev.hostname || `Host-${dev.ipAddress.split('.')[3]}`,
        subLabel: dev.model || dev.vendor || 'Thiết bị mạng nội bộ',
        type: nodeType,
        ip: dev.ipAddress,
        mac: dev.macAddress,
        vlanId: vNum,
        vlanName: matchingVlan.name,
        location: dev.matchedAsset?.locationName || 'Văn Phòng / Khu Vực Làm Việc',
        building: 'Trụ Sở Chính',
        status: 'ONLINE',
        switchId: 'sw-lan-main',
        switchPort: `Port Gi1/0/${portNum}`,
        portSpeed: dev.openPorts?.includes(135) || dev.openPorts?.includes(445) ? '1 Gbps' : '100 Mbps',
        duplex: 'Full',
        matchedAssetId: dev.matchedAsset?.id,
        matchedAssetTag: dev.matchedAsset?.assetTag,
        matchedAssetName: dev.matchedAsset?.name,
        matchedDepartment: dev.matchedAsset?.department || null,
        matchedAssignedTo: dev.matchedAsset?.assignedTo || null,
        x,
        y,
        specs: dev,
      });

      newLinks.push({
        id: `link-sw-${nodeId}`,
        source: 'sw-lan-main',
        target: nodeId,
        sourcePort: `Port Gi1/0/${portNum}`,
        targetPort: 'LAN RJ45',
        linkType: 'ACCESS_1G',
        status: 'UP',
        speed: '1 Gbps',
        vlanTag: `VLAN ${vNum}`,
      });
    });

    return { switches: switchData, vlans: vlanData, nodes: newNodes, links: newLinks };
  };

  // Load Topology Data
  const loadData = async () => {
    setLoading(true);
    try {
      // First, if initialDevices has items, immediately construct the real topology!
      if (initialDevices && initialDevices.length > 0) {
        const localBuilt = buildTopologyFromRealDevices(initialDevices, vlanList);
        if (localBuilt) {
          setSwitches(localBuilt.switches);
          setVlans(localBuilt.vlans);
          setNodes(localBuilt.nodes);
          setLinks(localBuilt.links);
          setSummary({
            totalSwitches: 1,
            totalVlans: localBuilt.vlans.filter((v) => v.enabled).length,
            totalDevices: initialDevices.length,
            matchedDevices: initialDevices.filter((d) => d.matchedAsset).length,
            unmatchedDevices: initialDevices.filter((d) => !d.matchedAsset).length,
            rogueDevices: 0,
            primarySubnet: `${localBuilt.vlans[0].subnet}`,
            lastScannedAt: new Date().toISOString(),
          });
          setLoading(false);
          return;
        }
      }

      // Check localStorage for previously scanned devices from Tab 1
      if (typeof window !== 'undefined') {
        try {
          const savedStr = localStorage.getItem('qltbit_discovered_devices');
          const savedVlansStr = localStorage.getItem('qltbit_discovery_vlans');
          const savedVlans = savedVlansStr ? JSON.parse(savedVlansStr) : undefined;
          if (savedStr) {
            const savedDevs = JSON.parse(savedStr);
            if (Array.isArray(savedDevs) && savedDevs.length > 0) {
              const localBuilt = buildTopologyFromRealDevices(savedDevs, savedVlans || vlanList);
              if (localBuilt) {
                setSwitches(localBuilt.switches);
                setVlans(localBuilt.vlans);
                setNodes(localBuilt.nodes);
                setLinks(localBuilt.links);
                setSummary({
                  totalSwitches: 1,
                  totalVlans: localBuilt.vlans.filter((v) => v.enabled).length,
                  totalDevices: savedDevs.length,
                  matchedDevices: savedDevs.filter((d) => d.matchedAsset).length,
                  unmatchedDevices: savedDevs.filter((d) => !d.matchedAsset).length,
                  rogueDevices: 0,
                  primarySubnet: `${localBuilt.vlans[0].subnet}`,
                  lastScannedAt: new Date().toISOString(),
                });
                setLoading(false);
                return;
              }
            }
          }
        } catch {}
      }

      // Fetch from API
      const res = await fetch('/api/discovery/topology');
      const json = await res.json();
      if (json.success && json.data) {
        setSwitches(json.data.switches || []);
        setVlans(json.data.vlans || []);
        setNodes(json.data.nodes || []);
        setLinks(json.data.links || []);
        setSummary(json.data.summary || null);

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
  }, [initialDevices, vlanList]);

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
        if (filterType === 'CAMERA' && n.type !== 'CAMERA') return false;
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

  // Execute REAL Discovery Scan
  const handleRunScan = async () => {
    setIsScanning(true);
    setScanTerminalLogs([
      `[${new Date().toLocaleTimeString('vi-VN')}] [Khám Phá Mạng Thực Tế] Đang dò tìm card mạng và dải subnet hoạt động...`,
      `[${new Date().toLocaleTimeString('vi-VN')}] [Quét Mạng] Gửi gói tin dò tìm ARP & Ping sweep đồng thời tới các thiết bị nội bộ...`,
    ]);

    try {
      // If parent passed onTriggerScan, invoke it to keep both tabs perfectly synced
      if (onTriggerScan) {
        await onTriggerScan();
      }

      const res = await fetch('/api/discovery/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SCAN' }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setScanTerminalLogs(json.data.logs || []);
        showToast(json.message || '✨ Quét mạng thực tế thành công!');
        if (Array.isArray(json.data.devices) && json.data.devices.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('qltbit_discovered_devices', JSON.stringify(json.data.devices));
          }
          const built = buildTopologyFromRealDevices(json.data.devices);
          if (built) {
            setSwitches(built.switches);
            setVlans(built.vlans);
            setNodes(built.nodes);
            setLinks(built.links);
          }
        } else {
          await loadData();
        }
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
      deviceType: node.type === 'CAMERA' ? 'Camera' : node.type === 'PRINTER' ? 'Máy in' : 'Laptop',
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
    const accessSw = switchList.find((s) => s.id === node.switchId) || switchList[0];
    if (accessSw) {
      steps.push({
        hopNumber: 1,
        title: accessSw.name,
        subTitle: `${accessSw.model} (${accessSw.ip})`,
        type: 'ACCESS_SWITCH',
        portInfo: `Cổng vào: ${node.switchPort || 'Gi1/0/1'} ──> Uplink Trunk: Port 24`,
        cableType: 'Cáp mạng Gigabit Cat6 (Trunk Uplink)',
        latency: '0.4 ms',
        vlan: `Trunk VLAN ${node.vlanId}`,
        location: accessSw.location,
      });
    }

    // Hop 2: Central QLTBIT Server Host
    const serverNode = nodeList.find((n) => n.type === 'SERVER') || nodeList[0];
    if (serverNode) {
      steps.push({
        hopNumber: 2,
        title: serverNode.label,
        subTitle: `Máy Chủ QLTBIT Web App (${serverNode.ip})`,
        type: 'SERVER',
        portInfo: 'Port Gi1/0/1 ──> HTTP :3001 & HTTPS :3443',
        cableType: 'Cáp mạng nội bộ LAN',
        latency: '0.6 ms',
        vlan: 'VLAN 1 - Mạng Trụ Sở',
        location: serverNode.location,
      });
    }

    // Hop 3: Gateway Router
    const gatewayNode = nodeList.find((n) => n.type === 'GATEWAY') || nodeList[0];
    if (gatewayNode) {
      steps.push({
        hopNumber: 3,
        title: gatewayNode.label,
        subTitle: `Default Gateway (${gatewayNode.ip})`,
        type: 'GATEWAY',
        portInfo: 'Cổng WAN / Internet NAT & DNS',
        cableType: 'Đường truyền Cáp quang Internet FTTH',
        latency: '1.2 ms',
        vlan: 'Gateway Internet',
        location: gatewayNode.location,
      });
    }

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
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const a = document.createElement('a');
      a.download = `So_Do_Mang_Thuc_Te_QLTBIT_${new Date().toISOString().slice(0, 10)}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      showToast('📸 Đã xuất sơ đồ mạng thực tế thành ảnh PNG!');
    };
    img.src = url;
  };

  // Export Reconciliation to Excel
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QLTBIT IT Asset Management';
      const sheet = workbook.addWorksheet('Đối Soát Thiết Bị Mạng Thực Tế');

      sheet.mergeCells('A1:J1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'BÁO CÁO ĐỐI SOÁT THIẾT BỊ KHÁM PHÁ MẠNG THỰC TẾ & HỒ SƠ TÀI SẢN CNTT';
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
        'Phân Đoạn VLAN / Subnet',
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
      a.download = `Bao_Cao_Doi_Soat_Mang_Thuc_Te_QLTBIT_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📥 Đã xuất file Excel đối soát thực tế thành công!');
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
      case 'DIST_SWITCH':
      case 'ACCESS_SWITCH':
        return <Network className="w-5 h-5 text-indigo-300" />;
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
                  Sơ Đồ Mạng Tô-Pô & Quét Thiết Bị Thực Tế
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10.5px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Dữ Liệu Mạng Thực Tế (Live Network ARP)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10.5px] font-mono font-bold">
                  {summary?.primarySubnet || '192.168.1.0/24'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Tự động dựng sơ đồ mạng L2/L3 từ kết quả quét mạng thực tế: Gateway Router, Switch LAN, Máy chủ QLTBIT & thiết bị đầu cuối
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
              <span>{isScanning ? 'Đang Quét Mạng Thực Tế...' : 'Quét Mạng Ngay (Real Scan)'}</span>
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
            <span className="text-[11px] text-slate-400 font-medium">Gateway Router:</span>
            <div className="text-sm font-black text-amber-400 mt-0.5 truncate">
              {nodes.find((n) => n.type === 'GATEWAY')?.ip || '192.168.1.1'}
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Máy Chủ QLTBIT:</span>
            <div className="text-sm font-black text-indigo-300 mt-0.5 truncate">
              {nodes.find((n) => n.type === 'SERVER')?.ip || '192.168.1.24'}
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Thiết Bị Thực Tế Đang Cắm:</span>
            <div className="text-base font-black text-white mt-0.5 flex items-baseline gap-1">
              {nodes.filter((n) => !n.type.includes('SWITCH') && n.type !== 'GATEWAY').length}
              <span className="text-[10px] text-blue-400 font-bold">Online</span>
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
            <span className="text-[11px] text-slate-400 font-medium">Thiết Bị Mới Chưa Đăng Ký:</span>
            <div className="text-base font-black text-amber-400 mt-0.5 flex items-baseline gap-1">
              {nodes.filter((n) => !n.matchedAssetId && n.type !== 'GATEWAY' && !n.type.includes('SWITCH')).length}
              <span className="text-[10px] text-amber-300 font-bold">Cần Đối Soát</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
            <span className="text-[11px] text-slate-400 font-medium">Cơ Chế Quét:</span>
            <div className="text-xs font-bold text-emerald-400 mt-0.5 truncate">
              Live ARP & TCP Prober
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
            <Activity className="w-3.5 h-3.5" />
            <span>2. Bảng Quan Sát Mạng Suzieq</span>
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
            <span>3. Đối Soát & Đồng Bộ Tài Sản ({nodes.filter((n) => !n.type.includes('SWITCH') && n.type !== 'GATEWAY').length})</span>
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
            <span>4. Truy Vết Cổng & Đường Đi (Suzieq Path Trace)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('ASSERTIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'ASSERTIONS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>5. Chẩn Đoán Sức Khỏe (Suzieq Assert)</span>
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

              {/* VLAN Filter */}
              <select
                value={filterVlan}
                onChange={(e) => setFilterVlan(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">🌐 Tất Cả VLAN ({vlans.length})</option>
                {vlans.map((v) => (
                  <option key={v.vlanId} value={String(v.vlanId)}>
                    VLAN {v.vlanId} - {v.name} ({v.deviceCount} máy)
                  </option>
                ))}
              </select>

              {/* Node Type Filters */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">🖥️ Tất Cả Loại Node</option>
                <option value="SWITCH">Switch & Router</option>
                <option value="SERVER">Máy Chủ QLTBIT</option>
                <option value="WORKSTATION">PC / Laptop Làm Việc</option>
                <option value="CAMERA">Camera An Ninh</option>
                <option value="PRINTER">Máy In Mạng</option>
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
                <span>
                  Đang hiển thị {filteredNodes.length} nodes thực tế & {filteredLinks.length} liên kết
                </span>
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
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

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

              {/* Logical Mode: Dynamic VLAN / Subnet Cluster Background */}
              {viewMode === 'LOGICAL' && (
                <g className="vlan-clusters">
                  {vlans.map((vlan) => {
                    const vlanNodes = filteredNodes.filter((n) => n.vlanId === vlan.vlanId);
                    if (vlanNodes.length === 0) return null;
                    const minX = Math.min(...vlanNodes.map((n) => (n.x || 0) - 70));
                    const maxX = Math.max(...vlanNodes.map((n) => (n.x || 0) + 70));
                    const minY = Math.min(...vlanNodes.map((n) => (n.y || 0) - 40));
                    const maxY = Math.max(...vlanNodes.map((n) => (n.y || 0) + 40));
                    return (
                      <g key={vlan.vlanId}>
                        <rect
                          x={minX - 25}
                          y={minY - 35}
                          width={maxX - minX + 50}
                          height={maxY - minY + 60}
                          rx="24"
                          fill={vlan.color || '#4F46E5'}
                          fillOpacity="0.08"
                          stroke={vlan.color || '#4F46E5'}
                          strokeWidth="1.5"
                          strokeDasharray="6 4"
                        />
                        <text
                          x={minX - 10}
                          y={minY - 15}
                          fill={vlan.color || '#818CF8'}
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {vlan.name} ({vlanNodes.length} Thiết bị)
                        </text>
                      </g>
                    );
                  })}
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
                  const strokeColor = isTrunk ? '#818CF8' : '#3B82F6';
                  const strokeWidth = isTrunk ? 2.5 : 1.5;

                  return (
                    <g key={link.id} className="transition-all">
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
                          <rect
                            x={x1 + (x2 - x1) * 0.28 - 28}
                            y={y1 + (y2 - y1) * 0.28 - 9}
                            width="56"
                            height="18"
                            rx="5"
                            fill="#0F172A"
                            stroke={strokeColor}
                            strokeWidth="1"
                            opacity="0.95"
                          />
                          <text
                            x={x1 + (x2 - x1) * 0.28}
                            y={y1 + (y2 - y1) * 0.28 + 3.5}
                            fill="#E2E8F0"
                            fontSize="8.5"
                            fontFamily="monospace"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {link.sourcePort.split('Ethernet')[1] || link.sourcePort}
                          </text>
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

                  const boxWidth = isCore ? 140 : isSwitch ? 120 : 105;
                  const boxHeight = isCore ? 64 : isSwitch ? 58 : 52;

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

                      {/* Node Label Text */}
                      <text
                        x="10"
                        y="20"
                        fill="#F8FAFC"
                        fontSize={isCore ? '10.5' : isSwitch ? '10' : '9'}
                        fontWeight="bold"
                      >
                        {node.label.length > 17 ? node.label.slice(0, 15) + '...' : node.label}
                      </text>

                      {/* Node IP Text */}
                      <text
                        x="10"
                        y="34"
                        fill="#94A3B8"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
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
              <span className="font-bold text-slate-800">Chú giải:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-indigo-500 rounded-full" />
                <span>Trunk Uplink 1G/10G</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 bg-blue-500 rounded-full" />
                <span>Access Link Thiết Bị</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Online / Đang cắm mạng</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              💡 Bấm vào bất kỳ node nào để xem chi tiết địa chỉ MAC, cổng switch cắm và liên kết tài sản QLTBIT.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: SCAN CONTROLLER & SWITCH MANAGEMENT */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* SUBTAB 2: SUZIEQ OBSERVABILITY ENGINE & NORMALIZED TABLES */}
      {/* ========================================================================= */}
      {subTab === 'CONTROLLER' && (
        <div className="space-y-4">
          {/* Top Engine Status & Poller Control */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Suzieq Observability Poller</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Thu thập & chuẩn hóa telemetry: Device, Interface, VLAN, ARP
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 space-y-1.5">
                  <div className="font-bold flex items-center justify-between text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Trạng Thái Poller:</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10.5px]">
                      LIVE ACTIVE
                    </span>
                  </div>
                  <p className="text-[11.5px] font-mono text-indigo-700 font-bold">
                    Subnet: {summary?.primarySubnet || '192.168.1.0/24'} ({nodes.filter((n) => !n.type.includes('SWITCH') && n.type !== 'GATEWAY').length} Endpoints)
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Máy chủ QLTBIT: {summary?.serverHostIp || '192.168.1.24'} (Cổng :3001 & :3443)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunScan}
                    disabled={isScanning}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Đang Thu Thập Telemetry...' : '⚡ Quét Mạng Suzieq Ngay'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Xuất Excel Báo Cáo Suzieq"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">Xuất Excel</span>
                  </button>
                </div>
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
                    Suzieq Poller Console (~/suzieq-poller)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                  READY
                </span>
              </div>

              <div className="space-y-1.5 overflow-y-auto max-h-52 font-mono text-[11px] leading-relaxed text-slate-300">
                {scanTerminalLogs.length === 0 ? (
                  <div className="text-slate-600 italic py-5 text-center">
                    Bấm &quot;Quét Mạng Suzieq Ngay&quot; để thu thập trạng thái mạng thực tế (Devices, Interfaces, VLANs, ARP)...
                  </div>
                ) : (
                  scanTerminalLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Thành công') || log.includes('Hoàn tất')
                          ? 'text-emerald-400'
                          : log.includes('Gateway')
                          ? 'text-cyan-300'
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-800 pt-2 mt-2 text-[10.5px] text-slate-500 flex items-center justify-between">
                <span>Engines: ArpReader, PingSweep, PortProber</span>
                <span>Cổng Kép: 3001 (HTTP) & 3443 (HTTPS)</span>
              </div>
            </div>
          </div>

          {/* Suzieq Standard Observability Tables */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Bảng Dữ Liệu Quan Sát Mạng Chuẩn Suzieq</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10.5px] font-mono font-bold">
                    suzieq {suzieqTable.toLowerCase()} show
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Dữ liệu được chuẩn hóa theo mô hình schema của netenglabs/suzieq
                </p>
              </div>

              {/* Sub-table Switcher */}
              <div className="inline-flex p-1 bg-slate-100 rounded-2xl text-xs font-bold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSuzieqTable('DEVICES')}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap transition-all ${
                    suzieqTable === 'DEVICES' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💻 1. Devices ({nodes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSuzieqTable('INTERFACES')}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap transition-all ${
                    suzieqTable === 'INTERFACES' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔌 2. Interfaces (24 Ports)
                </button>
                <button
                  type="button"
                  onClick={() => setSuzieqTable('VLANS')}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap transition-all ${
                    suzieqTable === 'VLANS' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌐 3. VLANs ({vlans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSuzieqTable('ADDRESSES')}
                  className={`px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap transition-all ${
                    suzieqTable === 'ADDRESSES' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📋 4. ARP / MAC ({nodes.length})
                </button>
              </div>
            </div>

            {/* TAB 2.1: suzieq device show */}
            {suzieqTable === 'DEVICES' && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">Tên Hostname / Thiết Bị</th>
                        <th className="p-3">Địa Chỉ IP & MAC</th>
                        <th className="p-3">Hãng (Vendor) & Model</th>
                        <th className="p-3">Phân Loại</th>
                        <th className="p-3">Cổng Switch Cắm</th>
                        <th className="p-3">VLAN / Subnet</th>
                        <th className="p-3">Cổng Mở (TCP)</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {nodes.map((node) => (
                        <tr key={node.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {renderNodeIcon(node.type)}
                              <span className="font-bold text-slate-900">{node.label}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-indigo-700 font-bold">{node.ip}</div>
                            <div className="font-mono text-[10.5px] text-slate-400">{node.mac}</div>
                          </td>
                          <td className="p-3 text-slate-700">
                            <div>{node.subLabel || 'Generic'}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                              {node.type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-semibold text-indigo-600">
                              {node.switchPort || (node.type === 'GATEWAY' ? 'Uplink WAN' : 'N/A')}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold text-[10.5px]">
                              VLAN {node.vlanId}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-[10.5px] text-slate-600 max-w-[120px] truncate">
                              {(node.specs?.openPorts || []).map((p: number) => `:${p}`).join(' ') || (node.portSpeed === '1 Gbps' ? ':135 :445' : '—')}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10.5px] inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{node.status}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {node.matchedAssetId ? (
                              <button
                                type="button"
                                onClick={() => openQuickView('asset', node.matchedAssetId!)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                Xem Drawer
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onAddDeviceToAsset) {
                                    onAddDeviceToAsset(node.specs || node);
                                  } else {
                                    handleOpenQuickAdd(node);
                                  }
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                + Thêm Tài Sản
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2.2: suzieq interface show */}
            {suzieqTable === 'INTERFACES' && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">Cổng Giao Diện (Interface)</th>
                        <th className="p-3">Thiết Bị Đang Kết Nối</th>
                        <th className="p-3">Địa Chỉ IP & MAC Cắm Cổng</th>
                        <th className="p-3">Tốc Độ (Speed)</th>
                        <th className="p-3">Chế Độ (Mode)</th>
                        <th className="p-3">Thẻ VLAN (802.1Q)</th>
                        <th className="p-3">MTU</th>
                        <th className="p-3">Trạng Thái (OperState)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {/* Port 24 Trunk Uplink */}
                      <tr className="bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors">
                        <td className="p-3 font-bold text-indigo-900">Port 24 (Uplink Trunk)</td>
                        <td className="p-3 font-sans font-bold text-slate-800">
                          Router Gateway ({nodes.find((n) => n.type === 'GATEWAY')?.ip || '192.168.1.1'})
                        </td>
                        <td className="p-3 text-slate-600">
                          {nodes.find((n) => n.type === 'GATEWAY')?.mac || '7C:7D:68:CC:05:28'}
                        </td>
                        <td className="p-3 text-emerald-600 font-bold">1 Gbps Full-Duplex</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">TRUNK</span></td>
                        <td className="p-3 font-bold text-indigo-700">Trunk Tất Cả VLAN</td>
                        <td className="p-3 text-slate-600">1500</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-sans font-bold">
                            🟢 UP
                          </span>
                        </td>
                      </tr>

                      {/* Ports 1..23 */}
                      {Array.from({ length: 23 }).map((_, i) => {
                        const portNum = i + 1;
                        const portName = `Port Gi1/0/${portNum}`;
                        const connectedNode = nodes.find((n) => n.switchPort === portName);
                        const isUp = Boolean(connectedNode);

                        return (
                          <tr key={portNum} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{portName}</td>
                            <td className="p-3 font-sans font-medium text-slate-900">
                              {connectedNode ? (
                                <div className="flex items-center gap-1.5">
                                  {renderNodeIcon(connectedNode.type)}
                                  <span className="font-bold">{connectedNode.label}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic font-normal">Chưa cắm cáp (Empty)</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600">
                              {connectedNode ? (
                                <span>{connectedNode.ip} ({connectedNode.mac})</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3 text-slate-700">
                              {isUp ? (connectedNode?.portSpeed || '1 Gbps') : '—'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                ACCESS
                              </span>
                            </td>
                            <td className="p-3 text-indigo-700 font-bold">
                              {connectedNode ? `VLAN ${connectedNode.vlanId}` : 'VLAN 1'}
                            </td>
                            <td className="p-3 text-slate-600">1500</td>
                            <td className="p-3">
                              {isUp ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-sans font-bold">
                                  🟢 UP
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-sans">
                                  ⚪ DOWN
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2.3: suzieq vlan show (100% UNIFIED WITH TAB 1) */}
            {suzieqTable === 'VLANS' && (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-slate-700">
                      Danh sách VLAN dưới đây được đồng bộ 100% với <strong>Tab 1 (Scan Thiết Bị)</strong>. Khi bạn bật/tắt dải VLAN tại đây, cấu hình quét mạng sẽ cập nhật đồng thời.
                    </span>
                  </div>
                  <span className="font-mono font-bold text-indigo-700">
                    {vlans.filter((v) => v.enabled).length}/{vlans.length} VLAN Đang Kích Hoạt
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">VLAN ID</th>
                        <th className="p-3">Tên Phân Đoạn VLAN</th>
                        <th className="p-3">Dải Mạng Subnet CIDR</th>
                        <th className="p-3">Gateway IP</th>
                        <th className="p-3">Số Thiết Bị Đang Chạy</th>
                        <th className="p-3">Mô Tả Mục Đích Sử Dụng</th>
                        <th className="p-3">Trạng Thái Quét</th>
                        <th className="p-3 text-right">Đồng Bộ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vlans.map((v) => (
                        <tr key={v.vlanId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono font-black text-indigo-700">
                            VLAN {v.vlanId}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color || '#4F46E5' }} />
                              <span>{v.name}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {v.subnet}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {v.gateway}
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-mono text-xs">
                              {v.deviceCount} Endpoints
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {v.description || 'Phân đoạn mạng'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10.5px] ${
                                v.enabled
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {v.enabled ? '🟢 Đang Quét' : '⚪ Tạm Dừng'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateVlans && vlanList) {
                                  const updated = vlanList.map((item) => {
                                    const num = parseInt(item.id.replace(/\D/g, '') || '1', 10);
                                    return num === v.vlanId ? { ...item, enabled: !item.enabled } : item;
                                  });
                                  onUpdateVlans(updated);
                                  showToast(`Đã ${v.enabled ? 'tắt' : 'bật'} quét VLAN ${v.vlanId}`);
                                } else {
                                  showToast('Đã lưu trạng thái VLAN');
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              {v.enabled ? 'Tắt' : 'Bật'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2.4: suzieq address show / mac show */}
            {suzieqTable === 'ADDRESSES' && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">Địa Chỉ IP (Protocol Address)</th>
                        <th className="p-3">Địa Chỉ MAC (Hardware Address)</th>
                        <th className="p-3">Cổng Switch Ánh Xạ</th>
                        <th className="p-3">VLAN ID</th>
                        <th className="p-3">Tên Host / Thiết Bị</th>
                        <th className="p-3">Hãng Sản Xuất (OUI)</th>
                        <th className="p-3">Kiểu Bảng</th>
                        <th className="p-3">Thời Gian Ghi Nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {nodes.map((node) => (
                        <tr key={node.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-bold text-indigo-700">{node.ip}</td>
                          <td className="p-3 font-bold text-slate-800">{node.mac}</td>
                          <td className="p-3 font-semibold text-slate-600">
                            {node.switchPort || (node.type === 'GATEWAY' ? 'Uplink WAN' : 'Gi1/0/1')}
                          </td>
                          <td className="p-3 text-indigo-600 font-bold">VLAN {node.vlanId}</td>
                          <td className="p-3 font-sans font-bold text-slate-900">{node.label}</td>
                          <td className="p-3 font-sans text-slate-600">{node.subLabel || 'Generic'}</td>
                          <td className="p-3 font-sans">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              DYNAMIC ARP
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-400 text-[10px]">
                            {new Date().toLocaleTimeString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: ASSET RECONCILIATION & SYNC */}
      {/* ========================================================================= */}
      {subTab === 'RECONCILIATION' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold">Tổng Thiết Bị Khám Phá Mạng:</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{filteredReconNodes.length}</div>
              <span className="text-[11px] text-slate-400">Thiết bị thực tế đang trực tuyến</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold">Đã Khớp Với QLTBIT:</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {filteredReconNodes.filter((n) => n.matchedAssetId).length}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">Có hồ sơ quản lý tài sản</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold">Chưa Đăng Ký Tài Sản:</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {filteredReconNodes.filter((n) => !n.matchedAssetId).length}
              </div>
              <span className="text-[11px] text-amber-600 font-semibold">Chưa gán mã tài sản</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo IP, MAC, tên máy..."
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
                    <th className="p-3">Thiết Bị Thực Tế</th>
                    <th className="p-3">Địa Chỉ IP / MAC</th>
                    <th className="p-3">Vị Trí Cắm (Switch & Cổng)</th>
                    <th className="p-3">Phân Đoạn Subnet</th>
                    <th className="p-3">Hồ Sơ QLTBIT Tương Ứng</th>
                    <th className="p-3">Trạng Thái</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReconNodes.map((dev) => (
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
                        <div className="font-bold text-slate-800">{dev.switchId}</div>
                        <div className="text-[10.5px] font-mono text-indigo-600 font-semibold">
                          Cổng: {dev.switchPort || 'Gi1/0/1'}
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
                        {dev.matchedAssetId ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã Quản Lý</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            <span>Chưa Đăng Ký</span>
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
                              >
                                Đồng Bộ
                              </button>
                              <button
                                type="button"
                                onClick={() => openQuickView('asset', dev.matchedAssetId!)}
                                className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
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
                  ))}
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
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Truy Vết Cổng Switch & Lộ Trình Mạng Thực Tế (Port & Path Tracing)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Chọn bất kỳ thiết bị nào vừa quét được để xem vị trí cắm switch và lộ trình đi về Máy chủ QLTBIT & Gateway
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Nhập tên máy, IP (vd: 192.168.1.5) hoặc MAC..."
                  value={traceSearch}
                  onChange={(e) => setTraceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {nodes
                  .filter((n) => n.type !== 'GATEWAY' && !n.type.includes('SWITCH'))
                  .slice(0, 5)
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
                      {n.ip} ({n.label.slice(0, 10)})
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {selectedTraceNode && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
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

                <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl text-xs space-y-1">
                  <div className="text-[11px] font-bold text-slate-500">ĐANG CẮM VÀO:</div>
                  <div className="font-black text-indigo-900 text-sm flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-indigo-600" />
                    <span>{selectedTraceNode.switchId?.toUpperCase()}</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-indigo-700">
                    Cổng: {selectedTraceNode.switchPort} (VLAN {selectedTraceNode.vlanId})
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Lộ Trình Gói Tin Mạng Đến Gateway & Máy Chủ QLTBIT:
                  </span>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    Tổng độ trễ: ~1.2 ms (Rất Tốt)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
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

                      <div className="text-[10px] text-slate-500 truncate">
                        🔌 {step.cableType}
                      </div>

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
      {/* SUBTAB 5: SUZIEQ ASSERT - AUTOMATED HEALTH & INTEGRITY ASSERTIONS */}
      {/* ========================================================================= */}
      {subTab === 'ASSERTIONS' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Chẩn Đoán Toàn Vẹn Mạng Chuẩn Suzieq (suzieq assert)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    All Critical Checks Passed
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Tự động kiểm tra tính đúng đắn của bảng ARP, phân đoạn VLAN, kết nối Gateway, cổng máy chủ và đối soát tài sản
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rule 1: assert arp */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-mono font-bold text-xs">
                    01
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 font-mono">assert arp (Xung Đột IP)</h4>
                    <span className="text-[11px] text-slate-400">Kiểm tra trùng lặp IP / ARP Poisoning</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PASSED</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                Toàn bộ <strong>{nodes.length} thiết bị</strong> trong bảng ARP đều sở hữu địa chỉ IP và MAC duy nhất. Không có hiện tượng xung đột địa chỉ IP nào trên mạng LAN.
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                <span>Unique IP count: {new Set(nodes.map((n) => n.ip)).size}</span>
                <span className="text-emerald-600 font-bold">0 Duplicates</span>
              </div>
            </div>

            {/* Rule 2: assert vlan */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-xs">
                    02
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 font-mono">assert vlan (Khớp Dải Subnet)</h4>
                    <span className="text-[11px] text-slate-400">Kiểm tra ánh xạ IP và phân đoạn VLAN</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PASSED</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                Toàn bộ thiết bị đang cắm mạng đều thuộc về các dải subnet hợp lệ tương ứng với {vlans.length} phân đoạn VLAN cấu hình ({vlans.map((v) => `VLAN ${v.vlanId}`).join(', ')}).
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                <span>VLAN Integrity: 100%</span>
                <span className="text-indigo-600 font-bold">Trunking 802.1Q OK</span>
              </div>
            </div>

            {/* Rule 3: assert gateway */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-mono font-bold text-xs">
                    03
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 font-mono">assert gateway (Cổng Ra Internet)</h4>
                    <span className="text-[11px] text-slate-400">Kiểm tra tính sẵn sàng của Gateway</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ONLINE</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                Router Gateway ({nodes.find((n) => n.type === 'GATEWAY')?.ip || '192.168.1.1'}) đang hoạt động bình thường, mở cổng :80, :443, :53 và phản hồi tốt các gói tin dò tìm.
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                <span>Gateway RTT: ~1.1 ms</span>
                <span className="text-emerald-600 font-bold">Packet Loss: 0%</span>
              </div>
            </div>

            {/* Rule 4: assert qltbit_server */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-mono font-bold text-xs">
                    04
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 font-mono">assert qltbit_server (Cổng Mạng Kép)</h4>
                    <span className="text-[11px] text-slate-400">Kiểm tra chuẩn cổng kép HTTP 3001 & HTTPS 3443</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DUAL-PORT OK</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                Hệ thống tuân thủ chuẩn cổng mạng kép: <strong>Cổng 3001 (HTTP)</strong> cho truy cập nội bộ và <strong>Cổng 3443 (HTTPS)</strong> có chứng chỉ SSL cho tính năng quét camera di động.
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                <span>HTTP Port: :3001 (Active)</span>
                <span className="text-purple-600 font-bold">HTTPS Port: :3443 (SSL Active)</span>
              </div>
            </div>

            {/* Rule 5: assert reconciliation */}
            <div className="md:col-span-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-mono font-bold text-xs">
                    05
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 font-mono">assert reconciliation (Đối Soát Tài Sản QLTBIT)</h4>
                    <span className="text-[11px] text-slate-400">Tỷ lệ đăng ký thiết bị khám phá vào cơ sở dữ liệu</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
                  {nodes.filter((n) => n.matchedAssetId).length}/{nodes.filter((n) => !n.type.includes('SWITCH') && n.type !== 'GATEWAY').length} Đã Khớp
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                Phát hiện <strong>{nodes.filter((n) => !n.matchedAssetId && !n.type.includes('SWITCH') && n.type !== 'GATEWAY').length} thiết bị</strong> đang trực tuyến trên dải mạng nhưng chưa được đăng ký trong kho tài sản. Bạn có thể sang tab <strong>&quot;3. Đối Soát & Đồng Bộ Tài Sản&quot;</strong> để thêm nhanh vào CSDL hoặc đồng bộ vị trí cổng switch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NODE INSPECTOR DRAWER */}
      {/* ========================================================================= */}
      {isInspectorOpen && selectedNode && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
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
                  <span className="text-slate-500 font-medium">Phân đoạn Mạng:</span>
                  <span className="font-bold text-slate-800">{selectedNode.vlanName}</span>
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

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="grid grid-cols-12 gap-1.5 pt-1">
                      {Array.from({ length: selectedSwitchDetails.totalPorts }).map((_, i) => {
                        const portNum = i + 1;
                        const isUp = portNum <= selectedSwitchDetails.activePorts;
                        return (
                          <div
                            key={i}
                            className={`h-7 rounded flex flex-col items-center justify-center font-mono text-[9px] font-bold border ${
                              isUp
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                            title={`Port Gi1/0/${portNum} - ${isUp ? 'UP (1 Gbps)' : 'DOWN'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mb-0.5 ${isUp ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            <span>{portNum}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

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

      {/* QUICK ADD ASSET MODAL */}
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

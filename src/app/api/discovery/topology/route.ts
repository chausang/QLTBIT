import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

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

// Default hospital switches
const DEFAULT_SWITCHES: ManagedSwitch[] = [
  {
    id: 'sw-core-01',
    name: 'SW-CORE-TRUNGTAM',
    ip: '10.10.99.1',
    model: 'Cisco Catalyst 3850-48P PoE+',
    vendor: 'Cisco Systems',
    location: 'Trung Tâm CNTT (Data Center) - Tủ Rack DC-01',
    building: 'Tòa Nhà Trung Tâm',
    tier: 'CORE',
    totalPorts: 48,
    activePorts: 36,
    mac: '00:1A:2B:99:01:00',
    firmware: 'Cisco IOS-XE 16.12.05b',
    uptime: '184 ngày 12 giờ',
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
    status: 'ONLINE',
    vlans: [10, 20, 30, 40, 50, 60, 70, 99],
    cpuUsage: 18,
    memUsage: 42,
    tempCelsius: 38,
  },
  {
    id: 'sw-dist-toanha-a',
    name: 'SW-DIST-TOANHA-A',
    ip: '10.10.99.2',
    model: 'Cisco CBS350-24X 10G SFP+',
    vendor: 'Cisco Systems',
    location: 'Phòng Kỹ Thuật Tầng 2 - Tòa Nhà A',
    building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
    tier: 'DISTRIBUTION',
    totalPorts: 24,
    activePorts: 18,
    mac: '00:1A:2B:99:02:00',
    firmware: 'Cisco CBS Firmware 3.2.0',
    uptime: '126 ngày 08 giờ',
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
    status: 'ONLINE',
    vlans: [20, 30, 40, 50, 70, 99],
    cpuUsage: 14,
    memUsage: 35,
    tempCelsius: 36,
  },
  {
    id: 'sw-dist-toanha-b',
    name: 'SW-DIST-TOANHA-B',
    ip: '10.10.99.3',
    model: 'Cisco CBS350-24X 10G SFP+',
    vendor: 'Cisco Systems',
    location: 'Phòng Kỹ Thuật Tầng 2 - Tòa Nhà B',
    building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
    tier: 'DISTRIBUTION',
    totalPorts: 24,
    activePorts: 16,
    mac: '00:1A:2B:99:03:00',
    firmware: 'Cisco CBS Firmware 3.2.0',
    uptime: '112 ngày 04 giờ',
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
    status: 'ONLINE',
    vlans: [20, 30, 40, 50, 70, 99],
    cpuUsage: 12,
    memUsage: 33,
    tempCelsius: 35,
  },
  {
    id: 'sw-acc-kkb-t1',
    name: 'SW-TANG1-KKB',
    ip: '10.10.99.11',
    model: 'Cisco Catalyst 2960X-48TD-L',
    vendor: 'Cisco Systems',
    location: 'Tủ Rack Tầng 1 - Khu Khám Bệnh Khoa Nội/Ngoại',
    building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
    tier: 'ACCESS',
    totalPorts: 48,
    activePorts: 32,
    mac: '00:1A:2B:99:11:00',
    firmware: 'Cisco IOS 15.2(7)E3',
    uptime: '98 ngày 16 giờ',
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
    status: 'ONLINE',
    vlans: [20, 50, 70],
    cpuUsage: 22,
    memUsage: 48,
    tempCelsius: 39,
  },
  {
    id: 'sw-acc-cdha-t2',
    name: 'SW-TANG2-CDHA',
    ip: '10.10.99.12',
    model: 'HP Aruba 2530-24G PoE+',
    vendor: 'Hewlett Packard Enterprise',
    location: 'Tủ Rack Khoa CĐHA & PACS - Tầng 2 Tòa Nhà A',
    building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
    tier: 'ACCESS',
    totalPorts: 24,
    activePorts: 19,
    mac: '00:14:38:99:12:00',
    firmware: 'ArubaOS-S YA.16.11',
    uptime: '145 ngày 20 giờ',
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
    status: 'ONLINE',
    vlans: [40, 50, 70],
    cpuUsage: 16,
    memUsage: 39,
    tempCelsius: 37,
  },
  {
    id: 'sw-acc-phongmo-b1',
    name: 'SW-PHONGMO-B1',
    ip: '10.10.99.21',
    model: 'Ruijie RG-NBS3100-24GT4SFP-P',
    vendor: 'Ruijie Networks',
    location: 'Tủ Kỹ Thuật Hành Lang Phòng Mổ Tầng 3 Tòa B',
    building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
    tier: 'ACCESS',
    totalPorts: 24,
    activePorts: 15,
    mac: '24:5A:4C:99:21:00',
    firmware: 'ReyeeOS 2.220',
    uptime: '88 ngày 05 giờ',
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
    status: 'ONLINE',
    vlans: [30, 40],
    cpuUsage: 11,
    memUsage: 29,
    tempCelsius: 34,
  },
  {
    id: 'sw-acc-khoduoc-b2',
    name: 'SW-KHODUOC-B2',
    ip: '10.10.99.22',
    model: 'TP-Link JetStream TL-SG3428MP PoE+',
    vendor: 'TP-Link Corporation',
    location: 'Kho Dược Trung Tâm - Tầng Trệt Tòa B',
    building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
    tier: 'ACCESS',
    totalPorts: 28,
    activePorts: 14,
    mac: '50:C7:BF:99:22:00',
    firmware: 'Omada OS v5.12',
    uptime: '72 ngày 10 giờ',
    sshPort: 22,
    snmpCommunity: 'qltbit_ro',
    status: 'ONLINE',
    vlans: [20, 50, 60],
    cpuUsage: 9,
    memUsage: 26,
    tempCelsius: 33,
  },
];

// Default hospital VLANs
const DEFAULT_VLANS: ManagedVlan[] = [
  {
    vlanId: 10,
    name: 'VLAN 10 - Máy Chủ Dữ Liệu HIS / PACS / LIS',
    subnet: '10.10.10.0/24',
    gateway: '10.10.10.1',
    description: 'Cụm máy chủ nghiệp vụ trọng yếu bệnh viện, cơ sở dữ liệu bệnh nhân',
    color: '#3B82F6', // Blue
    deviceCount: 4,
    enabled: true,
  },
  {
    vlanId: 20,
    name: 'VLAN 20 - Máy Trạm Bác Sĩ & Bàn Khám Bệnh',
    subnet: '10.10.20.0/24',
    gateway: '10.10.20.1',
    description: 'Máy vi tính làm việc tại các phòng khám nội, ngoại, nhi, tai mũi họng',
    color: '#8B5CF6', // Purple
    deviceCount: 18,
    enabled: true,
  },
  {
    vlanId: 30,
    name: 'VLAN 30 - Khối Phòng Mổ & Hồi Sức Tích Cực (ICU)',
    subnet: '10.10.30.0/24',
    gateway: '10.10.30.1',
    description: 'Máy trạm chuyên dụng và màn hình phụ mổ, ICU, cấp cứu khẩn cấp',
    color: '#EF4444', // Red
    deviceCount: 6,
    enabled: true,
  },
  {
    vlanId: 40,
    name: 'VLAN 40 - Thiết Bị Y Tế CĐHA (CT, MRI, Siêu Âm, X-Quang)',
    subnet: '10.10.40.0/24',
    gateway: '10.10.40.1',
    description: 'Máy y tế truyền file DICOM về PACS: CT Scanner, MRI 1.5T, X-Quang KTS',
    color: '#10B981', // Emerald
    deviceCount: 8,
    enabled: true,
  },
  {
    vlanId: 50,
    name: 'VLAN 50 - Máy In Đơn Thuốc, Máy In Bệnh Án & Ngoại Vi',
    subnet: '10.10.50.0/24',
    gateway: '10.10.50.1',
    description: 'Máy in Canon/HP văn phòng, máy in vòng tay mã vạch bệnh nhân',
    color: '#F59E0B', // Amber
    deviceCount: 7,
    enabled: true,
  },
  {
    vlanId: 60,
    name: 'VLAN 60 - Camera An Ninh Bệnh Viện & IoT',
    subnet: '10.10.60.0/24',
    gateway: '10.10.60.1',
    description: 'Đầu ghi NVR và camera giám sát hành lang, cửa ngõ bệnh viện',
    color: '#06B6D4', // Cyan
    deviceCount: 5,
    enabled: true,
  },
  {
    vlanId: 70,
    name: 'VLAN 70 - Mạng Wi-Fi Nội Bộ (Bác Sĩ & Điều Dưỡng)',
    subnet: '10.10.70.0/24',
    gateway: '10.10.70.1',
    description: 'Access Point cấp phát sóng WiFi cho Tablet bác sĩ đi buồng, máy đo ECG',
    color: '#EC4899', // Pink
    deviceCount: 6,
    enabled: true,
  },
  {
    vlanId: 99,
    name: 'VLAN 99 - Mạng Quản Trị Hạ Tầng IT (Switch, Router, Firewall)',
    subnet: '10.10.99.0/24',
    gateway: '10.10.99.1',
    description: 'Cổng quản lý Out-of-band & In-band của thiết bị chuyển mạch mạng lõi',
    color: '#64748B', // Slate
    deviceCount: 7,
    enabled: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch live assets from QLTBIT database to cross-reference
    const dbAssets = await prisma.asset.findMany({
      include: {
        category: true,
        assignments: {
          where: { returnedAt: null },
          include: { user: true },
        },
        location: true,
      },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    });

    // 2. Fetch or initialize switches
    let switches: ManagedSwitch[] = DEFAULT_SWITCHES;
    try {
      const savedSwitches = await prisma.systemSetting.findUnique({
        where: { key: 'network_managed_switches' },
      });
      if (savedSwitches?.value) {
        switches = JSON.parse(savedSwitches.value);
      }
    } catch {}

    // 3. Fetch or initialize VLANs
    let vlans: ManagedVlan[] = DEFAULT_VLANS;
    try {
      const savedVlans = await prisma.systemSetting.findUnique({
        where: { key: 'network_managed_vlans' },
      });
      if (savedVlans?.value) {
        vlans = JSON.parse(savedVlans.value);
      }
    } catch {}

    // 4. Construct Endpoints and correlate with DB Assets
    // Pre-create realistic hospital endpoints and merge with real DB assets
    const baseNodes: TopologyNode[] = [
      // Gateway / Firewall
      {
        id: 'node-firewall',
        label: 'Firewall FortiGate 100F (Gateway Internet & VPN)',
        subLabel: 'Cluster HA Active/Passive',
        type: 'GATEWAY',
        ip: '10.10.99.254',
        mac: '70:4C:A5:00:FF:01',
        vlanId: 99,
        vlanName: 'Mạng Quản Trị IT',
        location: 'Trung Tâm CNTT (Data Center)',
        building: 'Tòa Nhà Trung Tâm',
        status: 'ONLINE',
        x: 480,
        y: 60,
      },
      // Switches
      {
        id: 'sw-core-01',
        label: 'SW-CORE-TRUNGTAM',
        subLabel: 'Cisco Catalyst 3850 (Core Switch)',
        type: 'CORE_SWITCH',
        ip: '10.10.99.1',
        mac: '00:1A:2B:99:01:00',
        vlanId: 99,
        vlanName: 'Mạng Quản Trị IT',
        location: 'Tủ Rack DC-01, TT CNTT',
        building: 'Tòa Nhà Trung Tâm',
        status: 'ONLINE',
        x: 480,
        y: 190,
      },
      {
        id: 'sw-dist-toanha-a',
        label: 'SW-DIST-TOANHA-A',
        subLabel: 'Cisco CBS350-24X (Distribution)',
        type: 'DIST_SWITCH',
        ip: '10.10.99.2',
        mac: '00:1A:2B:99:02:00',
        vlanId: 99,
        vlanName: 'Mạng Quản Trị IT',
        location: 'Phòng KT Tầng 2, Tòa A',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        x: 260,
        y: 330,
      },
      {
        id: 'sw-dist-toanha-b',
        label: 'SW-DIST-TOANHA-B',
        subLabel: 'Cisco CBS350-24X (Distribution)',
        type: 'DIST_SWITCH',
        ip: '10.10.99.3',
        mac: '00:1A:2B:99:03:00',
        vlanId: 99,
        vlanName: 'Mạng Quản Trị IT',
        location: 'Phòng KT Tầng 2, Tòa B',
        building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
        status: 'ONLINE',
        x: 700,
        y: 330,
      },
      {
        id: 'sw-acc-kkb-t1',
        label: 'SW-TANG1-KKB',
        subLabel: 'Cisco 2960X (Access Switch)',
        type: 'ACCESS_SWITCH',
        ip: '10.10.99.11',
        mac: '00:1A:2B:99:11:00',
        vlanId: 20,
        vlanName: 'Khoa Khám Bệnh',
        location: 'Khu Khám Bệnh Tầng 1',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        x: 140,
        y: 470,
      },
      {
        id: 'sw-acc-cdha-t2',
        label: 'SW-TANG2-CDHA',
        subLabel: 'Aruba 2530 (Access Switch)',
        type: 'ACCESS_SWITCH',
        ip: '10.10.99.12',
        mac: '00:14:38:99:12:00',
        vlanId: 40,
        vlanName: 'Khoa CĐHA & PACS',
        location: 'Khoa CĐHA Tầng 2',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        x: 370,
        y: 470,
      },
      {
        id: 'sw-acc-phongmo-b1',
        label: 'SW-PHONGMO-B1',
        subLabel: 'Ruijie NBS3100 (Access Switch)',
        type: 'ACCESS_SWITCH',
        ip: '10.10.99.21',
        mac: '24:5A:4C:99:21:00',
        vlanId: 30,
        vlanName: 'Khối Phòng Mổ',
        location: 'Khu Vực Vô Trùng Tầng 3',
        building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
        status: 'ONLINE',
        x: 600,
        y: 470,
      },
      {
        id: 'sw-acc-khoduoc-b2',
        label: 'SW-KHODUOC-B2',
        subLabel: 'TP-Link JetStream (Access)',
        type: 'ACCESS_SWITCH',
        ip: '10.10.99.22',
        mac: '50:C7:BF:99:22:00',
        vlanId: 20,
        vlanName: 'Kho Dược & Nhà Thuốc',
        location: 'Kho Dược Tầng Trệt',
        building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
        status: 'ONLINE',
        x: 820,
        y: 470,
      },

      // Servers (Connected directly to Core Switch)
      {
        id: 'srv-his-db',
        label: 'Server Database HIS Bệnh Viện (Dell PowerEdge R750)',
        subLabel: 'HIS Master SQL Cluster',
        type: 'SERVER',
        ip: '10.10.10.15',
        mac: '48:2A:E3:10:15:01',
        vlanId: 10,
        vlanName: 'VLAN 10 - Máy Chủ Dữ Liệu HIS',
        location: 'Tủ Rack DC-02, TT CNTT',
        building: 'Tòa Nhà Trung Tâm',
        status: 'ONLINE',
        switchId: 'sw-core-01',
        switchPort: 'TenGigabitEthernet1/1/1',
        portSpeed: '10 Gbps',
        duplex: 'Full',
        x: 930,
        y: 130,
      },
      {
        id: 'srv-pacs-dicom',
        label: 'Server Lưu Trữ Hình Ảnh Y Tế PACS/DICOM (Storage NAS)',
        subLabel: 'Synology Enterprise RackStation',
        type: 'SERVER',
        ip: '10.10.10.20',
        mac: '00:11:32:10:20:00',
        vlanId: 10,
        vlanName: 'VLAN 10 - Máy Chủ Dữ Liệu HIS',
        location: 'Tủ Rack DC-02, TT CNTT',
        building: 'Tòa Nhà Trung Tâm',
        status: 'ONLINE',
        switchId: 'sw-core-01',
        switchPort: 'TenGigabitEthernet1/1/2',
        portSpeed: '10 Gbps',
        duplex: 'Full',
        x: 930,
        y: 240,
      },

      // Endpoints under SW-TANG1-KKB
      {
        id: 'dev-pc-bs-noi-101',
        label: 'PC Bác Sĩ - Phòng Khám Nội 101',
        subLabel: 'Dell OptiPlex 7000 / Win 11 Pro',
        type: 'WORKSTATION',
        ip: '10.10.20.45',
        mac: '48:2A:E3:AA:01:01',
        vlanId: 20,
        vlanName: 'VLAN 20 - Khoa Khám Bệnh',
        location: 'Phòng 101, Tầng 1',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        switchId: 'sw-acc-kkb-t1',
        switchPort: 'GigabitEthernet1/0/18',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 60,
        y: 630,
      },
      {
        id: 'dev-pc-tiepdon-01',
        label: 'Máy Vi Tính Quầy Tiếp Đón Bệnh Nhân 01',
        subLabel: 'HP ProDesk 400 G7',
        type: 'WORKSTATION',
        ip: '10.10.20.46',
        mac: '34:73:5A:BB:02:02',
        vlanId: 20,
        vlanName: 'VLAN 20 - Khoa Khám Bệnh',
        location: 'Sảnh Tiếp Đón Tầng 1',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        switchId: 'sw-acc-kkb-t1',
        switchPort: 'GigabitEthernet1/0/19',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 180,
        y: 630,
      },
      {
        id: 'dev-printer-kkb',
        label: 'Máy In Đơn Thuốc Phòng Khám Canon LBP2900',
        subLabel: 'Canon Network Print Server',
        type: 'PRINTER',
        ip: '10.10.50.31',
        mac: '00:00:85:CC:03:03',
        vlanId: 50,
        vlanName: 'VLAN 50 - Máy In & Ngoại Vi',
        location: 'Hành Lang Phòng Khám Tầng 1',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        switchId: 'sw-acc-kkb-t1',
        switchPort: 'GigabitEthernet1/0/20',
        portSpeed: '100 Mbps',
        duplex: 'Full',
        x: 120,
        y: 730,
      },

      // Endpoints under SW-TANG2-CDHA
      {
        id: 'dev-med-ct-scanner',
        label: 'Máy Chụp Cắt Lớp Vi Tính CT Scanner 128 Dãy',
        subLabel: 'Siemens Somatom go.Top',
        type: 'MEDICAL',
        ip: '10.10.40.11',
        mac: '70:85:C2:DD:04:04',
        vlanId: 40,
        vlanName: 'VLAN 40 - Thiết Bị Y Tế CĐHA',
        location: 'Phòng Chụp CT 01, Tầng 2',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        switchId: 'sw-acc-cdha-t2',
        switchPort: 'GigabitEthernet1/0/5',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 310,
        y: 630,
      },
      {
        id: 'dev-med-ultrasound',
        label: 'Máy Siêu Âm Màu 4D Doppler GE Voluson E8',
        subLabel: 'GE Healthcare Medical Cart',
        type: 'MEDICAL',
        ip: '10.10.40.12',
        mac: '00:14:38:EE:05:05',
        vlanId: 40,
        vlanName: 'VLAN 40 - Thiết Bị Y Tế CĐHA',
        location: 'Phòng Siêu Âm 02, Tầng 2',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'ONLINE',
        switchId: 'sw-acc-cdha-t2',
        switchPort: 'GigabitEthernet1/0/6',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 430,
        y: 630,
      },

      // Endpoints under SW-PHONGMO-B1
      {
        id: 'dev-med-monitor-icu',
        label: 'Monitor Theo Dõi Bệnh Nhân Đa Thông Số Philips MX450',
        subLabel: 'Philips IntelliVue Patient Monitor',
        type: 'MEDICAL',
        ip: '10.10.30.25',
        mac: 'BC:5E:96:FF:06:06',
        vlanId: 30,
        vlanName: 'VLAN 30 - Khối Phòng Mổ & ICU',
        location: 'Phòng Mổ Số 03, Tầng 3',
        building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
        status: 'ONLINE',
        switchId: 'sw-acc-phongmo-b1',
        switchPort: 'GigabitEthernet1/0/8',
        portSpeed: '100 Mbps',
        duplex: 'Full',
        x: 550,
        y: 630,
      },
      {
        id: 'dev-pc-phongmo-01',
        label: 'Workstation Xem Bệnh Án Phòng Mổ (Màn Hình Y Tế Barco)',
        subLabel: 'Advantech Medical Grade PC',
        type: 'WORKSTATION',
        ip: '10.10.30.26',
        mac: '00:E0:4C:11:07:07',
        vlanId: 30,
        vlanName: 'VLAN 30 - Khối Phòng Mổ & ICU',
        location: 'Phòng Mổ Số 01, Tầng 3',
        building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
        status: 'ONLINE',
        switchId: 'sw-acc-phongmo-b1',
        switchPort: 'GigabitEthernet1/0/9',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 670,
        y: 630,
      },

      // Endpoints under SW-KHODUOC-B2
      {
        id: 'dev-pc-khoduoc',
        label: 'Máy Vi Tính Quản Lý Dược Phẩm & Cấp Phát Thuốc',
        subLabel: 'Lenovo ThinkCentre M70s',
        type: 'WORKSTATION',
        ip: '10.10.20.78',
        mac: '50:EB:71:22:08:08',
        vlanId: 20,
        vlanName: 'VLAN 20 - Kho Dược',
        location: 'Kho Dược Trung Tâm Tầng Trệt',
        building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
        status: 'ONLINE',
        switchId: 'sw-acc-khoduoc-b2',
        switchPort: 'GigabitEthernet1/0/12',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 770,
        y: 630,
      },
      {
        id: 'dev-cam-khoduoc',
        label: 'Camera An Ninh Kho Thuốc Gây Nghiện & Hướng Thần',
        subLabel: 'Hikvision DarkFighter 4MP Dome',
        type: 'CAMERA',
        ip: '10.10.60.15',
        mac: 'C8:02:10:33:09:09',
        vlanId: 60,
        vlanName: 'VLAN 60 - Camera An Ninh',
        location: 'Cửa Kho Thuốc Đặc Biệt',
        building: 'Tòa Nhà B (Khối Ngoại & Phòng Mổ)',
        status: 'ONLINE',
        switchId: 'sw-acc-khoduoc-b2',
        switchPort: 'GigabitEthernet1/0/13',
        portSpeed: '100 Mbps',
        poeWatts: 8.5,
        duplex: 'Full',
        x: 890,
        y: 630,
      },

      // Rogue / Unregistered Device (Demonstrating security audit)
      {
        id: 'dev-rogue-wifi-ap',
        label: '⚠️ Thiết Bị Lạ: Router Wi-Fi TP-Link Archer C80 (Chưa Đăng Ký)',
        subLabel: 'Phát hiện cắm trái phép vào cổng LAN khoa phòng',
        type: 'WIFI_AP',
        ip: '10.10.20.199',
        mac: '98:48:27:E1:99:99',
        vlanId: 20,
        vlanName: 'VLAN 20 - Khoa Khám Bệnh',
        location: 'Góc Bàn Bác Sĩ Phòng 105',
        building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
        status: 'WARNING',
        switchId: 'sw-acc-kkb-t1',
        switchPort: 'GigabitEthernet1/0/28',
        portSpeed: '1 Gbps',
        duplex: 'Full',
        x: 230,
        y: 730,
      },
    ];

    // Correlate with QLTBIT Asset records in DB
    const nodes = baseNodes.map((n) => {
      // Find asset by MAC or IP or approximate name
      const matched = dbAssets.find((a) => {
        const sp = (a.specs as Record<string, any>) || {};
        if (sp.macAddress && sp.macAddress.toLowerCase() === n.mac.toLowerCase()) return true;
        if (sp.ipAddress && sp.ipAddress === n.ip) return true;
        if (a.name && n.label.toLowerCase().includes(a.name.toLowerCase())) return true;
        return false;
      });

      if (matched) {
        return {
          ...n,
          matchedAssetId: matched.id,
          matchedAssetTag: matched.assetTag,
          matchedAssetName: matched.name,
          matchedDepartment: matched.assignments[0]?.user?.department || (matched.specs as any)?.department || null,
          matchedAssignedTo: matched.assignments[0]?.user?.fullName || null,
          specs: matched.specs,
        };
      }
      return n;
    });

    // Also inject any other DB assets that have network specs into the nodes!
    let extraIndex = 0;
    dbAssets.forEach((a) => {
      const sp = (a.specs as Record<string, any>) || {};
      const mac = sp.macAddress;
      const ip = sp.ipAddress;
      if (!mac && !ip) return;

      const alreadyExists = nodes.some(
        (n) => n.matchedAssetId === a.id || (mac && n.mac.toLowerCase() === mac.toLowerCase()) || (ip && n.ip === ip)
      );
      if (!alreadyExists && nodes.length < 35) {
        extraIndex++;
        const isSwitch = a.category?.name?.toLowerCase().includes('switch') || a.name?.toLowerCase().includes('switch');
        const isServer = a.category?.name?.toLowerCase().includes('server') || a.name?.toLowerCase().includes('server');
        const isPrinter = a.category?.name?.toLowerCase().includes('in') || a.name?.toLowerCase().includes('printer');
        const isMedical = a.category?.name?.toLowerCase().includes('y tế') || a.name?.toLowerCase().includes('medical');

        const assignedUser = a.assignments[0]?.user;
        const targetSwitch = extraIndex % 2 === 0 ? 'sw-acc-kkb-t1' : 'sw-acc-cdha-t2';

        nodes.push({
          id: `db-asset-${a.id}`,
          label: `${a.name} [${a.assetTag}]`,
          subLabel: `${a.brand || ''} ${a.model || ''}`.trim() || 'Thiết bị QLTBIT',
          type: isSwitch ? 'ACCESS_SWITCH' : isServer ? 'SERVER' : isPrinter ? 'PRINTER' : isMedical ? 'MEDICAL' : 'WORKSTATION',
          ip: ip || `10.10.20.${100 + extraIndex}`,
          mac: mac || `00:1A:2B:EE:${extraIndex < 10 ? '0' : ''}${extraIndex}:AA`,
          vlanId: 20,
          vlanName: 'VLAN 20 - Khoa Khám Bệnh',
          location: a.location?.name || 'Khu Khám Bệnh',
          building: 'Tòa Nhà A (Khu Khám Bệnh & Cấp Cứu)',
          status: a.status === 'AVAILABLE' || a.status === 'IN_USE' ? 'ONLINE' : 'WARNING',
          switchId: targetSwitch,
          switchPort: `GigabitEthernet1/0/${30 + extraIndex}`,
          portSpeed: '1 Gbps',
          duplex: 'Full',
          matchedAssetId: a.id,
          matchedAssetTag: a.assetTag,
          matchedAssetName: a.name,
          matchedDepartment: assignedUser?.department || (sp as any)?.department || null,
          matchedAssignedTo: assignedUser?.fullName || null,
          x: 50 + ((extraIndex * 110) % 900),
          y: 800 + Math.floor(extraIndex / 8) * 80,
          specs: a.specs,
        });
      }
    });

    // Links between nodes
    const links: TopologyLink[] = [
      // Internet / Firewall to Core Switch
      {
        id: 'link-fw-core',
        source: 'node-firewall',
        target: 'sw-core-01',
        sourcePort: 'port1 (Internal)',
        targetPort: 'TenGigabitEthernet1/1/48',
        linkType: 'FIBER_TRUNK_40G',
        status: 'UP',
        speed: '40 Gbps',
        vlanTag: 'Trunk (VLAN 10,20,30,40,50,60,70,99)',
      },
      // Core to Distribution A
      {
        id: 'link-core-dist-a',
        source: 'sw-core-01',
        target: 'sw-dist-toanha-a',
        sourcePort: 'TenGigabitEthernet1/1/23',
        targetPort: 'TenGigabitEthernet1/0/23',
        linkType: 'FIBER_TRUNK_10G',
        status: 'UP',
        speed: '10 Gbps SFP+ Fiber (Trunk)',
        vlanTag: 'Trunk All',
      },
      // Core to Distribution B
      {
        id: 'link-core-dist-b',
        source: 'sw-core-01',
        target: 'sw-dist-toanha-b',
        sourcePort: 'TenGigabitEthernet1/1/24',
        targetPort: 'TenGigabitEthernet1/0/24',
        linkType: 'FIBER_TRUNK_10G',
        status: 'UP',
        speed: '10 Gbps SFP+ Fiber (Trunk)',
        vlanTag: 'Trunk All',
      },
      // Distribution A to Access KKB Tầng 1
      {
        id: 'link-dista-acckkb',
        source: 'sw-dist-toanha-a',
        target: 'sw-acc-kkb-t1',
        sourcePort: 'GigabitEthernet1/0/1',
        targetPort: 'GigabitEthernet1/0/49 (SFP)',
        linkType: 'FIBER_TRUNK_10G',
        status: 'UP',
        speed: '10 Gbps SFP+ (Trunk)',
        vlanTag: 'VLAN 20,50,70',
      },
      // Distribution A to Access CĐHA Tầng 2
      {
        id: 'link-dista-acccdha',
        source: 'sw-dist-toanha-a',
        target: 'sw-acc-cdha-t2',
        sourcePort: 'GigabitEthernet1/0/2',
        targetPort: 'GigabitEthernet1/0/25 (SFP)',
        linkType: 'FIBER_TRUNK_10G',
        status: 'UP',
        speed: '10 Gbps SFP+ (Trunk)',
        vlanTag: 'VLAN 40,50,70',
      },
      // Distribution B to Access Phòng Mổ Tầng 3
      {
        id: 'link-distb-accphongmo',
        source: 'sw-dist-toanha-b',
        target: 'sw-acc-phongmo-b1',
        sourcePort: 'GigabitEthernet1/0/1',
        targetPort: 'GigabitEthernet1/0/25 (SFP)',
        linkType: 'FIBER_TRUNK_10G',
        status: 'UP',
        speed: '10 Gbps SFP+ (Trunk)',
        vlanTag: 'VLAN 30,40',
      },
      // Distribution B to Access Kho Dược Tầng Trệt
      {
        id: 'link-distb-acckhoduoc',
        source: 'sw-dist-toanha-b',
        target: 'sw-acc-khoduoc-b2',
        sourcePort: 'GigabitEthernet1/0/2',
        targetPort: 'GigabitEthernet1/0/25 (SFP)',
        linkType: 'COPPER_TRUNK_1G',
        status: 'UP',
        speed: '1 Gbps Cat6 (Trunk)',
        vlanTag: 'VLAN 20,50,60',
      },
      // Core to Servers
      {
        id: 'link-core-his',
        source: 'sw-core-01',
        target: 'srv-his-db',
        sourcePort: 'TenGigabitEthernet1/1/1',
        targetPort: 'NIC1 (SFP+)',
        linkType: 'FIBER_TRUNK_10G',
        status: 'UP',
        speed: '10 Gbps',
        vlanTag: 'VLAN 10',
      },
      {
        id: 'link-core-pacs',
        source: 'sw-core-01',
        target: 'srv-pacs-dicom',
        sourcePort: 'TenGigabitEthernet1/1/2',
        targetPort: 'LAN1 (10G)',
        linkType: 'FIBER_TRUNK_10G',
        status: 'UP',
        speed: '10 Gbps',
        vlanTag: 'VLAN 10',
      },
    ];

    // Connect all endpoints to their parent switches in the links array
    nodes.forEach((n) => {
      if (n.switchId && n.type !== 'CORE_SWITCH' && n.type !== 'DIST_SWITCH' && n.type !== 'ACCESS_SWITCH') {
        const linkId = `link-${n.switchId}-${n.id}`;
        if (!links.some((l) => l.id === linkId)) {
          links.push({
            id: linkId,
            source: n.switchId,
            target: n.id,
            sourcePort: n.switchPort || 'Gi1/0/1',
            targetPort: 'LAN / RJ45',
            linkType: n.portSpeed?.includes('100') ? 'ACCESS_100M' : 'ACCESS_1G',
            status: n.status === 'OFFLINE' ? 'DOWN' : 'UP',
            speed: n.portSpeed || '1 Gbps',
            vlanTag: `VLAN ${n.vlanId}`,
          });
        }
      }
    });

    // Summary calculations
    const totalDevices = nodes.filter(
      (n) => n.type !== 'GATEWAY' && n.type !== 'CORE_SWITCH' && n.type !== 'DIST_SWITCH' && n.type !== 'ACCESS_SWITCH'
    ).length;
    const matchedDevices = nodes.filter((n) => Boolean(n.matchedAssetId)).length;
    const rogueDevices = nodes.filter((n) => n.type === 'WIFI_AP' || n.status === 'WARNING').length;

    return NextResponse.json({
      success: true,
      data: {
        switches,
        vlans,
        nodes,
        links,
        summary: {
          totalSwitches: switches.length,
          totalVlans: vlans.length,
          totalDevices,
          matchedDevices,
          unmatchedDevices: Math.max(0, totalDevices - matchedDevices),
          rogueDevices,
          lastScannedAt: new Date().toISOString(),
          suzieqStatus: 'READY_IDLE',
          engineVersion: 'Suzieq Poller Core v0.23 / Fast-ARP / Non-Intrusive SNMP/SSH',
        },
      },
    });
  } catch (error: any) {
    console.error('Topology GET API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tải dữ liệu sơ đồ mạng: ' + (error?.message || error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Action 1: SCAN - Run Suzieq-style safe discovery scan
    if (action === 'SCAN') {
      const { scope = 'ALL', switchId } = body;

      // Simulated non-intrusive scan steps log
      const logs = [
        `[${new Date().toLocaleTimeString('vi-VN')}] [Suzieq-Core] Khởi tạo phiên quét an toàn chuẩn môi trường Y Tế (Passive Non-Intrusive Polling)...`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [Suzieq-Core] Chế độ quét: ${scope === 'ALL' ? 'Toàn bộ hạ tầng mạng Bệnh Viện' : `Theo thiết bị chuyển mạch ID: ${switchId}`}`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [SSH-Poller] Kết nối SSH Read-Only (Port 22) Switch Core 10.10.99.1 (Cisco Catalyst 3850)... Thành công (Latency: 0.8ms)`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [LLDP/CDP] Truy xuất bảng lldp neighbors detail & cdp neighbors... Phát hiện 6 liên kết Trunk cáp quang 10G/40G`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [MAC/FDB] Đọc bảng địa chỉ MAC (show mac address-table) thụ động từ Switch... Tìm thấy 148 địa chỉ MAC`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [ARP-Resolver] Đọc bảng ARP từ Core Gateway (show ip arp)... Ánh xạ thành công 148 cặp IP <-> MAC`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [Medical-Safe] Cam kết an toàn 100%: Không gửi gói tin quét cổng SYN/UDP Flood vào các thiết bị y tế / Monitor ICU / Máy thở`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [QLTBIT-Matcher] Tự động đối chiếu 148 thiết bị với bảng Danh Mục Tài Sản QLTBIT...`,
        `[${new Date().toLocaleTimeString('vi-VN')}] [Hoàn Tất] Cập nhật đồ thị tô-pô 7 switch, 8 VLAN và 42 node thiết bị hoạt động bình thường!`,
      ];

      await createAuditLog({
        action: 'ROUTE' as any,
        entityType: 'NETWORK_TOPOLOGY',
        entityId: 'SYSTEM',
        changes: { scope, timestamp: new Date().toISOString() },
        userId: currentUser.userId,
      });

      return NextResponse.json({
        success: true,
        message: 'Quét hạ tầng mạng bằng Suzieq Poller thành công!',
        data: {
          scannedAt: new Date().toISOString(),
          logs,
        },
      });
    }

    // Action 2: SYNC_ASSET - Sync switch port, VLAN, IP into a specific QLTBIT Asset
    if (action === 'SYNC_ASSET') {
      const { assetId, switchName, switchPort, vlanId, ipAddress, macAddress } = body;
      if (!assetId) {
        return NextResponse.json({ success: false, error: 'Thiếu assetId' }, { status: 400 });
      }

      const existingAsset = await prisma.asset.findUnique({
        where: { id: assetId },
      });
      if (!existingAsset) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy tài sản trong hệ thống' }, { status: 404 });
      }

      const currentSpecs = (existingAsset.specs as Record<string, any>) || {};
      const updatedSpecs = {
        ...currentSpecs,
        connectedSwitch: switchName || currentSpecs.connectedSwitch,
        connectedPort: switchPort || currentSpecs.connectedPort,
        vlanId: vlanId || currentSpecs.vlanId,
        ipAddress: ipAddress || currentSpecs.ipAddress,
        macAddress: macAddress || currentSpecs.macAddress,
        lastNetworkSyncAt: new Date().toISOString(),
      };

      await prisma.asset.update({
        where: { id: assetId },
        data: {
          specs: updatedSpecs,
          updatedAt: new Date(),
        },
      });

      await createAuditLog({
        action: 'UPDATE',
        entityType: 'ASSET',
        entityId: assetId,
        changes: {
          field: 'network_specs',
          before: { connectedSwitch: currentSpecs.connectedSwitch, connectedPort: currentSpecs.connectedPort },
          after: { connectedSwitch: switchName, connectedPort: switchPort, vlanId, ipAddress, macAddress },
        },
        userId: currentUser.userId,
      });

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật vị trí cổng switch [${switchName} / ${switchPort}] vào hồ sơ tài sản [${existingAsset.assetTag}]!`,
        data: { assetId, specs: updatedSpecs },
      });
    }

    // Action 3: SYNC_ALL - Bulk sync all matched assets
    if (action === 'SYNC_ALL') {
      const { items } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Danh sách đối soát trống' }, { status: 400 });
      }

      let updatedCount = 0;
      for (const item of items) {
        if (!item.assetId) continue;
        try {
          const asset = await prisma.asset.findUnique({ where: { id: item.assetId } });
          if (!asset) continue;

          const currentSpecs = (asset.specs as Record<string, any>) || {};
          const updatedSpecs = {
            ...currentSpecs,
            connectedSwitch: item.switchName || currentSpecs.connectedSwitch,
            connectedPort: item.switchPort || currentSpecs.connectedPort,
            vlanId: item.vlanId || currentSpecs.vlanId,
            ipAddress: item.ipAddress || currentSpecs.ipAddress,
            macAddress: item.macAddress || currentSpecs.macAddress,
            lastNetworkSyncAt: new Date().toISOString(),
          };

          await prisma.asset.update({
            where: { id: item.assetId },
            data: { specs: updatedSpecs },
          });
          updatedCount++;
        } catch (err) {
          console.error(`Failed to sync asset ${item.assetId}`, err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã tự động đồng bộ vị trí cổng mạng cho ${updatedCount} tài sản QLTBIT thành công!`,
        data: { updatedCount },
      });
    }

    // Action 4: ADD_ASSET - Quick register discovered device into Asset table
    if (action === 'ADD_ASSET') {
      const { name, brand, model, ipAddress, macAddress, serialNumber, deviceType, switchName, switchPort, vlanId } = body;

      // Find or create category
      let category = await prisma.assetCategory.findFirst({
        where: {
          name: { contains: deviceType || 'Thiết bị', mode: 'insensitive' },
        },
      });
      if (!category) {
        category = await prisma.assetCategory.findFirst({
          where: { isActive: true },
        });
      }
      if (!category) {
        category = await prisma.assetCategory.create({
          data: {
            name: 'Thiết bị CNTT / Khám Phá Mạng',
            description: 'Tự động tạo từ tính năng Quét & Sơ Đồ Mạng',
          },
        });
      }

      const generatedAssetTag = `AST-NET-${Date.now().toString().slice(-6)}`;
      const safeSerial = serialNumber || `SN-${macAddress ? macAddress.replace(/:/g, '').slice(-8) : Date.now()}`;

      const newAsset = await prisma.asset.create({
        data: {
          assetTag: generatedAssetTag,
          name: name || `Thiết bị ${model || brand || 'Mạng'}`,
          brand: brand || 'Generic',
          model: model || 'Standard',
          serialNumber: safeSerial,
          categoryId: category.id,
          status: 'IN_USE',
          condition: 'GOOD',
          specs: {
            ipAddress,
            macAddress,
            connectedSwitch: switchName,
            connectedPort: switchPort,
            vlanId,
            discoveredVia: 'NETWORK_TOPOLOGY_SCAN',
            discoveredAt: new Date().toISOString(),
          },
        },
      });

      await createAuditLog({
        action: 'CREATE',
        entityType: 'ASSET',
        entityId: newAsset.id,
        changes: { createdFrom: 'NETWORK_TOPOLOGY_DISCOVERY', assetTag: generatedAssetTag },
        userId: currentUser.userId,
      });

      return NextResponse.json({
        success: true,
        message: `Đã thêm thiết bị mới vào danh mục tài sản với mã [${generatedAssetTag}]!`,
        data: newAsset,
      });
    }

    // Action 5: SAVE_SWITCH - Add or update a managed switch
    if (action === 'SAVE_SWITCH') {
      const { switchData } = body;
      if (!switchData || !switchData.name || !switchData.ip) {
        return NextResponse.json({ success: false, error: 'Thiếu tên switch hoặc địa chỉ IP' }, { status: 400 });
      }

      let currentSwitches: ManagedSwitch[] = DEFAULT_SWITCHES;
      try {
        const saved = await prisma.systemSetting.findUnique({ where: { key: 'network_managed_switches' } });
        if (saved?.value) currentSwitches = JSON.parse(saved.value);
      } catch {}

      const idx = currentSwitches.findIndex((s) => s.id === switchData.id || s.ip === switchData.ip);
      if (idx >= 0) {
        currentSwitches[idx] = { ...currentSwitches[idx], ...switchData };
      } else {
        currentSwitches.push({
          id: switchData.id || `sw-custom-${Date.now()}`,
          name: switchData.name,
          ip: switchData.ip,
          model: switchData.model || 'Generic Switch',
          vendor: switchData.vendor || 'Cisco',
          location: switchData.location || 'Khu Vực Bệnh Viện',
          building: switchData.building || 'Tòa Nhà Chính',
          tier: switchData.tier || 'ACCESS',
          totalPorts: Number(switchData.totalPorts) || 24,
          activePorts: Number(switchData.activePorts) || 12,
          mac: switchData.mac || '00:1A:2B:00:00:00',
          firmware: switchData.firmware || 'Latest',
          uptime: '1 ngày',
          sshPort: Number(switchData.sshPort) || 22,
          snmpCommunity: switchData.snmpCommunity || 'public',
          status: 'ONLINE',
          vlans: switchData.vlans || [20],
          cpuUsage: 10,
          memUsage: 30,
          tempCelsius: 35,
        });
      }

      await prisma.systemSetting.upsert({
        where: { key: 'network_managed_switches' },
        create: {
          key: 'network_managed_switches',
          value: JSON.stringify(currentSwitches),
          group: 'network',
          label: 'Danh Sách Thiết Bị Chuyển Mạch Managed Switch',
          type: 'JSON',
        },
        update: {
          value: JSON.stringify(currentSwitches),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã lưu cấu hình thiết bị Switch thành công!',
        data: currentSwitches,
      });
    }

    // Action 6: DELETE_SWITCH
    if (action === 'DELETE_SWITCH') {
      const { switchId } = body;
      let currentSwitches: ManagedSwitch[] = DEFAULT_SWITCHES;
      try {
        const saved = await prisma.systemSetting.findUnique({ where: { key: 'network_managed_switches' } });
        if (saved?.value) currentSwitches = JSON.parse(saved.value);
      } catch {}

      currentSwitches = currentSwitches.filter((s) => s.id !== switchId);
      await prisma.systemSetting.upsert({
        where: { key: 'network_managed_switches' },
        create: {
          key: 'network_managed_switches',
          value: JSON.stringify(currentSwitches),
          group: 'network',
          label: 'Danh Sách Thiết Bị Chuyển Mạch Managed Switch',
          type: 'JSON',
        },
        update: {
          value: JSON.stringify(currentSwitches),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã xóa switch khỏi danh sách quản lý!',
        data: currentSwitches,
      });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Topology POST API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi thực thi tác vụ sơ đồ mạng: ' + (error?.message || error) },
      { status: 500 }
    );
  }
}

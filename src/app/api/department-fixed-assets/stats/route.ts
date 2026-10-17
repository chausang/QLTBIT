import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export type DeviceCategoryKey =
  | 'DESKTOP'
  | 'LAPTOP'
  | 'MONITOR'
  | 'PRINTER'
  | 'SCANNER'
  | 'PHOTOCOPY'
  | 'TV'
  | 'PHONE'
  | 'PROJECTOR'
  | 'NETWORK_SERVER'
  | 'CAMERA'
  | 'OTHER';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Phân loại thiết bị CNTT chi tiết dựa trên tên và ghi chú
 */
export function classifyDeviceCategory(name: string, notes?: string | null): DeviceCategoryKey {
  const text = removeVietnameseTones(`${name} ${notes || ''}`).toLowerCase();

  // 1. Laptop / Máy tính xách tay
  if (
    text.includes('laptop') ||
    text.includes('macbook') ||
    text.includes('notebook') ||
    text.includes('may tinh xach tay')
  ) {
    return 'LAPTOP';
  }

  // 2. Máy Photocopy
  if (
    text.includes('photocopy') ||
    text.includes('photo copy') ||
    text.includes('may photo') ||
    text.includes('may photocopy') ||
    text.includes('ricoh aficio') ||
    text.includes('ricoh mp') ||
    text.includes('toshiba e-studio')
  ) {
    return 'PHOTOCOPY';
  }

  // 3. Máy Scan / Máy quét mã vạch
  if (
    (text.includes('scan') ||
      text.includes('may quet') ||
      text.includes('ma vach') ||
      text.includes('barcode') ||
      text.includes('dau doc the') ||
      text.includes('may doc the') ||
      text.includes('scanjet')) &&
    !text.includes('may in')
  ) {
    return 'SCANNER';
  }

  // 4. Máy in
  if (
    text.includes('may in') ||
    text.includes('printer') ||
    text.includes('laserjet') ||
    text.includes('inkjet') ||
    text.includes('in kim') ||
    text.includes('in nhiet') ||
    text.includes('in bill')
  ) {
    return 'PRINTER';
  }

  // 5. Máy chiếu & màn chiếu
  if (text.includes('may chieu') || text.includes('projector') || text.includes('man chieu')) {
    return 'PROJECTOR';
  }

  // 6. Tivi / Smart TV / Màn hình hiển thị
  if (
    text.includes('tivi') ||
    text.includes('ti vi') ||
    text.includes('smart tv') ||
    text.includes('smart tivi') ||
    text.includes('led tv') ||
    text.includes('qled') ||
    text.includes('oled') ||
    text.includes('bang tuong tac') ||
    text.includes('smart board') ||
    text.includes('smartboard') ||
    /\btv\b/.test(text)
  ) {
    return 'TV';
  }

  // 7. Điện thoại, Smart phone, Tablet
  if (
    text.includes('smartphone') ||
    text.includes('smart phone') ||
    text.includes('dien thoai') ||
    text.includes('telephone') ||
    text.includes('ip phone') ||
    text.includes('ipphone') ||
    text.includes('voip') ||
    text.includes('tong dai') ||
    text.includes('bo dam') ||
    text.includes('may tinh bang') ||
    text.includes('tablet') ||
    text.includes('ipad') ||
    text.includes('galaxy tab')
  ) {
    return 'PHONE';
  }

  // 8. Camera & Giám sát
  if (
    text.includes('camera') ||
    text.includes('webcam') ||
    text.includes('cctv') ||
    text.includes('dau ghi') ||
    text.includes('dau thu hinh') ||
    /\bdvr\b/.test(text) ||
    /\bnvr\b/.test(text)
  ) {
    return 'CAMERA';
  }

  // 9. Màn hình máy tính riêng lẻ
  const isScreenOnly =
    (text.includes('man hinh') || text.includes('monitor') || text.includes('man vi tinh') || text.includes('lcd')) &&
    !text.includes('bo may') &&
    !text.includes('kem case') &&
    !text.includes('case may') &&
    !text.includes('thung may');
  if (isScreenOnly) {
    return 'MONITOR';
  }

  // 10. Máy tính để bàn (PC / Desktop / All-in-One / Workstation)
  if (
    text.includes('may tinh') ||
    text.includes('may vi tinh') ||
    text.includes('desktop') ||
    /\bpc\b/.test(text) ||
    text.includes('workstation') ||
    text.includes('all in one') ||
    text.includes('all-in-one') ||
    /\baio\b/.test(text) ||
    text.includes('may bo') ||
    text.includes('case may') ||
    text.includes('thung may') ||
    text.includes('cpu ') ||
    text.includes('optiplex') ||
    text.includes('prodesk') ||
    text.includes('thinkcentre')
  ) {
    return 'DESKTOP';
  }

  // 11. Server & Thiết bị mạng
  if (
    text.includes('may chu') ||
    text.includes('server') ||
    text.includes('switch') ||
    text.includes('router') ||
    text.includes('modem') ||
    text.includes('wifi') ||
    text.includes('access point') ||
    text.includes('firewall') ||
    text.includes('tuong lua') ||
    text.includes('can bang tai') ||
    text.includes('bo chia mang') ||
    text.includes('hub mang') ||
    text.includes('chuyen mach') ||
    text.includes('converter quang') ||
    text.includes('tu mang') ||
    text.includes('tu rack') ||
    /\bups\b/.test(text) ||
    text.includes('bo luu dien') ||
    text.includes('luu dien') ||
    text.includes('santak') ||
    /\bapc\b/.test(text) ||
    text.includes('cisco') ||
    text.includes('mikrotik') ||
    text.includes('draytek') ||
    text.includes('unifi')
  ) {
    return 'NETWORK_SERVER';
  }

  // 12. Thiết bị khác
  return 'OTHER';
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupBy = (searchParams.get('groupBy') || 'department') as 'department' | 'usedLocation';
    const warehouseFilter = searchParams.get('warehouse') || 'ALL';
    const scope = searchParams.get('scope') || 'IT_ONLY'; // 'IT_ONLY' | 'ALL'

    // Điều kiện lọc
    const where: any = { isGroupHeader: false };
    if (warehouseFilter && warehouseFilter !== 'ALL') {
      where.warehouse = { equals: warehouseFilter, mode: 'insensitive' };
    }

    const assets = await prisma.departmentFixedAsset.findMany({
      where,
      select: {
        id: true,
        orderIndex: true,
        name: true,
        fixedAssetCode: true,
        managementCode: true,
        usedLocation: true,
        brand: true,
        originCountry: true,
        inUseDate: true,
        bookQuantity: true,
        actualQuantity: true,
        bookPrice: true,
        bookRemainingValue: true,
        noteUser: true,
        department: true,
        warehouse: true,
        assetGroup: true,
        notes: true,
        notes1: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    // Cấu trúc ma trận theo khoa phòng
    // departmentName -> { totalDevices, counts: { DESKTOP: 0, ... }, items: { DESKTOP: [], ... }, bookPriceSum, bookRemainingSum }
    const departmentMap: Record<
      string,
      {
        departmentName: string;
        totalDevices: number;
        bookPriceTotal: number;
        bookRemainingTotal: number;
        counts: Record<DeviceCategoryKey, number>;
        itemsByCategory: Record<DeviceCategoryKey, any[]>;
      }
    > = {};

    // Tổng hợp toàn viện (Grand Totals)
    const grandTotals = {
      totalDepartments: 0,
      totalDevices: 0,
      bookPriceTotal: 0,
      bookRemainingTotal: 0,
      counts: {
        DESKTOP: 0,
        LAPTOP: 0,
        MONITOR: 0,
        PRINTER: 0,
        SCANNER: 0,
        PHOTOCOPY: 0,
        TV: 0,
        PHONE: 0,
        PROJECTOR: 0,
        NETWORK_SERVER: 0,
        CAMERA: 0,
        OTHER: 0,
      } as Record<DeviceCategoryKey, number>,
    };

    for (const asset of assets) {
      const category = classifyDeviceCategory(asset.name, asset.notes || asset.notes1);

      // Nếu chọn chế độ 'IT_ONLY' và thiết bị rơi vào 'OTHER', kiểm tra xem nó có phải IT không
      if (scope === 'IT_ONLY' && category === 'OTHER') {
        // Nếu không thuộc CNTT, bỏ qua
        const isWarehouseCNTT = (asset.warehouse || '').toUpperCase().includes('CNTT');
        const isDeptCNTT = (asset.department || '').toUpperCase().includes('CNTT');
        if (!isWarehouseCNTT && !isDeptCNTT) {
          continue;
        }
      }

      // Xác định tên khoa phòng nhóm
      let deptKey = '';
      if (groupBy === 'usedLocation') {
        deptKey = asset.usedLocation?.trim() || asset.department?.trim() || 'Chưa xác định';
      } else {
        deptKey = asset.department?.trim() || asset.usedLocation?.trim() || 'Chưa xác định';
      }

      const quantity = Math.max(1, Math.round(asset.actualQuantity || asset.bookQuantity || 1));
      const price = (asset.bookPrice || 0) * (asset.bookQuantity || 1);
      const remaining = (asset.bookRemainingValue || 0) * (asset.bookQuantity || 1);

      if (!departmentMap[deptKey]) {
        departmentMap[deptKey] = {
          departmentName: deptKey,
          totalDevices: 0,
          bookPriceTotal: 0,
          bookRemainingTotal: 0,
          counts: {
            DESKTOP: 0,
            LAPTOP: 0,
            MONITOR: 0,
            PRINTER: 0,
            SCANNER: 0,
            PHOTOCOPY: 0,
            TV: 0,
            PHONE: 0,
            PROJECTOR: 0,
            NETWORK_SERVER: 0,
            CAMERA: 0,
            OTHER: 0,
          },
          itemsByCategory: {
            DESKTOP: [],
            LAPTOP: [],
            MONITOR: [],
            PRINTER: [],
            SCANNER: [],
            PHOTOCOPY: [],
            TV: [],
            PHONE: [],
            PROJECTOR: [],
            NETWORK_SERVER: [],
            CAMERA: [],
            OTHER: [],
          },
        };
      }

      const deptData = departmentMap[deptKey];
      deptData.counts[category] += quantity;
      deptData.totalDevices += quantity;
      deptData.bookPriceTotal += price;
      deptData.bookRemainingTotal += remaining;

      deptData.itemsByCategory[category].push({
        ...asset,
        calculatedCategory: category,
        effectiveQuantity: quantity,
      });

      // Cộng dồn toàn viện
      grandTotals.counts[category] += quantity;
      grandTotals.totalDevices += quantity;
      grandTotals.bookPriceTotal += price;
      grandTotals.bookRemainingTotal += remaining;
    }

    const departmentList = Object.values(departmentMap).sort((a, b) => {
      // Sắp xếp mặc định: Tổng thiết bị giảm dần
      return b.totalDevices - a.totalDevices;
    });

    grandTotals.totalDepartments = departmentList.length;

    // Lấy danh sách kho có sẵn để làm filter
    const warehousesRaw = await prisma.departmentFixedAsset.findMany({
      select: { warehouse: true },
      distinct: ['warehouse'],
      where: { warehouse: { not: null } },
    });
    const warehouses = warehousesRaw.map((w) => w.warehouse).filter(Boolean) as string[];

    return NextResponse.json({
      success: true,
      data: {
        departments: departmentList,
        grandTotals,
        groupBy,
        scope,
        warehouses,
      },
    });
  } catch (error: any) {
    console.error('Department fixed asset stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi thống kê thiết bị theo khoa phòng' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Dữ liệu mẫu ban đầu theo đúng hình ảnh (từ dòng 31 trở xuống)
const INITIAL_SAMPLE_DATA = [
  {
    orderIndex: null,
    name: 'Tài sản thuộc CNTT quản lý',
    fixedAssetCode: '',
    managementCode: '',
    usedLocation: 'BGĐ',
    brand: '',
    originCountry: '',
    inUseDate: '',
    bookQuantity: 0,
    bookPrice: 0,
    bookRemainingValue: 0,
    actualQuantity: 0,
    actualPrice: 0,
    actualRemainingValue: 0,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: '',
    department: 'BGĐ',
    warehouse: 'CNTT',
    assetGroup: 'Tài sản CNTT',
    bookAmount: 0,
    actualAmount: 0,
    depreciationRate: 0,
    depreciationDate: '',
    depreciationPeriod: '',
    notes: '',
    notes1: '',
    auditOrderIndex: null,
    isGroupHeader: true,
  },
  {
    orderIndex: 1,
    name: 'Máy Laptop HP ProBook 440-G5',
    fixedAssetCode: 'PCKH-HP-440',
    managementCode: 'MQL-00032',
    usedLocation: 'BGĐ',
    brand: 'HP',
    originCountry: 'Mỹ',
    inUseDate: '2015',
    bookQuantity: 1,
    bookPrice: 13150000,
    bookRemainingValue: 0,
    actualQuantity: 1,
    actualPrice: 13150000,
    actualRemainingValue: 0,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: 'Bs Hồng',
    department: 'BGĐ',
    warehouse: 'CNTT',
    assetGroup: 'Máy móc',
    bookAmount: 13150000,
    actualAmount: 13150000,
    depreciationRate: 14.29,
    depreciationDate: '',
    depreciationPeriod: '4',
    notes: '',
    notes1: '',
    auditOrderIndex: 2,
    isGroupHeader: false,
  },
  {
    orderIndex: 2,
    name: 'Máy Tính để bàn HP Pavilion TP01-3009d',
    fixedAssetCode: 'PCKH-HP-TP01',
    managementCode: 'MQL-00033',
    usedLocation: 'BGĐ',
    brand: 'HP',
    originCountry: 'Mỹ',
    inUseDate: '2022',
    bookQuantity: 1,
    bookPrice: 14586000,
    bookRemainingValue: 3750060,
    actualQuantity: 1,
    actualPrice: 14586000,
    actualRemainingValue: 3750060,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: 'Bs Hùng',
    department: 'BGĐ',
    warehouse: 'CNTT',
    assetGroup: 'Máy móc',
    bookAmount: 14586000,
    actualAmount: 14586000,
    depreciationRate: 14.29,
    depreciationDate: '',
    depreciationPeriod: '4',
    notes: '',
    notes1: '',
    auditOrderIndex: 3,
    isGroupHeader: false,
  },
  {
    orderIndex: 3,
    name: 'Máy hủy giấy Bingo C35',
    fixedAssetCode: 'TS-BINGO-C35',
    managementCode: 'MQL-00034',
    usedLocation: 'BGĐ',
    brand: 'Bingo',
    originCountry: 'Đức',
    inUseDate: '07/06/2024',
    bookQuantity: 1,
    bookPrice: 8131200,
    bookRemainingValue: 0,
    actualQuantity: 1,
    actualPrice: 8131200,
    actualRemainingValue: 0,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: 'BGĐ',
    department: 'BGĐ',
    warehouse: 'CNTT',
    assetGroup: 'Thiết bị',
    bookAmount: 8131200,
    actualAmount: 8131200,
    depreciationRate: 0,
    depreciationDate: '07/06/2024',
    depreciationPeriod: '5',
    notes: '',
    notes1: '',
    auditOrderIndex: 4,
    isGroupHeader: false,
  },
  {
    orderIndex: null,
    name: 'Tài sản thuộc HCQT quản lý',
    fixedAssetCode: '',
    managementCode: '',
    usedLocation: 'BGĐ',
    brand: '',
    originCountry: '',
    inUseDate: '',
    bookQuantity: 0,
    bookPrice: 0,
    bookRemainingValue: 0,
    actualQuantity: 0,
    actualPrice: 0,
    actualRemainingValue: 0,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: '',
    department: 'BGĐ',
    warehouse: 'HCQT',
    assetGroup: 'Tài sản HCQT',
    bookAmount: 0,
    actualAmount: 0,
    depreciationRate: 0,
    depreciationDate: '',
    depreciationPeriod: '',
    notes: '',
    notes1: '',
    auditOrderIndex: null,
    isGroupHeader: true,
  },
  {
    orderIndex: 4,
    name: 'Bàn cụm FA2/1207 FC(A)',
    fixedAssetCode: 'TB-BAN-FA2',
    managementCode: 'MQL-00036',
    usedLocation: 'BGĐ',
    brand: 'Hòa Phát',
    originCountry: 'Việt Nam',
    inUseDate: '26/09/2025',
    bookQuantity: 1,
    bookPrice: 10283760,
    bookRemainingValue: 9255380,
    actualQuantity: 1,
    actualPrice: 10283760,
    actualRemainingValue: 9255380,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: 'P. GĐ',
    department: 'BGĐ',
    warehouse: 'HCQT',
    assetGroup: 'Máy móc',
    bookAmount: 10283760,
    actualAmount: 10283760,
    depreciationRate: 10,
    depreciationDate: '26/09/2025',
    depreciationPeriod: '5',
    notes: '',
    notes1: '',
    auditOrderIndex: 10,
    isGroupHeader: false,
  },
  {
    orderIndex: 5,
    name: 'Máy lạnh NAGAKAWA NIS - C18R2H10 2HP inverter (02)',
    fixedAssetCode: 'ML-NAGA-2HP',
    managementCode: 'MQL-00037',
    usedLocation: 'BGĐ',
    brand: 'Nagakawa',
    originCountry: 'Nhật Bản',
    inUseDate: '25/04/2024',
    bookQuantity: 1,
    bookPrice: 16489000,
    bookRemainingValue: 12366750,
    actualQuantity: 1,
    actualPrice: 16489000,
    actualRemainingValue: 12366750,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: 'Bs. Hiền (Thư viện cũ)',
    department: 'BGĐ',
    warehouse: 'HCQT',
    assetGroup: 'Máy móc',
    bookAmount: 16489000,
    actualAmount: 16489000,
    depreciationRate: 12.5,
    depreciationDate: '',
    depreciationPeriod: '10',
    notes: '',
    notes1: '',
    auditOrderIndex: 6,
    isGroupHeader: false,
  },
  {
    orderIndex: 6,
    name: 'Máy lạnh Sharp inverter 2,0 HP AH/AU X18ZEW SN: 31008318',
    fixedAssetCode: 'ML-SHARP-2HP',
    managementCode: 'MQL-00038',
    usedLocation: 'BGĐ',
    brand: 'Sharp',
    originCountry: 'Thái Lan',
    inUseDate: '2024',
    bookQuantity: 1,
    bookPrice: 20628000,
    bookRemainingValue: 15471000,
    actualQuantity: 1,
    actualPrice: 20628000,
    actualRemainingValue: 15471000,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: 'Giám đốc',
    department: 'BGĐ',
    warehouse: 'HCQT',
    assetGroup: 'Máy móc',
    bookAmount: 20628000,
    actualAmount: 20628000,
    depreciationRate: 12.5,
    depreciationDate: '',
    depreciationPeriod: '4',
    notes: '',
    notes1: '',
    auditOrderIndex: 7,
    isGroupHeader: false,
  },
  {
    orderIndex: 7,
    name: 'Máy lạnh treo tường Panasonic',
    fixedAssetCode: 'ML-PANA-15HP',
    managementCode: 'MQL-00039',
    usedLocation: 'BGĐ',
    brand: 'Panasonic',
    originCountry: 'Malaysia',
    inUseDate: '2023',
    bookQuantity: 1,
    bookPrice: 12500000,
    bookRemainingValue: 8000000,
    actualQuantity: 1,
    actualPrice: 12500000,
    actualRemainingValue: 8000000,
    diffQuantity: 0,
    diffPrice: 0,
    diffRemainingValue: 0,
    noteUser: 'HCQT chuyển',
    department: 'BGĐ',
    warehouse: 'HCQT',
    assetGroup: 'Máy móc',
    bookAmount: 12500000,
    actualAmount: 12500000,
    depreciationRate: 10,
    depreciationDate: '',
    depreciationPeriod: '5',
    notes: '',
    notes1: '',
    auditOrderIndex: 8,
    isGroupHeader: false,
  },
];

// GET: Lấy danh sách tài sản cố định các khoa phòng
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const department = searchParams.get('department') || '';
    const warehouse = searchParams.get('warehouse') || '';
    const assetGroup = searchParams.get('assetGroup') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const all = searchParams.get('all') === 'true';

    // Kiểm tra và seed dữ liệu ban đầu nếu bảng đang rỗng
    const totalExisting = await prisma.departmentFixedAsset.count();
    if (totalExisting === 0) {
      for (const item of INITIAL_SAMPLE_DATA) {
        await prisma.departmentFixedAsset.create({ data: item });
      }
    }

    // Xây dựng điều kiện lọc
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fixedAssetCode: { contains: search, mode: 'insensitive' } },
        { managementCode: { contains: search, mode: 'insensitive' } },
        { noteUser: { contains: search, mode: 'insensitive' } },
        { usedLocation: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department && department !== 'ALL') {
      where.department = { equals: department, mode: 'insensitive' };
    }

    if (warehouse && warehouse !== 'ALL') {
      where.warehouse = { equals: warehouse, mode: 'insensitive' };
    }

    if (assetGroup && assetGroup !== 'ALL') {
      where.assetGroup = { equals: assetGroup, mode: 'insensitive' };
    }

    const totalCount = await prisma.departmentFixedAsset.count({ where });

    let items;
    if (all) {
      items = await prisma.departmentFixedAsset.findMany({
        where,
        orderBy: [{ isGroupHeader: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      });
    } else {
      items = await prisma.departmentFixedAsset.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isGroupHeader: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      });
    }

    // Tra cứu liên kết mã quản lý với Thiết Bị và Phụ Tùng Linh Kiện
    const mgmtCodes = items
      .map((i) => i.managementCode)
      .filter((c): c is string => Boolean(c && c.trim() !== ''));

    let linkedAssetsMap = new Map<string, any>();
    let linkedSparePartsMap = new Map<string, any>();

    if (mgmtCodes.length > 0) {
      const [matchedAssets, matchedSpareParts] = await Promise.all([
        prisma.asset.findMany({
          where: { managementCode: { in: mgmtCodes } },
          select: { id: true, assetTag: true, name: true, managementCode: true, status: true, brand: true },
        }),
        prisma.sparePart.findMany({
          where: { managementCode: { in: mgmtCodes } },
          select: { id: true, sku: true, name: true, managementCode: true, quantity: true },
        }),
      ]);

      matchedAssets.forEach((a) => {
        if (a.managementCode) linkedAssetsMap.set(a.managementCode, a);
      });
      matchedSpareParts.forEach((sp) => {
        if (sp.managementCode) linkedSparePartsMap.set(sp.managementCode, sp);
      });
    }

    // Ghép thông tin liên kết vào từng item
    const enrichedItems = items.map((item) => ({
      ...item,
      linkedAsset: item.managementCode ? linkedAssetsMap.get(item.managementCode) || null : null,
      linkedSparePart: item.managementCode ? linkedSparePartsMap.get(item.managementCode) || null : null,
    }));

    // Thống kê nhanh
    const allRecords = await prisma.departmentFixedAsset.findMany({
      where: { isGroupHeader: false },
      select: {
        bookPrice: true,
        bookRemainingValue: true,
        actualPrice: true,
        actualRemainingValue: true,
        diffPrice: true,
        bookQuantity: true,
        actualQuantity: true,
      },
    });

    const stats = {
      totalItems: allRecords.length,
      totalBookPrice: allRecords.reduce((sum, r) => sum + (r.bookPrice || 0), 0),
      totalBookRemaining: allRecords.reduce((sum, r) => sum + (r.bookRemainingValue || 0), 0),
      totalActualPrice: allRecords.reduce((sum, r) => sum + (r.actualPrice || 0), 0),
      totalActualRemaining: allRecords.reduce((sum, r) => sum + (r.actualRemainingValue || 0), 0),
      totalDiffPrice: allRecords.reduce((sum, r) => sum + (r.diffPrice || 0), 0),
    };

    // Danh sách các khoa phòng, kho, nhóm duy nhất để làm filter
    const [departmentsRaw, warehousesRaw, groupsRaw] = await Promise.all([
      prisma.departmentFixedAsset.findMany({ select: { department: true }, distinct: ['department'] }),
      prisma.departmentFixedAsset.findMany({ select: { warehouse: true }, distinct: ['warehouse'] }),
      prisma.departmentFixedAsset.findMany({ select: { assetGroup: true }, distinct: ['assetGroup'] }),
    ]);

    const departments = departmentsRaw.map((d) => d.department).filter(Boolean);
    const warehouses = warehousesRaw.map((w) => w.warehouse).filter(Boolean);
    const assetGroups = groupsRaw.map((g) => g.assetGroup).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: enrichedItems,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      stats,
      filters: {
        departments,
        warehouses,
        assetGroups,
      },
    });
  } catch (error: any) {
    console.error('Get department fixed assets error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách TSCĐ khoa phòng' }, { status: 500 });
  }
}

// POST: Thêm mới tài sản cố định
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      fixedAssetCode,
      managementCode,
      autoGenManagementCode,
      usedLocation,
      brand,
      originCountry,
      inUseDate,
      bookQuantity = 1,
      bookPrice = 0,
      bookRemainingValue = 0,
      actualQuantity = 1,
      actualPrice = 0,
      actualRemainingValue = 0,
      noteUser,
      department,
      warehouse,
      assetGroup,
      bookAmount,
      actualAmount,
      depreciationRate,
      depreciationDate,
      depreciationPeriod,
      notes,
      notes1,
      auditOrderIndex,
      isGroupHeader = false,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên tài sản cố định là bắt buộc' }, { status: 400 });
    }

    // Tự sinh mã quản lý nếu người dùng yêu cầu hoặc tick auto
    let finalManagementCode = managementCode ? managementCode.trim() : '';
    if (autoGenManagementCode && !finalManagementCode) {
      finalManagementCode = `MQL-${Date.now().toString().slice(-6)}`;
    }

    // Tính toán số chênh lệch
    const bQty = Number(bookQuantity) || 0;
    const aQty = Number(actualQuantity) || 0;
    const bPrice = Number(bookPrice) || 0;
    const aPrice = Number(actualPrice) || 0;
    const bRem = Number(bookRemainingValue) || 0;
    const aRem = Number(actualRemainingValue) || 0;

    const diffQuantity = aQty - bQty;
    const diffPrice = aPrice - bPrice;
    const diffRemainingValue = aRem - bRem;

    // Lấy STT lớn nhất hiện tại
    const maxOrder = await prisma.departmentFixedAsset.aggregate({
      _max: { orderIndex: true },
    });
    const nextOrder = (maxOrder._max.orderIndex || 0) + 1;

    const created = await prisma.departmentFixedAsset.create({
      data: {
        orderIndex: isGroupHeader ? null : nextOrder,
        name: name.trim(),
        fixedAssetCode: fixedAssetCode ? fixedAssetCode.trim() : null,
        managementCode: finalManagementCode || null,
        usedLocation: usedLocation || null,
        brand: brand || null,
        originCountry: originCountry || null,
        inUseDate: inUseDate || null,
        bookQuantity: bQty,
        bookPrice: bPrice,
        bookRemainingValue: bRem,
        actualQuantity: aQty,
        actualPrice: aPrice,
        actualRemainingValue: aRem,
        diffQuantity,
        diffPrice,
        diffRemainingValue,
        noteUser: noteUser || null,
        department: department || null,
        warehouse: warehouse || null,
        assetGroup: assetGroup || null,
        bookAmount: bookAmount !== undefined ? Number(bookAmount) : bPrice,
        actualAmount: actualAmount !== undefined ? Number(actualAmount) : aPrice,
        depreciationRate: depreciationRate !== undefined ? Number(depreciationRate) : null,
        depreciationDate: depreciationDate || null,
        depreciationPeriod: depreciationPeriod || null,
        notes: notes || null,
        notes1: notes1 || null,
        auditOrderIndex: auditOrderIndex ? Number(auditOrderIndex) : null,
        isGroupHeader: Boolean(isGroupHeader),
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error('Create department fixed asset error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi thêm mới TSCĐ khoa phòng' }, { status: 500 });
  }
}

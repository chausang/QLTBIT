import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Dữ liệu mẫu ban đầu theo đúng hình ảnh (từ dòng 31 trở xuống)
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
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedPageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const pageSize = !isNaN(parsedPageSize) && parsedPageSize > 0 ? Math.min(parsedPageSize, 500) : 50;
    const all = searchParams.get('all') === 'true';

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
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      });
    } else {
      items = await prisma.departmentFixedAsset.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
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

    // Thống kê nhanh bằng SQL aggregate (tối ưu cực nhanh, không kéo toàn bộ bảng về RAM)
    const [statsAggregate, statsCount] = await Promise.all([
      prisma.departmentFixedAsset.aggregate({
        where: { isGroupHeader: false },
        _sum: {
          bookPrice: true,
          bookRemainingValue: true,
          actualPrice: true,
          actualRemainingValue: true,
          diffPrice: true,
        },
      }),
      prisma.departmentFixedAsset.count({
        where: { isGroupHeader: false },
      }),
    ]);

    const stats = {
      totalItems: statsCount,
      totalBookPrice: statsAggregate._sum.bookPrice || 0,
      totalBookRemaining: statsAggregate._sum.bookRemainingValue || 0,
      totalActualPrice: statsAggregate._sum.actualPrice || 0,
      totalActualRemaining: statsAggregate._sum.actualRemainingValue || 0,
      totalDiffPrice: statsAggregate._sum.diffPrice || 0,
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

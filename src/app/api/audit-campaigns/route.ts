import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';

const SETTING_KEY_CAMPAIGNS = 'audit_campaigns_list';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAudit = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.audit'));
    if (!canAudit) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xem đợt kiểm kê' }, { status: 403 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let campaigns: any[] = [];
    if (setting?.value) {
      try {
        campaigns = JSON.parse(setting.value);
      } catch {}
    }

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách đợt kiểm kê' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAudit = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.audit'));
    if (!canAudit) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo đợt kiểm kê' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      companyName,
      companyNames,
      locationId,
      categoryId,
      notes,
      targetDate,
      responsiblePerson,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập tên đợt kiểm kê' }, { status: 400 });
    }

    // Build filter for matching assets
    const where: any = {};
    const effectiveCompanies = Array.isArray(companyNames) && companyNames.length > 0
      ? companyNames
      : Array.isArray(companyName)
      ? companyName
      : companyName && companyName !== 'ALL'
      ? [companyName]
      : [];

    if (effectiveCompanies.length > 0 && !effectiveCompanies.includes('ALL')) {
      where.companyName = { in: effectiveCompanies };
    }
    if (locationId && locationId !== 'ALL') {
      where.locationId = locationId;
    }
    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    let matchedAssets = await prisma.asset.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true } },
        location: { select: { id: true, name: true } },
        assignments: {
          where: { returnedAt: null },
          include: { user: { select: { id: true, fullName: true, department: true } } },
        },
      },
      orderBy: { assetTag: 'asc' },
    });

    // Fallback if no assets matched the strict filter
    if (matchedAssets.length === 0 && effectiveCompanies.length > 0) {
      matchedAssets = await prisma.asset.findMany({
        include: {
          category: { select: { id: true, name: true, icon: true } },
          location: { select: { id: true, name: true } },
          assignments: {
            where: { returnedAt: null },
            include: { user: { select: { id: true, fullName: true, department: true } } },
          },
        },
        orderBy: { assetTag: 'asc' },
        take: 300,
      });
    }

    const now = new Date();

    const items = matchedAssets.map((asset, index) => {
      const activeAssign = asset.assignments?.[0];
      const comp = (asset as any).companyName || (asset.specs as any)?.companyName || 'Công ty Cổ phần Tập đoàn ABC';
      const price = Number(asset.purchasePrice) || 0;

      // Tính khấu hao sổ sách và giá trị còn lại
      const pDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
      const usefulLifeMonths = Number((asset.specs as any)?.depreciationMonths) || 36;
      let remainingValue = price;
      let depRate = Math.round((12 / usefulLifeMonths) * 100 * 100) / 100;
      if (price > 0 && pDate && !isNaN(pDate.getTime())) {
        const diffMonths = Math.max(0, (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth()));
        const ratio = Math.min(1, diffMonths / usefulLifeMonths);
        remainingValue = Math.max(0, Math.round(price * (1 - ratio)));
      }

      // Nhóm tài sản: Máy móc thiết bị, Thiết bị trả kho, Theo dõi ngoài sổ
      const catName = (asset.category?.name || '').toLowerCase();
      let assetGroup = 'Máy móc, thiết bị';
      if (asset.status === 'AVAILABLE' || asset.status === 'RETIRED') {
        assetGroup = 'Thiết bị trả kho';
      } else if (catName.includes('phụ kiện') || catName.includes('ngoài sổ') || price === 0) {
        assetGroup = 'Theo dõi ngoài sổ';
      }

      const inUseYear =
        (asset.specs as any)?.manufacturingYear ||
        (pDate ? `${pDate.getMonth() + 1}/${pDate.getFullYear()}` : '2023');

      return {
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        fixedAssetName: (asset as any).fixedAssetName || (asset.specs as any)?.fixedAssetName || asset.name,
        brand: asset.brand || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        companyName: comp,
        categoryName: asset.category?.name || '',
        categoryIcon: asset.category?.icon || '💻',
        locationId: asset.locationId || '',
        locationName: asset.location?.name || 'Kho IT',
        systemUserId: activeAssign?.user?.id || '',
        systemUserName: activeAssign?.user?.fullName || 'Chưa cấp phát (Trong kho)',
        systemDepartment: activeAssign?.user?.department || asset.location?.name || 'Kho CNTT',
        systemCondition: asset.condition || 'GOOD',
        systemStatus: asset.status || 'AVAILABLE',

        // Các trường kiểm kê theo mẫu Hình 1 & Hình 2:
        countryOfOrigin: (asset.specs as any)?.countryOfOrigin || (asset.specs as any)?.origin || 'Việt Nam',
        inUseYear: inUseYear,
        inUseDate: pDate ? pDate.toLocaleDateString('vi-VN') : '',
        department: activeAssign?.user?.department || asset.location?.name || 'Kho CNTT',
        warehouse: asset.location?.name || 'Kho CNTT',
        assetGroup: (asset.specs as any)?.assetGroup || assetGroup,
        bookQuantity: 1,
        bookPrice: price,
        bookRemainingValue: remainingValue,

        // Theo kiểm kê (Actual)
        isAudited: false,
        auditStatus: 'PENDING',
        actualQuantity: 1,
        actualPrice: price,
        actualRemainingValue: remainingValue,
        diffQuantity: 0,
        diffPrice: 0,
        diffRemainingValue: 0,
        depreciationRate: depRate,
        depreciationDate: pDate ? `${pDate.getMonth() + 1}/${pDate.getFullYear()}` : '',
        controlCode: (asset.specs as any)?.controlCode || `KS-${3269 + index}`,

        actualUserId: activeAssign?.user?.id || '',
        actualUserName: activeAssign?.user?.fullName || 'Chưa cấp phát (Trong kho)',
        actualLocationId: asset.locationId || '',
        actualLocationName: asset.location?.name || 'Kho IT',
        actualCondition: asset.condition || 'GOOD',
        actualNotes: '',
        actualPhotoUrl: null,
        auditedAt: null,
        auditedBy: null,
      };
    });

    // Tích hợp linh kiện phụ tùng có gán tên TSCĐ vào đợt kiểm kê
    const spWhere: any = {
      fixedAssetName: { not: null },
    };
    if (locationId && locationId !== 'ALL') {
      spWhere.locationId = locationId;
    }
    if (categoryId && categoryId !== 'ALL') {
      spWhere.categoryId = categoryId;
    }

    let matchedSpareParts: any[] = [];
    try {
      matchedSpareParts = await prisma.sparePart.findMany({
        where: spWhere,
        include: {
          category: { select: { id: true, name: true, icon: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      });
    } catch {}

    const spItems = matchedSpareParts.map((sp, spIdx) => {
      const price = Number(sp.unitPrice) || 0;
      const totalVal = price * sp.quantity;
      const defaultCompany = effectiveCompanies.length === 1 && effectiveCompanies[0] !== 'ALL' ? effectiveCompanies[0] : 'Công ty Cổ phần Tập đoàn ABC';
      return {
        id: sp.id,
        assetTag: sp.sku || `PK-${sp.id.slice(0, 8).toUpperCase()}`,
        name: sp.name,
        fixedAssetName: sp.fixedAssetName || sp.name,
        brand: '—',
        model: sp.sku || '',
        serialNumber: '',
        companyName: defaultCompany,
        categoryName: sp.category?.name || 'Phụ tùng, linh kiện',
        categoryIcon: sp.category?.icon || '📦',
        locationId: sp.locationId || '',
        locationName: sp.location?.name || 'Kho IT',
        systemUserId: '',
        systemUserName: 'Kho phụ tùng & linh kiện',
        systemDepartment: sp.location?.name || 'Kho CNTT',
        systemCondition: 'NEW',
        systemStatus: 'AVAILABLE',
        countryOfOrigin: 'Việt Nam',
        inUseYear: '2024',
        inUseDate: '',
        department: sp.location?.name || 'Kho CNTT',
        warehouse: sp.location?.name || 'Kho CNTT',
        assetGroup: 'Linh kiện, phụ tùng TSCĐ',
        bookQuantity: sp.quantity,
        bookPrice: price,
        bookRemainingValue: totalVal,
        isAudited: false,
        auditStatus: 'PENDING',
        actualQuantity: sp.quantity,
        actualPrice: price,
        actualRemainingValue: totalVal,
        diffQuantity: 0,
        diffPrice: 0,
        diffRemainingValue: 0,
        depreciationRate: 0,
        depreciationDate: '',
        controlCode: `KS-PK-${spIdx + 1}`,
        isSparePart: true,
        actualUserId: '',
        actualUserName: 'Kho linh kiện',
        actualLocationId: sp.locationId || '',
        actualLocationName: sp.location?.name || 'Kho IT',
        actualCondition: 'GOOD',
        actualNotes: '',
        actualPhotoUrl: null,
        auditedAt: null,
        auditedBy: null,
      };
    });

    const allItems = [...items, ...spItems];

    const newCampaign = {
      id: 'AUDIT-' + Date.now(),
      title: title.trim(),
      companyName: effectiveCompanies.length > 0 ? (effectiveCompanies.length === 1 ? effectiveCompanies[0] : effectiveCompanies.join(', ')) : 'ALL',
      selectedCompanies: effectiveCompanies.length > 0 ? effectiveCompanies : ['ALL'],
      locationId: locationId || 'ALL',
      categoryId: categoryId || 'ALL',
      notes: notes || '',
      targetDate: targetDate || null,
      responsiblePerson: responsiblePerson || user.email,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdBy: user.email,
      totalAssets: allItems.length,
      auditedCount: 0,
      items: allItems,
    };

    // Load existing campaigns
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });
    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    list.unshift(newCampaign);

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY_CAMPAIGNS },
      update: { value: JSON.stringify(list), updatedAt: new Date() },
      create: {
        key: SETTING_KEY_CAMPAIGNS,
        value: JSON.stringify(list),
        type: 'JSON',
        group: 'audit',
        label: 'Danh Sách Đợt Kiểm Kê',
      },
    });

    return NextResponse.json({ success: true, data: newCampaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tạo đợt kiểm kê' }, { status: 500 });
  }
}

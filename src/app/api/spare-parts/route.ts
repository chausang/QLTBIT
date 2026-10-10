import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';

// GET /api/spare-parts
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fixedAssetName: { contains: search, mode: 'insensitive' } },
        { managementCode: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const spareParts = await prisma.sparePart.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });

    const parsedSpareParts = spareParts.map((p) => {
      let parsedSpecs: Record<string, any> = {};
      let cleanNotes = p.notes || '';

      if (p.notes && typeof p.notes === 'string' && p.notes.startsWith('{') && p.notes.includes('"specs"')) {
        try {
          const parsed = JSON.parse(p.notes);
          if (parsed && typeof parsed === 'object') {
            parsedSpecs = parsed.specs || {};
            cleanNotes = parsed.text !== undefined ? parsed.text : (parsed.note || '');
          }
        } catch {}
      }

      return {
        ...p,
        specs: parsedSpecs,
        notes: cleanNotes,
      };
    });

    const filtered = lowStockOnly
      ? parsedSpareParts.filter((p) => p.quantity <= p.minStock)
      : parsedSpareParts;

    const stats = {
      totalItems: parsedSpareParts.length,
      totalQuantity: parsedSpareParts.reduce((sum, p) => sum + p.quantity, 0),
      lowStockCount: parsedSpareParts.filter((p) => p.quantity <= p.minStock).length,
      totalValue: parsedSpareParts.reduce((sum, p) => sum + p.quantity * (Number(p.unitPrice) || 0), 0),
    };

    return NextResponse.json({ success: true, spareParts: filtered, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/spare-parts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'spare_parts.manage'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền quản lý kho linh kiện' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      fixedAssetName,
      managementCode,
      autoGenManagementCode,
      sku,
      categoryId,
      quantity,
      minStock,
      unit,
      unitPrice,
      currency,
      vendorId,
      locationId,
      notes,
      specs,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên phụ tùng không được để trống' }, { status: 400 });
    }

    let notesToStore: string | null = notes || null;
    if (specs && typeof specs === 'object' && Object.keys(specs).length > 0) {
      notesToStore = JSON.stringify({
        text: notes || '',
        specs: specs,
      });
    }

    let finalManagementCode = managementCode ? String(managementCode).trim() : null;
    if (autoGenManagementCode && !finalManagementCode) {
      finalManagementCode = `MQL-${Date.now().toString().slice(-6)}`;
    }

    const part = await prisma.sparePart.create({
      data: {
        name,
        fixedAssetName: fixedAssetName?.trim() || null,
        managementCode: finalManagementCode || null,
        sku: sku?.trim() || null,
        categoryId: categoryId || null,
        quantity: Number(quantity) || 0,
        minStock: Number(minStock) || 5,
        unit: unit || 'cái',
        unitPrice: unitPrice ? Number(unitPrice) : null,
        currency: currency || 'VND',
        vendorId: vendorId || null,
        locationId: locationId || null,
        notes: notesToStore,
      },
      include: {
        category: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    // If initial quantity > 0, log initial IN transaction
    if (Number(quantity) > 0) {
      await prisma.sparePartTransaction.create({
        data: {
          sparePartId: part.id,
          type: 'IN',
          quantity: Number(quantity),
          note: 'Nhập kho khởi tạo ban đầu',
          performedById: user.userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      sparePart: {
        ...part,
        specs: specs || {},
        notes: notes || '',
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Mã phụ tùng/linh kiện (SKU) đã tồn tại trong hệ thống' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

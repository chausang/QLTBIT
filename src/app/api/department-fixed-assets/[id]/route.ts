import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const item = await prisma.departmentFixedAsset.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Không tìm thấy tài sản cố định' }, { status: 404 });

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải chi tiết TSCĐ' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
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
      bookQuantity,
      bookPrice,
      bookRemainingValue,
      actualQuantity,
      actualPrice,
      actualRemainingValue,
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
      isGroupHeader,
      orderIndex,
    } = body;

    let finalManagementCode = managementCode ? managementCode.trim() : '';
    if (autoGenManagementCode && !finalManagementCode) {
      finalManagementCode = `MQL-${Date.now().toString().slice(-6)}`;
    }

    const bQty = Number(bookQuantity) || 0;
    const aQty = Number(actualQuantity) || 0;
    const bPrice = Number(bookPrice) || 0;
    const aPrice = Number(actualPrice) || 0;
    const bRem = Number(bookRemainingValue) || 0;
    const aRem = Number(actualRemainingValue) || 0;

    const diffQuantity = aQty - bQty;
    const diffPrice = aPrice - bPrice;
    const diffRemainingValue = aRem - bRem;

    const updated = await prisma.departmentFixedAsset.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        fixedAssetCode: fixedAssetCode !== undefined ? (fixedAssetCode ? fixedAssetCode.trim() : null) : undefined,
        managementCode: finalManagementCode || (managementCode === '' ? null : undefined),
        usedLocation: usedLocation !== undefined ? (usedLocation || null) : undefined,
        brand: brand !== undefined ? (brand || null) : undefined,
        originCountry: originCountry !== undefined ? (originCountry || null) : undefined,
        inUseDate: inUseDate !== undefined ? (inUseDate || null) : undefined,
        bookQuantity: bQty,
        bookPrice: bPrice,
        bookRemainingValue: bRem,
        actualQuantity: aQty,
        actualPrice: aPrice,
        actualRemainingValue: aRem,
        diffQuantity,
        diffPrice,
        diffRemainingValue,
        noteUser: noteUser !== undefined ? (noteUser || null) : undefined,
        department: department !== undefined ? (department || null) : undefined,
        warehouse: warehouse !== undefined ? (warehouse || null) : undefined,
        assetGroup: assetGroup !== undefined ? (assetGroup || null) : undefined,
        bookAmount: bookAmount !== undefined ? Number(bookAmount) : bPrice,
        actualAmount: actualAmount !== undefined ? Number(actualAmount) : aPrice,
        depreciationRate: depreciationRate !== undefined ? Number(depreciationRate) : undefined,
        depreciationDate: depreciationDate !== undefined ? (depreciationDate || null) : undefined,
        depreciationPeriod: depreciationPeriod !== undefined ? (depreciationPeriod || null) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
        notes1: notes1 !== undefined ? (notes1 || null) : undefined,
        auditOrderIndex: auditOrderIndex !== undefined ? (auditOrderIndex ? Number(auditOrderIndex) : null) : undefined,
        isGroupHeader: isGroupHeader !== undefined ? Boolean(isGroupHeader) : undefined,
        orderIndex: orderIndex !== undefined ? (orderIndex ? Number(orderIndex) : null) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật TSCĐ' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.departmentFixedAsset.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa tài sản cố định thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xóa TSCĐ' }, { status: 500 });
  }
}

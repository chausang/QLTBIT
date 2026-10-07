import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { MaintenanceType } from '@prisma/client';

// GET /api/assets/[id]/maintenance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const logs = await prisma.assetMaintenanceLog.findMany({
      where: { assetId: id },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
        vendor: { select: { id: true, name: true } },
      },
      orderBy: { performedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('List maintenance error:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance logs' }, { status: 500 });
  }
}

// POST /api/assets/[id]/maintenance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'assets.maintenance.create')) || (await hasPermission(currentUser.userId, 'assets.update'));
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo phiếu sửa chữa / bảo trì' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      type,
      title,
      description,
      cost,
      costCurrency,
      performedAt,
      performedById,
      vendorId,
      notes,
      attachmentUrls,
      // Spare parts integration
      sparePartId,
      sparePartQuantity,
      partActionType, // 'ADD_ON' | 'REPLACE'
      returnOldPart, // boolean
      oldPartName,
      oldPartCondition,
      oldPartAction, // 'SCRAP_DISPOSAL' | 'REPAIR_SPARE' | 'RESTOCK' | 'NONE'
      returnTargetSparePartId,
      hasHandoverDoc,
      handoverCode,
    } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Tiêu đề và loại hoạt động là bắt buộc' }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, assetTag: true, name: true, purchaseCurrency: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy thiết bị' }, { status: 404 });
    }

    const reqQty = Number(sparePartQuantity) || 1;
    let sparePart: any = null;

    if (sparePartId) {
      sparePart = await prisma.sparePart.findUnique({ where: { id: sparePartId } });
      if (!sparePart) {
        return NextResponse.json({ error: 'Không tìm thấy phụ tùng trong kho' }, { status: 404 });
      }
      if (sparePart.quantity < reqQty) {
        return NextResponse.json({
          error: `Số lượng tồn kho không đủ (Hiện còn: ${sparePart.quantity} ${sparePart.unit})`,
        }, { status: 400 });
      }
    }

    // Build part usage metadata
    const partUsageMetadata = sparePart
      ? {
          sparePartId: sparePart.id,
          sparePartName: sparePart.name,
          sparePartSku: sparePart.sku || '',
          quantity: reqQty,
          unit: sparePart.unit || 'cái',
          unitPrice: Number(sparePart.unitPrice || 0),
          currency: sparePart.currency || 'VND',
          partActionType: partActionType || 'REPLACE', // 'ADD_ON' | 'REPLACE'
          returnOldPart: !!returnOldPart,
          oldPartName: oldPartName || '',
          oldPartCondition: oldPartCondition || '',
          oldPartAction: oldPartAction || 'SCRAP_DISPOSAL',
          hasHandoverDoc: hasHandoverDoc !== false,
          handoverCode:
            handoverCode ||
            `BBBG-${asset.assetTag}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
        }
      : null;

    const combinedAttachments = {
      ...(typeof attachmentUrls === 'object' && attachmentUrls !== null && !Array.isArray(attachmentUrls)
        ? attachmentUrls
        : {}),
      files: Array.isArray(attachmentUrls) ? attachmentUrls : [],
      partUsage: partUsageMetadata,
    };

    // Calculate final cost
    let finalCost: number | null = null;
    if (cost !== undefined && cost !== '' && !isNaN(Number(cost))) {
      finalCost = Number(cost);
    } else if (sparePart && sparePart.unitPrice) {
      finalCost = Number(sparePart.unitPrice) * reqQty;
    }

    // Execute atomic transaction: create maintenance log + spare part stock operations
    const newLog = await prisma.$transaction(async (tx) => {
      const log = await tx.assetMaintenanceLog.create({
        data: {
          assetId: id,
          type: type as MaintenanceType,
          title,
          description: description || null,
          cost: finalCost,
          costCurrency: costCurrency || (sparePart ? sparePart.currency : asset.purchaseCurrency || 'VND'),
          performedAt: performedAt ? new Date(performedAt) : new Date(),
          performedById: performedById || currentUser.userId,
          vendorId: vendorId || null,
          notes: notes || null,
          attachmentUrls: combinedAttachments,
        },
        include: {
          performedBy: { select: { fullName: true, email: true } },
          vendor: { select: { name: true } },
        },
      });

      if (sparePart) {
        // 1. Trừ tồn kho phụ tùng đã dùng
        await tx.sparePart.update({
          where: { id: sparePart.id },
          data: { quantity: { decrement: reqQty } },
        });

        // 2. Tạo bản ghi giao dịch xuất kho
        const actionLabel = partActionType === 'ADD_ON' ? 'Gắn thêm nâng cấp' : 'Thay thế linh kiện';
        const noteText = `${actionLabel} cho thiết bị [${asset.assetTag}] ${asset.name}${
          returnOldPart && oldPartName ? ` (Thu hồi: ${oldPartName} - ${oldPartCondition || 'Hỏng'})` : ''
        }`;

        await tx.sparePartTransaction.create({
          data: {
            sparePartId: sparePart.id,
            type: 'OUT',
            quantity: -reqQty,
            note: noteText,
            assetId: id,
            maintenanceLogId: log.id,
            performedById: currentUser.userId,
          },
        });

        // 3. Nếu thu hồi linh kiện cũ và chọn nhập lại vào kho phụ tùng
        if (returnOldPart && returnTargetSparePartId && (oldPartAction === 'RESTOCK' || oldPartAction === 'REPAIR_SPARE')) {
          await tx.sparePart.update({
            where: { id: returnTargetSparePartId },
            data: { quantity: { increment: 1 } },
          });

          await tx.sparePartTransaction.create({
            data: {
              sparePartId: returnTargetSparePartId,
              type: 'IN',
              quantity: 1,
              note: `Thu hồi từ [${asset.assetTag}]: ${oldPartName || 'Linh kiện cũ'} (${oldPartCondition || 'Đã qua sử dụng'})`,
              assetId: id,
              maintenanceLogId: log.id,
              performedById: currentUser.userId,
            },
          });
        }
      }

      return log;
    });

    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (error) {
    console.error('Create maintenance error:', error);
    return NextResponse.json({ error: 'Failed to create maintenance log' }, { status: 500 });
  }
}

// DELETE /api/assets/[id]/maintenance?logId=...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'assets.maintenance.delete')) || (await hasPermission(currentUser.userId, 'assets.delete'));
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa phiếu sửa chữa / bảo trì' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');
    if (!logId) {
      return NextResponse.json({ error: 'logId is required' }, { status: 400 });
    }

    // Hoàn trả tồn kho phụ tùng nếu có giao dịch liên quan
    await prisma.$transaction(async (tx) => {
      const relatedTxs = await tx.sparePartTransaction.findMany({
        where: { maintenanceLogId: logId },
      });

      for (const t of relatedTxs) {
        if (t.type === 'OUT' && t.quantity < 0) {
          const returnQty = Math.abs(t.quantity);
          await tx.sparePart.update({
            where: { id: t.sparePartId },
            data: { quantity: { increment: returnQty } },
          });
        } else if (t.type === 'IN' && t.quantity > 0) {
          await tx.sparePart.update({
            where: { id: t.sparePartId },
            data: { quantity: { decrement: t.quantity } },
          });
        }
      }

      await tx.sparePartTransaction.deleteMany({
        where: { maintenanceLogId: logId },
      });

      await tx.assetMaintenanceLog.delete({
        where: { id: logId },
      });
    });

    return NextResponse.json({ success: true, message: 'Đã xóa bản ghi sửa chữa và cập nhật lại kho' });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance log' }, { status: 500 });
  }
}

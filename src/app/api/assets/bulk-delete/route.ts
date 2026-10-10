import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { moveToTrash } from '@/lib/trash';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/assets/bulk-delete - Xóa nhiều thiết bị cùng lúc và chuyển vào Thùng Rác
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = await hasPermission(currentUser.userId, 'assets.delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Missing assets.delete permission' }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất một thiết bị để xóa' }, { status: 400 });
    }

    // Lấy thông tin các thiết bị cần xóa
    const existingAssets = await prisma.asset.findMany({
      where: { id: { in: ids } },
    });

    if (existingAssets.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy thiết bị nào phù hợp để xóa' }, { status: 404 });
    }

    const validIds = existingAssets.map((a) => a.id);
    const trashItemIds: string[] = [];

    // 1. Lưu snapshot từng đối tượng vào Thùng Rác (Recycle Bin)
    for (const asset of existingAssets) {
      try {
        const trashResult = await moveToTrash({
          entityType: 'ASSET',
          entityId: asset.id,
          entityName: asset.name,
          entityCode: asset.assetTag,
          dataSnapshot: asset,
          deletedById: currentUser.userId,
          deletedByName: currentUser.fullName || currentUser.email,
        });
        if (trashResult?.trashItem?.id) {
          trashItemIds.push(trashResult.trashItem.id);
        }
      } catch (trashErr) {
        console.error(`Failed to snapshot asset ${asset.assetTag} to trash:`, trashErr);
      }
    }

    // 2. Cascade delete quan hệ trong Transaction an toàn
    await prisma.$transaction(async (tx) => {
      // Giảm usedSeats bản quyền
      const activeLicAssignments = await tx.licenseAssignment.findMany({
        where: { assetId: { in: validIds }, revokedAt: null },
      });
      for (const la of activeLicAssignments) {
        await tx.license.update({
          where: { id: la.licenseId },
          data: { usedSeats: { decrement: 1 } },
        });
      }

      // Xóa/unlink license assignments
      await tx.licenseAssignment.updateMany({
        where: { assetId: { in: validIds }, userId: { not: null } },
        data: { assetId: null },
      });
      await tx.licenseAssignment.deleteMany({
        where: { assetId: { in: validIds } },
      });

      // Unlink tickets
      await tx.ticket.updateMany({
        where: { assetId: { in: validIds } },
        data: { assetId: null },
      });

      // Unlink documents
      await tx.document.updateMany({
        where: { assetId: { in: validIds } },
        data: { assetId: null },
      });

      // Xóa lịch sử bàn giao
      await tx.assetAssignment.deleteMany({
        where: { assetId: { in: validIds } },
      });

      // Unlink phụ tùng
      await tx.sparePartTransaction.updateMany({
        where: { assetId: { in: validIds } },
        data: { assetId: null },
      });

      // Xóa lịch sử bảo trì
      const maintenanceLogs = await tx.assetMaintenanceLog.findMany({
        where: { assetId: { in: validIds } },
        select: { id: true },
      });
      if (maintenanceLogs.length > 0) {
        const logIds = maintenanceLogs.map((m) => m.id);
        await tx.sparePartTransaction.updateMany({
          where: { maintenanceLogId: { in: logIds } },
          data: { maintenanceLogId: null },
        });
        await tx.assetMaintenanceLog.deleteMany({
          where: { assetId: { in: validIds } },
        });
      }

      // Unlink password entries
      await tx.passwordEntry.updateMany({
        where: { assetId: { in: validIds } },
        data: { assetId: null },
      });

      // Xóa lịch bảo trì định kỳ
      await tx.maintenanceSchedule.deleteMany({
        where: { assetId: { in: validIds } },
      });

      // Xóa thiết bị khỏi bảng Asset
      await tx.asset.deleteMany({
        where: { id: { in: validIds } },
      });
    });

    // 3. Ghi Audit Log hàng loạt
    for (const asset of existingAssets) {
      await createAuditLog({
        action: 'DELETE',
        entityType: 'Asset',
        entityId: asset.id,
        userId: currentUser.userId,
        changes: { deleted: asset, bulk: true },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Đã chuyển thành công ${validIds.length} thiết bị vào Thùng rác`,
      count: validIds.length,
      trashItemIds,
    });
  } catch (error) {
    console.error('Bulk delete assets error:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa hàng loạt thiết bị' }, { status: 500 });
  }
}

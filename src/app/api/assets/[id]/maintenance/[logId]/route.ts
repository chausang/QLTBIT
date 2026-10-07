import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
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

    const { logId } = await params;

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

    return NextResponse.json({ success: true, message: 'Đã xóa bản ghi thành công và cập nhật lại kho' });
  } catch (error) {
    console.error('Delete maintenance log error:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance log' }, { status: 500 });
  }
}

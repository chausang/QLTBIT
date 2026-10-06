import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assetId, alertType } = body; // alertType: 'HARDWARE' | 'SOFTWARE' | 'CRACK' | 'ALL'

    if (!assetId) {
      return NextResponse.json({ error: 'Thiếu assetId' }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { category: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });
    }

    const currentSpecs = (asset.specs as Record<string, any>) || {};
    const updatedSpecs = { ...currentSpecs };

    let noteMessage = '';

    if (alertType === 'HARDWARE' || !alertType || alertType === 'ALL') {
      delete updatedSpecs.hardwareChangeAlert;
      noteMessage += 'Đã xóa cảnh báo thay đổi phần cứng. ';
    }

    if (alertType === 'SOFTWARE' || !alertType || alertType === 'ALL') {
      delete updatedSpecs.softwareChangeAlert;
      noteMessage += 'Đã xóa cảnh báo thay đổi phần mềm. ';
    }

    if (alertType === 'CRACK' || !alertType || alertType === 'ALL') {
      if (updatedSpecs.crackDetection) {
        updatedSpecs.crackDetection = {
          hasSuspect: false,
          warnings: [],
          detectedTools: [],
          acknowledgedBy: user.fullName,
          acknowledgedAt: new Date().toISOString(),
        };
      }
      noteMessage += 'Đã xác nhận và bỏ qua cảnh báo công cụ bẻ khóa. ';
    }

    // Resolve any corresponding HealthAlerts in Prisma
    try {
      await prisma.healthAlert.updateMany({
        where: {
          assetId,
          status: 'ACTIVE',
          metric: {
            in: ['HARDWARE_TAMPER', 'CRACK_TOOL', 'SOFTWARE_CHANGE'],
          },
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
    } catch {}

    // Ghi nhật ký vào changeHistory
    const existingHistory = Array.isArray(updatedSpecs.changeHistory) ? updatedSpecs.changeHistory : [];
    const clearRecord = {
      id: `${Date.now()}-clear-alert`,
      timestamp: new Date().toISOString(),
      category: alertType || 'ALL',
      action: 'ACKNOWLEDGED',
      component: 'Quản trị viên IT xác nhận an toàn',
      oldValue: 'Đang cảnh báo',
      newValue: 'Đã giải quyết',
      severity: 'INFO',
      description: `${user.fullName} đã xác nhận kiểm tra và xóa cờ cảnh báo của thiết bị.`,
    };

    updatedSpecs.changeHistory = [clearRecord, ...existingHistory].slice(0, 200);

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        specs: updatedSpecs,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Asset',
      entityId: asset.id,
      entityName: asset.name,
      oldData: { specs: asset.specs },
      newData: { specs: updatedSpecs },
    });

    return NextResponse.json({
      success: true,
      message: noteMessage.trim() || 'Đã cập nhật trạng thái cảnh báo.',
      specs: updatedAsset.specs,
    });
  } catch (error: any) {
    console.error('Clear Alert Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi xử lý cảnh báo' }, { status: 500 });
  }
}

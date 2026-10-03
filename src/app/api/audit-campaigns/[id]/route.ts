import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';

const SETTING_KEY_CAMPAIGNS = 'audit_campaigns_list';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAudit = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.audit'));
    if (!canAudit) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xem đợt kiểm kê' }, { status: 403 });
    }

    const { id } = await params;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    const campaign = list.find((c) => c.id === id);
    if (!campaign) {
      return NextResponse.json({ error: 'Không tìm thấy đợt kiểm kê' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải đợt kiểm kê' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAudit = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.audit'));
    if (!canAudit) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền cập nhật đợt kiểm kê' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, itemUpdate } = body;

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    const campaignIdx = list.findIndex((c) => c.id === id);
    if (campaignIdx === -1) {
      return NextResponse.json({ error: 'Không tìm thấy đợt kiểm kê' }, { status: 404 });
    }

    const campaign = list[campaignIdx];

    // Action 1: Update specific item audit status
    if (action === 'VERIFY_ITEM' && (itemUpdate?.assetId || itemUpdate?.assetTag)) {
      const itemIdx = campaign.items.findIndex(
        (i: any) => i.id === itemUpdate.assetId || i.assetTag === itemUpdate.assetTag
      );

      if (itemIdx !== -1) {
        const prev = campaign.items[itemIdx];
        const status = itemUpdate.auditStatus || 'MATCHED';
        const isLostOrDamaged = status === 'DAMAGED_OR_LOST';

        const bookQty = Number(prev.bookQuantity) || 1;
        const bookPrc = Number(prev.bookPrice) || 0;
        const bookRem = Number(prev.bookRemainingValue) || 0;

        let actQty = itemUpdate.actualQuantity !== undefined ? Number(itemUpdate.actualQuantity) : (isLostOrDamaged ? 0 : bookQty);
        let actPrc = itemUpdate.actualPrice !== undefined ? Number(itemUpdate.actualPrice) : (isLostOrDamaged ? 0 : bookPrc);
        let actRem = itemUpdate.actualRemainingValue !== undefined ? Number(itemUpdate.actualRemainingValue) : (isLostOrDamaged ? 0 : bookRem);

        let diffQty = actQty - bookQty;
        let diffPrc = actPrc - bookPrc;
        let diffRem = actRem - bookRem;

        campaign.items[itemIdx] = {
          ...prev,
          isAudited: true,
          auditStatus: status,
          actualQuantity: actQty,
          actualPrice: actPrc,
          actualRemainingValue: actRem,
          diffQuantity: diffQty,
          diffPrice: diffPrc,
          diffRemainingValue: diffRem,
          actualUserId: itemUpdate.actualUserId || prev.actualUserId,
          actualUserName: itemUpdate.actualUserName || prev.actualUserName,
          actualLocationId: itemUpdate.actualLocationId || prev.actualLocationId,
          actualLocationName: itemUpdate.actualLocationName || prev.actualLocationName,
          actualCondition: itemUpdate.actualCondition || prev.actualCondition,
          actualNotes: itemUpdate.actualNotes !== undefined ? itemUpdate.actualNotes : (prev.actualNotes || ''),
          actualPhotoUrl: itemUpdate.actualPhotoUrl !== undefined ? itemUpdate.actualPhotoUrl : (prev.actualPhotoUrl || null),
          department: itemUpdate.department || prev.department,
          warehouse: itemUpdate.warehouse || prev.warehouse,
          assetGroup: itemUpdate.assetGroup || prev.assetGroup,
          countryOfOrigin: itemUpdate.countryOfOrigin || prev.countryOfOrigin,
          inUseYear: itemUpdate.inUseYear || prev.inUseYear,
          notes1: itemUpdate.notes1 !== undefined ? itemUpdate.notes1 : prev.notes1,
          controlCode: itemUpdate.controlCode || prev.controlCode,
          auditedAt: new Date().toISOString(),
          auditedBy: user.email || 'IT Staff',
        };

        // Recalculate auditedCount
        campaign.auditedCount = campaign.items.filter((i: any) => i.isAudited || i.auditStatus !== 'PENDING').length;

        // Create maintenance inspection log
        try {
          await prisma.assetMaintenanceLog.create({
            data: {
              assetId: campaign.items[itemIdx].id,
              type: 'INSPECTION',
              title: 'Kiểm kê đợt: ' + campaign.title,
              description: 'Kết quả: ' + status + '. Ghi chú: ' + (itemUpdate.actualNotes || 'Khớp đúng.'),
              performedById: user.userId || undefined,
              cost: 0,
              attachmentUrls: itemUpdate.actualPhotoUrl ? [itemUpdate.actualPhotoUrl] : undefined,
              performedAt: new Date(),
            },
          });
        } catch {}
      }
    }

    // Action 1.1: Update custom fields of an item (Hình 1 & 2 attributes)
    if (action === 'UPDATE_ITEM_FIELDS' && (itemUpdate?.assetId || itemUpdate?.assetTag)) {
      const itemIdx = campaign.items.findIndex(
        (i: any) => i.id === itemUpdate.assetId || i.assetTag === itemUpdate.assetTag
      );
      if (itemIdx !== -1) {
        const prev = campaign.items[itemIdx];
        const merged = { ...prev, ...itemUpdate };

        // Recalculate diffs
        const bQty = Number(merged.bookQuantity) || 0;
        const bPrc = Number(merged.bookPrice) || 0;
        const bRem = Number(merged.bookRemainingValue) || 0;
        const aQty = Number(merged.actualQuantity) || 0;
        const aPrc = Number(merged.actualPrice) || 0;
        const aRem = Number(merged.actualRemainingValue) || 0;

        merged.diffQuantity = aQty - bQty;
        merged.diffPrice = aPrc - bPrc;
        merged.diffRemainingValue = aRem - bRem;

        campaign.items[itemIdx] = merged;
      }
    }

    // Action 1.2: Bulk update items
    if (action === 'BULK_UPDATE_ITEMS' && Array.isArray(body.items)) {
      campaign.items = body.items;
      campaign.auditedCount = campaign.items.filter((i: any) => i.isAudited || i.auditStatus !== 'PENDING').length;
    }

    // Action 2: Finalize Campaign
    if (action === 'FINALIZE') {
      campaign.status = 'COMPLETED';
      campaign.completedAt = new Date().toISOString();
      campaign.completedBy = user.email;
    }

    list[campaignIdx] = campaign;

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

    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật kiểm kê' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAudit = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.audit'));
    if (!canAudit) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa đợt kiểm kê' }, { status: 403 });
    }

    const { id } = await params;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    list = list.filter((c) => c.id !== id);

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

    return NextResponse.json({ success: true, message: 'Đã xóa đợt kiểm kê' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xóa đợt kiểm kê' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { normalizeCompanyName } from '@/lib/normalize';
import bcrypt from 'bcryptjs';

// GET /api/assets/[id]/transfer - Get assignment history and current active assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'assets.view'));
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xem lịch sử điều chuyển tài sản' }, { status: 403 });
    }

    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      select: {
        id: true,
        assetTag: true,
        name: true,
        brand: true,
        model: true,
        serialNumber: true,
        status: true,
        condition: true,
        companyName: true,
        locationId: true,
        location: { select: { id: true, name: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy tài liệu/thiết bị' }, { status: 404 });
    }

    const assignments = await prisma.assetAssignment.findMany({
      where: { assetId: id },
      include: {
        user: { select: { id: true, fullName: true, email: true, department: true, position: true, companyName: true } },
        assignedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const activeAssignment = assignments.find((a) => !a.returnedAt) || null;

    return NextResponse.json({
      success: true,
      data: {
        asset,
        activeAssignment,
        history: assignments,
      },
    });
  } catch (error) {
    console.error('Get transfer history error:', error);
    return NextResponse.json({ error: 'Lỗi khi tải lịch sử điều chuyển' }, { status: 500 });
  }
}

// POST /api/assets/[id]/transfer - Transfer asset to new user or return to warehouse
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = currentUser.roleName === 'Admin' ||
      (await hasPermission(currentUser.userId, 'assets.assign')) ||
      (await hasPermission(currentUser.userId, 'assets.update'));
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền điều chuyển tài sản' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      toUserId, // Target user ID (optional)
      toUserName, // Target user name if typed manually (optional)
      transferDate,
      condition,
      locationId,
      companyName,
      notes,
    } = body;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { user: true },
        },
        location: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy thiết bị' }, { status: 404 });
    }

    const currentAssignment = asset.assignments[0] || null;
    const effectiveDate = transferDate ? new Date(transferDate) : new Date();

    // Xác định target user:
    let targetUserId = (toUserId && typeof toUserId === 'string' && toUserId.trim() !== '') ? toUserId.trim() : null;
    let targetUserNameDisplay = '';

    const customName = (toUserName && typeof toUserName === 'string') ? toUserName.trim().replace(/\s+/g, ' ') : '';

    if (!targetUserId && customName) {
      // 1. Thử tìm user có sẵn theo fullName (không phân biệt hoa thường)
      const existingUser = await prisma.user.findFirst({
        where: {
          fullName: { equals: customName, mode: 'insensitive' },
        },
      });

      if (existingUser) {
        targetUserId = existingUser.id;
        targetUserNameDisplay = existingUser.fullName;
      } else {
        // 2. Tự động tạo user mới với tên này để hệ thống lưu trữ và theo dõi
        const staffRole = await prisma.role.findFirst({ where: { name: 'Staff' } })
          || await prisma.role.findFirst({ where: { name: 'User' } })
          || await prisma.role.findFirst();

        if (staffRole) {
          const cleanSlug = customName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
          const autoEmail = `${cleanSlug || 'staff'}.${Date.now().toString().slice(-6)}@internal.local`;
          const defaultPasswordHash = await bcrypt.hash('Staff@123', 10);

          const newUser = await prisma.user.create({
            data: {
              fullName: customName,
              email: autoEmail,
              passwordHash: defaultPasswordHash,
              department: asset.location?.name || null,
              companyName: companyName ? normalizeCompanyName(companyName) : asset.companyName,
              roleId: staffRole.id,
              isActive: true,
            },
          });
          targetUserId = newUser.id;
          targetUserNameDisplay = newUser.fullName;
        }
      }
    } else if (targetUserId) {
      const u = await prisma.user.findUnique({ where: { id: targetUserId }, select: { fullName: true } });
      targetUserNameDisplay = u?.fullName || '';
    }

    // 1. If currently assigned, mark active assignment as returned / transferred
    if (currentAssignment) {
      await prisma.assetAssignment.update({
        where: { id: currentAssignment.id },
        data: {
          returnedAt: effectiveDate,
          notes: currentAssignment.notes
            ? `${currentAssignment.notes}\n[Điều chuyển ${effectiveDate.toLocaleDateString('vi-VN')}]: ${notes || (targetUserId ? `Bàn giao cho ${targetUserNameDisplay}` : 'Chuyển giao (không gán đích danh nhân sự)')}`
            : `[Điều chuyển ${effectiveDate.toLocaleDateString('vi-VN')}]: ${notes || (targetUserId ? `Bàn giao cho ${targetUserNameDisplay}` : 'Chuyển giao (không gán đích danh nhân sự)')}`,
        },
      });
    }

    let newStatus = 'AVAILABLE';

    // 2. If target user provided -> create new assignment
    if (targetUserId) {
      await prisma.assetAssignment.create({
        data: {
          assetId: id,
          userId: targetUserId,
          assignedById: currentUser.userId,
          assignedAt: effectiveDate,
          notes: notes || null,
        },
      });
      newStatus = 'IN_USE';
    }

    // 3. Update asset status, condition, location, company
    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        status: newStatus as any,
        condition: condition || asset.condition,
        locationId: locationId !== undefined ? (locationId || null) : asset.locationId,
        companyName: companyName !== undefined ? (companyName ? normalizeCompanyName(companyName) : null) : asset.companyName,
      },
      include: {
        location: true,
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true } },
            assignedBy: { select: { fullName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    // 4. Audit Log
    await createAuditLog({
      userId: currentUser.userId,
      action: targetUserId ? 'ASSIGN' : 'UPDATE',
      entityType: 'ASSET',
      entityId: id,
      changes: {
        fromUser: currentAssignment?.user?.fullName || 'Kho thiết bị',
        toUser: targetUserId ? targetUserNameDisplay : 'Chưa gán người (Để trống)',
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: targetUserId
        ? `Điều chuyển thiết bị cho ${targetUserNameDisplay} thành công`
        : 'Cập nhật điều chuyển thiết bị thành công (Không gán người dùng)',
      data: updatedAsset,
    });
  } catch (error) {
    console.error('Transfer asset error:', error);
    return NextResponse.json({ error: 'Lỗi khi thực hiện điều chuyển' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { parseLocationAreas, LocationArea } from '../route';

// PUT /api/locations/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'locations.update'));
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền sửa khoa phòng' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, building, floor, notes, areas } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên khoa phòng là bắt buộc' }, { status: 400 });
    }

    // Process multiple areas
    let formattedAreas: LocationArea[] = [];
    if (Array.isArray(areas)) {
      formattedAreas = areas
        .filter((a: any) => (a.building && a.building.trim()) || (a.floor && a.floor.trim()) || (a.room && a.room.trim()))
        .map((a: any) => ({
          building: (a.building || '').trim(),
          floor: (a.floor || '').trim(),
          room: (a.room || '').trim(),
          notes: (a.notes || '').trim(),
        }));
    }

    const primaryBuilding = formattedAreas.length > 0
      ? formattedAreas.map((a) => a.building).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')
      : (building !== undefined ? building : undefined);

    const primaryFloor = formattedAreas.length > 0
      ? formattedAreas.map((a) => a.floor).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')
      : (floor !== undefined ? floor : undefined);

    let notesPayload: string | undefined = undefined;
    if (areas !== undefined || notes !== undefined) {
      notesPayload = JSON.stringify({
        areas: formattedAreas,
        notes: typeof notes === 'string' ? notes.trim() : '',
      });
    }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: name.trim(),
        building: primaryBuilding !== undefined ? primaryBuilding : undefined,
        floor: primaryFloor !== undefined ? primaryFloor : undefined,
        notes: notesPayload !== undefined ? notesPayload : undefined,
      },
    });

    return NextResponse.json({ success: true, data: parseLocationAreas(updated) });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

// DELETE /api/locations/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'locations.delete'));
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa khoa phòng' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Location deactivated' });
  } catch (error) {
    console.error('Delete location error:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export interface LocationArea {
  id?: string;
  building: string;
  floor: string;
  room?: string;
  notes?: string;
}

export function parseLocationAreas(loc: any) {
  let areas: LocationArea[] = [];
  let cleanNotes = loc.notes || '';

  if (loc.notes && typeof loc.notes === 'string' && loc.notes.startsWith('{') && loc.notes.includes('"areas"')) {
    try {
      const parsed = JSON.parse(loc.notes);
      if (Array.isArray(parsed.areas)) {
        areas = parsed.areas;
        cleanNotes = parsed.notes || parsed.text || '';
      }
    } catch {}
  }

  // Fallback if no areas array in notes but building or floor exists
  if (areas.length === 0 && (loc.building || loc.floor)) {
    areas = [
      {
        building: loc.building || '',
        floor: loc.floor || '',
        room: '',
      },
    ];
  }

  const areasSummary = areas.length > 0
    ? areas
        .map((a) => {
          const parts = [a.building, a.floor, a.room ? `(${a.room})` : ''].filter(Boolean);
          return parts.join(' - ');
        })
        .join('; ')
    : '';

  return {
    ...loc,
    areas,
    areasSummary,
    cleanNotes,
  };
}

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    const data = locations.map(parseLocationAreas);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'locations.create'));
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo khoa phòng' }, { status: 403 });
    }

    const body = await request.json();
    const { name, building, floor, notes, areas } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên khoa phòng là bắt buộc' }, { status: 400 });
    }

    // Process multiple areas
    let formattedAreas: LocationArea[] = [];
    if (Array.isArray(areas) && areas.length > 0) {
      formattedAreas = areas
        .filter((a: any) => (a.building && a.building.trim()) || (a.floor && a.floor.trim()) || (a.room && a.room.trim()))
        .map((a: any) => ({
          building: (a.building || '').trim(),
          floor: (a.floor || '').trim(),
          room: (a.room || '').trim(),
          notes: (a.notes || '').trim(),
        }));
    } else if (building || floor) {
      formattedAreas = [
        {
          building: (building || '').trim(),
          floor: (floor || '').trim(),
          room: '',
        },
      ];
    }

    // Determine primary building & floor summary
    const primaryBuilding = formattedAreas.length > 0
      ? formattedAreas.map((a) => a.building).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')
      : (building || null);

    const primaryFloor = formattedAreas.length > 0
      ? formattedAreas.map((a) => a.floor).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')
      : (floor || null);

    const notesPayload = JSON.stringify({
      areas: formattedAreas,
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        building: primaryBuilding || null,
        floor: primaryFloor || null,
        notes: notesPayload,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: parseLocationAreas(location) }, { status: 201 });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}

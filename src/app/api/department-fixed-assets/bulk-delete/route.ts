import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Danh sách ID không hợp lệ' }, { status: 400 });
    }

    const deleteResult = await prisma.departmentFixedAsset.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa thành công ${deleteResult.count} tài sản cố định`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa hàng loạt' }, { status: 500 });
  }
}

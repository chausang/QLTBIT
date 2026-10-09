import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export type MinuteType = 'HANDOVER' | 'REVOCATION' | 'MAINTENANCE' | 'PROPOSAL';
export type MinuteStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export interface MinuteEquipmentItem {
  id?: string;
  name: string;
  code?: string;
  serial?: string;
  quantity: number;
  unit?: string;
  condition?: string;
  notes?: string;
}

export interface MinutePayload {
  id?: string;
  title: string;
  minuteType: MinuteType;
  minuteCode?: string;
  department?: string;
  companyName?: string;
  documentDate?: string;
  status: MinuteStatus;
  sender?: {
    name?: string;
    title?: string;
    department?: string;
  };
  receiver?: {
    name?: string;
    title?: string;
    department?: string;
  };
  equipmentList?: MinuteEquipmentItem[];
  reason?: string;
  signers?: {
    creator?: string;
    deptRep?: string;
    itLead?: string;
    director?: string;
  };
  fileUrl?: string;
  fileName?: string;
  attachments?: any[];
  extraNotes?: string;
}

// Helper to auto-generate minute code
function generateMinuteCode(type: MinuteType): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  switch (type) {
    case 'HANDOVER':
      return `BB-BG-${year}-${randomSuffix}`;
    case 'REVOCATION':
      return `BB-TH-${year}-${randomSuffix}`;
    case 'MAINTENANCE':
      return `BB-BT-${year}-${randomSuffix}`;
    case 'PROPOSAL':
      return `DN-TB-${year}-${randomSuffix}`;
    default:
      return `BB-${year}-${randomSuffix}`;
  }
}

// GET /api/minutes - List minutes with stats & filtering
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const subtype = (searchParams.get('subtype') || 'ALL').toUpperCase();
    const status = (searchParams.get('status') || 'ALL').toUpperCase();
    const department = searchParams.get('department')?.trim() || '';

    // Query documents that represent minutes or proposals
    let rawDocuments = await prisma.document.findMany({
      where: {
        OR: [
          { type: 'HANDOVER' },
          { type: 'PROPOSAL' },
          { projectCode: { startsWith: 'BB-' } },
          { projectCode: { startsWith: 'DN-' } },
          { notes: { contains: '"minuteType"' } },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, department: true },
        },
      },
      orderBy: [
        { documentDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 200,
    });

    if (rawDocuments.length === 0) {
      const year = new Date().getFullYear();
      const initialMinutes = [
        {
          title: 'Biên bản bàn giao 03 bộ máy tính & máy in đa năng cho Khoa Khám Bệnh',
          type: 'HANDOVER' as const,
          projectCode: `BB-BG-${year}-1001`,
          projectName: 'Khoa Khám Bệnh',
          documentDate: new Date(),
          notes: JSON.stringify({
            minuteType: 'HANDOVER',
            minuteCode: `BB-BG-${year}-1001`,
            department: 'Khoa Khám Bệnh',
            status: 'APPROVED',
            sender: { name: 'Nguyễn Văn An', title: 'Kỹ sư phần cứng CNTT', department: 'Phòng CNTT' },
            receiver: { name: 'Trần Thị Mai', title: 'Điều dưỡng trưởng', department: 'Khoa Khám Bệnh' },
            equipmentList: [
              { name: 'Bộ máy tính để bàn HP ProDesk 400 G7', code: 'TS-PC-012', serial: 'HP-883291', quantity: 3, unit: 'Bộ', condition: 'Mới 100%, kèm phím chuột HP', notes: 'Bàn giao phòng khám 1, 2, 3' },
              { name: 'Máy in laser Canon LBP 2900', code: 'TS-PR-008', serial: 'CN-449102', quantity: 1, unit: 'Cái', condition: 'Hoạt động tốt, đã nạp đầy mực', notes: 'Đặt tại bàn tiếp đón' },
            ],
            reason: 'Trang bị bổ sung phương tiện làm việc phục vụ tiếp nhận người bệnh',
            signers: { creator: 'Nguyễn Văn An', deptRep: 'Trần Thị Mai', itLead: 'Phạm Minh Đức', director: 'Ban Giám Đốc' },
          }),
        },
        {
          title: 'Biên bản thu hồi 02 laptop Lenovo ThinkPad cũ hỏng từ Khoa Xét Nghiệm',
          type: 'HANDOVER' as const,
          projectCode: `BB-TH-${year}-1002`,
          projectName: 'Khoa Xét Nghiệm',
          documentDate: new Date(Date.now() - 86400000 * 2),
          notes: JSON.stringify({
            minuteType: 'REVOCATION',
            minuteCode: `BB-TH-${year}-1002`,
            department: 'Khoa Xét Nghiệm',
            status: 'APPROVED',
            sender: { name: 'Lê Hoàng Nam', title: 'Kỹ thuật viên xét nghiệm', department: 'Khoa Xét Nghiệm' },
            receiver: { name: 'Vũ Đức Thịnh', title: 'Cán bộ quản lý kho IT', department: 'Phòng CNTT' },
            equipmentList: [
              { name: 'Laptop Lenovo ThinkPad T480s', code: 'TS-NB-005', serial: 'PF-109283', quantity: 2, unit: 'Chiếc', condition: 'Màn hình bị sọc, pin chai 80%, thu hồi chờ thanh lý', notes: 'Kèm 02 củ sạc 65W' },
            ],
            reason: 'Thu hồi thiết bị hết hạn khấu hao và hư hỏng phần cứng về kho IT',
            signers: { creator: 'Vũ Đức Thịnh', deptRep: 'Lê Hoàng Nam', itLead: 'Phạm Minh Đức', director: 'Ban Giám Đốc' },
          }),
        },
        {
          title: 'Kế hoạch bảo trì định kỳ & nâng cấp RAM/SSD máy tính Khoa Cấp Cứu',
          type: 'HANDOVER' as const,
          projectCode: `BB-BT-${year}-1003`,
          projectName: 'Khoa Cấp Cứu',
          documentDate: new Date(Date.now() - 86400000 * 5),
          notes: JSON.stringify({
            minuteType: 'MAINTENANCE',
            minuteCode: `BB-BT-${year}-1003`,
            department: 'Khoa Cấp Cứu',
            status: 'COMPLETED',
            sender: { name: 'Đội Kỹ Thuật CNTT', title: 'Tổ bảo trì & hạ tầng', department: 'Phòng CNTT' },
            receiver: { name: 'Bác sĩ CK1 Nguyễn Thành Long', title: 'Trưởng Khoa Cấp Cứu', department: 'Khoa Cấp Cứu' },
            equipmentList: [
              { name: 'Ổ cứng SSD Kingston NV2 500GB NVMe M.2', code: 'PK-SSD-500', serial: 'KS-99120', quantity: 4, unit: 'Chiếc', condition: 'Mới 100%, nâng cấp tăng tốc độ khởi động', notes: 'Thay thế cho 4 máy trực cấp cứu' },
              { name: 'Thanh RAM Kingston Fury 16GB DDR4 3200MHz', code: 'PK-RAM-16G', serial: 'KF-44819', quantity: 4, unit: 'Thanh', condition: 'Mới 100%, nâng tổng RAM lên 32GB', notes: 'Chạy phần mềm HIS mượt mà' },
            ],
            reason: 'Bảo trì vệ sinh phòng máy và nâng cấp linh kiện đáp ứng phần mềm bệnh viện HIS/LIS',
            signers: { creator: 'Nguyễn Văn An', deptRep: 'Nguyễn Thành Long', itLead: 'Phạm Minh Đức', director: 'Ban Giám Đốc' },
          }),
        },
        {
          title: 'Tờ đề nghị xin cấp 03 máy quét mã vạch và 02 máy in nhiệt cho Khoa Dược',
          type: 'PROPOSAL' as const,
          projectCode: `DN-TB-${year}-1004`,
          projectName: 'Khoa Dược',
          documentDate: new Date(Date.now() - 86400000 * 1),
          notes: JSON.stringify({
            minuteType: 'PROPOSAL',
            minuteCode: `DN-TB-${year}-1004`,
            department: 'Khoa Dược',
            status: 'PENDING',
            sender: { name: 'Dược sĩ Đỗ Thúy Hằng', title: 'Phụ trách kho thuốc', department: 'Khoa Dược' },
            receiver: { name: 'Bộ phận CNTT Tiếp nhận', title: 'Chuyên viên quản trị thiết bị', department: 'Phòng CNTT' },
            equipmentList: [
              { name: 'Máy quét mã vạch Honeywell Xenon 1900G 2D QR', code: 'DN-SCAN-01', serial: '', quantity: 3, unit: 'Chiếc', condition: 'Xin cấp mới 100%', notes: 'Quét mã vạch đơn thuốc điện tử BHYT' },
              { name: 'Máy in hóa đơn nhiệt Xprinter XP-Q80I', code: 'DN-PR-POS', serial: '', quantity: 2, unit: 'Chiếc', condition: 'Xin cấp mới 100%', notes: 'In phiếu cấp phát thuốc ngoại trú' },
            ],
            reason: 'Lượng bệnh nhân ngoại trú tăng cao, xin cấp bổ sung thiết bị quét mã để tránh ùn ứ quầy thuốc',
            signers: { creator: 'Đỗ Thúy Hằng', deptRep: 'Trưởng Khoa Dược', itLead: 'Phạm Minh Đức', director: 'Ban Giám Đốc' },
          }),
        },
      ];

      for (const item of initialMinutes) {
        await prisma.document.create({
          data: {
            title: item.title,
            type: item.type,
            projectCode: item.projectCode,
            projectName: item.projectName,
            documentDate: item.documentDate,
            fileUrl: '',
            fileName: 'bien-ban.pdf',
            fileSize: 0,
            fileType: 'application/pdf',
            attachments: [],
            notes: item.notes,
            createdById: currentUser.userId,
          },
        });
      }

      rawDocuments = await prisma.document.findMany({
        where: {
          OR: [
            { type: 'HANDOVER' },
            { type: 'PROPOSAL' },
            { projectCode: { startsWith: 'BB-' } },
            { projectCode: { startsWith: 'DN-' } },
            { notes: { contains: '"minuteType"' } },
          ],
        },
        include: {
          createdBy: {
            select: { id: true, fullName: true, department: true },
          },
        },
        orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      });
    }

    const parsedItems = rawDocuments.map((doc) => {
      let meta: any = {};
      try {
        if (doc.notes && doc.notes.startsWith('{')) {
          meta = JSON.parse(doc.notes);
        }
      } catch {
        meta = {};
      }

      const minuteType: MinuteType = meta.minuteType || (doc.type === 'PROPOSAL' ? 'PROPOSAL' : 'HANDOVER');
      const minuteCode: string = meta.minuteCode || doc.projectCode || `BB-${doc.id.slice(0, 8).toUpperCase()}`;
      const dept: string = meta.department || doc.projectName || '';
      const minuteStatus: MinuteStatus = meta.status || 'APPROVED';
      const sender = meta.sender || { name: doc.createdBy?.fullName || '', title: 'Kỹ thuật viên CNTT', department: 'Phòng CNTT' };
      const receiver = meta.receiver || { name: '', title: '', department: dept };
      const equipmentList: MinuteEquipmentItem[] = Array.isArray(meta.equipmentList) ? meta.equipmentList : [];
      const reason: string = meta.reason || '';
      const signers = meta.signers || {};
      const extraNotes = meta.extraNotes || '';

      return {
        id: doc.id,
        title: doc.title,
        minuteType,
        minuteCode,
        department: dept,
        companyName: doc.companyName || '',
        documentDate: doc.documentDate ? doc.documentDate.toISOString() : doc.createdAt.toISOString(),
        status: minuteStatus,
        sender,
        receiver,
        equipmentList,
        reason,
        signers,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        attachments: (doc.attachments as any[]) || [],
        extraNotes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        createdBy: doc.createdBy,
      };
    });

    // Compute stats before filtering
    const stats = {
      total: parsedItems.length,
      handover: parsedItems.filter((i) => i.minuteType === 'HANDOVER').length,
      revocation: parsedItems.filter((i) => i.minuteType === 'REVOCATION').length,
      maintenance: parsedItems.filter((i) => i.minuteType === 'MAINTENANCE').length,
      proposal: parsedItems.filter((i) => i.minuteType === 'PROPOSAL').length,
    };

    // Apply filtering
    let filtered = parsedItems;
    if (subtype !== 'ALL') {
      filtered = filtered.filter((i) => i.minuteType === subtype);
    }
    if (status !== 'ALL') {
      filtered = filtered.filter((i) => i.status === status);
    }
    if (department) {
      filtered = filtered.filter((i) => i.department.toLowerCase().includes(department.toLowerCase()));
    }
    if (search) {
      filtered = filtered.filter((i) => {
        const text = `${i.minuteCode} ${i.title} ${i.department} ${i.sender.name} ${i.receiver.name} ${i.reason} ${i.equipmentList.map((e) => e.name + ' ' + (e.serial || '')).join(' ')}`.toLowerCase();
        return text.includes(search);
      });
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching minutes:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách biên bản' }, { status: 500 });
  }
}

// POST /api/minutes - Create new minute or proposal
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MinutePayload = await request.json();
    if (!body.title || !body.minuteType) {
      return NextResponse.json({ error: 'Tiêu đề và Loại biên bản là bắt buộc' }, { status: 400 });
    }

    const minuteCode = body.minuteCode?.trim() || generateMinuteCode(body.minuteType);
    const minuteType = body.minuteType;
    const department = body.department?.trim() || '';
    const status = body.status || 'DRAFT';
    const documentDate = body.documentDate ? new Date(body.documentDate) : new Date();

    const meta = {
      minuteType,
      minuteCode,
      department,
      status,
      sender: body.sender || {},
      receiver: body.receiver || {},
      equipmentList: body.equipmentList || [],
      reason: body.reason || '',
      signers: body.signers || {},
      extraNotes: body.extraNotes || '',
    };

    const docType = minuteType === 'PROPOSAL' ? 'PROPOSAL' : 'HANDOVER';

    const newDoc = await prisma.document.create({
      data: {
        title: body.title,
        type: docType,
        projectCode: minuteCode,
        projectName: department,
        companyName: body.companyName || null,
        documentDate,
        fileUrl: body.fileUrl || '',
        fileName: body.fileName || (body.fileUrl ? body.title : 'bien-ban.pdf'),
        fileSize: 0,
        fileType: 'application/pdf',
        attachments: body.attachments || [],
        notes: JSON.stringify(meta),
        createdById: currentUser.userId,
      },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: 'CREATE',
      entityType: 'Document',
      entityId: newDoc.id,
      changes: {
        minuteType,
        minuteCode,
        title: body.title,
        department,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Tạo biên bản thành công',
      data: {
        ...newDoc,
        minuteCode,
        minuteType,
        department,
        status,
      },
    });
  } catch (error: any) {
    console.error('Error creating minute:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo biên bản' }, { status: 500 });
  }
}

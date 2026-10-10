import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export type MinuteType = 'HANDOVER' | 'REVOCATION' | 'MAINTENANCE' | 'PROPOSAL';
export type MinuteStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export interface MinuteEquipmentItem {
  id?: string;
  name: string; // Tên, đặc điểm, ký hiệu TSCĐ
  code?: string; // Mã tài sản / Mã QR
  serial?: string; // Số Serinumber
  model?: string; // Model (LBP 2900, ...)
  quantity: number; // Số lượng
  unit?: string; // ĐVT (Cái, Bộ...)
  usageYear?: string; // Năm sử dụng ("Không rõ", "2021", ...)
  originalPrice?: string; // Nguyên giá (đồng) ("Không rõ", ...)
  condition?: string; // Tình trạng ("Hư không sửa được", "Mới 100%", ...)
  notes?: string; // Ghi chú
  qrData?: string; // Mã QR
}

export interface MinutePayload {
  id?: string;
  title: string;
  minuteType: MinuteType;
  minuteCode?: string;
  hospitalName?: string; // Tên Bệnh viện / Đơn vị (VD: "BỆNH VIỆN ĐA KHOA CHÂU ĐỐC")
  department?: string; // Khoa / Phòng (VD: "KHOA DƯỢC" hoặc "Phòng Hành Chính Quản trị")
  location?: string; // Địa điểm lập biên bản (VD: "Phòng Hành Chính Quản trị")
  locationCity?: string; // Địa danh (VD: "Châu Đốc")
  recipients?: string; // Kính gửi (VD: "- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin")
  legalBasis?: string; // Căn cứ thu hồi
  handoverCommitment?: string; // Lời cam kết bàn giao
  copiesCount?: string | number; // Số bản lập (VD: "03")
  companyName?: string;
  documentDate?: string;
  status: MinuteStatus;

  // Trường liên kết Tờ đề nghị
  isBasedOnProposal?: boolean; // Đánh dấu thiết bị được cấp mới hay thu hồi theo đề nghị
  relatedProposalId?: string; // ID của tờ đề nghị
  relatedProposalCode?: string; // Mã tờ đề nghị (VD: "DN-TB-2026-1004")
  relatedProposalTitle?: string; // Tiêu đề tờ đề nghị

  sender?: {
    name?: string;
    title?: string;
    department?: string;
  };
  receiver1?: {
    name?: string;
    title?: string;
    department?: string;
  };
  receiver2?: {
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
    senderSignerTitle?: string; // VD: "Bên Giao" hoặc "Bên bàn giao"
    senderSignerName?: string;
    receiver1Title?: string; // VD: "Bên Nhận" hoặc "Trưởng Khoa/Phòng"
    receiver1Name?: string;
    receiver2Title?: string; // VD: "Nhân viên Khoa/Phòng"
    receiver2Name?: string;
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
          title: 'Biên bản bàn giao tài sản, công cụ',
          type: 'HANDOVER' as const,
          projectCode: `BB-BG-2025-0145`,
          projectName: 'Phòng Hành Chính Quản trị',
          documentDate: new Date('2025-02-28'),
          notes: JSON.stringify({
            minuteType: 'HANDOVER',
            minuteCode: `BB-BG-2025-0145`,
            hospitalName: 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
            department: 'Phòng Hành Chính Quản trị',
            location: 'Phòng Hành Chính Quản trị',
            locationCity: 'Châu Đốc',
            status: 'APPROVED',
            isBasedOnProposal: true,
            relatedProposalCode: `DN-TB-2025-089`,
            relatedProposalTitle: 'Đề nghị xin cấp màn hình vi tính cho Phòng Hành Chính Quản trị',
            sender: { name: '', title: 'Nhân viên', department: 'Phòng CNTT' },
            receiver1: { name: 'Trần Trung Nguyên', title: 'Trưởng Phòng', department: 'Phòng Hành Chính Quản trị' },
            receiver2: { name: 'Nguyễn Thị Thu Thanh', title: 'Nhân viên', department: 'Phòng HCQT' },
            receiver: { name: 'Trần Trung Nguyên', title: 'Trưởng Phòng', department: 'Phòng Hành Chính Quản trị' },
            reason: 'Cấp mới màn hình máy vi tính theo đề nghị của Phòng Hành Chính Quản trị.',
            handoverCommitment: 'Kể từ ngày 28/02/2025 số tài sản trên bên giao đã bàn giao lại hết cho bên nhận đầy đủ.',
            copiesCount: '03',
            equipmentList: [
              {
                name: 'Màn hình Aiwa 22 inch',
                code: 'PCKH31450',
                serial: 'AW-22019',
                model: 'Aiwa 22 inch',
                quantity: 1,
                unit: 'Cái',
                condition: 'Mới 100%',
                notes: '',
              },
            ],
            signers: {
              senderSignerTitle: 'Bên bàn giao',
              senderSignerName: '',
              receiver1Title: 'Trưởng Khoa/Phòng',
              receiver1Name: 'Trần Trung Nguyên',
              receiver2Title: 'Nhân viên Khoa/Phòng',
              receiver2Name: 'Nguyễn Thị Thu Thanh',
            },
          }),
        },
        {
          title: 'Biên bản thu hồi tài sản',
          type: 'HANDOVER' as const,
          projectCode: `BB-TH-2026-0218`,
          projectName: 'Dược',
          documentDate: new Date(),
          notes: JSON.stringify({
            minuteType: 'REVOCATION',
            minuteCode: `BB-TH-2026-0218`,
            hospitalName: 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
            department: 'Dược',
            locationCity: 'Châu Đốc',
            status: 'APPROVED',
            recipients: '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin',
            legalBasis: 'Căn cứ tình hình thực tế của Khoa Dược, tài sản hiện tại khoa không có nhu cầu sử dụng nên cần trả lại Phòng Công Nghệ Thông Tin như sau:',
            reason: 'Khoa không có nhu cầu sử dụng nên cần trả lại Phòng Công Nghệ Thông Tin',
            isBasedOnProposal: true,
            relatedProposalCode: `DN-TB-2026-015`,
            relatedProposalTitle: 'Đề nghị thu hồi thiết bị hỏng Khoa Dược',
            sender: { name: 'Dược sĩ Đỗ Thúy Hằng', title: 'Phụ trách', department: 'Khoa Dược' },
            receiver1: { name: '', title: 'Nhân viên', department: 'Phòng CNTT' },
            receiver: { name: '', title: 'Nhân viên', department: 'Phòng CNTT' },
            copiesCount: '03',
            equipmentList: [
              {
                name: 'Máy in Canon',
                code: 'TS-PR-01',
                serial: 'MQCA697363',
                model: 'LBP 2900',
                quantity: 1,
                unit: 'Cái',
                usageYear: 'Không rõ',
                originalPrice: 'Không rõ',
                condition: 'Hư không sửa được',
                notes: '',
              },
              {
                name: 'Máy in Canon',
                code: 'TS-PR-02',
                serial: 'NDMA266911',
                model: 'LBP 2900',
                quantity: 1,
                unit: 'Cái',
                usageYear: 'Không rõ',
                originalPrice: 'Không rõ',
                condition: 'Hư không sửa được',
                notes: '',
              },
            ],
            signers: {
              senderSignerTitle: 'Bên Giao',
              senderSignerName: 'Đỗ Thúy Hằng',
              receiver1Title: 'Bên Nhận',
              receiver1Name: '',
            },
          }),
        },
        {
          title: 'Tờ đề nghị xin cấp màn hình vi tính cho Phòng Hành Chính Quản trị',
          type: 'PROPOSAL' as const,
          projectCode: `DN-TB-2025-089`,
          projectName: 'Phòng Hành Chính Quản trị',
          documentDate: new Date('2025-02-20'),
          notes: JSON.stringify({
            minuteType: 'PROPOSAL',
            minuteCode: `DN-TB-2025-089`,
            hospitalName: 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
            department: 'Phòng Hành Chính Quản trị',
            status: 'APPROVED',
            sender: { name: 'Trần Trung Nguyên', title: 'Trưởng Phòng', department: 'Phòng Hành Chính Quản trị' },
            receiver1: { name: 'Phòng Công Nghệ Thông Tin', title: 'Tiếp nhận', department: 'Phòng CNTT' },
            reason: 'Trang bị bổ sung màn hình máy vi tính phục vụ công tác văn thư lưu trữ',
            equipmentList: [
              {
                name: 'Màn hình Aiwa 22 inch',
                code: 'PCKH31450',
                serial: '',
                model: 'Aiwa 22 inch',
                quantity: 1,
                unit: 'Cái',
                condition: 'Xin cấp mới 100%',
                notes: 'Phục vụ bàn làm việc văn thư',
              },
            ],
            signers: {
              senderSignerTitle: 'Đại diện đề nghị',
              senderSignerName: 'Trần Trung Nguyên',
              receiver1Title: 'Lãnh đạo duyệt',
              receiver1Name: 'Ban Giám Đốc',
            },
          }),
        },
        {
          title: 'Tờ đề nghị thu hồi máy in hỏng Khoa Dược',
          type: 'PROPOSAL' as const,
          projectCode: `DN-TB-2026-015`,
          projectName: 'Dược',
          documentDate: new Date('2026-02-15'),
          notes: JSON.stringify({
            minuteType: 'PROPOSAL',
            minuteCode: `DN-TB-2026-015`,
            hospitalName: 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
            department: 'Dược',
            status: 'APPROVED',
            sender: { name: 'Dược sĩ Đỗ Thúy Hằng', title: 'Phụ trách', department: 'Khoa Dược' },
            receiver1: { name: 'Phòng Công Nghệ Thông Tin', title: 'Tiếp nhận', department: 'Phòng CNTT' },
            reason: 'Đề nghị Phòng CNTT thu hồi 02 máy in Canon LBP 2900 bị hỏng linh kiện không còn khả năng sửa chữa',
            equipmentList: [
              {
                name: 'Máy in Canon',
                code: 'TS-PR-01',
                serial: 'MQCA697363',
                model: 'LBP 2900',
                quantity: 1,
                unit: 'Cái',
                condition: 'Hư không sửa được',
                notes: 'Cháy nguồn và hỏng hộp quang',
              },
              {
                name: 'Máy in Canon',
                code: 'TS-PR-02',
                serial: 'NDMA266911',
                model: 'LBP 2900',
                quantity: 1,
                unit: 'Cái',
                condition: 'Hư không sửa được',
                notes: 'Hỏng mainboard chính',
              },
            ],
            signers: {
              senderSignerTitle: 'Đại diện đề nghị',
              senderSignerName: 'Đỗ Thúy Hằng',
              receiver1Title: 'Lãnh đạo duyệt',
              receiver1Name: 'Ban Giám Đốc',
            },
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
      const receiver1 = meta.receiver1 || meta.receiver || { name: '', title: '', department: dept };
      const receiver2 = meta.receiver2 || { name: '', title: '', department: dept };
      const receiver = receiver1;
      const equipmentList: MinuteEquipmentItem[] = Array.isArray(meta.equipmentList) ? meta.equipmentList : [];
      const reason: string = meta.reason || '';
      const signers = meta.signers || {};
      const extraNotes = meta.extraNotes || '';

      return {
        id: doc.id,
        title: doc.title,
        minuteType,
        minuteCode,
        hospitalName: meta.hospitalName || doc.companyName || 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
        department: dept,
        location: meta.location || dept,
        locationCity: meta.locationCity || 'Châu Đốc',
        recipients: meta.recipients || '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin',
        legalBasis: meta.legalBasis || '',
        handoverCommitment: meta.handoverCommitment || '',
        copiesCount: meta.copiesCount || '03',
        companyName: doc.companyName || '',
        documentDate: doc.documentDate ? doc.documentDate.toISOString() : doc.createdAt.toISOString(),
        status: minuteStatus,
        isBasedOnProposal: !!meta.isBasedOnProposal,
        relatedProposalId: meta.relatedProposalId || '',
        relatedProposalCode: meta.relatedProposalCode || '',
        relatedProposalTitle: meta.relatedProposalTitle || '',
        sender,
        receiver1,
        receiver2,
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
        const text = `${i.minuteCode} ${i.title} ${i.department} ${i.sender?.name} ${i.receiver1?.name} ${i.receiver2?.name} ${i.relatedProposalCode} ${i.reason} ${i.equipmentList?.map((e) => e.name + ' ' + (e.serial || '') + ' ' + (e.model || '')).join(' ')}`.toLowerCase();
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
      hospitalName: body.hospitalName || 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
      department,
      location: body.location || department,
      locationCity: body.locationCity || 'Châu Đốc',
      recipients: body.recipients || '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin',
      legalBasis: body.legalBasis || '',
      handoverCommitment: body.handoverCommitment || '',
      copiesCount: body.copiesCount || '03',
      status,
      isBasedOnProposal: !!body.isBasedOnProposal,
      relatedProposalId: body.relatedProposalId || '',
      relatedProposalCode: body.relatedProposalCode || '',
      relatedProposalTitle: body.relatedProposalTitle || '',
      sender: body.sender || {},
      receiver1: body.receiver1 || body.receiver || {},
      receiver2: body.receiver2 || {},
      receiver: body.receiver1 || body.receiver || {},
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
        companyName: body.hospitalName || body.companyName || null,
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
        relatedProposalCode: body.relatedProposalCode,
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

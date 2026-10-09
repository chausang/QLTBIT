import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { MinutePayload } from '../route';

export const dynamic = 'force-dynamic';

// GET /api/minutes/[id] - Get minute details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, department: true, email: true },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Không tìm thấy biên bản' }, { status: 404 });
    }

    let meta: any = {};
    try {
      if (doc.notes && doc.notes.startsWith('{')) {
        meta = JSON.parse(doc.notes);
      }
    } catch {
      meta = {};
    }

    const minuteType = meta.minuteType || (doc.type === 'PROPOSAL' ? 'PROPOSAL' : 'HANDOVER');
    const minuteCode = meta.minuteCode || doc.projectCode || `BB-${doc.id.slice(0, 8).toUpperCase()}`;
    const department = meta.department || doc.projectName || '';
    const status = meta.status || 'APPROVED';

    const receiver1 = meta.receiver1 || meta.receiver || { name: '', title: '', department };
    const receiver2 = meta.receiver2 || { name: '', title: '', department };

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        title: doc.title,
        minuteType,
        minuteCode,
        hospitalName: meta.hospitalName || doc.companyName || 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC',
        department,
        location: meta.location || department,
        locationCity: meta.locationCity || 'Châu Đốc',
        recipients: meta.recipients || '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin',
        legalBasis: meta.legalBasis || '',
        handoverCommitment: meta.handoverCommitment || '',
        copiesCount: meta.copiesCount || '03',
        companyName: doc.companyName || '',
        documentDate: doc.documentDate ? doc.documentDate.toISOString() : doc.createdAt.toISOString(),
        status,
        isBasedOnProposal: !!meta.isBasedOnProposal,
        relatedProposalId: meta.relatedProposalId || '',
        relatedProposalCode: meta.relatedProposalCode || '',
        relatedProposalTitle: meta.relatedProposalTitle || '',
        sender: meta.sender || {},
        receiver1,
        receiver2,
        receiver: receiver1,
        equipmentList: meta.equipmentList || [],
        reason: meta.reason || '',
        signers: meta.signers || {},
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        attachments: (doc.attachments as any[]) || [],
        extraNotes: meta.extraNotes || '',
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        createdBy: doc.createdBy,
      },
    });
  } catch (error: any) {
    console.error('Error fetching minute by id:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải chi tiết biên bản' }, { status: 500 });
  }
}

// PUT /api/minutes/[id] - Update minute
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: MinutePayload = await request.json();

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy biên bản để cập nhật' }, { status: 404 });
    }

    let existingMeta: any = {};
    try {
      if (existing.notes && existing.notes.startsWith('{')) {
        existingMeta = JSON.parse(existing.notes);
      }
    } catch {
      existingMeta = {};
    }

    const minuteType = body.minuteType || existingMeta.minuteType || 'HANDOVER';
    const minuteCode = body.minuteCode?.trim() || existingMeta.minuteCode || existing.projectCode || '';
    const department = body.department !== undefined ? body.department.trim() : (existingMeta.department || existing.projectName || '');
    const status = body.status || existingMeta.status || 'DRAFT';
    const documentDate = body.documentDate ? new Date(body.documentDate) : (existing.documentDate || new Date());

    const meta = {
      ...existingMeta,
      minuteType,
      minuteCode,
      hospitalName: body.hospitalName !== undefined ? body.hospitalName : (existingMeta.hospitalName || 'BỆNH VIỆN ĐA KHOA CHÂU ĐỐC'),
      department,
      location: body.location !== undefined ? body.location : (existingMeta.location || department),
      locationCity: body.locationCity !== undefined ? body.locationCity : (existingMeta.locationCity || 'Châu Đốc'),
      recipients: body.recipients !== undefined ? body.recipients : (existingMeta.recipients || '- Ban Giám Đốc\n- Phòng Công Nghệ Thông Tin'),
      legalBasis: body.legalBasis !== undefined ? body.legalBasis : existingMeta.legalBasis,
      handoverCommitment: body.handoverCommitment !== undefined ? body.handoverCommitment : existingMeta.handoverCommitment,
      copiesCount: body.copiesCount !== undefined ? body.copiesCount : (existingMeta.copiesCount || '03'),
      status,
      isBasedOnProposal: body.isBasedOnProposal !== undefined ? !!body.isBasedOnProposal : !!existingMeta.isBasedOnProposal,
      relatedProposalId: body.relatedProposalId !== undefined ? body.relatedProposalId : existingMeta.relatedProposalId,
      relatedProposalCode: body.relatedProposalCode !== undefined ? body.relatedProposalCode : existingMeta.relatedProposalCode,
      relatedProposalTitle: body.relatedProposalTitle !== undefined ? body.relatedProposalTitle : existingMeta.relatedProposalTitle,
      sender: body.sender !== undefined ? body.sender : existingMeta.sender,
      receiver1: body.receiver1 !== undefined ? body.receiver1 : (existingMeta.receiver1 || existingMeta.receiver),
      receiver2: body.receiver2 !== undefined ? body.receiver2 : existingMeta.receiver2,
      receiver: body.receiver1 !== undefined ? body.receiver1 : (existingMeta.receiver1 || existingMeta.receiver),
      equipmentList: body.equipmentList !== undefined ? body.equipmentList : existingMeta.equipmentList,
      reason: body.reason !== undefined ? body.reason : existingMeta.reason,
      signers: body.signers !== undefined ? body.signers : existingMeta.signers,
      extraNotes: body.extraNotes !== undefined ? body.extraNotes : existingMeta.extraNotes,
    };

    const docType = minuteType === 'PROPOSAL' ? 'PROPOSAL' : 'HANDOVER';

    const updated = await prisma.document.update({
      where: { id },
      data: {
        title: body.title || existing.title,
        type: docType,
        projectCode: minuteCode,
        projectName: department,
        companyName: body.hospitalName || body.companyName || existing.companyName,
        documentDate,
        fileUrl: body.fileUrl !== undefined ? body.fileUrl : existing.fileUrl,
        fileName: body.fileName !== undefined ? body.fileName : existing.fileName,
        attachments: body.attachments !== undefined ? body.attachments : (existing.attachments as any[]),
        notes: JSON.stringify(meta),
      },
    });

    await createAuditLog({
      userId: currentUser.userId,
      action: 'UPDATE',
      entityType: 'Document',
      entityId: id,
      changes: {
        title: body.title,
        status,
        minuteType,
        department,
        relatedProposalCode: meta.relatedProposalCode,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật biên bản thành công',
      data: {
        ...updated,
        minuteCode,
        minuteType,
        department,
        status,
      },
    });
  } catch (error: any) {
    console.error('Error updating minute:', error);
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật biên bản' }, { status: 500 });
  }
}

// DELETE /api/minutes/[id] - Delete minute
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy biên bản' }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });

    await createAuditLog({
      userId: currentUser.userId,
      action: 'DELETE',
      entityType: 'Document',
      entityId: id,
      changes: { title: existing.title, code: existing.projectCode },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa biên bản thành công',
    });
  } catch (error: any) {
    console.error('Error deleting minute:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xóa biên bản' }, { status: 500 });
  }
}

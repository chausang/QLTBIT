import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const MODULE_NAMES: Record<string, string> = {
  'asset-categories': 'Danh Mục Thiết Bị',
  'license-categories': 'Danh Mục License / Bản Quyền',
  'service-categories': 'Danh Mục Dịch Vụ IT',
  'vendors': 'Đối Tác & Nhà Cung Cấp',
  'companies': 'Công Ty Thành Viên & Sơ Đồ OU',
  'locations': 'Vị Trí & Phòng Ban',
  'assets': 'Danh Mục Thiết Bị CNTT',
  'spare-parts': 'Kho Phụ Tùng & Linh Kiện',
};

// GET /api/system/backup/scoped?module={moduleKey} - Export JSON backup for a single module
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module') || '';

    if (!module || !MODULE_NAMES[module]) {
      return NextResponse.json(
        { error: 'Module không hợp lệ. Các module hợp lệ: ' + Object.keys(MODULE_NAMES).join(', ') },
        { status: 400 }
      );
    }

    let moduleData: any = null;
    let totalRecords = 0;

    switch (module) {
      case 'asset-categories': {
        const categories = await prisma.assetCategory.findMany({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        moduleData = categories;
        totalRecords = categories.length;
        break;
      }
      case 'license-categories': {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: 'categories.license' },
        });
        try {
          moduleData = setting?.value ? JSON.parse(setting.value) : [];
        } catch {
          moduleData = [];
        }
        totalRecords = Array.isArray(moduleData) ? moduleData.length : 0;
        break;
      }
      case 'service-categories': {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: 'categories.service' },
        });
        try {
          moduleData = setting?.value ? JSON.parse(setting.value) : [];
        } catch {
          moduleData = [];
        }
        totalRecords = Array.isArray(moduleData) ? moduleData.length : 0;
        break;
      }
      case 'vendors': {
        const vendors = await prisma.vendor.findMany({
          orderBy: { name: 'asc' },
        });
        moduleData = vendors;
        totalRecords = vendors.length;
        break;
      }
      case 'companies': {
        const [compSetting, ouSetting] = await Promise.all([
          prisma.systemSetting.findUnique({ where: { key: 'corporate.companies' } }),
          prisma.systemSetting.findUnique({ where: { key: 'corporate.ou_structure' } }),
        ]);
        let companiesList: string[] = [];
        let ouTree: any[] = [];
        try {
          if (compSetting?.value) companiesList = JSON.parse(compSetting.value);
        } catch {}
        try {
          if (ouSetting?.value) ouTree = JSON.parse(ouSetting.value);
        } catch {}
        moduleData = { companies: companiesList, ouStructure: ouTree };
        totalRecords = companiesList.length;
        break;
      }
      case 'locations': {
        const locations = await prisma.location.findMany({
          orderBy: { name: 'asc' },
        });
        moduleData = locations;
        totalRecords = locations.length;
        break;
      }
      case 'assets': {
        const assets = await prisma.asset.findMany({
          orderBy: { createdAt: 'desc' },
        });
        moduleData = assets;
        totalRecords = assets.length;
        break;
      }
      case 'spare-parts': {
        const spareParts = await prisma.sparePart.findMany({
          orderBy: { createdAt: 'desc' },
        });
        moduleData = spareParts;
        totalRecords = spareParts.length;
        break;
      }
    }

    const payload = {
      meta: {
        system: 'Simply IT',
        appVersion: '2.1.0',
        backupType: 'SCOPED_MODULE',
        module,
        moduleName: MODULE_NAMES[module],
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.email || currentUser.fullName || 'Admin',
        totalRecords,
      },
      data: moduleData,
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `SimplyIT_Backup_${module}_${dateStr}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Scoped backup error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi sao lưu dữ liệu chức năng' }, { status: 500 });
  }
}

// POST /api/system/backup/scoped - Restore single module data from JSON
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { module, mode = 'upsert', data, meta } = body;

    if (!module || !MODULE_NAMES[module]) {
      return NextResponse.json({ error: 'Module không hợp lệ' }, { status: 400 });
    }

    if (data === undefined || data === null) {
      return NextResponse.json({ error: 'Dữ liệu phục hồi (data) không được để trống' }, { status: 400 });
    }

    let restoredCount = 0;

    switch (module) {
      case 'asset-categories': {
        const list: any[] = Array.isArray(data) ? data : [];
        if (mode === 'replace') {
          // Deactivate or reset
          await prisma.assetCategory.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });
        }

        // Restore first level (no parentId)
        for (const item of list) {
          if (!item.name) continue;
          await prisma.assetCategory.upsert({
            where: {
              name_parentId: {
                name: item.name,
                parentId: item.parentId || null,
              },
            },
            create: {
              name: item.name,
              description: item.description || null,
              icon: item.icon || '📦',
              parentId: item.parentId || null,
              customFields: item.customFields || undefined,
              sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
              isActive: true,
            },
            update: {
              description: item.description || null,
              icon: item.icon || '📦',
              customFields: item.customFields || undefined,
              sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
              isActive: true,
            },
          });
          restoredCount++;
        }
        break;
      }

      case 'license-categories': {
        const list = Array.isArray(data) ? data : [];
        await prisma.systemSetting.upsert({
          where: { key: 'categories.license' },
          create: {
            key: 'categories.license',
            value: JSON.stringify(list),
            type: 'JSON',
            group: 'general',
            label: 'Danh mục bản quyền License',
          },
          update: {
            value: JSON.stringify(list),
          },
        });
        restoredCount = list.length;
        break;
      }

      case 'service-categories': {
        const list = Array.isArray(data) ? data : [];
        await prisma.systemSetting.upsert({
          where: { key: 'categories.service' },
          create: {
            key: 'categories.service',
            value: JSON.stringify(list),
            type: 'JSON',
            group: 'general',
            label: 'Danh mục dịch vụ IT',
          },
          update: {
            value: JSON.stringify(list),
          },
        });
        restoredCount = list.length;
        break;
      }

      case 'vendors': {
        const list: any[] = Array.isArray(data) ? data : [];
        if (mode === 'replace') {
          await prisma.vendor.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });
        }

        for (const item of list) {
          if (!item.name) continue;
          const existing = await prisma.vendor.findFirst({
            where: { name: item.name },
          });

          if (existing) {
            await prisma.vendor.update({
              where: { id: existing.id },
              data: {
                contactPerson: item.contactPerson || null,
                email: item.email || null,
                phone: item.phone || null,
                address: item.address || null,
                website: item.website || null,
                notes: typeof item.notes === 'string' ? item.notes : (item.contacts ? JSON.stringify({ contacts: item.contacts, generalNotes: item.generalNotes || '' }) : null),
                isActive: true,
              },
            });
          } else {
            await prisma.vendor.create({
              data: {
                name: item.name,
                contactPerson: item.contactPerson || null,
                email: item.email || null,
                phone: item.phone || null,
                address: item.address || null,
                website: item.website || null,
                notes: typeof item.notes === 'string' ? item.notes : (item.contacts ? JSON.stringify({ contacts: item.contacts, generalNotes: item.generalNotes || '' }) : null),
                isActive: true,
              },
            });
          }
          restoredCount++;
        }
        break;
      }

      case 'companies': {
        let companiesList: string[] = [];
        let ouTree: any[] = [];
        if (Array.isArray(data)) {
          companiesList = data;
        } else if (typeof data === 'object') {
          companiesList = Array.isArray(data.companies) ? data.companies : [];
          ouTree = Array.isArray(data.ouStructure) ? data.ouStructure : [];
        }

        if (companiesList.length > 0) {
          await prisma.systemSetting.upsert({
            where: { key: 'corporate.companies' },
            create: {
              key: 'corporate.companies',
              value: JSON.stringify(companiesList),
              type: 'JSON',
              group: 'general',
              label: 'Danh sách công ty quản lý trong tập đoàn',
            },
            update: {
              value: JSON.stringify(companiesList),
            },
          });
        }

        if (ouTree.length > 0) {
          await prisma.systemSetting.upsert({
            where: { key: 'corporate.ou_structure' },
            create: {
              key: 'corporate.ou_structure',
              value: JSON.stringify(ouTree),
              type: 'JSON',
              group: 'general',
              label: 'Cơ cấu sơ đồ tổ chức (OU) đa cấp',
            },
            update: {
              value: JSON.stringify(ouTree),
            },
          });
        }
        restoredCount = companiesList.length;
        break;
      }

      case 'locations': {
        const list: any[] = Array.isArray(data) ? data : [];
        if (mode === 'replace') {
          await prisma.location.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });
        }

        for (const item of list) {
          if (!item.name) continue;
          const existing = await prisma.location.findFirst({
            where: { name: item.name },
          });

          if (existing) {
            await prisma.location.update({
              where: { id: existing.id },
              data: {
                building: item.building || null,
                floor: item.floor || null,
                notes: item.notes || null,
                isActive: true,
              },
            });
          } else {
            await prisma.location.create({
              data: {
                name: item.name,
                building: item.building || null,
                floor: item.floor || null,
                notes: item.notes || null,
                isActive: true,
              },
            });
          }
          restoredCount++;
        }
        break;
      }

      case 'spare-parts': {
        const list: any[] = Array.isArray(data) ? data : [];
        for (const item of list) {
          if (!item.name) continue;
          const sku = item.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const existing = await prisma.sparePart.findFirst({
            where: { sku: item.sku },
          });

          if (existing) {
            await prisma.sparePart.update({
              where: { id: existing.id },
              data: {
                name: item.name,
                partNumber: item.partNumber || null,
                category: item.category || null,
                quantity: typeof item.quantity === 'number' ? item.quantity : existing.quantity,
                minQuantity: typeof item.minQuantity === 'number' ? item.minQuantity : 0,
                unit: item.unit || 'cái',
                unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                location: item.location || null,
                supplier: item.supplier || null,
                compatibleModels: item.compatibleModels || [],
                fixedAssetName: item.fixedAssetName || null,
                notes: item.notes || null,
              },
            });
          } else {
            await prisma.sparePart.create({
              data: {
                name: item.name,
                sku,
                partNumber: item.partNumber || null,
                category: item.category || null,
                quantity: typeof item.quantity === 'number' ? item.quantity : 0,
                minQuantity: typeof item.minQuantity === 'number' ? item.minQuantity : 0,
                unit: item.unit || 'cái',
                unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                location: item.location || null,
                supplier: item.supplier || null,
                compatibleModels: item.compatibleModels || [],
                fixedAssetName: item.fixedAssetName || null,
                notes: item.notes || null,
              },
            });
          }
          restoredCount++;
        }
        break;
      }
    }

    // Write audit log
    await createAuditLog({
      userId: currentUser.userId,
      action: 'RESTORE',
      entityType: 'SCOPED_BACKUP',
      entityId: module,
      details: {
        module,
        moduleName: MODULE_NAMES[module],
        mode,
        restoredCount,
        restoredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      module,
      moduleName: MODULE_NAMES[module],
      mode,
      restoredCount,
      message: `Phục hồi thành công ${restoredCount} mục cho ${MODULE_NAMES[module]}`,
    });
  } catch (error: any) {
    console.error('Scoped restore error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi phục hồi dữ liệu chức năng' }, { status: 500 });
  }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang khởi tạo Role & Quyền hệ thống DMS-NPP ---');

  // 1. Danh sách Roles
  const rolesData = [
    { code: 'ADMIN', name: 'Quản trị viên hệ thống' },
    { code: 'ACCOUNTANT', name: 'Kế toán viên NPP' },
    { code: 'WAREHOUSE_KEEPER', name: 'Thủ kho' },
    { code: 'SALES', name: 'Đại diện kinh doanh (VNBH)' },
    { code: 'DRIVER', name: 'Nhân viên giao hàng (NVGH/Tài xế)' },
  ];

  const roleMap = new Map();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: { code: r.code, name: r.name },
    });
    roleMap.set(r.code, role.id);
  }
  console.log(`✓ Đã cập nhật ${roleMap.size} roles.`);

  // 2. Danh mục Permissions chi tiết theo từng Resource
  const permissionsData = [
    // Phân hệ Bán hàng (SO)
    { resource: 'sales_orders', action: 'view', name: 'Xem đơn bán hàng (SO)', description: 'Xem danh sách và chi tiết đơn bán hàng' },
    { resource: 'sales_orders', action: 'create', name: 'Lập đơn bán hàng mới', description: 'Tạo đơn hàng bán cho khách/đại lý' },
    { resource: 'sales_orders', action: 'edit', name: 'Chỉnh sửa đơn hàng bán', description: 'Cập nhật mặt hàng, số lượng, giảm giá' },
    { resource: 'sales_orders', action: 'confirm', name: 'Xác nhận chốt đơn (Kế toán)', description: 'Xác nhận đơn hàng, chuyển trạng thái soạn/giao' },
    { resource: 'sales_orders', action: 'cancel', name: 'Hủy đơn hàng bán', description: 'Hủy đơn bán hàng khi có yêu cầu' },
    { resource: 'sales_orders', action: 'close', name: 'Đóng/Quyết toán đơn bán', description: 'Đóng đơn hàng và quyết toán công nợ' },
    { resource: 'sales_orders', action: 'export', name: 'Xuất dữ liệu đơn bán', description: 'Xuất file Excel đơn hàng bán' },

    // Phân hệ Mua hàng (PO)
    { resource: 'purchase_orders', action: 'view', name: 'Xem đơn mua hàng (PO)', description: 'Xem danh sách và chi tiết đơn đặt mua từ NCC' },
    { resource: 'purchase_orders', action: 'create', name: 'Lập đơn mua hàng (PO)', description: 'Tạo đơn đặt hàng mua gửi nhà cung cấp' },
    { resource: 'purchase_orders', action: 'send', name: 'Gửi PO cho NCC', description: 'Chốt và gửi đơn đặt hàng tới NCC' },
    { resource: 'purchase_orders', action: 'receive', name: 'Nhập kho mua hàng', description: 'Nhận hàng từ chuyến xe NCC về kho' },
    { resource: 'purchase_orders', action: 'discrepancy', name: 'Xử lý lệch thừa/thiếu', description: 'Lập và duyệt biên bản chênh lệch nhập hàng' },
    { resource: 'purchase_orders', action: 'cancel', name: 'Hủy đơn mua hàng', description: 'Hủy đơn mua hàng' },
    { resource: 'purchase_orders', action: 'export', name: 'Xuất dữ liệu đơn mua', description: 'Xuất file Excel đơn mua hàng' },

    // Phân hệ Kho & Tồn kho
    { resource: 'inventory', action: 'view', name: 'Xem tồn kho (RPT083, FEFO)', description: 'Xem số lượng tồn theo lô, date và hạn dùng' },
    { resource: 'inventory', action: 'adjust', name: 'Điều chỉnh tồn kho', description: 'Cân đối tăng/giảm tồn kho' },
    { resource: 'inventory', action: 'export', name: 'Xuất báo cáo tồn kho', description: 'Xuất Excel báo cáo tồn kho RPT083' },

    // Phân hệ Kiểm kê kho (Inventory Count)
    { resource: 'inventory_counts', action: 'view', name: 'Xem phiếu kiểm kê kho', description: 'Xem danh sách và chi tiết các đợt kiểm kê' },
    { resource: 'inventory_counts', action: 'create', name: 'Tạo đợt kiểm kê kho', description: 'Mở đợt kiểm kê định kỳ hoặc đột xuất' },
    { resource: 'inventory_counts', action: 'count', name: 'Nhập số lượng đếm thực tế', description: 'Thủ kho nhập số lượng tồn thực tế đếm được' },
    { resource: 'inventory_counts', action: 'submit', name: 'Gửi duyệt phiếu kiểm kê', description: 'Nộp biên bản kiểm kê lên cấp thẩm quyền' },
    { resource: 'inventory_counts', action: 'approve', name: 'Duyệt phiếu kiểm kê (Admin)', description: 'Cấp Admin phê duyệt chốt cân đối tồn kho' },
    { resource: 'inventory_counts', action: 'export', name: 'Xuất biên bản kiểm kê', description: 'Xuất file Excel biên bản kiểm kê' },

    // Phân hệ Điều phối & Giao nhận (Delivery Trips)
    { resource: 'delivery_trips', action: 'view', name: 'Xem chuyến xe & điều phối', description: 'Xem danh sách chuyến xe và trạng thái giao hàng' },
    { resource: 'delivery_trips', action: 'dispatch', name: 'Lập chuyến & Phân bổ xe', description: 'Gán đơn hàng vào chuyến xe, điều phối tài xế' },
    { resource: 'delivery_trips', action: 'deliver', name: 'Xác nhận giao hàng (Tài xế)', description: 'Cập nhật giao thành công, trả hàng hoặc thu tiền' },
    { resource: 'delivery_trips', action: 'close', name: 'Đóng & Quyết toán chuyến xe', description: 'Chốt chuyến xe khi xe hoàn tất về kho' },

    // Phân hệ Danh mục Master Data
    { resource: 'master_data', action: 'view', name: 'Xem danh mục chung', description: 'Xem sản phẩm, khách hàng, nhà cung cấp, kho' },
    { resource: 'master_data', action: 'manage', name: 'Quản lý danh mục', description: 'Thêm, sửa thông tin sản phẩm, khách hàng, nhà cung cấp' },
    { resource: 'master_data', action: 'approve_sample', name: 'Duyệt thương mại hóa hàng mẫu (Admin)', description: 'Admin duyệt đưa hàng mẫu vào kinh doanh thương mại' },

    // Phân hệ Tài chính & Báo cáo
    { resource: 'reports_finance', action: 'view', name: 'Xem báo cáo PnL & Doanh số', description: 'Xem báo cáo lãi lỗ PnL, báo cáo doanh số RPT057' },
    { resource: 'reports_finance', action: 'export', name: 'Xuất báo cáo tài chính', description: 'Tải file Excel các báo cáo tổng hợp' },

    // Phân hệ Quản trị hệ thống & Phân quyền
    { resource: 'users_roles', action: 'manage', name: 'Quản lý Người dùng & Phân quyền', description: 'Tạo tài khoản, gán vai trò và thiết lập ma trận quyền' },
  ];

  const permMap = new Map();
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: p.resource,
          action: p.action,
        },
      },
      update: {
        name: p.name,
        description: p.description,
      },
      create: {
        resource: p.resource,
        action: p.action,
        name: p.name,
        description: p.description,
      },
    });
    permMap.set(`${p.resource}:${p.action}`, perm.id);
  }
  console.log(`✓ Đã nạp ${permMap.size} permissions.`);

  // 3. Phân bổ quyền mặc định cho từng Role
  const rolePermissionsConfig = {
    ADMIN: [
      // Admin có toàn quyền hệ thống, đặc biệt nắm các quyền duyệt quan trọng
      'users_roles:manage',
      'inventory_counts:approve',
      'inventory_counts:view',
      'inventory_counts:export',
      'master_data:approve_sample',
      'master_data:view',
      'master_data:manage',
      'sales_orders:view',
      'sales_orders:cancel',
      'sales_orders:export',
      'purchase_orders:view',
      'purchase_orders:cancel',
      'purchase_orders:export',
      'inventory:view',
      'inventory:export',
      'delivery_trips:view',
      'reports_finance:view',
      'reports_finance:export',
    ],
    ACCOUNTANT: [
      // Kế toán viên: Nắm trục vận hành chính (xử lý đơn SO, PO, công nợ, báo cáo, điều phối)
      'sales_orders:view',
      'sales_orders:create',
      'sales_orders:edit',
      'sales_orders:confirm',
      'sales_orders:cancel',
      'sales_orders:close',
      'sales_orders:export',
      'purchase_orders:view',
      'purchase_orders:create',
      'purchase_orders:send',
      'purchase_orders:discrepancy',
      'purchase_orders:cancel',
      'purchase_orders:export',
      'inventory:view',
      'inventory:adjust',
      'inventory:export',
      'inventory_counts:view',
      'inventory_counts:create',
      'inventory_counts:submit',
      'inventory_counts:export',
      'delivery_trips:view',
      'delivery_trips:dispatch',
      'delivery_trips:close',
      'master_data:view',
      'master_data:manage',
      'reports_finance:view',
      'reports_finance:export',
    ],
    WAREHOUSE_KEEPER: [
      // Thủ kho: Quản lý hàng thực tế, nhận hàng PO, kiểm đếm tồn kho
      'purchase_orders:view',
      'purchase_orders:receive',
      'inventory:view',
      'inventory_counts:view',
      'inventory_counts:count',
      'inventory_counts:submit',
      'delivery_trips:view',
      'master_data:view',
    ],
    SALES: [
      // VNBH: Tạo đơn SO cho khách, theo dõi trạng thái và tra cứu tồn
      'sales_orders:view',
      'sales_orders:create',
      'inventory:view',
      'master_data:view',
    ],
    DRIVER: [
      // Tài xế: Nhận đơn theo chuyến và xác nhận kết quả giao
      'delivery_trips:view',
      'delivery_trips:deliver',
    ],
  };

  // Xóa các liên kết quyền cũ và nạp lại chuẩn
  for (const [roleCode, permKeys] of Object.entries(rolePermissionsConfig)) {
    const roleId = roleMap.get(roleCode);
    if (!roleId) continue;

    // Xóa liên kết hiện tại của role
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    const entries = permKeys
      .map((k) => {
        const pId = permMap.get(k);
        return pId ? { roleId, permissionId: pId } : null;
      })
      .filter(Boolean);

    for (const entry of entries) {
      await prisma.rolePermission.create({
        data: entry,
      });
    }
  }

  console.log('✓ Đã khởi tạo ma trận Role - Permissions thành công!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed Role & Permission:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

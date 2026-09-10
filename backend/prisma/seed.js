import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Đang tạo dữ liệu mẫu hệ thống DMS-NPP...");

  // 1. Roles
  const rolesList = [
    { code: 'ADMIN', name: 'Quản trị viên hệ thống' },
    { code: 'SALES', name: 'Đại diện kinh doanh (VNBH)' },
    { code: 'DRIVER', name: 'Nhân viên giao hàng (NVGH/Tài xế)' },
    { code: 'WAREHOUSE_KEEPER', name: 'Thủ kho' }
  ];

  const roleMap = {};
  for (const r of rolesList) {
    let role = await prisma.role.findUnique({ where: { code: r.code } });
    if (!role) {
      role = await prisma.role.create({ data: r });
    }
    roleMap[r.code] = role;
  }
  console.log("✓ Đã khởi tạo Roles");

  // 2. Distributor
  let distributor = await prisma.distributor.findUnique({ where: { code: 'G-10KF1292' } });
  if (!distributor) {
    distributor = await prisma.distributor.create({
      data: {
        code: 'G-10KF1292',
        name: 'Nhà Phân Phối G KF1292',
        address: '123 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh',
        phone: '02838999999',
        channel: 'GT',
        region: 'Miền Nam'
      }
    });
  }

  // 3. Warehouse
  let warehouse = await prisma.warehouse.findUnique({
    where: {
      distributorId_code: {
        distributorId: distributor.id,
        code: 'G-10KF1292'
      }
    }
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        distributorId: distributor.id,
        code: 'G-10KF1292',
        name: 'Kho NPP mặc định',
        type: 'SALES'
      }
    });
  }

  const passwordHash = await bcrypt.hash('123456', 10);

  // 4. Admin User
  let admin = await prisma.user.findUnique({ where: { username: 'admin@example.com' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        username: 'admin@example.com',
        passwordHash,
        fullName: 'Nguyễn Phước Admin',
        roleId: roleMap.ADMIN.id
      }
    });
  }

  // 5. Sales Reps (VNBH)
  const salesUsers = [
    { username: 'NVBH001', fullName: 'Nguyễn Văn An', phone: '0908111222', email: 'an.nguyen@dms.vn' },
    { username: 'NVBH002', fullName: 'Trần Thị Mai', phone: '0908333444', email: 'mai.tran@dms.vn' },
    { username: 'NVBH003', fullName: 'Lê Hoàng Phúc', phone: '0908555666', email: 'phuc.le@dms.vn' }
  ];

  const salesMap = {};
  for (const s of salesUsers) {
    let u = await prisma.user.findUnique({ where: { username: s.username } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          username: s.username,
          passwordHash,
          fullName: s.fullName,
          phone: s.phone,
          email: s.email,
          roleId: roleMap.SALES.id,
          distributorId: distributor.id
        }
      });
    }
    salesMap[s.username] = u;
  }
  console.log("✓ Đã khởi tạo Sales Reps (VNBH)");

  // 6. Drivers (NVGH)
  const driverUsers = [
    { username: 'NVGH001', fullName: 'Phạm Văn Tài (Tài xế xe 1)', phone: '0912111222' },
    { username: 'NVGH002', fullName: 'Đỗ Quốc Bảo (Tài xế xe 2)', phone: '0912333444' }
  ];

  const driverMap = {};
  for (const d of driverUsers) {
    let u = await prisma.user.findUnique({ where: { username: d.username } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          username: d.username,
          passwordHash,
          fullName: d.fullName,
          phone: d.phone,
          roleId: roleMap.DRIVER.id,
          distributorId: distributor.id
        }
      });
    }
    driverMap[d.username] = u;
  }
  console.log("✓ Đã khởi tạo Drivers (NVGH)");

  // 7. Retailers (Đại lý / Cửa hàng)
  const retailersList = [
    { code: 'DL-001', name: 'Tạp Hóa Minh Phát', address: '124 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM', phone: '0901234567' },
    { code: 'DL-002', name: 'Cửa Hàng Bách Hóa Cô Ba', address: '45 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', phone: '0912345678' },
    { code: 'DL-003', name: 'Siêu Thị Mini Tiện Lợi', address: '789 Nguyễn Thị Thập, Phường Tân Phong, Quận 7, TP.HCM', phone: '0923456789' },
    { code: 'DL-004', name: 'Đại Lý Nước Giải Khát Hòa Bình', address: '22 Bạch Đằng, Phường 24, Quận Bình Thạnh, TP.HCM', phone: '0934567890' },
    { code: 'DL-005', name: 'Cửa Hàng Tiện Ích 24/7 An Lộc', address: '56 Trường Chinh, Phường 15, Quận Tân Bình, TP.HCM', phone: '0945678901' }
  ];

  const retailerMap = {};
  for (const ret of retailersList) {
    let r = await prisma.retailer.findUnique({
      where: {
        distributorId_code: {
          distributorId: distributor.id,
          code: ret.code
        }
      }
    });
    if (!r) {
      r = await prisma.retailer.create({
        data: {
          distributorId: distributor.id,
          code: ret.code,
          name: ret.name,
          address: ret.address,
          phone: ret.phone
        }
      });
    }
    retailerMap[ret.code] = r;
  }
  console.log("✓ Đã khởi tạo Retailers");

  // 8. Delivery Trips (Chuyến xe giao hàng)
  const tripsList = [
    { tripCode: 'TRIP-20260909-001', driverId: driverMap['NVGH001']?.id, status: 'WAITING_SHIP' },
    { tripCode: 'TRIP-20260909-002', driverId: driverMap['NVGH002']?.id, status: 'WAITING_CONFIRM' }
  ];

  const tripMap = {};
  for (const t of tripsList) {
    let trip = await prisma.deliveryTrip.findUnique({ where: { tripCode: t.tripCode } });
    if (!trip) {
      trip = await prisma.deliveryTrip.create({
        data: {
          tripCode: t.tripCode,
          distributorId: distributor.id,
          warehouseId: warehouse.id,
          driverId: t.driverId,
          status: t.status
        }
      });
    }
    tripMap[t.tripCode] = trip;
  }
  console.log("✓ Đã khởi tạo Delivery Trips");

  // 9. Lấy 5 sản phẩm đầu tiên từ kho
  const products = await prisma.product.findMany({ take: 6 });
  if (products.length === 0) {
    console.log("⚠️ Chưa có sản phẩm, vui lòng chạy import_inventory.js trước!");
    return;
  }

  // Đảm bảo các lô GOOD có HSD hợp lệ trong tương lai
  await prisma.stockLot.updateMany({
    where: { status: 'GOOD' },
    data: { expiryDate: new Date('2027-12-31T00:00:00Z') }
  });

  // Reset đơn hàng cũ để tạo mới đồng bộ
  await prisma.salesOrder.deleteMany();

  // 10. Tạo các Sales Orders với nhiều trạng thái
  const ordersToSeed = [
    {
      orderCode: 'SO-20260909-0001',
      retailerCode: 'DL-001',
      salesUsername: 'NVBH001',
      status: 'PENDING',
      orderType: 'LATER',
      createdAt: new Date('2026-09-09T08:15:00Z'),
      items: [
        { productId: products[1].id, quantity: 2, unitPrice: products[1].basePrice || 105000 },
        { productId: products[3].id, quantity: 2, unitPrice: products[3].basePrice || 120000 }
      ]
    },
    {
      orderCode: 'SO-20260909-0002',
      retailerCode: 'DL-002',
      salesUsername: 'NVBH002',
      status: 'PENDING', // Đơn hàng cố tình có số lượng lớn hơn tồn để test RPT005 thiếu tồn
      orderType: 'LATER',
      createdAt: new Date('2026-09-09T09:00:00Z'),
      items: [
        { productId: products[2].id, quantity: 9999, unitPrice: products[2].basePrice || 180000 }, // Thiếu tồn
        { productId: products[3].id, quantity: 2, unitPrice: products[3].basePrice || 320000 }
      ]
    },
    {
      orderCode: 'SO-20260909-0003',
      retailerCode: 'DL-003',
      salesUsername: 'NVBH001',
      status: 'ALLOCATED',
      orderType: 'LATER',
      createdAt: new Date('2026-09-08T14:30:00Z'),
      items: [
        { productId: products[0].id, quantity: 4, unitPrice: products[0].basePrice || 120000 },
        { productId: products[4]?.id || products[1].id, quantity: 6, unitPrice: products[4]?.basePrice || 150000 }
      ]
    },
    {
      orderCode: 'SO-20260909-0004',
      retailerCode: 'DL-004',
      salesUsername: 'NVBH003',
      status: 'SHIPPED',
      tripCode: 'TRIP-20260909-001',
      orderType: 'LATER',
      createdAt: new Date('2026-09-08T10:00:00Z'),
      items: [
        { productId: products[1].id, quantity: 8, unitPrice: products[1].basePrice || 250000 },
        { productId: products[3].id, quantity: 5, unitPrice: products[3].basePrice || 320000 }
      ]
    },
    {
      orderCode: 'SO-20260909-0005',
      retailerCode: 'DL-005',
      salesUsername: 'NVBH002',
      status: 'DELIVERED',
      tripCode: 'TRIP-20260909-001',
      orderType: 'LATER',
      createdAt: new Date('2026-09-07T11:20:00Z'),
      items: [
        { productId: products[0].id, quantity: 12, unitPrice: products[0].basePrice || 120000 }
      ]
    },
    {
      orderCode: 'SO-20260909-0006',
      retailerCode: 'DL-001',
      salesUsername: 'NVBH001',
      status: 'PAID',
      tripCode: 'TRIP-20260909-002',
      orderType: 'IMMEDIATE',
      createdAt: new Date('2026-09-06T09:10:00Z'),
      items: [
        { productId: products[2].id, quantity: 15, unitPrice: products[2].basePrice || 180000 }
      ]
    },
    {
      orderCode: 'SO-20260909-0007',
      retailerCode: 'DL-002',
      salesUsername: 'NVBH003',
      status: 'CANCELLED',
      orderType: 'LATER',
      createdAt: new Date('2026-09-08T16:00:00Z'),
      items: [
        { productId: products[3].id, quantity: 3, unitPrice: products[3].basePrice || 320000 }
      ]
    }
  ];

  for (const o of ordersToSeed) {
    const existing = await prisma.salesOrder.findUnique({ where: { orderCode: o.orderCode } });
    if (!existing) {
      const retailer = retailerMap[o.retailerCode];
      const salesUser = salesMap[o.salesUsername];
      const trip = o.tripCode ? tripMap[o.tripCode] : null;

      const order = await prisma.salesOrder.create({
        data: {
          orderCode: o.orderCode,
          distributorId: distributor.id,
          warehouseId: warehouse.id,
          retailerId: retailer.id,
          createdById: salesUser?.id,
          deliveryTripId: trip?.id || null,
          status: o.status,
          orderType: o.orderType,
          createdAt: o.createdAt,
          items: {
            create: o.items.map(it => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice
            }))
          }
        },
        include: { items: true }
      });

      // Tạo log lịch sử trạng thái
      await prisma.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedById: salesUser?.id || admin.id,
          changedAt: o.createdAt,
          notes: 'Tạo mới đơn hàng bởi ĐDKD'
        }
      });

      if (o.status !== 'PENDING') {
        await prisma.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: 'PENDING',
            toStatus: o.status,
            changedById: admin.id,
            changedAt: new Date(o.createdAt.getTime() + 3600000),
            reason: o.status === 'CANCELLED' ? 'Khách hàng đổi ý, yêu cầu huỷ đơn' : null,
            notes: `Chuyển trạng thái sang ${o.status}`
          }
        });
      }

      // Nếu trạng thái ALLOCATED, phân bổ lô FEFO thử nghiệm
      if (o.status === 'ALLOCATED') {
        for (const item of order.items) {
          const lots = await prisma.stockLot.findMany({
            where: {
              productId: item.productId,
              warehouseId: warehouse.id,
              status: 'GOOD'
            },
            include: { stockBalance: true },
            orderBy: { expiryDate: 'asc' },
            take: 1
          });

          if (lots.length > 0) {
            await prisma.salesOrderItemAllocation.create({
              data: {
                salesOrderItemId: item.id,
                lotId: lots[0].id,
                quantity: item.quantity
              }
            });

            // Tăng quantityReserved
            await prisma.stockBalance.update({
              where: { lotId: lots[0].id },
              data: {
                quantityReserved: {
                  increment: item.quantity
                }
              }
            });
          }
        }
      }
    }
  }

  // 10. Suppliers (Nhà cung cấp)
  const sampleSuppliers = [
    { code: 'NCC-THP', name: 'Công ty Cổ phần Tập đoàn Tân Hiệp Phát', address: '219 Đại lộ Bình Dương, Thuận An, Bình Dương', phone: '02743755999' },
    { code: 'NCC-VINAMILK', name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)', address: '10 Tân Trào, Tân Phú, Quận 7, TP. HCM', phone: '02854155555' },
    { code: 'NCC-MASAN', name: 'Công ty Cổ phần Hàng tiêu dùng Masan', address: 'Tầng 12, MPlaza Saigon, 39 Lê Duẩn, Quận 1, TP. HCM', phone: '02862563862' },
    { code: 'NCC-UNILEVER', name: 'Công ty TNHH Quốc tế Unilever Việt Nam', address: 'A2-3, KCN Tây Bắc Củ Chi, TP. HCM', phone: '02838236655' }
  ];

  for (const s of sampleSuppliers) {
    let sup = await prisma.supplier.findUnique({ where: { code: s.code } });
    if (!sup) {
      await prisma.supplier.create({ data: s });
    }
  }
  console.log("✓ Đã khởi tạo các Nhà cung cấp mẫu (Suppliers)");

  console.log("✓ Đã khởi tạo các Đơn hàng mẫu (Sales Orders) với đầy đủ trạng thái và line items!");
  console.log("Hoàn tất nạp dữ liệu mẫu!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

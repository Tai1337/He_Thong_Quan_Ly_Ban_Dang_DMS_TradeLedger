import prisma from '../config/prisma.js';

// Helper sinh mã ngẫu nhiên dạng PO-YYYYMMDD-XXXX
const generateCode = (prefix) => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${randomPart}`;
};

/**
 * Tự động chốt PPO lúc 11:00 hàng ngày (hoặc kích hoạt theo yêu cầu mô phỏng):
 * 1. Thu thập toàn bộ đề xuất PPO đang ở trạng thái NEW / VIEWED
 * 2. Gom nhóm theo Nhà cung cấp (supplierId) và Kho (warehouseId)
 * 3. Với mỗi nhóm, sinh đồng thời:
 *    - Chuyến xe giao hàng INBOUND (DeliveryTrip) với ngày dự kiến giao D+3
 *    - Đơn đặt hàng mua (PurchaseOrder) trạng thái WAITING_RECEIVE
 *    - Đơn bán hàng (SalesOrder) từ NCC tương ứng
 * 4. Chuyển trạng thái các PPO sang APPROVED và gắn khóa ngoại purchaseOrderId
 */
export const execute11AmClosingService = async ({ distributorId = 1, userId = null } = {}) => {
  const distId = BigInt(distributorId);

  // 1. Lấy tất cả đề xuất PPO chưa chốt
  const pendingPpos = await prisma.ppoSuggestion.findMany({
    where: {
      distributorId: distId,
      status: { in: ['NEW', 'VIEWED'] }
    },
    include: {
      product: true,
      supplier: true,
      warehouse: true
    }
  });

  if (pendingPpos.length === 0) {
    return {
      success: true,
      message: 'Không có đề xuất PPO nào đang chờ duyệt lúc 11:00.',
      summary: {
        totalPpoApproved: 0,
        tripsCreated: 0,
        posCreated: 0,
        sosCreated: 0
      },
      createdTrips: []
    };
  }

  // 2. Tìm đại lý mặc định để gắn vào SO (đơn bán từ NCC tới NPP)
  let defaultRetailer = await prisma.retailer.findFirst({
    where: { distributorId: distId, status: true }
  });

  if (!defaultRetailer) {
    defaultRetailer = await prisma.retailer.create({
      data: {
        distributorId: distId,
        code: 'NPP-CENTRAL-HUB',
        name: 'Trung Tâm Tiếp Nhận Kho NPP',
        address: 'Kho Trung Tâm NPP',
        status: true
      }
    });
  }

  // 3. Gom nhóm PPO theo Nhà cung cấp (supplierId) và Kho (warehouseId)
  const groupMap = new Map();
  for (const ppo of pendingPpos) {
    const sId = ppo.supplierId ? ppo.supplierId.toString() : 'UNKNOWN';
    const wId = ppo.warehouseId ? ppo.warehouseId.toString() : '1';
    const groupKey = `${sId}_${wId}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        supplierId: ppo.supplierId,
        warehouseId: ppo.warehouseId,
        supplierName: ppo.supplier?.name || 'Nhà Cung Cấp Tổng',
        warehouseName: ppo.warehouse?.name || 'Kho Tổng NPP',
        items: []
      });
    }
    groupMap.get(groupKey).items.push(ppo);
  }

  // 4. Tính toán ngày giao dự kiến: D + 3
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + 3);
  const expectedDateOnly = new Date(expectedDate.toISOString().slice(0, 10));

  const createdTrips = [];
  const ppoIdsApproved = [];

  // 5. Chạy Transaction cho từng nhóm
  for (const [, group] of groupMap.entries()) {
    const tripCode = generateCode('TRIP-IN');
    const poCode = generateCode('PO');
    const soCode = generateCode('SO-NCC');

    await prisma.$transaction(async (tx) => {
      // 5.1 Tạo Chuyến xe INBOUND (Hàng NCC giao về kho NPP)
      const trip = await tx.deliveryTrip.create({
        data: {
          tripCode,
          tripType: 'INBOUND',
          distributorId: distId,
          warehouseId: group.warehouseId,
          supplierId: group.supplierId,
          expectedDeliveryDate: expectedDateOnly,
          status: 'SHIPPING' // Đang được NCC xếp chuyến giao
        }
      });

      // 5.2 Tạo Đơn đặt hàng mua (Purchase Order)
      const po = await tx.purchaseOrder.create({
        data: {
          poCode,
          distributorId: distId,
          warehouseId: group.warehouseId,
          supplierId: group.supplierId,
          status: 'WAITING_RECEIVE',
          expectedDate: expectedDateOnly,
          deliveryTripId: trip.id,
          createdById: userId ? BigInt(userId) : null,
          notes: `Đơn hàng sinh tự động lúc 11:00 từ PPO AI. Ngày giao dự kiến D+3: ${expectedDateOnly.toISOString().slice(0, 10)}. Gán chuyến xe ${tripCode}.`,
          items: {
            create: group.items.map(item => {
              const qty = Number(item.finalQty || item.suggestedQty || 1);
              const price = Number(item.product?.basePrice || 0);
              return {
                productId: item.productId,
                quantity: qty,
                quantityReceived: 0,
                unitPrice: price
              };
            })
          }
        }
      });

      // 5.3 Tạo Đơn bán hàng (Sales Order) của NCC xuất cho NPP
      const so = await tx.salesOrder.create({
        data: {
          orderCode: soCode,
          distributorId: distId,
          warehouseId: group.warehouseId,
          retailerId: defaultRetailer.id,
          orderType: 'LATER',
          status: 'ALLOCATED',
          deliveryTripId: trip.id,
          createdById: userId ? BigInt(userId) : null,
          items: {
            create: group.items.map(item => {
              const qty = Number(item.finalQty || item.suggestedQty || 1);
              const price = Number(item.product?.basePrice || 0);
              return {
                productId: item.productId,
                quantity: qty,
                unitPrice: price,
                isPromotion: false
              };
            })
          }
        }
      });

      // 5.4 Cập nhật quan hệ salesOrderId vào PurchaseOrder
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { salesOrderId: so.id }
      });

      // 5.5 Ghi lịch sử trạng thái PO
      await tx.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId: po.id,
          fromStatus: 'DRAFT',
          toStatus: 'WAITING_RECEIVE',
          changedById: userId ? BigInt(userId) : null,
          notes: `Tự động chốt đơn lúc 11:00 từ PPO. Gán chuyến xe ${tripCode}, ngày dự kiến giao D+3 (${expectedDateOnly.toISOString().slice(0, 10)}).`
        }
      });

      // 5.6 Cập nhật trạng thái PPO sang APPROVED và gắn purchaseOrderId
      const groupPpoIds = group.items.map(i => i.id);
      await tx.ppoSuggestion.updateMany({
        where: { id: { in: groupPpoIds } },
        data: {
          status: 'APPROVED',
          purchaseOrderId: po.id,
          reviewedAt: new Date(),
          reviewedById: userId ? BigInt(userId) : null
        }
      });

      groupPpoIds.forEach(id => ppoIdsApproved.push(id.toString()));

      createdTrips.push({
        tripId: trip.id.toString(),
        tripCode: trip.tripCode,
        tripType: 'INBOUND',
        status: trip.status,
        expectedDeliveryDate: expectedDateOnly.toISOString().slice(0, 10),
        supplierName: group.supplierName,
        warehouseName: group.warehouseName,
        purchaseOrderId: po.id.toString(),
        poCode: po.poCode,
        salesOrderId: so.id.toString(),
        soCode: so.orderCode,
        totalItems: group.items.length
      });
    });
  }

  return {
    success: true,
    message: `Đã tự động chốt thành công ${ppoIdsApproved.length} đề xuất PPO vào lúc 11:00. Đã tạo ${createdTrips.length} chuyến xe INBOUND (D+3) cùng các đơn PO và SO tương ứng.`,
    summary: {
      totalPpoApproved: ppoIdsApproved.length,
      tripsCreated: createdTrips.length,
      posCreated: createdTrips.length,
      sosCreated: createdTrips.length,
      expectedDeliveryDate: expectedDateOnly.toISOString().slice(0, 10)
    },
    createdTrips
  };
};

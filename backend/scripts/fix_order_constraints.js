import prisma from '../src/prisma/prisma.client.js';

async function fixOrderConstraints() {
  console.log('--- BẮT ĐẦU CHUẨN HÓA VÀ THẮT CHẶT RÀNG BUỘC ĐƠN HÀNG TRONG DATABASE ---');

  const orders = await prisma.salesOrder.findMany({
    include: {
      items: {
        include: {
          product: true,
          allocations: true
        }
      },
      warehouse: true
    }
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const order of orders) {
    if (order.status === 'ALLOCATED' || order.status === 'SHIPPED') {
      let isFullyAllocated = true;
      let needsReallocation = false;

      for (const item of order.items) {
        const orderQty = Number(item.quantity);
        if (orderQty <= 0) continue;

        const allocatedQty = item.allocations.reduce((s, a) => s + Number(a.quantity), 0);
        if (allocatedQty < orderQty) {
          isFullyAllocated = false;
          needsReallocation = true;
          console.log(`[CẢNH BÁO] Đơn ${order.orderCode} (Trạng thái: ${order.status}) SP ${item.product.sku} Đặt: ${orderQty}, Phân bổ: ${allocatedQty}`);
        }
      }

      if (!isFullyAllocated) {
        // Thử kiểm tra xem kho có đủ tồn để phân bổ tự động không
        console.log(`-> Đang kiểm tra tồn kho để xử lý đơn ${order.orderCode}...`);
        let canAllocateAll = true;

        for (const item of order.items) {
          const orderQty = Number(item.quantity);
          if (orderQty <= 0) continue;

          // Tìm các lô khả dụng
          const lots = await prisma.stockLot.findMany({
            where: {
              productId: item.productId,
              warehouseId: order.warehouseId,
              status: 'GOOD',
              OR: [{ expiryDate: null }, { expiryDate: { gte: now } }]
            },
            include: { stockBalance: true }
          });

          const totalAvail = lots.reduce((sum, l) => {
            const onHand = Number(l.stockBalance?.quantityOnHand || 0);
            const res = Number(l.stockBalance?.quantityReserved || 0);
            return sum + Math.max(0, onHand - res);
          }, 0);

          if (totalAvail < orderQty) {
            canAllocateAll = false;
            break;
          }
        }

        if (canAllocateAll) {
          // Phân bổ FEFO bổ sung cho đơn
          console.log(`-> Kho có đủ tồn! Tự động tạo phân bổ FEFO cho đơn ${order.orderCode}...`);
          for (const item of order.items) {
            const orderQty = Number(item.quantity);
            if (orderQty <= 0) continue;

            const existingAllocated = item.allocations.reduce((s, a) => s + Number(a.quantity), 0);
            let needed = orderQty - existingAllocated;
            if (needed <= 0) continue;

            const lots = await prisma.stockLot.findMany({
              where: {
                productId: item.productId,
                warehouseId: order.warehouseId,
                status: 'GOOD',
                OR: [{ expiryDate: null }, { expiryDate: { gte: now } }]
              },
              include: { stockBalance: true },
              orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }]
            });

            for (const lot of lots) {
              if (needed <= 0) break;
              const onHand = Number(lot.stockBalance?.quantityOnHand || 0);
              const res = Number(lot.stockBalance?.quantityReserved || 0);
              const avail = Math.max(0, onHand - res);
              if (avail <= 0) continue;

              const allocQty = Math.min(avail, needed);

              await prisma.salesOrderItemAllocation.create({
                data: {
                  salesOrderItemId: item.id,
                  lotId: lot.id,
                  quantity: allocQty
                }
              });

              await prisma.stockBalance.update({
                where: { lotId: lot.id },
                data: { quantityReserved: { increment: allocQty } }
              });

              needed -= allocQty;
            }
          }
          console.log(`✔ Đã phân bổ đầy đủ tồn kho cho đơn ${order.orderCode}`);
        } else {
          // Thiếu tồn kho -> Đưa đơn về PENDING để tuân thủ ràng buộc chặt chẽ!
          console.log(`✖ Kho KHÔNG đủ tồn! Đưa đơn ${order.orderCode} từ ${order.status} về PENDING do vi phạm ràng buộc thiếu tồn.`);

          // Dọn dẹp allocations dở dang nếu có
          for (const item of order.items) {
            for (const alloc of item.allocations) {
              await prisma.stockBalance.update({
                where: { lotId: alloc.lotId },
                data: { quantityReserved: { decrement: alloc.quantity } }
              });
            }
            await prisma.salesOrderItemAllocation.deleteMany({
              where: { salesOrderItemId: item.id }
            });
          }

          await prisma.salesOrder.update({
            where: { id: order.id },
            data: {
              status: 'PENDING',
              deliveryTripId: null
            }
          });

          await prisma.orderStatusHistory.create({
            data: {
              salesOrderId: order.id,
              fromStatus: order.status,
              toStatus: 'PENDING',
              notes: 'Ràng buộc CSDL: Hoàn về PENDING do thiếu tồn kho chưa đủ điều kiện xác nhận'
            }
          });
          console.log(`✔ Đã đưa đơn ${order.orderCode} về PENDING an toàn`);
        }
      }
    }
  }

  console.log('--- HOÀN TẤT CHUẨN HÓA DỮ LIỆU CSDL ---');
  process.exit(0);
}

fixOrderConstraints();

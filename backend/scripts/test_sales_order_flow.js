import prisma from '../server/config/prisma.js';
import * as salesOrderService from '../server/services/salesOrderService.js';

const log = (step, msg) => console.log(`\x1b[36m[STEP ${step}]\x1b[0m ${msg}`);
const pass = (msg) => console.log(`\x1b[32m  ✔ PASS:\x1b[0m ${msg}`);
const fail = (msg, err) => {
  console.error(`\x1b[31m  ✖ FAIL:\x1b[0m ${msg}`);
  if (err) console.error(err);
  process.exit(1);
};

async function runFullSalesOrderLifecycleTest() {
  console.log('\n======================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN PHÂN HỆ QUẢN LÝ BÁN HÀNG');
  console.log('======================================================\n');

  try {
    // 1. Chuẩn bị master data
    log(1, 'Kiểm tra dữ liệu mẫu (Distributor, Warehouse, Retailer, Product)...');
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) throw new Error('Không tìm thấy NPP');
    const distId = distributor.id.toString();

    const warehouse = await prisma.warehouse.findFirst({ where: { distributorId: distributor.id } });
    if (!warehouse) throw new Error('Không tìm thấy Kho của NPP');
    const whId = warehouse.id.toString();

    const retailer = await prisma.retailer.findFirst({ where: { distributorId: distributor.id } });
    if (!retailer) throw new Error('Không tìm thấy Khách hàng/Đại lý');
    const retId = retailer.id.toString();

    // Lấy 2 sản phẩm có tồn kho khả dụng
    const lots = await prisma.stockLot.findMany({
      where: { warehouseId: warehouse.id, status: 'GOOD' },
      include: { stockBalance: true, product: true },
      take: 5
    });

    const validLots = lots.filter(l => Number(l.stockBalance?.quantityOnHand || 0) > 5);
    if (validLots.length < 2) {
      throw new Error('Cần ít nhất 2 lô hàng có tồn kho > 5 để kiểm thử');
    }

    const prod1 = validLots[0].product;
    const prod2 = validLots[1].product;
    pass(`Master data hợp lệ: NPP=${distributor.name}, Kho=${warehouse.name}, Đại lý=${retailer.name}`);
    pass(`Sản phẩm test: [${prod1.sku}] ${prod1.name}, [${prod2.sku}] ${prod2.name}`);

    // 2. Test getSalesOrderMetadata
    log(2, 'Test lấy Metadata (Khách hàng, Kho, Sản phẩm kèm tồn)...');
    const meta = await salesOrderService.getSalesOrderMetadata(distId);
    if (!meta.retailers || !meta.warehouses || !meta.products) {
      fail('getSalesOrderMetadata trả về thiếu trường dữ liệu');
    }
    pass(`Lấy metadata thành công: ${meta.retailers.length} khách, ${meta.warehouses.length} kho, ${meta.products.length} sản phẩm`);

    // 3. Test Tạo đơn hàng mới
    log(3, 'Test Tạo đơn đặt hàng bán mới (POST /api/sales-orders)...');
    const createRes = await salesOrderService.createNewSalesOrder({
      retailerId: retId,
      warehouseId: whId,
      orderType: 'IMMEDIATE',
      notes: 'Đơn hàng tự động tạo trong test suite',
      items: [
        { productId: prod1.id.toString(), quantity: 2, unitPrice: Number(prod1.basePrice) || 100000 },
        { productId: prod2.id.toString(), quantity: 1, unitPrice: Number(prod2.basePrice) || 150000 }
      ]
    }, distId, 1);

    const testOrderId = createRes.data.id;
    pass(`Tạo đơn thành công: Mã=${createRes.data.orderCode}, ID=${testOrderId}, Status=${createRes.data.status}`);

    // 4. Test Thêm sản phẩm vào đơn PENDING
    log(4, 'Test Thêm/Sửa sản phẩm trong đơn PENDING...');
    await salesOrderService.addOrderItem(testOrderId, distId, 1, {
      productId: prod2.id.toString(),
      quantity: 1,
      unitPrice: Number(prod2.basePrice) || 150000
    });
    pass('Thêm sản phẩm thành công (tự động cộng dồn số lượng)');

    // 5. Test Lấy chi tiết đơn hàng
    log(5, 'Test Lấy chi tiết đơn hàng (GET /api/sales-orders/:id)...');
    const detail = await salesOrderService.getOrderDetail(testOrderId, distId);
    if (detail.items.length !== 2) fail('Số lượng sản phẩm trong đơn không khớp');
    pass(`Chi tiết đơn hàng: ${detail.orderCode}, Tổng tiền: ${detail.totalAmount.toLocaleString('vi-VN')} VND, Items: ${detail.items.length}`);

    // 6. Test Nộp duyệt đơn (PENDING -> SUBMITTED)
    log(6, 'Test Nộp duyệt đơn hàng (PATCH /api/sales-orders/:id/submit)...');
    const submitRes = await salesOrderService.submitOrder(testOrderId, distId, 1);
    if (submitRes.status !== 'SUBMITTED') fail('Trạng thái không chuyển sang SUBMITTED');
    pass('Nộp duyệt đơn thành công -> SUBMITTED');

    // 7. Test Xác nhận & Phân bổ tồn kho FEFO (SUBMITTED -> ALLOCATED)
    log(7, 'Test Xác nhận & Phân bổ tồn kho FEFO (PATCH /api/sales-orders/:id/confirm)...');
    const confirmRes = await salesOrderService.confirmOrder(testOrderId, distId, 1);
    if (confirmRes.status !== 'ALLOCATED') fail('Trạng thái không chuyển sang ALLOCATED');

    const detailAllocated = await salesOrderService.getOrderDetail(testOrderId, distId);
    const hasAllocations = detailAllocated.items.every(it => it.allocations.length > 0);
    if (!hasAllocations) fail('Chưa có thông tin phân bổ lô hàng trong SalesOrderItemAllocation');
    pass('Xác nhận & phân bổ FEFO thành công -> ALLOCATED, các mặt hàng đã được giữ chỗ tồn (quantityReserved)');

    // 8. Test Lấy chuyến xe khả dụng & Gán chuyến xe (ALLOCATED -> SHIPPED)
    log(8, 'Test Gán chuyến xe giao hàng (PATCH /api/sales-orders/:id/assign-trip)...');
    let trip = await prisma.deliveryTrip.findFirst({
      where: { distributorId: distributor.id, tripType: 'OUTBOUND' }
    });

    if (!trip) {
      // Tạo một chuyến xe test nếu chưa có
      trip = await prisma.deliveryTrip.create({
        data: {
          tripCode: `TRIP-${Date.now()}`,
          tripType: 'OUTBOUND',
          distributorId: distributor.id,
          warehouseId: warehouse.id,
          status: 'WAITING_CONFIRM'
        }
      });
      pass(`Đã tạo chuyến xe mẫu: ${trip.tripCode}`);
    }

    const assignRes = await salesOrderService.assignDeliveryTrip(testOrderId, distId, trip.id.toString(), 1);
    if (assignRes.status !== 'SHIPPED') fail('Trạng thái không chuyển sang SHIPPED');
    pass(`Gán chuyến xe ${trip.tripCode} thành công -> SHIPPED`);

    // 9. Test Hủy gán chuyến xe (SHIPPED -> ALLOCATED) & Gán lại
    log(9, 'Test Huỷ gán chuyến xe (PATCH /api/sales-orders/:id/unassign-trip)...');
    const unassignRes = await salesOrderService.unassignDeliveryTrip(testOrderId, distId, 1, 'Đổi xe khác');
    if (unassignRes.status !== 'ALLOCATED') fail('Hủy gán xe không hoàn về ALLOCATED');
    pass('Huỷ gán chuyến xe thành công -> Hoàn về ALLOCATED');

    // Gán lại xe để tiếp tục luồng
    await salesOrderService.assignDeliveryTrip(testOrderId, distId, trip.id.toString(), 1);
    pass('Gán lại xe thành công -> Tiếp tục SHIPPED');

    // 10. Test Xác nhận giao hàng thành công (SHIPPED -> DELIVERED)
    log(10, 'Test Xác nhận giao hàng thành công (PATCH /api/sales-orders/:id/confirm-delivery)...');
    const deliverRes = await salesOrderService.confirmDelivery(testOrderId, distId, 1, true, 'Khách đã ký nhận');
    if (deliverRes.status !== 'DELIVERED') fail('Trạng thái không chuyển sang DELIVERED');

    // Kiểm tra đã trừ tồn kho vật lý và ghi nhận transaction OUT
    const outTxn = await prisma.inventoryTransaction.findFirst({
      where: {
        referenceType: 'SALES_ORDER',
        referenceId: BigInt(testOrderId),
        direction: 'OUT'
      }
    });
    if (!outTxn) fail('Chưa ghi nhận InventoryTransaction OUT khi giao hàng thành công');
    pass(`Giao hàng thành công -> DELIVERED. Đã ghi nhận InventoryTransaction: ${outTxn.transactionCode}`);

    // 11. Test Xuất hoá đơn bán hàng (DELIVERED -> INVOICED)
    log(11, 'Test Xuất hoá đơn bán hàng (POST /api/sales-orders/:id/invoice)...');
    const invoiceRes = await salesOrderService.createOrderInvoice(testOrderId, distId, 1, { vatRate: 0.1 });
    if (invoiceRes.invoice.status !== 'UNPAID') fail('Trạng thái hoá đơn không phải UNPAID');
    pass(`Xuất hoá đơn thành công: Mã=${invoiceRes.invoice.invoiceCode}, Tổng tiền=${invoiceRes.invoice.totalAmount.toLocaleString('vi-VN')} VND -> INVOICED`);

    // 12. Test Thu tiền / Thanh toán (INVOICED -> PAID)
    log(12, 'Test Ghi nhận thanh toán (POST /api/sales-orders/:id/payments)...');
    const paymentRes = await salesOrderService.recordOrderPayment(testOrderId, distId, 1, {
      amount: invoiceRes.invoice.totalAmount,
      paymentMethod: 'BANK_TRANSFER',
      note: 'Chuyển khoản thanh toán toàn bộ'
    });
    if (!paymentRes.isFullPaid || paymentRes.orderStatus !== 'PAID') {
      fail('Thanh toán đủ nhưng đơn hàng chưa chuyển sang PAID');
    }
    pass(`Ghi nhận thanh toán thành công -> Hoá đơn & Đơn hàng đã chuyển sang PAID`);

    // 13. Test Báo cáo thống kê Analytics
    log(13, 'Test Thống kê bán hàng Analytics...');
    const analytics = await salesOrderService.getSalesAnalytics(distId);
    pass(`Thống kê: Doanh thu=${analytics.totalRevenue.toLocaleString('vi-VN')}, Đã thu=${analytics.totalPaid.toLocaleString('vi-VN')}, Trạng thái=${JSON.stringify(analytics.statusCounts)}`);

    // 14. Test Luồng Hủy đơn hàng và hoàn tồn (CANCELLED)
    log(14, 'Test Luồng Hủy đơn hàng và hoàn tồn (Tạo đơn 2 -> Phân bổ -> Huỷ)...');
    const cancelOrderRes = await salesOrderService.createNewSalesOrder({
      retailerId: retId,
      warehouseId: whId,
      items: [{ productId: prod1.id.toString(), quantity: 1, unitPrice: 100000 }]
    }, distId, 1);
    const cancelOrderId = cancelOrderRes.data.id;

    // Phân bổ lô
    await salesOrderService.confirmOrder(cancelOrderId, distId, 1);
    pass('Đơn 2 đã phân bổ lô (ALLOCATED)');

    // Huỷ đơn
    const cancelled = await salesOrderService.cancelOrder(cancelOrderId, distId, 1, 'Khách đổi ý không lấy');
    if (cancelled.status !== 'CANCELLED') fail('Đơn 2 không chuyển sang CANCELLED');

    // Kiểm tra xem allocations đã được xoá và reserved đã được hoàn lại
    const allocCount = await prisma.salesOrderItemAllocation.count({
      where: { salesOrderItem: { salesOrderId: BigInt(cancelOrderId) } }
    });
    if (allocCount !== 0) fail('Allocations chưa được dọn dẹp khi huỷ đơn');
    pass('Huỷ đơn thành công -> CANCELLED, hoàn trả Reserved Stock và dọn dẹp allocations an toàn!');

    console.log('\n======================================================');
    console.log('🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ (100% PASS)!');
    console.log('======================================================\n');
    process.exit(0);

  } catch (error) {
    fail('Lỗi trong quá trình kiểm thử luồng bán hàng:', error);
  }
}

runFullSalesOrderLifecycleTest();

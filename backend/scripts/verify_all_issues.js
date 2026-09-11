import prisma from '../server/config/prisma.js';

async function main() {
  console.log('--- BẮT ĐẦU KIỂM TRA TOÀN DIỆN CÁC LỖI ĐÃ SỬA ---\n');
  const distributorId = 1;

  // 1. Kiểm tra API huỷ đơn không có lý do
  console.log('1. Kiểm thử huỷ đơn hàng không nhập lý do:');
  const cancelRes = await fetch('http://localhost:3001/api/sales-orders/999999/cancel', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: '   ', distributorId })
  });
  const cancelJson = await cancelRes.json();
  if (cancelRes.status === 400 && cancelJson.error?.includes('lý do')) {
    console.log('   ✅ PASS: Chặn huỷ đơn khi không có lý do thành công (Status 400, message:', cancelJson.error, ')');
  } else {
    console.error('   ❌ FAIL:', cancelRes.status, cancelJson);
  }

  // 2. Tìm hoặc tạo đơn PENDING để kiểm tra sửa số lượng thành 0 (Issue 1 & Issue 3)
  console.log('\n2. Kiểm thử sửa số lượng sản phẩm thành 0 (Issue 1 & Issue 3):');
  let pendingOrder = await prisma.salesOrder.findFirst({
    where: { distributorId: BigInt(distributorId), status: 'PENDING' },
    include: { items: true }
  });

  if (!pendingOrder || pendingOrder.items.length === 0) {
    console.log('   Tạo đơn nháp để kiểm tra...');
    const warehouse = await prisma.warehouse.findFirst({ where: { distributorId: BigInt(distributorId) } });
    const retailer = await prisma.retailer.findFirst({ where: { distributorId: BigInt(distributorId) } });
    const product = await prisma.product.findFirst();

    pendingOrder = await prisma.salesOrder.create({
      data: {
        orderCode: `TEST-SO-${Date.now()}`,
        distributorId: BigInt(distributorId),
        warehouseId: warehouse.id,
        retailerId: retailer.id,
        status: 'PENDING',
        orderType: 'IMMEDIATE',
        items: {
          create: [{
            productId: product.id,
            quantity: 5,
            unitPrice: 20000,
            discountRate: 0,
            discountAmount: 0,
            finalPrice: 20000
          }]
        }
      },
      include: { items: true }
    });
  }

  const testItemId = pendingOrder.items[0].id.toString();
  const testOrderId = pendingOrder.id.toString();

  // Gọi API cập nhật số lượng về 0
  const updateRes = await fetch(`http://localhost:3001/api/sales-orders/${testOrderId}/items/${testItemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 0, distributorId })
  });
  const updateJson = await updateRes.json();

  if (updateRes.status === 200 && updateJson.success && updateJson.newQuantity === 0) {
    console.log('   ✅ PASS: Cho phép cập nhật số lượng sản phẩm về 0 thành công! (old: ' + updateJson.oldQuantity + ' -> new: ' + updateJson.newQuantity + ')');
  } else {
    console.error('   ❌ FAIL gọi API cập nhật số lượng:', updateRes.status, updateJson);
  }

  // 3. Ràng buộc dữ liệu: Không cho phép duyệt đơn hàng thiếu tồn
  console.log('\n3. Kiểm tra ràng buộc chặt chẽ: Đơn thiếu tồn không thể chuyển sang ALLOCATED');
  // Cập nhật lại số lượng sản phẩm lên cực lớn để gây thiếu tồn
  await prisma.salesOrderItem.update({
    where: { id: BigInt(testItemId) },
    data: { quantity: 99999999 }
  });

  const confirmRes = await fetch(`http://localhost:3001/api/sales-orders/${testOrderId}/confirm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ distributorId })
  });
  const confirmJson = await confirmRes.json();

  if (confirmRes.status === 400 && confirmJson.error?.includes('không đủ tồn kho khả dụng')) {
    console.log('   ✅ PASS: Hệ thống chặn thành công không cho duyệt đơn khi thiếu tồn:', confirmJson.error);
  } else {
    console.error('   ❌ FAIL: Hệ thống không chặn đơn thiếu tồn:', confirmRes.status, confirmJson);
  }

  // Khôi phục lại đơn test
  await prisma.salesOrderItem.update({
    where: { id: BigInt(testItemId) },
    data: { quantity: 1 }
  });

  // 4. Kiểm tra KPI cho các đơn chưa đóng
  console.log('\n4. Kiểm tra thông số KPI "Đơn chưa đóng" trong tổng quan:');
  const kpiRes = await fetch(`http://localhost:3001/api/sales-orders?distributorId=${distributorId}`);
  const kpiJson = await kpiRes.json();

  if (kpiJson.kpis && 'unclosedOrdersCount' in kpiJson.kpis) {
    console.log('   ✅ PASS: KPI trả về unclosedOrdersCount =', kpiJson.kpis.unclosedOrdersCount, 
                ', unclosedOrdersAmount =', kpiJson.kpis.unclosedOrdersAmount);
  } else {
    console.error('   ❌ FAIL: Thiếu chỉ số KPI đơn chưa đóng:', kpiJson.kpis);
  }

  // 5. Kiểm tra toàn vẹn database: Có đơn ALLOCATED nào mà chưa được phân bổ lô không?
  console.log('\n5. Kiểm tra tính toàn vẹn dữ liệu đơn hàng trong Database:');
  const invalidAllocated = await prisma.salesOrder.findMany({
    where: {
      status: 'ALLOCATED',
      distributorId: BigInt(distributorId),
      items: {
        some: {
          quantity: { gt: 0 },
          allocations: { none: {} }
        }
      }
    }
  });

  if (invalidAllocated.length === 0) {
    console.log('   ✅ PASS: Không còn đơn hàng nào ở trạng thái ALLOCATED mà thiếu phân bổ lô tồn kho!');
  } else {
    console.warn(`   ⚠️ Cảnh báo: Vẫn còn ${invalidAllocated.length} đơn ALLOCATED thiếu lô:`, invalidAllocated.map(o => o.orderCode));
  }

  console.log('\n--- HOÀN TẤT KIỂM TRA TẤT CẢ CÁC MỤC ---');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error running test script:', err);
  process.exit(1);
});

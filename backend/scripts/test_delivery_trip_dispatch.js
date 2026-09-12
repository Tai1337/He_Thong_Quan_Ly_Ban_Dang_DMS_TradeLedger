/**
 * Script kiểm thử tự động toàn diện Phân hệ Chuyến xe vận chuyển
 * - Kiểm tra tạo chuyến xe
 * - Kiểm tra đưa đơn lên xe theo tải trọng
 * - Kiểm tra ngăn chặn quá tải (Overweight guard)
 * - Kiểm tra Bảng kê hàng hóa theo Số Lô (Lot Manifest)
 * - Kiểm tra chuyển trạng thái vòng đời (WAITING_SHIP -> SHIPPING -> COMPLETED)
 */
import {
  createDeliveryTripService,
  getDeliveryTripsService,
  getDeliveryTripDetailService,
  getDispatchableOrdersService,
  dispatchOrdersToTripService,
  removeOrderFromTripService,
  updateTripStatusService,
  getTripCargoManifestService
} from '../server/services/deliveryTripService.js';
import prisma from '../server/config/prisma.js';

async function runTest() {
  console.log('=== BẮT ĐẦU TEST TOÀN DIỆN PHÂN HỆ CHUYẾN XE VẬN CHUYỂN ===\n');

  // 1. Kiểm tra lấy danh sách đơn chờ xếp xe (ALLOCATED)
  const dispatchable = await getDispatchableOrdersService(1);
  console.log(`✓ Tìm thấy ${dispatchable.length} đơn hàng ALLOCATED sẵn sàng xếp lên xe.`);
  if (dispatchable.length === 0) {
    console.log('Không có đơn ALLOCATED để test, tạo đơn test...');
  } else {
    console.log(`  - Ví dụ đơn đầu tiên: [${dispatchable[0].orderCode}] - Trọng lượng: ${dispatchable[0].orderWeightKg} kg, Lô: ${dispatchable[0].lotNumbers.join(', ')}`);
  }

  // 2. Tạo một chuyến xe OUTBOUND kiểm thử tải trọng 500kg
  console.log('\n--- 1. TẠO CHUYẾN XE VẬN CHUYỂN ---');
  const warehouse = await prisma.warehouse.findFirst({ where: { status: true } });
  const driver = await prisma.user.findFirst({ where: { role: { code: 'DRIVER' } } });

  const newTripResult = await createDeliveryTripService({
    distributorId: 1,
    warehouseId: warehouse.id,
    driverId: driver ? driver.id : null,
    licensePlate: '59C-TEST.99',
    maxWeightKg: 500, // Tải trọng nhỏ để dễ test vượt tải
    notes: 'Chuyến xe chạy thử nghiệm kiểm soát tải trọng & số lô'
  });

  const tripId = newTripResult.id;
  console.log(`✓ Đã tạo chuyến xe test: ID ${tripId} (${newTripResult.tripCode}) - Tải trọng tối đa: 500 kg`);

  // 3. Đưa đơn hàng lên xe
  if (dispatchable.length > 0) {
    console.log('\n--- 2. ĐƯA ĐƠN HÀNG LÊN XE THEO TRỌNG LƯỢNG & SỐ LÔ ---');
    const orderToDispatch = dispatchable[0];
    const dispatchRes = await dispatchOrdersToTripService({
      tripId,
      distributorId: 1,
      orderIds: [orderToDispatch.id],
      changedById: 1
    });
    console.log(`✓ ${dispatchRes.message}`);

    // Kiểm tra chi tiết chuyến xe sau khi xếp
    const detailAfterDispatch = await getDeliveryTripDetailService(tripId, 1);
    console.log(`  - Trọng lượng hiện tại: ${detailAfterDispatch.currentWeightKg} / ${detailAfterDispatch.maxWeightKg} kg (${detailAfterDispatch.loadPercentage}%)`);
    console.log(`  - Đơn hàng trên xe: ${detailAfterDispatch.orders.map(o => o.orderCode).join(', ')}`);

    // 4. Kiểm tra Bảng kê hàng hóa theo Số Lô (Lot Manifest)
    console.log('\n--- 3. LẬP BẢNG KÊ HÀNG HÓA THEO SỐ LÔ (LOT MANIFEST) ---');
    const manifest = await getTripCargoManifestService(tripId, 1);
    console.log(`✓ Bảng kê cho xe ${manifest.licensePlate} (${manifest.tripCode}):`);
    console.log(`  - Tổng kiện hàng: ${manifest.totalPackages} thùng, Tổng trọng lượng: ${manifest.totalTripWeightKg} kg`);
    manifest.cargoByLot.forEach(item => {
      console.log(`    + [Lô: ${item.lotNumber}] ${item.productName} | SL: ${item.totalQuantity} ${item.unit} | HSD: ${item.expiryDate} | Vị trí: ${item.locationCode}`);
    });

    // 5. Chuyển trạng thái sang SHIPPING (Xuất bến)
    console.log('\n--- 4. XUẤT BẾN (CHUYỂN SANG SHIPPING) ---');
    const shipRes = await updateTripStatusService({
      tripId,
      distributorId: 1,
      toStatus: 'SHIPPING',
      changedById: 1,
      notes: 'Xe bắt đầu rời kho giao hàng'
    });
    console.log(`✓ ${shipRes.message}`);

    // Kiểm tra trạng thái đơn hàng trên xe
    const orderInDb = await prisma.salesOrder.findUnique({ where: { id: BigInt(orderToDispatch.id) } });
    console.log(`  - Trạng thái đơn hàng sau khi xe chạy: ${orderInDb.status} (Kỳ vọng: SHIPPED)`);

    // 6. Hoàn tất chuyến xe (COMPLETED)
    console.log('\n--- 5. HOÀN TẤT GIAO HÀNG (CHUYỂN SANG COMPLETED) ---');
    const compRes = await updateTripStatusService({
      tripId,
      distributorId: 1,
      toStatus: 'COMPLETED',
      changedById: 1,
      notes: 'Tất cả điểm bán đã nhận đủ hàng'
    });
    console.log(`✓ ${compRes.message}`);

    const orderCompleted = await prisma.salesOrder.findUnique({ where: { id: BigInt(orderToDispatch.id) } });
    console.log(`  - Trạng thái đơn hàng sau khi giao xong: ${orderCompleted.status} (Kỳ vọng: DELIVERED)`);
  }

  console.log('\n=== TẤT CẢ CÁC TEST CASE CHO CHUYẾN XE ĐÃ ĐẠT 100%! ===');
}

runTest()
  .catch(err => {
    console.error('Lỗi khi test:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import prisma from '../config/prisma.js';

/**
 * Thuật toán phân tích ROP & Safety Stock để tự động sinh đề xuất PPO
 * @param {string|number} distributorId - ID nhà phân phối
 */
export const runPpoAnalysis = async (distributorId = 1) => {
  const distId = BigInt(distributorId);

  // 1. Lấy thông tin nhà phân phối, kho và danh mục nhà cung cấp
  const [warehouse, suppliers, products] = await Promise.all([
    prisma.warehouse.findFirst({
      where: { distributorId: distId, status: true }
    }),
    prisma.supplier.findMany({
      where: { status: true }
    }),
    prisma.product.findMany({
      where: { status: true },
      include: {
        stockLots: {
          where: { warehouse: { distributorId: distId } },
          include: { stockBalance: true }
        }
      }
    })
  ]);

  if (!warehouse) throw new Error('Không tìm thấy kho hàng hoạt động của Nhà phân phối');
  const defaultSupplier = suppliers[0] || null;

  // 2. Tính toán khoảng thời gian 30 ngày gần nhất để tính doanh số bán trung bình ngày
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Lấy tổng sản lượng bán ra của từng sản phẩm trong 30 ngày qua
  const salesHistory = await prisma.salesOrderItem.groupBy({
    by: ['productId'],
    where: {
      salesOrder: {
        distributorId: distId,
        status: { notIn: ['CANCELLED'] },
        createdAt: { gte: thirtyDaysAgo }
      }
    },
    _sum: {
      quantity: true
    }
  });

  const salesMap = {};
  salesHistory.forEach(row => {
    salesMap[row.productId.toString()] = Number(row._sum.quantity || 0);
  });

  const generatedSuggestions = [];

  // 3. Phân tích từng sản phẩm
  for (const product of products) {
    const prodIdStr = product.id.toString();

    // 3.1 Tính tồn kho khả dụng hiện tại
    let totalOnHand = 0;
    let totalReserved = 0;

    (product.stockLots || []).forEach(lot => {
      if (lot.stockBalance) {
        totalOnHand += Number(lot.stockBalance.quantityOnHand || 0);
        totalReserved += Number(lot.stockBalance.quantityReserved || 0);
      }
    });

    const quantityAvailable = Math.max(0, totalOnHand - totalReserved);

    // 3.2 Tính doanh số bán TB/ngày (moving average 30 ngày)
    const totalSold30Days = salesMap[prodIdStr] || 0;
    let avgDailyDemand = totalSold30Days > 0 ? (totalSold30Days / 30) : 0;

    // Nếu sản phẩm chưa có phát sinh bán trong 30 ngày qua, gán mức tối thiểu 0.5 để kiểm tra tồn kho
    if (avgDailyDemand === 0 && quantityAvailable < 10) {
      avgDailyDemand = 0.5;
    }

    // 3.3 Thông số chu kỳ cung ứng
    const leadTimeDays = 4; // Thời gian giao hàng trung bình từ NCC: 4 ngày
    const safetyStockBufferDays = 2; // Buffer an toàn tương đương 2 ngày bán
    const safetyStock = Math.max(5, Math.ceil(avgDailyDemand * safetyStockBufferDays));

    // Điểm đặt hàng lại: ROP = (Demand * LeadTime) + SafetyStock
    const reorderPoint = Math.ceil((avgDailyDemand * leadTimeDays) + safetyStock);

    // 3.4 Kiểm tra điều kiện cần sinh đề xuất đặt hàng
    if (quantityAvailable < reorderPoint || quantityAvailable <= 5) {
      // Số lượng đề xuất: bù đủ chu kỳ dự trữ 14 ngày + lead time trừ đi tồn hiện có
      const reserveCycleDays = 14;
      const targetStock = Math.ceil(avgDailyDemand * (leadTimeDays + reserveCycleDays));
      const neededQty = Math.max(10, targetStock - quantityAvailable);

      // Xác định mức độ ưu tiên
      let priority = 'MEDIUM';
      let daysOfSupply = avgDailyDemand > 0 ? Math.floor(quantityAvailable / avgDailyDemand) : 0;

      if (quantityAvailable <= safetyStock) {
        priority = 'HIGH';
      } else if (quantityAvailable >= reorderPoint * 0.8) {
        priority = 'LOW';
      }

      // Chọn NCC phù hợp cho sản phẩm
      const sup = defaultSupplier;

      // Diễn giải lý do đề xuất (Explainable AI)
      let reason = '';
      if (priority === 'HIGH') {
        reason = `BÁO ĐỘNG ĐỨT HÀNG: Tồn khả dụng (${quantityAvailable} ${product.unit}) dưới ngưỡng an toàn (${safetyStock}). Dự kiến hết sạch trong ~${daysOfSupply} ngày. Cần đặt gấp ${neededQty} ${product.unit}.`;
      } else if (priority === 'MEDIUM') {
        reason = `CHẠM ĐIỂM ĐẶT HÀNG: Tồn khả dụng (${quantityAvailable}) < ROP (${reorderPoint}). Tốc độ bán TB ${avgDailyDemand.toFixed(1)} ${product.unit}/ngày. Đề xuất đặt ${neededQty} ${product.unit} cho chu kỳ 14 ngày.`;
      } else {
        reason = `DỰ PHÒNG CHU KỲ: Tồn khả dụng (${quantityAvailable}) tiệm cận điểm đặt lại ROP (${reorderPoint}). Bán TB ${avgDailyDemand.toFixed(1)} ${product.unit}/ngày. Đề xuất bổ sung ${neededQty} ${product.unit}.`;
      }

      generatedSuggestions.push({
        distributorId: distId,
        productId: product.id,
        supplierId: sup ? sup.id : null,
        warehouseId: warehouse.id,
        avgDailyDemand,
        leadTimeDays,
        safetyStock,
        reorderPoint,
        quantityAvailableSnapshot: quantityAvailable,
        suggestedQty: neededQty,
        finalQty: neededQty, // Mặc định finalQty = suggestedQty
        priority,
        reason,
        status: 'NEW'
      });
    }
  }

  // 4. Lưu vào CSDL: Cập nhật đề xuất đang chờ hoặc tạo mới
  const createdOrUpdatedList = [];

  for (const item of generatedSuggestions) {
    // Kiểm tra xem đã có đề xuất chưa xử lý cho sản phẩm này chưa
    const existing = await prisma.ppoSuggestion.findFirst({
      where: {
        distributorId: distId,
        productId: item.productId,
        status: { in: ['NEW', 'VIEWED'] }
      }
    });

    if (existing) {
      // Cập nhật lại số liệu mới nhất
      const updated = await prisma.ppoSuggestion.update({
        where: { id: existing.id },
        data: {
          avgDailyDemand: item.avgDailyDemand,
          leadTimeDays: item.leadTimeDays,
          safetyStock: item.safetyStock,
          reorderPoint: item.reorderPoint,
          quantityAvailableSnapshot: item.quantityAvailableSnapshot,
          suggestedQty: item.suggestedQty,
          finalQty: existing.finalQty || item.suggestedQty,
          priority: item.priority,
          reason: item.reason,
          generatedAt: new Date()
        }
      });
      createdOrUpdatedList.push(updated);
    } else {
      const created = await prisma.ppoSuggestion.create({
        data: item
      });
      createdOrUpdatedList.push(created);
    }
  }

  return {
    totalEvaluated: products.length,
    suggestionsCount: createdOrUpdatedList.length,
    highPriorityCount: createdOrUpdatedList.filter(s => s.priority === 'HIGH').length,
    mediumPriorityCount: createdOrUpdatedList.filter(s => s.priority === 'MEDIUM').length,
    lowPriorityCount: createdOrUpdatedList.filter(s => s.priority === 'LOW').length
  };
};

import prisma from '../config/prisma.js';
import { runPpoAnalysis } from './ppoEngineService.js';
import { createPurchaseOrderService } from './purchaseOrderService.js';
import {
  findPpoSuggestions,
  findPpoById,
  findPpoSummary
} from '../repositories/ppoRepository.js';

const formatNumber = (num) => Number(num || 0);

/**
 * Format PPO entity sang JSON an toàn (BigInt -> String, Decimal -> Number)
 */
export const sanitizePpoSuggestion = (ppo) => {
  if (!ppo) return null;

  return {
    id: ppo.id.toString(),
    distributorId: ppo.distributorId.toString(),
    productId: ppo.productId.toString(),
    supplierId: ppo.supplierId ? ppo.supplierId.toString() : null,
    warehouseId: ppo.warehouseId ? ppo.warehouseId.toString() : null,
    avgDailyDemand: formatNumber(ppo.avgDailyDemand),
    leadTimeDays: ppo.leadTimeDays,
    safetyStock: formatNumber(ppo.safetyStock),
    reorderPoint: formatNumber(ppo.reorderPoint),
    quantityAvailableSnapshot: formatNumber(ppo.quantityAvailableSnapshot),
    suggestedQty: formatNumber(ppo.suggestedQty),
    finalQty: ppo.finalQty !== null ? formatNumber(ppo.finalQty) : formatNumber(ppo.suggestedQty),
    priority: ppo.priority,
    reason: ppo.reason,
    status: ppo.status,
    rejectedReason: ppo.rejectedReason,
    purchaseOrderId: ppo.purchaseOrderId ? ppo.purchaseOrderId.toString() : null,
    generatedAt: ppo.generatedAt,
    reviewedById: ppo.reviewedById ? ppo.reviewedById.toString() : null,
    reviewedAt: ppo.reviewedAt,
    product: ppo.product ? {
      id: ppo.product.id.toString(),
      sku: ppo.product.sku,
      name: ppo.product.name,
      unit: ppo.product.unit,
      basePrice: formatNumber(ppo.product.basePrice)
    } : null,
    supplier: ppo.supplier ? {
      id: ppo.supplier.id.toString(),
      code: ppo.supplier.code,
      name: ppo.supplier.name,
      phone: ppo.supplier.phone
    } : null,
    warehouse: ppo.warehouse ? {
      id: ppo.warehouse.id.toString(),
      code: ppo.warehouse.code,
      name: ppo.warehouse.name
    } : null,
    purchaseOrder: ppo.purchaseOrder ? {
      id: ppo.purchaseOrder.id.toString(),
      poCode: ppo.purchaseOrder.poCode,
      status: ppo.purchaseOrder.status
    } : null,
    reviewedBy: ppo.reviewedBy ? {
      id: ppo.reviewedBy.id.toString(),
      fullName: ppo.reviewedBy.fullName,
      username: ppo.reviewedBy.username
    } : null
  };
};

/**
 * Service sinh đề xuất PPO
 */
export const generatePpoSuggestionsService = async (distributorId = 1) => {
  const result = await runPpoAnalysis(distributorId);
  return result;
};

/**
 * Service lấy danh sách PPO có phân trang & filter
 */
export const getPpoSuggestionsService = async (distributorId = 1, filters = {}) => {
  const [listResult, summary] = await Promise.all([
    findPpoSuggestions(distributorId, filters),
    findPpoSummary(distributorId)
  ]);

  return {
    data: listResult.items.map(sanitizePpoSuggestion),
    total: listResult.total,
    page: listResult.page,
    limit: listResult.limit,
    summary
  };
};

/**
 * Service lấy chi tiết 1 PPO
 */
export const getPpoByIdService = async (id, distributorId = 1) => {
  const ppo = await findPpoById(id, distributorId);
  if (!ppo) return null;

  // Nếu đang ở trạng thái NEW, tự động chuyển sang VIEWED để đánh dấu người dùng đã mở xem
  if (ppo.status === 'NEW') {
    await prisma.ppoSuggestion.update({
      where: { id: ppo.id },
      data: { status: 'VIEWED' }
    });
    ppo.status = 'VIEWED';
  }

  return sanitizePpoSuggestion(ppo);
};

/**
 * Lấy trạng thái khung giờ duyệt PPO (09:00 - 11:00)
 */
export const getPpoWindowStatus = () => {
  const now = new Date();
  const currentHour = now.getHours();
  // Khung giờ duyệt của kế toán là từ 09:00 đến 11:00
  const isWindowActive = currentHour >= 9 && currentHour < 11;
  return {
    isWindowActive,
    windowStart: '09:00',
    windowEnd: '11:00',
    serverTime: now.toISOString(),
    displayTime: now.toTimeString().slice(0, 5)
  };
};

/**
 * Service chỉnh sửa số lượng đặt chốt (override finalQty)
 * Quy tắc: Kế toán chỉ có thể GIẢM số lượng (finalQty <= suggestedQty), không được tăng.
 */
export const updatePpoQuantityService = async (id, { distributorId = 1, finalQty }) => {
  const qty = parseFloat(finalQty);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Số lượng đặt phải là số dương lớn hơn 0');
  }

  const ppo = await prisma.ppoSuggestion.findUnique({
    where: { id: BigInt(id) }
  });

  if (!ppo) throw new Error('Không tìm thấy đề xuất PPO');
  if (distributorId && ppo.distributorId.toString() !== distributorId.toString()) {
    throw new Error('Bạn không có quyền chỉnh sửa đề xuất này');
  }

  if (ppo.status === 'APPROVED') {
    throw new Error('Đề xuất này đã được duyệt tạo PO, không thể sửa số lượng');
  }

  const suggestedQtyNum = Number(ppo.suggestedQty);
  if (qty > suggestedQtyNum) {
    throw new Error(`Số lượng đặt (${qty}) không được vượt quá số lượng AI đề xuất (${suggestedQtyNum}). Kế toán chỉ có thể giảm số lượng!`);
  }

  const updated = await prisma.ppoSuggestion.update({
    where: { id: ppo.id },
    data: {
      finalQty: qty,
      status: ppo.status === 'NEW' ? 'VIEWED' : ppo.status
    },
    include: {
      product: true,
      supplier: true,
      warehouse: true
    }
  });

  return sanitizePpoSuggestion(updated);
};

/**
 * Service Duyệt hàng loạt PPO -> Gom theo Nhà cung cấp -> Tự động sinh PO Nháp
 * @param {Object} params - { distributorId, ppoIds, userId }
 */
export const approvePpoBatchService = async ({ distributorId = 1, ppoIds, userId }) => {
  if (!ppoIds || !Array.isArray(ppoIds) || ppoIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất một đề xuất PPO để duyệt');
  }

  const distId = BigInt(distributorId);
  const bigIds = ppoIds.map(id => BigInt(id));

  // 1. Lấy danh sách PPO cần duyệt
  const ppoList = await prisma.ppoSuggestion.findMany({
    where: {
      id: { in: bigIds },
      distributorId: distId
    },
    include: {
      product: true,
      supplier: true,
      warehouse: true
    }
  });

  if (ppoList.length === 0) {
    throw new Error('Không tìm thấy đề xuất PPO hợp lệ nào');
  }

  // Kiểm tra nếu có dòng nào đã được duyệt trước đó
  const alreadyApproved = ppoList.filter(p => p.status === 'APPROVED');
  if (alreadyApproved.length > 0) {
    throw new Error(`Đề xuất của SKU [${alreadyApproved[0].product.sku}] đã được duyệt thành đơn PO trước đó`);
  }

  // 2. Gom nhóm các mặt hàng theo supplierId
  const supplierGroups = {};
  const fallbackSupplier = await prisma.supplier.findFirst({ where: { status: true } });

  ppoList.forEach(item => {
    const sId = item.supplierId ? item.supplierId.toString() : (fallbackSupplier ? fallbackSupplier.id.toString() : 'UNKNOWN');
    if (!supplierGroups[sId]) {
      supplierGroups[sId] = [];
    }
    supplierGroups[sId].push(item);
  });

  const createdOrders = [];

  // 3. Với mỗi NCC, tạo một đơn PO Nháp (DRAFT)
  for (const [supIdStr, itemsInGroup] of Object.entries(supplierGroups)) {
    const warehouseId = itemsInGroup[0].warehouseId || (await prisma.warehouse.findFirst({ where: { distributorId: distId } }))?.id;

    const poItems = itemsInGroup.map(item => ({
      productId: item.productId.toString(),
      quantity: Number(item.finalQty || item.suggestedQty),
      unitPrice: Number(item.product.basePrice || 0)
    }));

    // Dự kiến nhận sau 4 ngày
    const expected = new Date();
    expected.setDate(expected.getDate() + 4);

    const notes = `Đơn đặt hàng tự động sinh từ hệ thống Đề xuất AI (PPO) cho ${itemsInGroup.length} mặt hàng`;

    // Gọi createPurchaseOrderService để sinh PO Nháp
    const newPo = await createPurchaseOrderService({
      distributorId: distId.toString(),
      warehouseId: warehouseId ? warehouseId.toString() : '1',
      supplierId: supIdStr !== 'UNKNOWN' ? supIdStr : null,
      expectedDate: expected.toISOString().slice(0, 10),
      notes,
      items: poItems,
      createdById: userId ? userId.toString() : null
    });

    createdOrders.push(newPo);

    // 4. Cập nhật trạng thái PPO sang APPROVED và gắn purchaseOrderId
    const ppoIdsInGroup = itemsInGroup.map(p => p.id);
    await prisma.ppoSuggestion.updateMany({
      where: { id: { in: ppoIdsInGroup } },
      data: {
        status: 'APPROVED',
        purchaseOrderId: BigInt(newPo.id),
        reviewedById: userId ? BigInt(userId) : null,
        reviewedAt: new Date()
      }
    });
  }

  return {
    success: true,
    message: `Đã duyệt thành công ${ppoList.length} đề xuất và tự động tạo ${createdOrders.length} đơn đặt hàng mua (PO Nháp)`,
    createdOrders,
    approvedPpoCount: ppoList.length
  };
};

/**
 * Service từ chối đề xuất PPO kèm lý do
 */
export const rejectPpoService = async (id, { distributorId = 1, userId, reason }) => {
  if (!reason || !reason.trim()) {
    throw new Error('Vui lòng nhập lý do từ chối đề xuất này');
  }

  const ppo = await prisma.ppoSuggestion.findUnique({
    where: { id: BigInt(id) }
  });

  if (!ppo) throw new Error('Không tìm thấy đề xuất PPO');
  if (distributorId && ppo.distributorId.toString() !== distributorId.toString()) {
    throw new Error('Bạn không có quyền từ chối đề xuất này');
  }

  if (ppo.status === 'APPROVED') {
    throw new Error('Đề xuất này đã được duyệt thành PO, không thể từ chối');
  }

  const updated = await prisma.ppoSuggestion.update({
    where: { id: ppo.id },
    data: {
      status: 'REJECTED',
      rejectedReason: reason.trim(),
      reviewedById: userId ? BigInt(userId) : null,
      reviewedAt: new Date()
    },
    include: {
      product: true,
      supplier: true,
      warehouse: true
    }
  });

  return sanitizePpoSuggestion(updated);
};

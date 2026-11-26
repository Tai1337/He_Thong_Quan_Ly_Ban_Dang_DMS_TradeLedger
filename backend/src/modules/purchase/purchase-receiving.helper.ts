import { BadRequestException } from '@nestjs/common';

export interface NormalizedReceiveLine {
  poItemId: bigint;
  quantityReceived: number;
  lotNumber: string;
  manufactureDate: Date | null;
  expiryDate: Date | null;
  locationCode: string;
}

export interface ExecuteReceiveOptions {
  tx: any;
  warehouseId: bigint;
  userId?: string | number | bigint | null;
  lines: NormalizedReceiveLine[];
  poItemsMap: Map<string, any>;
  historyNotePrefix?: string;
  customNotes?: string | null;
}

let txnSeq = 0;

/**
 * Sinh mã giao dịch kho duy nhất ngay cả khi ghi nhiều lô trong cùng 1ms
 */
export const generateUniqueInboundTxnCode = (): string => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  txnSeq = (txnSeq + 1) % 1000;
  const rand = Math.floor(100 + Math.random() * 900);
  const seqStr = String(txnSeq).padStart(3, '0');
  return `TXN-IN-${datePart}-${rand}${seqStr}`;
};

const parseOptionalDate = (value: string | Date | null | undefined, label: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({ error: `${label} không hợp lệ` });
  }
  return parsed;
};

/**
 * Chuẩn hóa và kiểm tra dữ liệu đầu vào cho từng dòng nhận hàng (hỗ trợ cả tách nhiều lô cho 1 PO item)
 */
export const normalizeAndValidateReceiveLines = (
  rawItems: any[],
  poItemsMap: Map<string, any>,
): NormalizedReceiveLine[] => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new BadRequestException({ error: 'Vui lòng chọn ít nhất 1 sản phẩm để nhận hàng' });
  }

  const normalized: NormalizedReceiveLine[] = [];

  for (const row of rawItems) {
    const rawId = row.poItemId ?? row.itemId;
    const receiveQty = Number(row.quantityReceivedNow ?? row.quantityReceived ?? 0);

    if (!receiveQty || receiveQty <= 0) continue;

    if (!rawId) {
      throw new BadRequestException({ error: 'Thiếu mã dòng sản phẩm (poItemId / itemId)' });
    }

    const lineItem = poItemsMap.get(String(rawId));
    if (!lineItem) {
      throw new BadRequestException({ error: `Mặt hàng (ID ${rawId}) không thuộc chứng từ cần nhận` });
    }

    const productLabel = lineItem.product?.sku
      ? `${lineItem.product.sku} - ${lineItem.product.name}`
      : `ID ${lineItem.productId}`;

    const lotNumber = String(row.lotNumber || '').trim();
    if (!lotNumber) {
      throw new BadRequestException({ error: `Vui lòng nhập số lô cho sản phẩm "${productLabel}"` });
    }

    const manufactureDate = parseOptionalDate(row.manufactureDate ?? row.mfgDate, `Ngày sản xuất (${productLabel})`);
    const expiryDate = parseOptionalDate(row.expiryDate ?? row.expDate, `Hạn sử dụng (${productLabel})`);

    if (manufactureDate && expiryDate && expiryDate <= manufactureDate) {
      throw new BadRequestException({
        error: `Sản phẩm "${productLabel}" (Lô ${lotNumber}): Hạn sử dụng phải lớn hơn Ngày sản xuất`,
      });
    }

    normalized.push({
      poItemId: BigInt(rawId),
      quantityReceived: receiveQty,
      lotNumber,
      manufactureDate,
      expiryDate,
      locationCode: String(row.locationCode || 'KHO-A1').trim() || 'KHO-A1',
    });
  }

  if (normalized.length === 0) {
    throw new BadRequestException({ error: 'Không có sản phẩm nào có số lượng thực nhận > 0' });
  }

  return normalized;
};

/**
 * Thực thi ghi nhận Lô (StockLot), Tồn kho (StockBalance), Giao dịch IN (InventoryTransaction),
 * cập nhật tiến độ PO và đồng bộ trạng thái Chuyến xe INBOUND trong cùng 1 transaction.
 */
export const executeReceiveLinesInTx = async ({
  tx,
  warehouseId,
  userId,
  lines,
  poItemsMap,
  historyNotePrefix = 'Nhận hàng nhập kho',
  customNotes,
}: ExecuteReceiveOptions) => {
  const affectedPoIds = new Set<bigint>();
  const poReceiveLogs = new Map<string, string[]>();
  const processedItems: any[] = [];

  for (const line of lines) {
    const lineItem = poItemsMap.get(line.poItemId.toString());
    const poId = lineItem.purchaseOrderId as bigint;
    const poKey = poId.toString();
    affectedPoIds.add(poId);

    let lot = await tx.stockLot.findUnique({
      where: {
        productId_warehouseId_lotNumber: {
          productId: lineItem.productId,
          warehouseId,
          lotNumber: line.lotNumber,
        },
      },
    });

    if (!lot) {
      lot = await tx.stockLot.create({
        data: {
          productId: lineItem.productId,
          warehouseId,
          lotNumber: line.lotNumber,
          manufactureDate: line.manufactureDate,
          expiryDate: line.expiryDate,
          locationCode: line.locationCode,
          status: 'GOOD',
        },
      });
    } else {
      const lotUpdateData: any = {};
      if (!lot.manufactureDate && line.manufactureDate) lotUpdateData.manufactureDate = line.manufactureDate;
      if (!lot.expiryDate && line.expiryDate) lotUpdateData.expiryDate = line.expiryDate;
      if (!lot.locationCode && line.locationCode) lotUpdateData.locationCode = line.locationCode;

      if (Object.keys(lotUpdateData).length > 0) {
        lot = await tx.stockLot.update({
          where: { id: lot.id },
          data: lotUpdateData,
        });
      }
    }

    const balance = await tx.stockBalance.findUnique({
      where: { lotId: lot.id },
    });

    if (!balance) {
      await tx.stockBalance.create({
        data: {
          lotId: lot.id,
          quantityOnHand: line.quantityReceived,
          quantityReserved: 0,
        },
      });
    } else {
      await tx.stockBalance.update({
        where: { lotId: lot.id },
        data: {
          quantityOnHand: { increment: line.quantityReceived },
        },
      });
    }

    const transactionCode = generateUniqueInboundTxnCode();
    await tx.inventoryTransaction.create({
      data: {
        transactionCode,
        direction: 'IN',
        lotId: lot.id,
        warehouseId,
        quantity: line.quantityReceived,
        unitPrice: lineItem.unitPrice,
        referenceType: 'PURCHASE_ORDER',
        referenceId: poId,
        createdById: userId ? BigInt(userId) : null,
      },
    });

    await tx.purchaseOrderItem.update({
      where: { id: lineItem.id },
      data: {
        quantityReceived: { increment: line.quantityReceived },
      },
    });

    const skuLabel = lineItem.product?.sku || lineItem.productId.toString();
    const existingLogs = poReceiveLogs.get(poKey) || [];
    existingLogs.push(`${skuLabel}: nhận ${line.quantityReceived} (Lô ${line.lotNumber}, Vị trí ${line.locationCode})`);
    poReceiveLogs.set(poKey, existingLogs);

    processedItems.push({
      poId: poKey,
      poItemId: lineItem.id.toString(),
      productId: lineItem.productId.toString(),
      quantityReceivedNow: line.quantityReceived,
      lotNumber: line.lotNumber,
      locationCode: line.locationCode,
      transactionCode,
    });
  }

  const tripIdsToSync = new Set<bigint>();
  const updatedOrders: any[] = [];

  for (const poId of affectedPoIds) {
    const currentPo = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });
    if (!currentPo) continue;

    if (currentPo.deliveryTripId) {
      tripIdsToSync.add(currentPo.deliveryTripId);
    }

    const isAllCompleted = currentPo.items.every(
      (it: any) => Number(it.quantityReceived) >= Number(it.quantity),
    );
    const hasAnyReceived = currentPo.items.some((it: any) => Number(it.quantityReceived) > 0);
    const newStatus = isAllCompleted
      ? 'COMPLETED'
      : hasAnyReceived
        ? 'PARTIALLY_RECEIVED'
        : currentPo.status;

    const updatedPo = await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus },
      include: {
        supplier: true,
        warehouse: true,
        deliveryTrip: {
          include: {
            driver: { select: { id: true, fullName: true } },
          },
        },
        items: { include: { product: true }, orderBy: { id: 'asc' } },
      },
    });
    updatedOrders.push(updatedPo);

    const detailLogs = (poReceiveLogs.get(poId.toString()) || []).join(', ');
    const noteText = customNotes
      ? `${customNotes} | ${historyNotePrefix}: ${detailLogs}`
      : `${historyNotePrefix}: ${detailLogs}`;

    await tx.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: poId,
        fromStatus: currentPo.status,
        toStatus: newStatus,
        changedById: userId ? BigInt(userId) : null,
        notes: noteText,
      },
    });
  }

  let syncedTripStatus: string | null = null;
  for (const tripId of tripIdsToSync) {
    const tripOrders = await tx.purchaseOrder.findMany({
      where: {
        deliveryTripId: tripId,
        status: { not: 'CANCELLED' },
      },
    });

    const isAllTripPosCompleted =
      tripOrders.length > 0 && tripOrders.every((po: any) => po.status === 'COMPLETED');
    const newTripStatus = isAllTripPosCompleted ? 'COMPLETED' : 'SHIPPING';

    const updatedTrip = await tx.deliveryTrip.update({
      where: { id: tripId },
      data: {
        status: newTripStatus,
        ...(isAllTripPosCompleted ? { completedTime: new Date() } : {}),
      },
    });
    syncedTripStatus = updatedTrip.status;
  }

  return {
    processedItems,
    updatedOrders,
    syncedTripStatus,
  };
};

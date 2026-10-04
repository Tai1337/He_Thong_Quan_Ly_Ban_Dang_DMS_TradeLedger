import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CountType, DocStatus, TxnDirection, InventoryReferenceType, AdjustmentType } from '@prisma/client';

@Injectable()
export class InventoryCountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sinh mã kiểm kê theo định dạng KKxxxxxx (VD: KK000001)
   */
  async generateCountCode(): Promise<string> {
    const lastCount = await this.prisma.inventoryCount.findFirst({
      where: {
        countCode: { startsWith: 'KK' },
      },
      orderBy: { id: 'desc' },
      select: { countCode: true },
    });

    if (lastCount && lastCount.countCode) {
      const match = lastCount.countCode.match(/^KK(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `KK${nextNum.toString().padStart(6, '0')}`;
      }
    }

    const count = await this.prisma.inventoryCount.count();
    return `KK${(count + 1).toString().padStart(6, '0')}`;
  }

  /**
   * Sinh mã phiếu điều chỉnh tồn kho ADJ-YYYYMMDD-XXXXX
   */
  private generateAdjustmentCode(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    return `ADJ-${yyyy}${mm}${dd}-${random}`;
  }

  /**
   * Lấy danh sách phiếu kiểm kê có phân trang và lọc
   */
  async findCountsByDistributor(distributorId: string | number | bigint, filters: any = {}) {
    const {
      page = 1,
      limit = 20,
      warehouseId,
      status,
      countType,
      search,
      fromDate,
      toDate,
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      distributorId: BigInt(distributorId),
    };

    if (warehouseId) {
      where.warehouseId = BigInt(warehouseId);
    }
    if (status) {
      where.status = status;
    }
    if (countType) {
      where.countType = countType;
    }
    if (search) {
      where.countCode = { contains: search };
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const t = new Date(toDate);
        t.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = t;
      }
    }

    const [counts, total] = await Promise.all([
      this.prisma.inventoryCount.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: {
            select: { id: true, code: true, name: true },
          },
          createdBy: {
            select: { id: true, fullName: true, username: true },
          },
          _count: {
            select: { items: true },
          },
          items: {
            select: {
              id: true,
              systemQuantity: true,
              actualQuantity: true,
              variance: true,
              reason: true,
            },
          },
        },
      }),
      this.prisma.inventoryCount.count({ where }),
    ]);

    // Bổ sung thông tin tổng kết nhanh cho mỗi phiếu
    const enrichedCounts = counts.map((count) => {
      let matchedCount = 0;
      let surplusCount = 0;
      let deficitCount = 0;
      let uncountedCount = 0;

      count.items.forEach((item) => {
        if (item.actualQuantity === null || item.actualQuantity === undefined) {
          uncountedCount++;
        } else {
          const varNum = Number(item.variance || 0);
          if (varNum === 0) matchedCount++;
          else if (varNum > 0) surplusCount++;
          else deficitCount++;
        }
      });

      return {
        ...count,
        summary: {
          totalSkus: count.items.length,
          matchedCount,
          surplusCount,
          deficitCount,
          uncountedCount,
          hasVariance: surplusCount > 0 || deficitCount > 0,
        },
      };
    });

    return { data: enrichedCounts, total, page: Number(page), limit: take };
  }

  /**
   * Lấy chi tiết phiếu kiểm kê theo ID
   */
  async findCountById(id: string | number | bigint, distributorId: string | number | bigint) {
    return this.prisma.inventoryCount.findFirst({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
      include: {
        warehouse: true,
        createdBy: {
          select: { id: true, fullName: true, username: true, phone: true },
        },
        items: {
          include: {
            stockLot: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    unit: true,
                    productType: true,
                    category: true,
                  },
                },
                stockBalance: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });
  }

  /**
   * Lấy danh sách lô hàng trong kho để tạo phiếu kiểm kê
   */
  async getWarehouseStockLots(distributorId: string | number | bigint, warehouseId: string | number | bigint, skuIds?: (string | number)[]) {
    const where: any = {
      warehouseId: BigInt(warehouseId),
      warehouse: {
        distributorId: BigInt(distributorId),
      },
    };

    if (skuIds && skuIds.length > 0) {
      where.productId = {
        in: skuIds.map((id) => BigInt(id)),
      };
    }

    return this.prisma.stockLot.findMany({
      where,
      include: {
        product: true,
        stockBalance: true,
      },
      orderBy: [
        { product: { sku: 'asc' } },
        { expiryDate: 'asc' },
      ],
    });
  }

  /**
   * Tạo mới phiếu kiểm kê
   */
  async createCount(data: {
    distributorId: bigint;
    warehouseId: bigint;
    countCode: string;
    countType: CountType;
    notes?: string;
    createdById?: bigint;
    items: Array<{
      lotId: bigint;
      systemQuantity: number;
      actualQuantity?: number | null;
      variance?: number | null;
      reason?: string | null;
    }>;
  }) {
    return this.prisma.inventoryCount.create({
      data: {
        countCode: data.countCode,
        distributorId: data.distributorId,
        warehouseId: data.warehouseId,
        countType: data.countType,
        status: DocStatus.DRAFT,
        notes: data.notes,
        createdById: data.createdById,
        items: {
          create: data.items.map((item) => ({
            lotId: item.lotId,
            systemQuantity: item.systemQuantity,
            actualQuantity: item.actualQuantity !== undefined ? item.actualQuantity : null,
            variance: item.variance !== undefined ? item.variance : null,
            reason: item.reason || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            stockLot: {
              include: { product: true },
            },
          },
        },
      },
    });
  }

  /**
   * Cập nhật danh sách số lượng kiểm đếm thực tế và lý do giải trình
   */
  async updateCountItems(
    countId: string | number | bigint,
    distributorId: string | number | bigint,
    items: Array<{
      lotId?: string | number | bigint;
      id?: string | number | bigint;
      actualQuantity?: number | null;
      reason?: string | null;
    }>,
    notes?: string,
  ) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: {
        id: BigInt(countId),
        distributorId: BigInt(distributorId),
      },
      include: { items: true },
    });

    if (!count) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    }

    if (count.status === DocStatus.COMPLETED || count.status === DocStatus.APPROVED) {
      throw new BadRequestException('Không thể chỉnh sửa phiếu kiểm kê đã được duyệt/hoàn tất');
    }

    return this.prisma.$transaction(async (tx) => {
      // Cập nhật notes của phiếu nếu có
      if (notes !== undefined) {
        await tx.inventoryCount.update({
          where: { id: count.id },
          data: { notes },
        });
      }

      // Cập nhật từng dòng kiểm kê
      for (const itemInput of items) {
        const targetItem = count.items.find((item) => {
          if (itemInput.id) return item.id.toString() === itemInput.id.toString();
          if (itemInput.lotId) return item.lotId.toString() === itemInput.lotId.toString();
          return false;
        });

        if (targetItem) {
          const actualQty = itemInput.actualQuantity !== undefined && itemInput.actualQuantity !== null
            ? Number(itemInput.actualQuantity)
            : null;

          const systemQty = Number(targetItem.systemQuantity);
          const variance = actualQty !== null ? actualQty - systemQty : null;

          await tx.inventoryCountItem.update({
            where: { id: targetItem.id },
            data: {
              actualQuantity: actualQty,
              variance: variance,
              reason: itemInput.reason !== undefined ? itemInput.reason : targetItem.reason,
            },
          });
        }
      }

      return tx.inventoryCount.findUnique({
        where: { id: count.id },
        include: {
          items: {
            include: {
              stockLot: {
                include: { product: true },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Thay đổi trạng thái chứng từ (Gửi duyệt, Từ chối, Hủy)
   */
  async updateStatus(
    id: string | number | bigint,
    distributorId: string | number | bigint,
    toStatus: DocStatus,
    reason?: string,
  ) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
    });

    if (!count) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    }

    const data: any = { status: toStatus };
    if (reason) {
      data.notes = count.notes ? `${count.notes}\n[Lý do: ${reason}]` : `[Lý do: ${reason}]`;
    }

    return this.prisma.inventoryCount.update({
      where: { id: count.id },
      data,
    });
  }

  /**
   * Phê duyệt & Cân kho (Approve & Reconcile)
   * 1. Kiểm tra trạng thái hiện tại (phải là WAITING_APPROVAL)
   * 2. Mở Transaction cập nhật:
   *    - Điều chỉnh stock_balances về actualQuantity
   *    - Tạo inventory_transactions (IN nếu thừa, OUT nếu thiếu)
   *    - Tạo phiếu inventory_adjustments liên kết
   *    - Đổi trạng thái phiếu kiểm kê thành COMPLETED
   */
  async approveAndReconcileCount(
    id: string | number | bigint,
    distributorId: string | number | bigint,
    approvedById?: string | number | bigint,
  ) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
      include: {
        warehouse: true,
        items: {
          include: {
            stockLot: {
              include: {
                product: true,
                stockBalance: true,
              },
            },
          },
        },
      },
    });

    if (!count) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    }

    if (count.status !== DocStatus.WAITING_APPROVAL && count.status !== DocStatus.DRAFT) {
      throw new BadRequestException(`Không thể phê duyệt phiếu ở trạng thái: ${count.status}`);
    }

    // Kiểm tra xem tất cả các dòng đã có actualQuantity hay chưa
    const uncounted = count.items.filter((item) => item.actualQuantity === null || item.actualQuantity === undefined);
    if (uncounted.length > 0) {
      throw new BadRequestException(`Còn ${uncounted.length} dòng sản phẩm chưa được nhập số lượng thực tế`);
    }

    // Kiểm tra xem các dòng bị lệch có lý do giải trình chưa
    const varianceItemsWithoutReason = count.items.filter((item) => {
      const varNum = Number(item.variance || 0);
      return varNum !== 0 && (!item.reason || item.reason.trim() === '');
    });
    if (varianceItemsWithoutReason.length > 0) {
      throw new BadRequestException(
        `Có ${varianceItemsWithoutReason.length} mặt hàng chênh lệch nhưng chưa có lý do giải trình. Vui lòng hoàn tất bước nhập lý do trước khi duyệt.`,
      );
    }

    const varianceItems = count.items.filter((item) => Number(item.variance || 0) !== 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Tạo phiếu Điều chỉnh tồn kho (InventoryAdjustment) nếu có dòng chênh lệch
      let adjustment = null;
      if (varianceItems.length > 0) {
        const adjustmentCode = this.generateAdjustmentCode();
        adjustment = await tx.inventoryAdjustment.create({
          data: {
            adjustmentCode,
            distributorId: count.distributorId,
            warehouseId: count.warehouseId,
            adjustmentType: AdjustmentType.STATUS_CHANGE, // Loại điều chỉnh từ kiểm kê
            status: DocStatus.COMPLETED,
            reason: `Cân kho tự động theo biên bản kiểm kê ${count.countCode}`,
            createdById: approvedById ? BigInt(approvedById) : count.createdById,
            items: {
              create: varianceItems.map((item) => ({
                lotId: item.lotId,
                quantity: Math.abs(Number(item.variance)),
                fromStatus: item.stockLot.status,
                toStatus: item.stockLot.status,
              })),
            },
          },
        });
      }

      // 2. Cập nhật tồn kho & sinh giao dịch kho (InventoryTransaction)
      const now = new Date();
      for (const item of count.items) {
        const varianceNum = Number(item.variance || 0);
        const actualQty = Number(item.actualQuantity);

        // Luôn cập nhật stock_balances về đúng số thực tế
        await tx.stockBalance.upsert({
          where: { lotId: item.lotId },
          update: {
            quantityOnHand: actualQty,
            updatedAt: now,
          },
          create: {
            lotId: item.lotId,
            quantityOnHand: actualQty,
            quantityReserved: 0,
            updatedAt: now,
          },
        });

        // Nếu có chênh lệch, ghi sổ giao dịch (IN hoặc OUT)
        if (varianceNum !== 0) {
          const isSurplus = varianceNum > 0;
          const diffQuantity = Math.abs(varianceNum);
          const txnCode = `TXN-KK-${item.lotId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          await tx.inventoryTransaction.create({
            data: {
              transactionCode: txnCode,
              direction: isSurplus ? TxnDirection.IN : TxnDirection.OUT,
              lotId: item.lotId,
              warehouseId: count.warehouseId,
              quantity: diffQuantity,
              unitPrice: Number(item.stockLot.product.basePrice || 0),
              referenceType: InventoryReferenceType.INVENTORY_COUNT,
              referenceId: count.id,
              createdById: approvedById ? BigInt(approvedById) : count.createdById,
              createdAt: now,
            },
          });
        }
      }

      // 3. Cập nhật trạng thái phiếu kiểm kê thành COMPLETED
      const updatedCount = await tx.inventoryCount.update({
        where: { id: count.id },
        data: {
          status: DocStatus.COMPLETED,
        },
        include: {
          warehouse: true,
          items: {
            include: {
              stockLot: {
                include: { product: true },
              },
            },
          },
        },
      });

      return {
        count: updatedCount,
        adjustmentCode: adjustment ? adjustment.adjustmentCode : null,
        adjustedItemsCount: varianceItems.length,
      };
    });
  }
}

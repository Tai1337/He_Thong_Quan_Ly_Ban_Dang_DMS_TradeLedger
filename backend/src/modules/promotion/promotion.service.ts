import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PROMOTION_INCLUDE = {
  percentageDiscount: {
    include: {
      products: {
        include: {
          product: true,
        },
      },
    },
  },
  combo: {
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  },
  buyNGetM: {
    include: {
      items: {
        include: {
          buyProduct: true,
          freeProduct: true,
        },
      },
    },
  },
  invoiceDiscount: true,
};

const VALID_PROMOTION_TYPES = ['PERCENTAGE', 'COMBO', 'BUY_N_GET_M', 'INVOICE_DISCOUNT'] as const;

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj;
  if (typeof obj === 'object' && typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = serializeBigInt(value);
    }
    return res;
  }
  return obj;
}

/**
 * Chuẩn hóa mốc 00:00:00 UTC theo ngày lịch để so sánh chính xác với cột @db.Date
 */
function getDateOnlyUtc(input: string | Date = new Date()): Date {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException({ error: 'Ngày áp dụng khuyến mãi không hợp lệ' });
  }
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

const formatVnd = (val: number): string => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy tổng tồn khả dụng theo danh sách productId của NPP (lô GOOD)
   */
  private async getAvailableStockMap(distributorId: bigint, productIds: bigint[]): Promise<Map<string, number>> {
    const stockMap = new Map<string, number>();
    if (productIds.length === 0) return stockMap;

    const lots = await this.prisma.stockLot.findMany({
      where: {
        productId: { in: productIds },
        warehouse: { distributorId },
        status: 'GOOD',
      },
      include: { stockBalance: true },
    });

    for (const lot of lots) {
      const pId = lot.productId.toString();
      const onHand = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
      const reserved = lot.stockBalance ? Number(lot.stockBalance.quantityReserved) : 0;
      const avail = Math.max(0, onHand - reserved);
      stockMap.set(pId, (stockMap.get(pId) || 0) + avail);
    }

    return stockMap;
  }

  /**
   * Quét và tự động chuyển status = false cho:
   * 1. Khuyến mãi có endDate < ngày hôm nay (đã qua hết ngày kết thúc).
   * 2. Khuyến mãi BUY_N_GET_M nếu sản phẩm quà tặng (freeProduct) đã hết tồn kho khả dụng (<= 0).
   */
  async checkAndExpirePromotions(distributorId: any = 1) {
    const distId = BigInt(distributorId);
    const todayUtc = getDateOnlyUtc(new Date());

    // 1. Tắt khuyến mãi đã qua ngày kết thúc
    await this.prisma.promotion.updateMany({
      where: {
        distributorId: distId,
        status: true,
        endDate: { lt: todayUtc },
      },
      data: { status: false },
    });

    // 2. Tắt khuyến mãi tặng quà nếu hàng quà tặng hết tồn
    const buyNGetMPromos = await this.prisma.promotion.findMany({
      where: {
        distributorId: distId,
        status: true,
        promotionType: 'BUY_N_GET_M',
      },
      include: {
        buyNGetM: {
          include: {
            items: true,
          },
        },
      },
    });

    const freeProductIds = Array.from(
      new Set(
        buyNGetMPromos.flatMap((p) => (p.buyNGetM?.items || []).map((it) => it.freeProductId)),
      ),
    );
    const stockMap = await this.getAvailableStockMap(distId, freeProductIds);

    for (const promo of buyNGetMPromos) {
      if (!promo.buyNGetM?.items?.length) continue;
      const giftOutOfStock = promo.buyNGetM.items.some(
        (item) => (stockMap.get(item.freeProductId.toString()) || 0) <= 0,
      );

      if (giftOutOfStock) {
        await this.prisma.promotion.update({
          where: { id: promo.id },
          data: { status: false },
        });
      }
    }
  }

  async getPromotions(distributorId: any = 1, filters: any = {}) {
    await this.checkAndExpirePromotions(distributorId);

    const where: any = {
      distributorId: BigInt(distributorId),
    };

    if (filters.status !== undefined && filters.status !== '') {
      where.status = filters.status === 'true' || filters.status === true;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
    }

    if (filters.promotionType && VALID_PROMOTION_TYPES.includes(filters.promotionType)) {
      where.promotionType = filters.promotionType;
    }

    const promotions = await this.prisma.promotion.findMany({
      where,
      include: PROMOTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return serializeBigInt(promotions);
  }

  async getPromotionById(id: string, distributorId: any = 1) {
    const promo = await this.prisma.promotion.findFirst({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
      include: PROMOTION_INCLUDE,
    });

    if (!promo) {
      throw new NotFoundException({ error: 'Không tìm thấy chương trình khuyến mãi' });
    }

    return serializeBigInt(promo);
  }

  async getClearanceCandidates(distributorId: any = 1) {
    const lots: any[] = await this.prisma.stockLot.findMany({
      where: {
        warehouse: { distributorId: BigInt(distributorId) },
        status: 'GOOD',
      },
      include: {
        stockBalance: true,
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
            imageUrl: true,
            unit: true,
          },
        },
      },
    });

    const map = new Map<string, { product: any; availableQty: number; totalOnHand: number }>();
    for (const lot of lots) {
      if (!lot.product) continue;
      const pId = lot.productId.toString();
      const onHand = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
      const reserved = lot.stockBalance ? Number(lot.stockBalance.quantityReserved) : 0;
      const avail = Math.max(0, onHand - reserved);

      if (!map.has(pId)) {
        map.set(pId, { product: lot.product, availableQty: 0, totalOnHand: 0 });
      }
      const entry = map.get(pId)!;
      entry.availableQty += avail;
      entry.totalOnHand += onHand;
    }

    const result = Array.from(map.values())
      .filter((it) => it.availableQty > 0)
      .sort((a, b) => b.availableQty - a.availableQty)
      .slice(0, 10);

    return serializeBigInt(result);
  }

  private validatePromotionPayload(data: any, isCreate = true) {
    if (isCreate && (!data.name || !String(data.name).trim())) {
      throw new BadRequestException({ error: 'Vui lòng nhập tên chương trình khuyến mãi' });
    }
    if (data.startDate && data.endDate) {
      const start = getDateOnlyUtc(data.startDate);
      const end = getDateOnlyUtc(data.endDate);
      if (end < start) {
        throw new BadRequestException({ error: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu' });
      }
    }
    if (data.promotionType && !VALID_PROMOTION_TYPES.includes(data.promotionType)) {
      throw new BadRequestException({ error: `Loại khuyến mãi không hợp lệ: ${data.promotionType}` });
    }
  }

  async createPromotion(distributorId: any = 1, data: any) {
    this.validatePromotionPayload(data, true);

    const {
      name,
      description,
      promotionType = 'PERCENTAGE',
      startDate,
      endDate,
      status = true,
      discountPercent,
      minQuantity,
      maxQuantityPerOrder,
      productIds = [],
      comboPrice,
      comboItems = [],
      buyQuantity,
      freeQuantity,
      buyNGetMItems = [],
      minOrderAmount,
      discountAmount,
    } = data;

    const resolvedType =
      promotionType || (discountPercent !== undefined ? 'PERCENTAGE' : 'PERCENTAGE');

    const createData: any = {
      distributorId: BigInt(distributorId),
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      promotionType: resolvedType,
      startDate: getDateOnlyUtc(startDate),
      endDate: getDateOnlyUtc(endDate),
      status: Boolean(status),
    };

    if (resolvedType === 'PERCENTAGE') {
      const pct = Number(discountPercent ?? 0);
      if (pct <= 0 || pct > 100) {
        throw new BadRequestException({ error: 'Tỷ lệ giảm giá (%) phải trong khoảng 0.1 - 100' });
      }
      const uniquePids = Array.from(new Set((productIds || []).map((pid: any) => String(pid))));
      if (uniquePids.length === 0) {
        throw new BadRequestException({ error: 'Vui lòng chọn ít nhất 1 sản phẩm áp dụng giảm giá %' });
      }

      createData.percentageDiscount = {
        create: {
          discountPercent: pct,
          minQuantity: Math.max(1, Number(minQuantity ?? 1)),
          maxQuantityPerOrder: maxQuantityPerOrder ? Number(maxQuantityPerOrder) : null,
          products: {
            create: uniquePids.map((pid: string) => ({
              productId: BigInt(pid),
            })),
          },
        },
      };
    } else if (resolvedType === 'COMBO') {
      const price = Number(comboPrice ?? 0);
      if (price <= 0) {
        throw new BadRequestException({ error: 'Giá gói Combo phải lớn hơn 0' });
      }
      if (!Array.isArray(comboItems) || comboItems.length < 2) {
        throw new BadRequestException({ error: 'Gói Combo phải bao gồm ít nhất 2 sản phẩm' });
      }

      createData.combo = {
        create: {
          comboPrice: price,
          items: {
            create: comboItems.map((item: any) => ({
              productId: BigInt(item.productId),
              quantity: Math.max(1, Number(item.quantity ?? 1)),
            })),
          },
        },
      };
    } else if (resolvedType === 'BUY_N_GET_M') {
      const bQty = Number(buyQuantity ?? 1);
      const fQty = Number(freeQuantity ?? 1);
      if (bQty < 1 || fQty < 1) {
        throw new BadRequestException({ error: 'Số lượng mua (N) và tặng (M) phải >= 1' });
      }
      if (!Array.isArray(buyNGetMItems) || buyNGetMItems.length === 0) {
        throw new BadRequestException({ error: 'Vui lòng chọn sản phẩm mua và sản phẩm tặng thưởng' });
      }

      createData.buyNGetM = {
        create: {
          buyQuantity: bQty,
          freeQuantity: fQty,
          items: {
            create: buyNGetMItems.map((item: any) => ({
              buyProductId: BigInt(item.buyProductId),
              freeProductId: BigInt(item.freeProductId),
            })),
          },
        },
      };
    } else if (resolvedType === 'INVOICE_DISCOUNT') {
      const minAmt = Number(minOrderAmount ?? 0);
      const pct = discountPercent !== null && discountPercent !== undefined ? Number(discountPercent) : null;
      const amt = discountAmount !== null && discountAmount !== undefined ? Number(discountAmount) : null;
      if (minAmt < 0) {
        throw new BadRequestException({ error: 'Mốc giá trị đơn hàng tối thiểu không được âm' });
      }
      if ((!pct || pct <= 0) && (!amt || amt <= 0)) {
        throw new BadRequestException({ error: 'Vui lòng nhập tỷ lệ (%) hoặc số tiền giảm cho chiết khấu đơn' });
      }

      createData.invoiceDiscount = {
        create: {
          minOrderAmount: minAmt,
          discountPercent: pct,
          discountAmount: amt,
        },
      };
    }

    const promotion = await this.prisma.promotion.create({
      data: createData,
      include: PROMOTION_INCLUDE,
    });

    return serializeBigInt(promotion);
  }

  async autoGeneratePromotion(distributorId: any = 1, dto: any) {
    const {
      autoType,
      productIds = [],
      minQuantity,
      discountPercent,
      minOrderAmount,
      buyProductId,
      freeProductId,
      buyQuantity,
      freeQuantity,
      startDate: inputStartDate,
      endDate: inputEndDate,
    } = dto;

    const startDate = inputStartDate ? new Date(inputStartDate) : new Date();
    const endDate = inputEndDate ? new Date(inputEndDate) : new Date(startDate);

    if (autoType === 'BULK_QUANTITY') {
      const minQty = Number(minQuantity || 3);
      const discPct = Number(discountPercent || 10);
      if (!inputEndDate) endDate.setDate(startDate.getDate() + 30);

      let prodNames = '';
      let validProductIds = productIds;
      if (productIds.length > 0) {
        const prods = await this.prisma.product.findMany({
          where: { id: { in: productIds.map((p: any) => BigInt(p)) } },
          select: { name: true },
        });
        prodNames = prods.map((p) => p.name).slice(0, 2).join(', ');
        if (prods.length > 2) prodNames += ` (+${prods.length - 2} sản phẩm)`;
      } else {
        const defaultProds = await this.prisma.product.findMany({
          where: { status: true },
          take: 3,
          select: { id: true, name: true },
        });
        validProductIds = defaultProds.map((p) => p.id.toString());
        prodNames = defaultProds.map((p) => p.name).join(', ');
      }

      const name = `Mua từ ${minQty} sản phẩm - Giảm ${discPct}% ${prodNames ? `(${prodNames})` : ''}`.slice(0, 190);
      const description = `Ưu đãi mua số lượng lớn: Giảm ngay ${discPct}% khi mua từ ${minQty} sản phẩm trở lên.`;

      return this.createPromotion(distributorId, {
        name,
        description,
        promotionType: 'PERCENTAGE',
        startDate,
        endDate,
        status: true,
        minQuantity: minQty,
        discountPercent: discPct,
        productIds: validProductIds,
      });
    } else if (autoType === 'CLEARANCE_STOCK') {
      const discPct = Number(discountPercent || 15);
      if (!inputEndDate) endDate.setDate(startDate.getDate() + 14);

      let targetProductIds = productIds;
      let prodNames = '';
      if (!targetProductIds || targetProductIds.length === 0) {
        const candidates = await this.getClearanceCandidates(distributorId);
        targetProductIds = candidates.slice(0, 3).map((c: any) => c.product.id);
        prodNames = candidates.slice(0, 3).map((c: any) => c.product.name).join(', ');
      } else {
        const prods = await this.prisma.product.findMany({
          where: { id: { in: targetProductIds.map((p: any) => BigInt(p)) } },
          select: { name: true },
        });
        prodNames = prods.map((p) => p.name).slice(0, 2).join(', ');
      }

      const name = `Xả kho trợ giá - Giảm ${discPct}% ${prodNames ? `(${prodNames})` : ''}`.slice(0, 190);
      const description = `Chương trình xả hàng tồn kho cao: Giảm ngay ${discPct}% cho các mặt hàng tồn kho dồi dào.`;

      return this.createPromotion(distributorId, {
        name,
        description,
        promotionType: 'PERCENTAGE',
        startDate,
        endDate,
        status: true,
        minQuantity: 1,
        discountPercent: discPct,
        productIds: targetProductIds,
      });
    } else if (autoType === 'INVOICE_TOTAL') {
      const minAmount = Number(minOrderAmount || 500000);
      const discPct = Number(discountPercent || 5);
      if (!inputEndDate) endDate.setDate(startDate.getDate() + 30);

      const name = `Đơn từ ${formatVnd(minAmount)} đ - Giảm ${discPct}% toàn đơn`.slice(0, 190);
      const description = `Chiết khấu ${discPct}% trực tiếp trên tổng giá trị hóa đơn khi đơn hàng đạt tối thiểu ${formatVnd(minAmount)} đ.`;

      return this.createPromotion(distributorId, {
        name,
        description,
        promotionType: 'INVOICE_DISCOUNT',
        startDate,
        endDate,
        status: true,
        minOrderAmount: minAmount,
        discountPercent: discPct,
      });
    } else if (autoType === 'BUY_N_GET_M') {
      const bQty = Number(buyQuantity || 3);
      const fQty = Number(freeQuantity || 1);
      if (!inputEndDate) endDate.setDate(startDate.getDate() + 30);

      let bProdId = buyProductId;
      let fProdId = freeProductId || buyProductId;

      if (!bProdId) {
        const firstProd = await this.prisma.product.findFirst({ where: { status: true } });
        if (firstProd) {
          bProdId = firstProd.id.toString();
          fProdId = firstProd.id.toString();
        }
      }

      const prods = await this.prisma.product.findMany({
        where: { id: { in: [BigInt(bProdId), BigInt(fProdId)] } },
      });
      const bProd = prods.find((p) => p.id.toString() === bProdId.toString());
      const fProd = prods.find((p) => p.id.toString() === fProdId.toString());

      const name = `Mua ${bQty} tặng ${fQty} ${bProd ? bProd.name : ''}`.slice(0, 190);
      const description = `Mua ${bQty} sản phẩm ${bProd?.name || ''} tặng ngay ${fQty} ${fProd?.name || ''}.`;

      return this.createPromotion(distributorId, {
        name,
        description,
        promotionType: 'BUY_N_GET_M',
        startDate,
        endDate,
        status: true,
        buyQuantity: bQty,
        freeQuantity: fQty,
        buyNGetMItems: [{ buyProductId: bProdId, freeProductId: fProdId }],
      });
    } else {
      throw new BadRequestException({ error: 'Loại khuyến mãi tự động không hợp lệ: ' + autoType });
    }
  }

  async updatePromotion(id: string, distributorId: any = 1, data: any) {
    this.validatePromotionPayload(data, false);
    const existing = await this.prisma.promotion.findFirst({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
      include: PROMOTION_INCLUDE,
    });

    if (!existing) {
      throw new NotFoundException({ error: 'Không tìm thấy chương trình khuyến mãi' });
    }

    const {
      name,
      description,
      startDate,
      endDate,
      status,
      discountPercent,
      minQuantity,
      maxQuantityPerOrder,
      productIds,
      comboPrice,
      comboItems,
      buyQuantity,
      freeQuantity,
      buyNGetMItems,
      minOrderAmount,
      discountAmount,
    } = data;

    return this.prisma.$transaction(async (tx: any) => {
      await tx.promotion.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { name: String(name).trim() }),
          ...(description !== undefined && { description: description ? String(description).trim() : null }),
          ...(startDate !== undefined && { startDate: getDateOnlyUtc(startDate) }),
          ...(endDate !== undefined && { endDate: getDateOnlyUtc(endDate) }),
          ...(status !== undefined && { status: Boolean(status) }),
        },
      });

      if (existing.promotionType === 'PERCENTAGE' && (discountPercent !== undefined || productIds !== undefined || minQuantity !== undefined)) {
        const uniquePids: string[] | null = productIds
          ? Array.from(new Set<string>(productIds.map((p: any) => String(p))))
          : null;
        await tx.promotionPercentageDiscount.update({
          where: { promotionId: existing.id },
          data: {
            ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
            ...(minQuantity !== undefined && { minQuantity: Math.max(1, Number(minQuantity)) }),
            ...(maxQuantityPerOrder !== undefined && {
              maxQuantityPerOrder: maxQuantityPerOrder ? Number(maxQuantityPerOrder) : null,
            }),
          },
        });
        if (uniquePids) {
          await tx.promotionPercentageProduct.deleteMany({ where: { promotionId: existing.id } });
          if (uniquePids.length > 0) {
            await tx.promotionPercentageProduct.createMany({
              data: uniquePids.map((pid: string) => ({ promotionId: existing.id, productId: BigInt(pid) })),
            });
          }
        }
      } else if (existing.promotionType === 'COMBO' && (comboPrice !== undefined || comboItems !== undefined)) {
        await tx.promotionCombo.update({
          where: { promotionId: existing.id },
          data: {
            ...(comboPrice !== undefined && { comboPrice: Number(comboPrice) }),
          },
        });
        if (Array.isArray(comboItems)) {
          await tx.promotionComboItem.deleteMany({ where: { promotionId: existing.id } });
          if (comboItems.length > 0) {
            await tx.promotionComboItem.createMany({
              data: comboItems.map((it: any) => ({
                promotionId: existing.id,
                productId: BigInt(it.productId),
                quantity: Math.max(1, Number(it.quantity || 1)),
              })),
            });
          }
        }
      } else if (existing.promotionType === 'BUY_N_GET_M' && (buyQuantity !== undefined || freeQuantity !== undefined || buyNGetMItems !== undefined)) {
        await tx.promotionBuyNGetM.update({
          where: { promotionId: existing.id },
          data: {
            ...(buyQuantity !== undefined && { buyQuantity: Math.max(1, Number(buyQuantity)) }),
            ...(freeQuantity !== undefined && { freeQuantity: Math.max(1, Number(freeQuantity)) }),
          },
        });
        if (Array.isArray(buyNGetMItems)) {
          await tx.promotionBuyNGetMItem.deleteMany({ where: { promotionId: existing.id } });
          if (buyNGetMItems.length > 0) {
            await tx.promotionBuyNGetMItem.createMany({
              data: buyNGetMItems.map((it: any) => ({
                promotionId: existing.id,
                buyProductId: BigInt(it.buyProductId),
                freeProductId: BigInt(it.freeProductId),
              })),
            });
          }
        }
      } else if (existing.promotionType === 'INVOICE_DISCOUNT' && (minOrderAmount !== undefined || discountPercent !== undefined || discountAmount !== undefined)) {
        await tx.promotionInvoiceDiscount.update({
          where: { promotionId: existing.id },
          data: {
            ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
            ...(discountPercent !== undefined && { discountPercent: discountPercent !== null ? Number(discountPercent) : null }),
            ...(discountAmount !== undefined && { discountAmount: discountAmount !== null ? Number(discountAmount) : null }),
          },
        });
      }

      const updated = await tx.promotion.findUnique({
        where: { id: existing.id },
        include: PROMOTION_INCLUDE,
      });
      return serializeBigInt(updated);
    });
  }

  async deletePromotion(id: string, distributorId: any = 1) {
    const promo = await this.prisma.promotion.findFirst({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
    });

    if (!promo) {
      throw new NotFoundException({ error: 'Không tìm thấy chương trình khuyến mãi' });
    }

    await this.prisma.promotion.delete({
      where: { id: BigInt(id) },
    });

    return { success: true, message: 'Đã xóa chương trình khuyến mãi thành công' };
  }

  /**
   * Động cơ đánh giá thống nhất cả 4 loại khuyến mãi (PERCENTAGE, COMBO, BUY_N_GET_M, INVOICE_DISCOUNT)
   * Dùng chung cho Đơn bán hàng (SO) và Giỏ hàng / Checkout (Shop Portal).
   */
  async evaluateOrderPromotions(distributorId: any = 1, payload: any) {
    const distId = BigInt(distributorId || 1);
    const { items = [], orderDate = new Date() } = payload;
    const evalDateUtc = getDateOnlyUtc(orderDate);

    // 1. Quét tự động tắt CTKM quá hạn hoặc hết hàng quà tặng
    await this.checkAndExpirePromotions(distId);

    // 2. Lấy tất cả CTKM đang hoạt động trong khoảng ngày hợp lệ
    const activePromotions = await this.prisma.promotion.findMany({
      where: {
        distributorId: distId,
        status: true,
        startDate: { lte: evalDateUtc },
        endDate: { gte: evalDateUtc },
      },
      include: PROMOTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    // 3. Gom số lượng & thành tiền theo productId
    const cartMap = new Map<
      string,
      { productId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }
    >();

    for (const raw of items) {
      if (raw.isPromotion) continue;
      const qty = Number(raw.quantity || 0);
      if (!raw.productId || qty <= 0) continue;

      const pid = String(raw.productId);
      const unitPrice = Number(raw.unitPrice ?? raw.price ?? 0);
      const existing = cartMap.get(pid);
      if (existing) {
        existing.quantity += qty;
        existing.lineTotal += qty * unitPrice;
      } else {
        cartMap.set(pid, {
          productId: pid,
          name: raw.name || '',
          quantity: qty,
          unitPrice,
          lineTotal: qty * unitPrice,
        });
      }
    }

    const subtotal = Array.from(cartMap.values()).reduce((sum, it) => sum + it.lineTotal, 0);

    // Map theo dõi tổng giảm giá cấp sản phẩm (từ PERCENTAGE & COMBO) để không vượt quá lineTotal
    const itemDiscountMap = new Map<
      string,
      {
        productId: string;
        discountAmount: number;
        promotionId: string;
        promotionName: string;
        type: string;
      }
    >();

    const freeItems: any[] = [];
    const appliedPromotions: any[] = [];
    const upsellHints: string[] = [];
    const upsellSuggestions: any[] = [];

    const addProductDiscount = (
      productId: string,
      rawDiscount: number,
      promo: any,
      type: string,
    ): number => {
      const cartItem = cartMap.get(productId);
      if (!cartItem || rawDiscount <= 0) return 0;

      const prev = itemDiscountMap.get(productId)?.discountAmount || 0;
      const remainingCap = Math.max(0, cartItem.lineTotal - prev);
      const applied = Math.min(Math.round(rawDiscount), Math.round(remainingCap));
      if (applied <= 0) return 0;

      itemDiscountMap.set(productId, {
        productId,
        discountAmount: prev + applied,
        promotionId: promo.id.toString(),
        promotionName: promo.name,
        type,
      });
      return applied;
    };

    // 4. Bước 1: PERCENTAGE (Giảm % theo sản phẩm)
    const percentagePromos = activePromotions.filter(
      (p) => p.promotionType === 'PERCENTAGE' && p.percentageDiscount,
    );
    for (const promo of percentagePromos) {
      const cfg = promo.percentageDiscount!;
      const minQty = Number(cfg.minQuantity || 1);
      const maxQty = cfg.maxQuantityPerOrder ? Number(cfg.maxQuantityPerOrder) : null;
      const discPct = Number(cfg.discountPercent || 0);

      for (const rule of cfg.products || []) {
        const pid = rule.productId.toString();
        const cartItem = cartMap.get(pid);
        if (!cartItem) continue;

        const pName = cartItem.name || rule.product?.name || '';

        if (cartItem.quantity >= minQty) {
          const eligibleQty = maxQty ? Math.min(cartItem.quantity, maxQty) : cartItem.quantity;
          const rawDiscount = eligibleQty * cartItem.unitPrice * (discPct / 100);
          const appliedAmt = addProductDiscount(pid, rawDiscount, promo, 'PERCENTAGE');

          if (appliedAmt > 0) {
            const msg = `Giảm ${discPct}% cho ${pName} (-${formatVnd(appliedAmt)} đ)`;
            appliedPromotions.push({
              id: promo.id.toString(),
              promotionId: promo.id.toString(),
              name: promo.name,
              type: 'PERCENTAGE',
              productId: pid,
              productName: pName,
              discountPercent: discPct,
              discountAmount: appliedAmt,
              description: msg,
              message: msg,
            });
          }
        } else {
          const needed = minQty - cartItem.quantity;
          const msg = `Mua thêm ${needed} ${pName} để được giảm ${discPct}%!`;
          upsellHints.push(msg);
          upsellSuggestions.push({
            promotionId: promo.id.toString(),
            type: 'PERCENTAGE',
            productId: pid,
            productName: pName,
            currentQuantity: cartItem.quantity,
            targetQuantity: minQty,
            neededQuantity: needed,
            discountPercent: discPct,
            potentialSaving: Math.round(minQty * cartItem.unitPrice * (discPct / 100)),
            message: msg,
          });
        }
      }
    }

    // 5. Bước 2: COMBO (Gói Combo giá cố định)
    const comboPromos = activePromotions.filter((p) => p.promotionType === 'COMBO' && p.combo);
    for (const promo of comboPromos) {
      const cfg = promo.combo!;
      const comboItems = cfg.items || [];
      if (comboItems.length === 0) continue;

      let sets = Infinity;
      let presentCount = 0;
      const missingParts: string[] = [];

      for (const ci of comboItems) {
        const pid = ci.productId.toString();
        const reqQty = Math.max(1, Number(ci.quantity || 1));
        const inCart = cartMap.get(pid);
        const currQty = inCart ? inCart.quantity : 0;
        if (currQty > 0) presentCount += 1;
        sets = Math.min(sets, Math.floor(currQty / reqQty));
        if (currQty < reqQty) {
          missingParts.push(`${reqQty - currQty} ${ci.product?.name || 'SP'}`);
        }
      }

      if (sets >= 1 && Number.isFinite(sets)) {
        const originalComboSum = comboItems.reduce((sum, ci) => {
          const inCart = cartMap.get(ci.productId.toString());
          return sum + Number(ci.quantity || 1) * (inCart?.unitPrice || 0) * sets;
        }, 0);
        const totalComboCharge = Number(cfg.comboPrice || 0) * sets;
        const rawComboSaving = Math.max(0, Math.round(originalComboSum - totalComboCharge));

        if (rawComboSaving > 0 && originalComboSum > 0) {
          let totalComboApplied = 0;
          let distributed = 0;

          comboItems.forEach((ci, idx) => {
            const pid = ci.productId.toString();
            const inCart = cartMap.get(pid)!;
            const partVal = Number(ci.quantity || 1) * inCart.unitPrice * sets;
            const share =
              idx === comboItems.length - 1
                ? Math.max(0, rawComboSaving - distributed)
                : Math.round((partVal / originalComboSum) * rawComboSaving);
            distributed += share;
            totalComboApplied += addProductDiscount(pid, share, promo, 'COMBO');
          });

          if (totalComboApplied > 0) {
            const msg = `Áp dụng ${sets} bộ ${promo.name} (Tiết kiệm ${formatVnd(totalComboApplied)} đ)`;
            appliedPromotions.push({
              id: promo.id.toString(),
              promotionId: promo.id.toString(),
              name: promo.name,
              type: 'COMBO',
              discountAmount: totalComboApplied,
              description: msg,
              message: msg,
            });
          }
        }
      } else if (presentCount > 0 && missingParts.length > 0) {
        const msg = `Thêm ${missingParts.join(', ')} để đủ gói ${promo.name} giá chỉ ${formatVnd(Number(cfg.comboPrice))} đ!`;
        upsellHints.push(msg);
        upsellSuggestions.push({
          promotionId: promo.id.toString(),
          type: 'COMBO',
          message: msg,
        });
      }
    }

    // 6. Bước 3: BUY_N_GET_M (Mua N tặng M - kiểm tra tồn kho quà tặng)
    const buyNGetMPromos = activePromotions.filter(
      (p) => p.promotionType === 'BUY_N_GET_M' && p.buyNGetM,
    );
    const giftProductIds = Array.from(
      new Set(buyNGetMPromos.flatMap((p) => (p.buyNGetM?.items || []).map((r) => r.freeProductId))),
    );
    const giftStockMap = await this.getAvailableStockMap(distId, giftProductIds);

    for (const promo of buyNGetMPromos) {
      const config = promo.buyNGetM!;
      const buyQtyTarget = Math.max(1, Number(config.buyQuantity || 1));
      const freeQtyPerSlot = Math.max(1, Number(config.freeQuantity || 1));

      for (const rule of config.items || []) {
        const buyPid = rule.buyProductId.toString();
        const freePid = rule.freeProductId.toString();
        const matchingCartItem = cartMap.get(buyPid);
        const currentQty = matchingCartItem ? matchingCartItem.quantity : 0;

        if (currentQty >= buyQtyTarget) {
          const slots = Math.floor(currentQty / buyQtyTarget);
          const wantedFreeQty = slots * freeQtyPerSlot;
          const availableGiftStock = Math.floor(giftStockMap.get(freePid) || 0);
          const grantedFreeQty = Math.min(wantedFreeQty, availableGiftStock);

          if (grantedFreeQty > 0) {
            giftStockMap.set(freePid, Math.max(0, availableGiftStock - grantedFreeQty));
            freeItems.push({
              productId: rule.freeProduct.id.toString(),
              productSku: rule.freeProduct.sku,
              productName: rule.freeProduct.name,
              unit: rule.freeProduct.unit || 'Thùng',
              quantity: grantedFreeQty,
              unitPrice: 0,
              isPromotion: true,
              appliedPromotionId: promo.id.toString(),
              promotionName: promo.name,
            });

            const msg = `Tặng kèm ${grantedFreeQty} ${rule.freeProduct.unit || 'SP'} ${rule.freeProduct.name} (0 đ)`;
            appliedPromotions.push({
              id: promo.id.toString(),
              promotionId: promo.id.toString(),
              name: promo.name,
              type: 'BUY_N_GET_M',
              buyProductId: buyPid,
              freeProductId: freePid,
              freeProductName: rule.freeProduct.name,
              freeQuantity: grantedFreeQty,
              description: `Mua ${buyQtyTarget} tặng ${freeQtyPerSlot} (Đạt ${slots} suất)`,
              message: msg,
            });
          }
        } else if (currentQty > 0 && currentQty < buyQtyTarget) {
          const needed = buyQtyTarget - currentQty;
          const bName = matchingCartItem?.name || rule.buyProduct?.name || '';
          const fName = rule.freeProduct?.name || '';
          const msg = `Mua thêm ${needed} ${bName} để nhận ngay ${freeQtyPerSlot} ${fName} miễn phí!`;
          upsellHints.push(msg);
          upsellSuggestions.push({
            promotionId: promo.id.toString(),
            type: 'BUY_N_GET_M',
            productId: buyPid,
            productName: bName,
            currentQuantity: currentQty,
            targetQuantity: buyQtyTarget,
            neededQuantity: needed,
            freeProductId: freePid,
            freeProductName: fName,
            freeQuantity: freeQtyPerSlot,
            message: msg,
          });
        }
      }
    }

    // Tổng tiền hàng sau khi đã trừ giảm giá cấp SKU (PERCENTAGE + COMBO)
    const itemDiscounts = Array.from(itemDiscountMap.values());
    const totalItemDiscountAmount = itemDiscounts.reduce((sum, d) => sum + d.discountAmount, 0);
    const subtotalAfterItemDiscounts = Math.max(0, subtotal - totalItemDiscountAmount);

    // 7. Bước 4: INVOICE_DISCOUNT (Chọn 1 bậc chiết khấu lợi nhất trên phần tiền sau giảm SP)
    const invoiceDiscountPromos = activePromotions.filter(
      (p) => p.promotionType === 'INVOICE_DISCOUNT' && p.invoiceDiscount,
    );

    const eligibleTiers = invoiceDiscountPromos.filter(
      (p) => subtotalAfterItemDiscounts >= Number(p.invoiceDiscount!.minOrderAmount),
    );

    let bestTier: any = null;
    let highestDiscountAmount = 0;

    for (const promo of eligibleTiers) {
      const config = promo.invoiceDiscount!;
      let calcDiscount = 0;
      if (config.discountPercent && Number(config.discountPercent) > 0) {
        calcDiscount = subtotalAfterItemDiscounts * (Number(config.discountPercent) / 100);
      } else if (config.discountAmount && Number(config.discountAmount) > 0) {
        calcDiscount = Number(config.discountAmount);
      }
      calcDiscount = Math.min(Math.round(calcDiscount), Math.round(subtotalAfterItemDiscounts));

      if (calcDiscount > highestDiscountAmount) {
        highestDiscountAmount = calcDiscount;
        bestTier = {
          promotionId: promo.id.toString(),
          promotionName: promo.name,
          minOrderAmount: Number(config.minOrderAmount),
          discountPercent: config.discountPercent ? Number(config.discountPercent) : null,
          discountAmount: calcDiscount,
        };
      }
    }

    if (bestTier) {
      const benefitText = bestTier.discountPercent
        ? `${bestTier.discountPercent}%`
        : `${formatVnd(bestTier.discountAmount)} đ`;
      const msg = `Giảm ${benefitText} cho đơn từ ${formatVnd(bestTier.minOrderAmount)} đ (-${formatVnd(bestTier.discountAmount)} đ)`;
      appliedPromotions.push({
        id: bestTier.promotionId,
        promotionId: bestTier.promotionId,
        name: bestTier.promotionName,
        type: 'INVOICE_DISCOUNT',
        discountPercent: bestTier.discountPercent,
        discountAmount: bestTier.discountAmount,
        description: msg,
        message: msg,
      });
    }

    const upcomingTiers = invoiceDiscountPromos
      .filter((p) => Number(p.invoiceDiscount!.minOrderAmount) > subtotalAfterItemDiscounts)
      .sort(
        (a, b) =>
          Number(a.invoiceDiscount!.minOrderAmount) - Number(b.invoiceDiscount!.minOrderAmount),
      );

    if (upcomingTiers.length > 0 && subtotalAfterItemDiscounts > 0) {
      const nextTier = upcomingTiers[0];
      const targetAmt = Number(nextTier.invoiceDiscount!.minOrderAmount);
      const diff = targetAmt - subtotalAfterItemDiscounts;
      const nextPct = nextTier.invoiceDiscount!.discountPercent
        ? Number(nextTier.invoiceDiscount!.discountPercent)
        : null;
      const nextAmt = nextTier.invoiceDiscount!.discountAmount
        ? Number(nextTier.invoiceDiscount!.discountAmount)
        : null;
      const benefit = nextPct ? `${nextPct}%` : `${formatVnd(nextAmt || 0)} đ`;
      const msg = `Mua thêm ${formatVnd(diff)} đ để được chiết khấu ${benefit} cho toàn đơn (${nextTier.name})!`;

      upsellHints.push(msg);
      upsellSuggestions.push({
        promotionId: nextTier.id.toString(),
        type: 'INVOICE_DISCOUNT',
        currentAmount: subtotalAfterItemDiscounts,
        targetAmount: targetAmt,
        neededAmount: diff,
        discountPercent: nextPct,
        message: msg,
      });
    }

    const totalInvoiceDiscountAmount = bestTier ? bestTier.discountAmount : 0;
    const totalDiscountAmount = Math.min(subtotal, totalItemDiscountAmount + totalInvoiceDiscountAmount);
    const finalAmount = Math.max(0, subtotal - totalDiscountAmount);

    return serializeBigInt({
      subtotal,
      subtotalAfterItemDiscounts,
      itemDiscounts,
      totalItemDiscountAmount,
      freeItems,
      invoiceDiscount: bestTier,
      totalInvoiceDiscountAmount,
      appliedPromotions,
      upsellHints,
      upsellSuggestions,
      totalDiscountAmount,
      totalDiscount: totalDiscountAmount,
      finalAmount,
      finalTotal: finalAmount,
    });
  }

  /**
   * Wrapper cho Giỏ hàng Portal (dùng chung 1 Engine với evaluateOrderPromotions)
   */
  async evaluateCartPromotions(distributorId: any = 1, cartData: any) {
    const { items = [] } = cartData || {};
    return this.evaluateOrderPromotions(distributorId, {
      items: items.map((it: any) => ({
        productId: it.productId,
        name: it.name,
        quantity: Number(it.quantity || 0),
        unitPrice: Number(it.unitPrice ?? it.price ?? 0),
      })),
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
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

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
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

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  async getPromotions(distributorId: any = 1, filters: any = {}) {
    const where: any = {
      distributorId: BigInt(distributorId),
    };

    if (filters.status !== undefined) {
      where.status = filters.status === 'true' || filters.status === true;
    }

    if (filters.search && filters.search.trim()) {
      where.name = { contains: filters.search.trim() };
    }

    if (filters.promotionType) {
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
      throw new NotFoundException('Không tìm thấy chương trình khuyến mãi');
    }

    return serializeBigInt(promo);
  }

  async createPromotion(distributorId: any = 1, data: any) {
    const {
      name,
      description,
      promotionType = 'PERCENTAGE',
      startDate,
      endDate,
      status = true,
      discountPercent,
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

    const createData: any = {
      distributorId: BigInt(distributorId),
      name,
      description: description || null,
      promotionType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
    };

    if (promotionType === 'PERCENTAGE' || (!data.promotionType && discountPercent !== undefined)) {
      createData.promotionType = 'PERCENTAGE';
      createData.percentageDiscount = {
        create: {
          discountPercent: discountPercent ?? 0,
          maxQuantityPerOrder: maxQuantityPerOrder ?? null,
          products: {
            create: productIds.map((pid: string | number | bigint) => ({
              productId: BigInt(pid),
            })),
          },
        },
      };
    } else if (promotionType === 'COMBO') {
      createData.combo = {
        create: {
          comboPrice: comboPrice ?? 0,
          items: {
            create: comboItems.map((item: any) => ({
              productId: BigInt(item.productId),
              quantity: item.quantity ?? 1,
            })),
          },
        },
      };
    } else if (promotionType === 'BUY_N_GET_M') {
      createData.buyNGetM = {
        create: {
          buyQuantity: Number(buyQuantity ?? 1),
          freeQuantity: Number(freeQuantity ?? 1),
          items: {
            create: buyNGetMItems.map((item: any) => ({
              buyProductId: BigInt(item.buyProductId),
              freeProductId: BigInt(item.freeProductId),
            })),
          },
        },
      };
    } else if (promotionType === 'INVOICE_DISCOUNT') {
      createData.invoiceDiscount = {
        create: {
          minOrderAmount: minOrderAmount ?? 0,
          discountPercent: discountPercent ?? null,
          discountAmount: discountAmount ?? null,
        },
      };
    }

    const promotion = await this.prisma.promotion.create({
      data: createData,
      include: PROMOTION_INCLUDE,
    });

    return serializeBigInt(promotion);
  }

  async updatePromotion(id: string, distributorId: any = 1, data: any) {
    const { name, description, startDate, endDate, status } = data;

    await this.prisma.promotion.updateMany({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status !== undefined && { status }),
      },
    });

    return this.getPromotionById(id, distributorId);
  }

  async deletePromotion(id: string, distributorId: any = 1) {
    await this.prisma.promotion.deleteMany({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
    });
    return { success: true, message: 'Đã xóa chương trình khuyến mãi thành công' };
  }

  /**
   * Động cơ đánh giá và tự động tính khuyến mãi cho đơn hàng (Promotion Engine)
   */
  async evaluateOrderPromotions(distributorId: any = 1, payload: any) {
    const { items = [], orderDate = new Date() } = payload;
    const now = new Date(orderDate);

    // 1. Lấy tất cả promotions đang hoạt động và còn hạn
    const activePromotions = await this.prisma.promotion.findMany({
      where: {
        distributorId: BigInt(distributorId),
        status: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: PROMOTION_INCLUDE,
    });

    // 2. Tính subtotal ban đầu của các mặt hàng mua (bỏ qua hàng tặng)
    const paidItems = items.filter((it: any) => !it.isPromotion && Number(it.quantity) > 0);
    const subtotal = paidItems.reduce((sum: number, it: any) => {
      return sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    }, 0);

    const freeItems: any[] = [];
    const appliedPromotions: any[] = [];
    const upsellHints: string[] = [];

    // 3. Xử lý BUY_N_GET_M (Mua N tặng M)
    const buyNGetMPromos = activePromotions.filter(
      (p) => p.promotionType === 'BUY_N_GET_M' && p.buyNGetM,
    );
    for (const promo of buyNGetMPromos) {
      const config = promo.buyNGetM!;
      const buyQtyTarget = config.buyQuantity;
      const freeQtyPerSlot = config.freeQuantity;

      for (const rule of config.items) {
        const matchingCartItem = paidItems.find(
          (it) => String(it.productId) === String(rule.buyProductId),
        );
        const currentQty = matchingCartItem ? Number(matchingCartItem.quantity) : 0;

        if (currentQty >= buyQtyTarget && buyQtyTarget > 0) {
          const slots = Math.floor(currentQty / buyQtyTarget);
          const totalFreeQty = slots * freeQtyPerSlot;

          freeItems.push({
            productId: rule.freeProduct.id.toString(),
            productSku: rule.freeProduct.sku,
            productName: rule.freeProduct.name,
            unit: rule.freeProduct.unit || 'Thùng',
            quantity: totalFreeQty,
            unitPrice: 0,
            isPromotion: true,
            appliedPromotionId: promo.id.toString(),
            promotionName: promo.name,
          });

          appliedPromotions.push({
            id: promo.id.toString(),
            name: promo.name,
            type: 'BUY_N_GET_M',
            description: `Mua ${buyQtyTarget} tặng ${freeQtyPerSlot} (Đạt ${slots} suất)`,
          });
        } else if (currentQty > 0 && currentQty < buyQtyTarget) {
          const needed = buyQtyTarget - currentQty;
          upsellHints.push(
            `Mua thêm ${needed} ${rule.buyProduct.name} để nhận ngay ${freeQtyPerSlot} ${rule.freeProduct.name} miễn phí (${promo.name})`,
          );
        }
      }
    }

    // 4. Xử lý INVOICE_DISCOUNT (Chiết khấu bậc thang theo tổng đơn)
    const invoiceDiscountPromos = activePromotions.filter(
      (p) => p.promotionType === 'INVOICE_DISCOUNT' && p.invoiceDiscount,
    );

    // Tìm các mốc đạt được
    const eligibleTiers = invoiceDiscountPromos.filter((p) => {
      const minAmt = Number(p.invoiceDiscount!.minOrderAmount);
      return subtotal >= minAmt;
    });

    // Sắp xếp tìm bậc chiết khấu có lợi nhất
    let bestTier: any = null;
    let highestDiscountAmount = 0;

    for (const promo of eligibleTiers) {
      const config = promo.invoiceDiscount!;
      let calcDiscount = 0;
      if (config.discountPercent) {
        calcDiscount = subtotal * (Number(config.discountPercent) / 100);
      } else if (config.discountAmount) {
        calcDiscount = Number(config.discountAmount);
      }

      if (calcDiscount > highestDiscountAmount) {
        highestDiscountAmount = calcDiscount;
        bestTier = {
          promotionId: promo.id.toString(),
          promotionName: promo.name,
          minOrderAmount: Number(config.minOrderAmount),
          discountPercent: config.discountPercent ? Number(config.discountPercent) : null,
          discountAmount: Math.round(calcDiscount),
        };
      }
    }

    if (bestTier) {
      appliedPromotions.push({
        id: bestTier.promotionId,
        name: bestTier.promotionName,
        type: 'INVOICE_DISCOUNT',
        description: `Chiết khấu tổng đơn: ${bestTier.discountPercent ? `${bestTier.discountPercent}%` : `${new Intl.NumberFormat('vi-VN').format(bestTier.discountAmount)} đ`}`,
      });
    }

    // Tìm bậc tiếp theo để gợi ý Upsell
    const upcomingTiers = invoiceDiscountPromos
      .filter((p) => Number(p.invoiceDiscount!.minOrderAmount) > subtotal)
      .sort(
        (a, b) =>
          Number(a.invoiceDiscount!.minOrderAmount) - Number(b.invoiceDiscount!.minOrderAmount),
      );

    if (upcomingTiers.length > 0) {
      const nextTier = upcomingTiers[0];
      const diff = Number(nextTier.invoiceDiscount!.minOrderAmount) - subtotal;
      const benefit = nextTier.invoiceDiscount!.discountPercent
        ? `${nextTier.invoiceDiscount!.discountPercent}%`
        : `${new Intl.NumberFormat('vi-VN').format(Number(nextTier.invoiceDiscount!.discountAmount))} đ`;
      upsellHints.push(
        `Mua thêm ${new Intl.NumberFormat('vi-VN').format(diff)} đ để được chiết khấu ${benefit} cho toàn đơn (${nextTier.name})!`,
      );
    }

    const totalDiscountAmount = bestTier ? bestTier.discountAmount : 0;
    const finalAmount = Math.max(0, subtotal - totalDiscountAmount);

    return {
      subtotal,
      freeItems,
      invoiceDiscount: bestTier,
      appliedPromotions,
      upsellHints,
      totalDiscountAmount,
      finalAmount,
    };
  }
}


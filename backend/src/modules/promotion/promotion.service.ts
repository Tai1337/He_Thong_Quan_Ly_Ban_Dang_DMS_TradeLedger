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
}


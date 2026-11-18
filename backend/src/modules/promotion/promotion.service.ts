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

  /**
   * Quét và tự động chuyển status = false cho:
   * 1. Khuyến mãi có endDate < hiện tại.
   * 2. Khuyến mãi BUY_N_GET_M nếu sản phẩm quà tặng (freeProduct) đã hết tồn kho khả dụng (<= 0).
   */
  async checkAndExpirePromotions(distributorId: any = 1) {
    const now = new Date();

    // 1. Tắt khuyến mãi quá hạn ngày kết thúc
    await this.prisma.promotion.updateMany({
      where: {
        distributorId: BigInt(distributorId),
        status: true,
        endDate: { lt: now },
      },
      data: { status: false },
    });

    // 2. Tắt khuyến mãi tặng quà nếu hàng quà tặng hết tồn
    const buyNGetMPromos = await this.prisma.promotion.findMany({
      where: {
        distributorId: BigInt(distributorId),
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

    for (const promo of buyNGetMPromos) {
      if (!promo.buyNGetM?.items?.length) continue;
      let giftOutOfStock = false;

      for (const item of promo.buyNGetM.items) {
        const freeProductId = item.freeProductId;
        const lots = await this.prisma.stockLot.findMany({
          where: {
            productId: freeProductId,
            warehouse: { distributorId: BigInt(distributorId) },
            status: 'GOOD',
          },
          include: { stockBalance: true },
        });

        const totalAvailable = lots.reduce((sum, lot) => {
          const onHand = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
          const reserved = lot.stockBalance ? Number(lot.stockBalance.quantityReserved) : 0;
          return sum + Math.max(0, onHand - reserved);
        }, 0);

        if (totalAvailable <= 0) {
          giftOutOfStock = true;
          break;
        }
      }

      if (giftOutOfStock) {
        await this.prisma.promotion.update({
          where: { id: promo.id },
          data: { status: false },
        });
      }
    }
  }

  async getPromotions(distributorId: any = 1, filters: any = {}) {
    // Luôn chạy check hạn & quà trước khi lấy danh sách
    await this.checkAndExpirePromotions(distributorId);

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

  async createPromotion(distributorId: any = 1, data: any) {
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
          minQuantity: minQuantity ?? 1,
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

  async autoGeneratePromotion(distributorId: any = 1, dto: any) {
    const {
      autoType, // 'BULK_QUANTITY' | 'CLEARANCE_STOCK' | 'INVOICE_TOTAL' | 'BUY_N_GET_M'
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
    const endDate = inputEndDate ? new Date(inputEndDate) : new Date();

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

      const name = `Mua từ ${minQty} món - Giảm ${discPct}% ${prodNames ? `(${prodNames})` : ''}`.slice(0, 190);
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
      const description = `Chương trình xả hàng tồn kho trợ giá tốt nhất. Giảm ngay ${discPct}% cho các mặt hàng tồn kho dồi dào.`;

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

      const name = `Đơn từ ${minAmount.toLocaleString('vi-VN')} ₫ - Giảm ${discPct}% toàn đơn`.slice(0, 190);
      const description = `Chiết khấu ${discPct}% trực tiếp trên tổng giá trị hóa đơn khi đơn hàng đạt tối thiểu ${minAmount.toLocaleString('vi-VN')} ₫.`;

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
        const firstProd = await this.prisma.product.findFirst({
          where: { status: true },
        });
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
        buyNGetMItems: [
          {
            buyProductId: bProdId,
            freeProductId: fProdId,
          },
        ],
      });
    } else {
      throw new Error('Loại khuyến mãi tự động không hợp lệ: ' + autoType);
    }
  }

  async evaluateCartPromotions(distributorId: any = 1, cartData: any) {
    const { items = [], subtotal = 0 } = cartData;

    // 1. Quét và tắt các khuyến mãi hết hạn hoặc hết quà
    await this.checkAndExpirePromotions(distributorId);

    // 2. Lấy các promotion hợp lệ
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        distributorId: BigInt(distributorId),
        status: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: PROMOTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const appliedPromotions: any[] = [];
    const upsellSuggestions: any[] = [];
    let totalDiscount = 0;

    const cartMap = new Map<string, { quantity: number; price: number; name: string }>();
    for (const item of items) {
      cartMap.set(item.productId.toString(), {
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        name: item.name || '',
      });
    }

    for (const promo of promotions) {
      if (promo.promotionType === 'PERCENTAGE' && promo.percentageDiscount) {
        const minQty = Number(promo.percentageDiscount.minQuantity || 1);
        const discPct = Number(promo.percentageDiscount.discountPercent || 0);
        const promoProducts = promo.percentageDiscount.products || [];

        for (const p of promoProducts) {
          const pId = p.productId.toString();
          const pName = p.product?.name || '';
          const cartItem = cartMap.get(pId);

          if (cartItem) {
            if (cartItem.quantity >= minQty) {
              const discountAmt = Math.round(cartItem.quantity * cartItem.price * (discPct / 100));
              appliedPromotions.push({
                promotionId: promo.id.toString(),
                type: 'PERCENTAGE',
                name: promo.name,
                productId: pId,
                productName: cartItem.name || pName,
                discountPercent: discPct,
                discountAmount: discountAmt,
                message: `Giảm ${discPct}% cho ${cartItem.name || pName} (-${discountAmt.toLocaleString('vi-VN')} ₫)`,
              });
              totalDiscount += discountAmt;
            } else {
              const needed = minQty - cartItem.quantity;
              upsellSuggestions.push({
                promotionId: promo.id.toString(),
                type: 'PERCENTAGE',
                productId: pId,
                productName: cartItem.name || pName,
                currentQuantity: cartItem.quantity,
                targetQuantity: minQty,
                neededQuantity: needed,
                discountPercent: discPct,
                potentialSaving: Math.round(minQty * cartItem.price * (discPct / 100)),
                message: `Mua thêm ${needed} ${cartItem.name || pName} để được giảm ${discPct}%!`,
              });
            }
          }
        }
      } else if (promo.promotionType === 'BUY_N_GET_M' && promo.buyNGetM) {
        const buyQty = Number(promo.buyNGetM.buyQuantity || 1);
        const freeQty = Number(promo.buyNGetM.freeQuantity || 1);
        const pairs = promo.buyNGetM.items || [];

        for (const pair of pairs) {
          const bId = pair.buyProductId.toString();
          const fId = pair.freeProductId.toString();
          const bName = pair.buyProduct?.name || '';
          const fName = pair.freeProduct?.name || '';
          const cartItem = cartMap.get(bId);

          if (cartItem) {
            if (cartItem.quantity >= buyQty) {
              const sets = Math.floor(cartItem.quantity / buyQty);
              const totalFree = sets * freeQty;
              appliedPromotions.push({
                promotionId: promo.id.toString(),
                type: 'BUY_N_GET_M',
                name: promo.name,
                buyProductId: bId,
                freeProductId: fId,
                freeProductName: fName,
                freeQuantity: totalFree,
                message: `🎁 Tặng kèm ${totalFree} x ${fName} (0 ₫)`,
              });
            } else {
              const needed = buyQty - cartItem.quantity;
              upsellSuggestions.push({
                promotionId: promo.id.toString(),
                type: 'BUY_N_GET_M',
                productId: bId,
                productName: cartItem.name || bName,
                currentQuantity: cartItem.quantity,
                targetQuantity: buyQty,
                neededQuantity: needed,
                freeProductId: fId,
                freeProductName: fName,
                freeQuantity: freeQty,
                message: `Mua thêm ${needed} ${cartItem.name || bName} để được tặng ${freeQty} ${fName}!`,
              });
            }
          }
        }
      } else if (promo.promotionType === 'INVOICE_DISCOUNT' && promo.invoiceDiscount) {
        const minAmount = Number(promo.invoiceDiscount.minOrderAmount || 0);
        const discPct = Number(promo.invoiceDiscount.discountPercent || 0);
        const discAmt = Number(promo.invoiceDiscount.discountAmount || 0);

        if (subtotal >= minAmount) {
          const discountVal = discAmt > 0 ? discAmt : Math.round(subtotal * (discPct / 100));
          appliedPromotions.push({
            promotionId: promo.id.toString(),
            type: 'INVOICE_DISCOUNT',
            name: promo.name,
            discountPercent: discPct,
            discountAmount: discountVal,
            message: `Giảm ${discPct > 0 ? discPct + '%' : discountVal.toLocaleString('vi-VN') + ' ₫'} cho đơn hàng từ ${minAmount.toLocaleString('vi-VN')} ₫ (-${discountVal.toLocaleString('vi-VN')} ₫)`,
          });
          totalDiscount += discountVal;
        } else if (subtotal > 0) {
          const needed = minAmount - subtotal;
          upsellSuggestions.push({
            promotionId: promo.id.toString(),
            type: 'INVOICE_DISCOUNT',
            currentAmount: subtotal,
            targetAmount: minAmount,
            neededAmount: needed,
            discountPercent: discPct,
            message: `Mua thêm ${needed.toLocaleString('vi-VN')} ₫ để được giảm ${discPct > 0 ? discPct + '%' : discAmt.toLocaleString('vi-VN') + ' ₫'} toàn đơn!`,
          });
        }
      }
    }

    const finalTotal = Math.max(0, subtotal - totalDiscount);

    return serializeBigInt({
      appliedPromotions,
      upsellSuggestions,
      totalDiscount,
      finalTotal,
    });
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
    const promo = await this.prisma.promotion.findFirst({
      where: {
        id: BigInt(id),
        distributorId: BigInt(distributorId),
      },
    });

    if (!promo) {
      throw new NotFoundException('Không tìm thấy chương trình khuyến mãi');
    }

    await this.prisma.promotion.delete({
      where: { id: BigInt(id) },
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

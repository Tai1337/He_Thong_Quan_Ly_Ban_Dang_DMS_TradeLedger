import prisma from '../config/prisma.js';

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

function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const res = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = serializeBigInt(value);
    }
    return res;
  }
  return obj;
}

export const getPromotions = async (distributorId = 1, filters = {}) => {
  const where = {
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

  const promotions = await prisma.promotion.findMany({
    where,
    include: PROMOTION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return serializeBigInt(promotions);
};

export const getPromotionById = async (id, distributorId = 1) => {
  const promo = await prisma.promotion.findFirst({
    where: {
      id: BigInt(id),
      distributorId: BigInt(distributorId),
    },
    include: PROMOTION_INCLUDE,
  });

  if (!promo) {
    throw new Error('Không tìm thấy chương trình khuyến mãi');
  }

  return serializeBigInt(promo);
};

export const createPromotion = async (distributorId = 1, data) => {
  const {
    name,
    description,
    promotionType = 'BUY_N_GET_M',
    startDate,
    endDate,
    status = true,
    buyQuantity,
    freeQuantity,
    buyNGetMItems = [],
    minOrderAmount,
    discountPercent,
    discountAmount,
  } = data;

  const createData = {
    distributorId: BigInt(distributorId),
    name,
    description: description || null,
    promotionType,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    status,
  };

  if (promotionType === 'BUY_N_GET_M') {
    createData.buyNGetM = {
      create: {
        buyQuantity: Number(buyQuantity ?? 1),
        freeQuantity: Number(freeQuantity ?? 1),
        items: {
          create: buyNGetMItems.map((item) => ({
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

  const promotion = await prisma.promotion.create({
    data: createData,
    include: PROMOTION_INCLUDE,
  });

  return serializeBigInt(promotion);
};

export const updatePromotion = async (id, distributorId = 1, data) => {
  const { name, description, startDate, endDate, status } = data;

  await prisma.promotion.updateMany({
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

  return getPromotionById(id, distributorId);
};

export const deletePromotion = async (id, distributorId = 1) => {
  await prisma.promotion.deleteMany({
    where: {
      id: BigInt(id),
      distributorId: BigInt(distributorId),
    },
  });
  return { success: true, message: 'Đã xóa chương trình khuyến mãi thành công' };
};

export const evaluateOrderPromotions = async (distributorId = 1, payload) => {
  const { items = [], orderDate = new Date() } = payload;
  const now = new Date(orderDate);

  const activePromotions = await prisma.promotion.findMany({
    where: {
      distributorId: BigInt(distributorId),
      status: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: PROMOTION_INCLUDE,
  });

  const paidItems = items.filter((it) => !it.isPromotion && Number(it.quantity) > 0);
  const subtotal = paidItems.reduce((sum, it) => {
    return sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
  }, 0);

  const freeItems = [];
  const appliedPromotions = [];
  const upsellHints = [];

  // BUY_N_GET_M
  const buyNGetMPromos = activePromotions.filter(
    (p) => p.promotionType === 'BUY_N_GET_M' && p.buyNGetM,
  );
  for (const promo of buyNGetMPromos) {
    const config = promo.buyNGetM;
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

  // INVOICE_DISCOUNT
  const invoiceDiscountPromos = activePromotions.filter(
    (p) => p.promotionType === 'INVOICE_DISCOUNT' && p.invoiceDiscount,
  );

  const eligibleTiers = invoiceDiscountPromos.filter((p) => {
    const minAmt = Number(p.invoiceDiscount.minOrderAmount);
    return subtotal >= minAmt;
  });

  let bestTier = null;
  let highestDiscountAmount = 0;

  for (const promo of eligibleTiers) {
    const config = promo.invoiceDiscount;
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

  const upcomingTiers = invoiceDiscountPromos
    .filter((p) => Number(p.invoiceDiscount.minOrderAmount) > subtotal)
    .sort(
      (a, b) =>
        Number(a.invoiceDiscount.minOrderAmount) - Number(b.invoiceDiscount.minOrderAmount),
    );

  if (upcomingTiers.length > 0) {
    const nextTier = upcomingTiers[0];
    const diff = Number(nextTier.invoiceDiscount.minOrderAmount) - subtotal;
    const benefit = nextTier.invoiceDiscount.discountPercent
      ? `${nextTier.invoiceDiscount.discountPercent}%`
      : `${new Intl.NumberFormat('vi-VN').format(Number(nextTier.invoiceDiscount.discountAmount))} đ`;
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
};


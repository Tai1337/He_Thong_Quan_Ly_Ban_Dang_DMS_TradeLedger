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

  if (promotionType === 'PERCENTAGE' || (!data.promotionType && discountPercent !== undefined && !buyQuantity && !minOrderAmount)) {
    createData.promotionType = 'PERCENTAGE';
    createData.percentageDiscount = {
      create: {
        discountPercent: discountPercent ?? 0,
        minQuantity: data.minQuantity ?? 1,
        maxQuantityPerOrder: data.maxQuantityPerOrder ?? null,
        products: {
          create: (data.productIds || []).map((pid) => ({
            productId: BigInt(pid),
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

export const checkAndExpirePromotions = async (distributorId = 1) => {
  const now = new Date();
  await prisma.promotion.updateMany({
    where: {
      distributorId: BigInt(distributorId),
      status: true,
      endDate: { lt: now },
    },
    data: { status: false },
  });
};

export const getClearanceCandidates = async (distributorId = 1) => {
  const lots = await prisma.stockLot.findMany({
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

  const map = new Map();
  for (const lot of lots) {
    if (!lot.product) continue;
    const pId = lot.productId.toString();
    const onHand = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
    const reserved = lot.stockBalance ? Number(lot.stockBalance.quantityReserved) : 0;
    const avail = Math.max(0, onHand - reserved);

    if (!map.has(pId)) {
      map.set(pId, { product: lot.product, availableQty: 0, totalOnHand: 0 });
    }
    const entry = map.get(pId);
    entry.availableQty += avail;
    entry.totalOnHand += onHand;
  }

  const result = Array.from(map.values())
    .filter((it) => it.availableQty > 0)
    .sort((a, b) => b.availableQty - a.availableQty)
    .slice(0, 10);

  return serializeBigInt(result);
};

export const autoGeneratePromotion = async (distributorId = 1, dto) => {
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
  const endDate = inputEndDate ? new Date(inputEndDate) : new Date();

  if (autoType === 'BULK_QUANTITY') {
    const minQty = Number(minQuantity || 3);
    const discPct = Number(discountPercent || 10);
    if (!inputEndDate) endDate.setDate(startDate.getDate() + 30);

    let prodNames = '';
    let validProductIds = productIds;
    if (productIds.length > 0) {
      const prods = await prisma.product.findMany({
        where: { id: { in: productIds.map((p) => BigInt(p)) } },
        select: { name: true },
      });
      prodNames = prods.map((p) => p.name).slice(0, 2).join(', ');
      if (prods.length > 2) prodNames += ` (+${prods.length - 2} sản phẩm)`;
    } else {
      const defaultProds = await prisma.product.findMany({
        where: { status: true },
        take: 3,
        select: { id: true, name: true },
      });
      validProductIds = defaultProds.map((p) => p.id.toString());
      prodNames = defaultProds.map((p) => p.name).join(', ');
    }

    const name = `Mua từ ${minQty} món - Giảm ${discPct}% ${prodNames ? `(${prodNames})` : ''}`.slice(0, 190);
    const description = `Ưu đãi mua số lượng lớn: Giảm ngay ${discPct}% khi mua từ ${minQty} sản phẩm trở lên.`;

    return createPromotion(distributorId, {
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
      const candidates = await getClearanceCandidates(distributorId);
      targetProductIds = candidates.slice(0, 3).map((c) => c.product.id);
      prodNames = candidates.slice(0, 3).map((c) => c.product.name).join(', ');
    } else {
      const prods = await prisma.product.findMany({
        where: { id: { in: targetProductIds.map((p) => BigInt(p)) } },
        select: { name: true },
      });
      prodNames = prods.map((p) => p.name).slice(0, 2).join(', ');
    }

    const name = `Xả kho trợ giá - Giảm ${discPct}% ${prodNames ? `(${prodNames})` : ''}`.slice(0, 190);
    const description = `Chương trình xả hàng tồn kho trợ giá tốt nhất. Giảm ngay ${discPct}% cho các mặt hàng tồn kho dồi dào.`;

    return createPromotion(distributorId, {
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

    return createPromotion(distributorId, {
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
      const firstProd = await prisma.product.findFirst({
        where: { status: true },
      });
      if (firstProd) {
        bProdId = firstProd.id.toString();
        fProdId = firstProd.id.toString();
      }
    }

    const prods = await prisma.product.findMany({
      where: { id: { in: [BigInt(bProdId), BigInt(fProdId)] } },
    });
    const bProd = prods.find((p) => p.id.toString() === bProdId.toString());
    const fProd = prods.find((p) => p.id.toString() === fProdId.toString());

    const name = `Mua ${bQty} tặng ${fQty} ${bProd ? bProd.name : ''}`.slice(0, 190);
    const description = `Mua ${bQty} sản phẩm ${bProd?.name || ''} tặng ngay ${fQty} ${fProd?.name || ''}.`;

    return createPromotion(distributorId, {
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
};

export const evaluateCartPromotions = async (distributorId = 1, cartData) => {
  const { items = [], subtotal = 0 } = cartData;
  await checkAndExpirePromotions(distributorId);

  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: {
      distributorId: BigInt(distributorId),
      status: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: PROMOTION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  const appliedPromotions = [];
  const upsellSuggestions = [];
  let totalDiscount = 0;

  const cartMap = new Map();
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
    subtotal,
    totalDiscount,
    finalTotal,
    appliedPromotions,
    upsellSuggestions,
  });
};


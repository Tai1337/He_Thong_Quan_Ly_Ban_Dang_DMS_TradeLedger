import { Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';

export interface RegisterCustomerDto {
  phone: string;
  password: string;
  fullName: string;
  accountType?: 'CONSUMER' | 'STORE' | string;
  storeName?: string;
  address?: string;
  email?: string;
}

export interface PlaceShopOrderDto {
  customerId: string | number | bigint;
  items: Array<{ productId: string | number | bigint; quantity?: number; unitPrice?: number }>;
  shippingAddress?: string;
  notes?: string;
  paymentMethod?: string;
}

export interface GetShopProductsQuery {
  cursor?: string | number | bigint;
  limit?: number | string;
  categoryId?: string | number | bigint;
  search?: string;
  accountType?: string;
}

@Injectable()
export class ShopPortalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy Nhà phân phối và Kho hàng bán mặc định
   */
  async getDefaultDistributorAndWarehouse() {
    let distributor = await this.prisma.distributor.findFirst({
      where: { status: true },
    });
    if (!distributor) {
      distributor = await this.prisma.distributor.findFirst();
    }
    if (!distributor) {
      throw new Error('Chưa cấu hình Nhà phân phối trong hệ thống');
    }

    let warehouse = await this.prisma.warehouse.findFirst({
      where: { distributorId: distributor.id, status: true, type: 'SALES' },
    });
    if (!warehouse) {
      warehouse = await this.prisma.warehouse.findFirst({
        where: { distributorId: distributor.id, status: true },
      });
    }
    if (!warehouse) {
      throw new Error('Chưa cấu hình Kho hàng bán cho Nhà phân phối');
    }

    return { distributor, warehouse };
  }

  /**
   * Đảm bảo tồn tại Retailer mặc định đại diện cho nhóm Khách mua lẻ cá nhân
   */
  async getOrCreateConsumerRetailer(distributorId: string | number | bigint) {
    let retailer = await this.prisma.retailer.findFirst({
      where: {
        distributorId: BigInt(distributorId),
        code: 'RETAILER_CONSUMER',
      },
    });

    if (!retailer) {
      retailer = await this.prisma.retailer.create({
        data: {
          distributorId: BigInt(distributorId),
          code: 'RETAILER_CONSUMER',
          name: 'Khách hàng Cá nhân (B2C)',
          address: 'Hệ thống Web Bán Hàng',
          phone: '1900-0000',
          status: true,
        },
      });
    }

    return retailer;
  }

  /**
   * Đăng ký tài khoản khách hàng mới
   */
  async registerCustomer(data: RegisterCustomerDto) {
    const { phone, password, fullName, accountType = 'CONSUMER', storeName, address, email } = data;

    if (!phone || !phone.trim()) {
      throw new Error('Số điện thoại không được để trống');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }
    if (!fullName || !fullName.trim()) {
      throw new Error('Họ và tên không được để trống');
    }

    const cleanPhone = phone.trim();
    const existing = await this.prisma.customerAccount.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      throw new Error('Số điện thoại này đã được đăng ký tài khoản');
    }

    const { distributor } = await this.getDefaultDistributorAndWarehouse();
    const passwordHash = await bcrypt.hash(password, 10);

    let retailerId: bigint | null = null;

    if (accountType === 'STORE') {
      if (!storeName || !storeName.trim()) {
        throw new Error('Cửa hàng / Điểm bán cần nhập tên tiệm kinh doanh');
      }
      const cleanStoreName = storeName.trim();
      const phoneSuffix = cleanPhone.slice(-4);
      const randSuffix = Math.floor(100 + Math.random() * 900);
      const retailerCode = `CH-${phoneSuffix}-${randSuffix}`;

      const retailer = await this.prisma.retailer.create({
        data: {
          distributorId: distributor.id,
          code: retailerCode,
          name: cleanStoreName,
          address: address?.trim() || 'Chưa cập nhật',
          phone: cleanPhone,
          status: true,
        },
      });
      retailerId = retailer.id;
    } else {
      const consumerRetailer = await this.getOrCreateConsumerRetailer(distributor.id);
      retailerId = consumerRetailer.id;
    }

    const newAccount = await this.prisma.customerAccount.create({
      data: {
        phone: cleanPhone,
        passwordHash,
        fullName: fullName.trim(),
        accountType: accountType === 'STORE' ? 'STORE' : 'CONSUMER',
        storeName: storeName?.trim() || null,
        address: address?.trim() || null,
        email: email?.trim() || null,
        retailerId,
        status: true,
      },
      include: {
        retailer: true,
      },
    });

    return serializeCustomer(newAccount);
  }

  /**
   * Đăng nhập khách hàng
   */
  async loginCustomer(phone: string, pass: string) {
    if (!phone || !pass) {
      throw new Error('Vui lòng nhập đầy đủ số điện thoại và mật khẩu');
    }

    const cleanPhone = phone.trim();
    const account = await this.prisma.customerAccount.findUnique({
      where: { phone: cleanPhone },
      include: {
        retailer: true,
      },
    });

    if (!account) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (!account.status) {
      throw new Error('Tài khoản của bạn đang tạm khóa. Vui lòng liên hệ nhà phân phối');
    }

    const isValid = await bcrypt.compare(pass, account.passwordHash);
    if (!isValid) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    return serializeCustomer(account);
  }

  /**
   * Lấy thông tin tài khoản khách hàng theo ID
   */
  async getCustomerProfile(customerId: string | number | bigint) {
    const account = await this.prisma.customerAccount.findUnique({
      where: { id: BigInt(customerId) },
      include: { retailer: true },
    });

    if (!account) {
      throw new Error('Tài khoản không tồn tại');
    }

    return serializeCustomer(account);
  }

  /**
   * Lấy danh mục sản phẩm cho Web Bán Hàng
   */
  async getShopProducts({ cursor, limit = 16, categoryId, search, accountType = 'CONSUMER' }: GetShopProductsQuery = {}) {
    const where: any = {
      status: true,
    };

    if (categoryId) {
      where.categoryId = BigInt(categoryId);
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [{ name: { contains: s } }, { sku: { contains: s } }];
    }

    const take = Number(limit) || 16;
    const queryArgs: any = {
      where,
      take: take + 1,
      include: {
        category: true,
        stockLots: {
          include: {
            stockBalance: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    };

    if (cursor) {
      queryArgs.cursor = { id: BigInt(cursor) };
      queryArgs.skip = 1;
    }

    const [products, totalCount] = await Promise.all([
      this.prisma.product.findMany(queryArgs),
      this.prisma.product.count({ where }),
    ]);

    const hasMore = products.length > take;
    const pageProducts = hasMore ? products.slice(0, take) : products;
    const nextCursor =
      hasMore && pageProducts.length > 0 ? pageProducts[pageProducts.length - 1].id.toString() : null;

    const items = pageProducts.map((p: any) => {
      let totalAvailable = 0;
      let nearestExpiryDate = null;
      let mainLotNumber = null;

      if (p.stockLots && p.stockLots.length > 0) {
        for (const lot of p.stockLots) {
          if (lot.stockBalance) {
            const onHand = Number(lot.stockBalance.quantityOnHand || 0);
            const reserved = Number(lot.stockBalance.quantityReserved || 0);
            const avail = Math.max(0, onHand - reserved);
            totalAvailable += avail;
          }
          if (lot.expiryDate && (!nearestExpiryDate || new Date(lot.expiryDate) < new Date(nearestExpiryDate))) {
            nearestExpiryDate = lot.expiryDate;
            mainLotNumber = lot.lotNumber;
          }
        }
      }

      let basePrice = Number(p.basePrice || 0);
      if (basePrice <= 0) {
        const seedVal = Math.abs(Number(p.id) * 31);
        basePrice = (12 + (seedVal % 35)) * 10000;
      }
      const wholesalePrice = Math.round(basePrice * 0.88);
      const activePrice = accountType === 'STORE' ? wholesalePrice : basePrice;

      return {
        id: p.id.toString(),
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        retailUnit: p.retailUnit,
        conversionRate: p.conversionRate || 1,
        groupStdSku: p.groupStdSku || null,
        expiryDate: nearestExpiryDate ? new Date(nearestExpiryDate).toISOString().slice(0, 10) : null,
        lotNumber: mainLotNumber,
        categoryName: p.category?.name || 'Khác',
        categoryId: p.categoryId ? p.categoryId.toString() : null,
        imageUrl: p.imageUrl || null,
        retailImageUrl: p.retailImageUrl || null,
        basePrice,
        wholesalePrice,
        activePrice,
        availableQty: totalAvailable,
        inStock: totalAvailable > 0,
      };
    });

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Lấy danh sách ngành hàng / danh mục
   */
  async getShopCategories() {
    const categories = await this.prisma.productCategory.findMany({
      include: {
        _count: {
          select: {
            products: {
              where: { status: true },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return categories.map((c: any) => ({
      id: c.id.toString(),
      name: c.name,
      productCount: c._count?.products || 0,
    }));
  }

  /**
   * Lấy chi tiết sản phẩm
   */
  async getShopProductDetail(productId: string | number | bigint, accountType: string = 'CONSUMER') {
    if (!productId) {
      throw new Error('Mã sản phẩm không hợp lệ');
    }

    const p = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
      include: {
        category: true,
        stockLots: {
          include: {
            stockBalance: true,
          },
        },
      },
    });

    if (!p) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    let totalAvailable = 0;
    let nearestExpiryDate = null;
    let mainLotNumber = null;

    if (p.stockLots && p.stockLots.length > 0) {
      for (const lot of p.stockLots) {
        if (lot.stockBalance) {
          const onHand = Number(lot.stockBalance.quantityOnHand || 0);
          const reserved = Number(lot.stockBalance.quantityReserved || 0);
          const avail = Math.max(0, onHand - reserved);
          totalAvailable += avail;
        }
        if (lot.expiryDate && (!nearestExpiryDate || new Date(lot.expiryDate) < new Date(nearestExpiryDate))) {
          nearestExpiryDate = lot.expiryDate;
          mainLotNumber = lot.lotNumber;
        }
      }
    }

    let basePrice = Number(p.basePrice || 0);
    if (basePrice <= 0) {
      const seedVal = Math.abs(Number(p.id) * 31);
      basePrice = (12 + (seedVal % 35)) * 10000;
    }
    const wholesalePrice = Math.round(basePrice * 0.88);
    const activePrice = accountType === 'STORE' ? wholesalePrice : basePrice;

    const conversionRate = p.conversionRate && p.conversionRate > 0 ? p.conversionRate : 24;
    const retailUnitPrice = Math.round(activePrice / conversionRate);

    const relatedList = await this.prisma.product.findMany({
      where: {
        status: true,
        categoryId: p.categoryId,
        id: { not: p.id },
      },
      take: 4,
      include: {
        category: true,
      },
    });

    const relatedProducts = relatedList.map((item: any) => {
      let price = Number(item.basePrice || 0);
      if (price <= 0) {
        const seedVal = Math.abs(Number(item.id) * 31);
        price = (12 + (seedVal % 35)) * 10000;
      }
      return {
        id: item.id.toString(),
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        retailUnit: item.retailUnit,
        conversionRate: item.conversionRate || 1,
        categoryName: item.category?.name || 'Khác',
        imageUrl: item.imageUrl || null,
        retailImageUrl: item.retailImageUrl || null,
        basePrice: price,
        wholesalePrice: Math.round(price * 0.88),
        activePrice: accountType === 'STORE' ? Math.round(price * 0.88) : price,
        inStock: true,
      };
    });

    return {
      id: p.id.toString(),
      sku: p.sku,
      name: p.name,
      unit: p.unit || 'THÙNG',
      retailUnit: p.retailUnit || 'Chai/Gói',
      imageUrl: p.imageUrl || null,
      retailImageUrl: p.retailImageUrl || null,
      conversionRate,
      groupStdSku: p.groupStdSku || null,
      expiryDate: nearestExpiryDate ? new Date(nearestExpiryDate).toISOString().slice(0, 10) : null,
      lotNumber: mainLotNumber,
      categoryName: p.category?.name || 'Khác',
      categoryId: p.categoryId ? p.categoryId.toString() : null,
      basePrice,
      wholesalePrice,
      activePrice,
      retailUnitPrice,
      availableQty: totalAvailable,
      availableCases: Math.floor(totalAvailable / conversionRate),
      availableRetailUnits: totalAvailable % conversionRate,
      inStock: totalAvailable > 0,
      relatedProducts,
    };
  }

  /**
   * Đặt hàng từ Web Bán Hàng
   */
  async placeShopOrder(
    { customerId, items, shippingAddress, notes, paymentMethod = 'COD' }: PlaceShopOrderDto,
    io: any = null,
  ) {
    if (!customerId) {
      throw new Error('Vui lòng đăng nhập để tiến hành đặt hàng');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Giỏ hàng trống. Vui lòng chọn ít nhất 1 sản phẩm');
    }

    const customer = await this.prisma.customerAccount.findUnique({
      where: { id: BigInt(customerId) },
      include: { retailer: true },
    });

    if (!customer) {
      throw new Error('Tài khoản khách hàng không tồn tại');
    }

    const { distributor, warehouse } = await this.getDefaultDistributorAndWarehouse();
    let retailerId = customer.retailerId;

    if (!retailerId) {
      const defaultRetailer = await this.getOrCreateConsumerRetailer(distributor.id);
      retailerId = defaultRetailer.id;
    }

    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(10000 + Math.random() * 90000);
    const orderCode = `R-${yyyymmdd}-${rand}`;

    const fullNotes = [
      `[Đơn Web Portal - ${customer.accountType === 'STORE' ? 'Cửa Hàng' : 'Khách Cá Nhân'}]`,
      `Người đặt: ${customer.fullName} (${customer.phone})`,
      customer.storeName ? `Tên tiệm: ${customer.storeName}` : null,
      `Địa chỉ nhận: ${shippingAddress || customer.address || 'Chưa cung cấp'}`,
      `Hình thức thanh toán: ${paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản QR' : 'COD (Tiền mặt khi nhận)'}`,
      notes ? `Ghi chú thêm: ${notes}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.create({
        data: {
          orderCode,
          distributorId: distributor.id,
          warehouseId: warehouse.id,
          retailerId: BigInt(retailerId),
          customerId: customer.id,
          orderType: 'LATER',
          status: 'PENDING',
          createdAt: date,
          items: {
            create: items.map((it) => {
              const qty = Number(it.quantity || 1);
              const price = Number(it.unitPrice || 0);
              return {
                product: { connect: { id: BigInt(it.productId) } },
                quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
                unitPrice: isNaN(price) || price < 0 ? 0 : price,
                isPromotion: false,
              };
            }),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          retailer: true,
          customer: true,
        },
      });

      const totalAmount = order.items.reduce((sum: number, it: any) => {
        return sum + Number(it.quantity) * Number(it.unitPrice);
      }, 0);

      if (io) {
        try {
          io.emit('order:created', {
            id: order.id.toString(),
            orderCode: order.orderCode,
            customerName: customer.fullName,
            accountType: customer.accountType,
            storeName: customer.storeName,
            phone: customer.phone,
            totalAmount,
            itemCount: order.items.length,
            createdAt: order.createdAt,
            source: 'PORTAL',
          });
        } catch (err: any) {
          console.error('Socket emit error:', err.message);
        }
      }

      return {
        ...serializeOrder(order),
        totalAmount,
        deliveryNotes: fullNotes,
      };
    });
  }

  /**
   * Lấy lịch sử đơn hàng của khách hàng
   */
  async getCustomerOrders(customerId: string | number | bigint) {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        customerId: BigInt(customerId),
      },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(serializeOrder);
  }

  /**
   * Tra cứu thông tin đơn hàng theo mã đơn
   */
  async getOrderDetailByCode(orderCode: string) {
    if (!orderCode || !orderCode.trim()) {
      throw new Error('Mã đơn hàng không hợp lệ');
    }

    const order = await this.prisma.salesOrder.findUnique({
      where: { orderCode: orderCode.trim() },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
        retailer: true,
        deliveryTrip: true,
      },
    });

    if (!order) {
      throw new Error('Không tìm thấy đơn hàng với mã này');
    }

    return serializeOrder(order);
  }
}

// ==========================================
// Helper Serializers (Chuyển BigInt -> String)
// ==========================================

function serializeCustomer(acc: any) {
  return {
    id: acc.id.toString(),
    phone: acc.phone,
    fullName: acc.fullName,
    accountType: acc.accountType,
    storeName: acc.storeName,
    address: acc.address,
    email: acc.email,
    retailerId: acc.retailerId ? acc.retailerId.toString() : null,
    retailerName: acc.retailer?.name || null,
    retailerCode: acc.retailer?.code || null,
    createdAt: acc.createdAt,
  };
}

function serializeOrder(order: any) {
  const items = (order.items || []).map((it: any) => ({
    id: it.id.toString(),
    productId: it.productId.toString(),
    productName: it.product?.name || 'Sản phẩm',
    sku: it.product?.sku || '',
    unit: it.product?.unit || 'THÙNG',
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
    amount: Number(it.quantity) * Number(it.unitPrice),
  }));

  const totalAmount = items.reduce((s: number, it: any) => s + it.amount, 0);

  return {
    id: order.id.toString(),
    orderCode: order.orderCode,
    status: order.status,
    createdAt: order.createdAt,
    customerId: order.customerId ? order.customerId.toString() : null,
    customerName: order.customer?.fullName || null,
    customerPhone: order.customer?.phone || null,
    storeName: order.customer?.storeName || null,
    accountType: order.customer?.accountType || null,
    items,
    totalAmount,
    deliveryTripCode: order.deliveryTrip?.tripCode || null,
  };
}

// Standalone functions for backward compatibility
export const registerCustomer = async (data: RegisterCustomerDto) => {
  const service = new ShopPortalService(prisma as any);
  return service.registerCustomer(data);
};

export const loginCustomer = async (phone: string, pass: string) => {
  const service = new ShopPortalService(prisma as any);
  return service.loginCustomer(phone, pass);
};

export const getCustomerProfile = async (customerId: string | number | bigint) => {
  const service = new ShopPortalService(prisma as any);
  return service.getCustomerProfile(customerId);
};

export const getShopProducts = async (params: GetShopProductsQuery = {}) => {
  const service = new ShopPortalService(prisma as any);
  return service.getShopProducts(params);
};

export const getShopCategories = async () => {
  const service = new ShopPortalService(prisma as any);
  return service.getShopCategories();
};

export const getShopProductDetail = async (productId: string | number | bigint, accountType: string = 'CONSUMER') => {
  const service = new ShopPortalService(prisma as any);
  return service.getShopProductDetail(productId, accountType);
};

export const placeShopOrder = async (payload: PlaceShopOrderDto, io: any = null) => {
  const service = new ShopPortalService(prisma as any);
  return service.placeShopOrder(payload, io);
};

export const getCustomerOrders = async (customerId: string | number | bigint) => {
  const service = new ShopPortalService(prisma as any);
  return service.getCustomerOrders(customerId);
};

export const getOrderDetailByCode = async (orderCode: string) => {
  const service = new ShopPortalService(prisma as any);
  return service.getOrderDetailByCode(orderCode);
};

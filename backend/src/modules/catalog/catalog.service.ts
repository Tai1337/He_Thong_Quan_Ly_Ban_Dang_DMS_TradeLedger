import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getWarehouses(distributorId?: string) {
    const where: any = { status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    const warehouses = await this.prisma.warehouse.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        category: true,
      },
      orderBy: { id: 'asc' },
    });

    return warehouses.map((w) => ({
      id: w.id.toString(),
      code: w.code,
      name: w.name,
      type: w.type,
      category: w.category,
    }));
  }

  async getRetailers(distributorId?: string, search?: string) {
    const where: any = { status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }
    if (search && search.trim()) {
      where.OR = [
        { code: { contains: search.trim() } },
        { name: { contains: search.trim() } },
      ];
    }

    const retailers = await this.prisma.retailer.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return retailers.map((r) => ({
      id: r.id.toString(),
      code: r.code,
      name: r.name,
      address: r.address,
      phone: r.phone,
    }));
  }

  async getDeliveryTrips(distributorId?: string) {
    const where: any = {};
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    const trips = await this.prisma.deliveryTrip.findMany({
      where,
      include: { driver: true },
      orderBy: { createdAt: 'desc' },
    });

    return trips.map((t) => ({
      id: t.id.toString(),
      tripCode: t.tripCode,
      status: t.status,
      driverName: t.driver?.fullName || 'Chưa gán tài xế',
      driverPhone: t.driver?.phone || '',
    }));
  }

  async getSalesReps(distributorId?: string) {
    const salesRole = await this.prisma.role.findUnique({ where: { code: 'SALES' } });
    if (!salesRole) return [];

    const where: any = { roleId: salesRole.id, status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });

    return users.map((u) => ({
      id: u.id.toString(),
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
    }));
  }

  async getProducts(search?: string) {
    const where: any = { status: true };
    if (search && search.trim()) {
      where.OR = [
        { sku: { contains: search.trim() } },
        { name: { contains: search.trim() } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 100,
    });

    return products.map((p) => ({
      id: p.id.toString(),
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      retailUnit: p.retailUnit,
      imageUrl: p.imageUrl,
      retailImageUrl: p.retailImageUrl,
      basePrice: Number(p.basePrice),
    }));
  }

  async getSuppliers(search?: string) {
    const where: any = { status: true };
    if (search && search.trim()) {
      where.OR = [
        { code: { contains: search.trim() } },
        { name: { contains: search.trim() } },
      ];
    }

    const suppliers = await this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return suppliers.map((s) => ({
      id: s.id.toString(),
      code: s.code,
      name: s.name,
      address: s.address,
      phone: s.phone,
    }));
  }

  async getCategories() {
    const categories = await this.prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      parentId: c.parentId ? c.parentId.toString() : null,
    }));
  }

  /**
   * Lấy danh sách sản phẩm Admin kèm thống kê chỉ số Hàng mẫu [S]
   */
  async getAdminProducts(query: { search?: string; productType?: string; categoryId?: string }) {
    const where: any = {};

    if (query.productType && query.productType !== 'ALL') {
      where.productType = query.productType;
    }

    if (query.categoryId) {
      where.categoryId = BigInt(query.categoryId);
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { sku: { contains: s } },
        { name: { contains: s } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        sampleAllocations: {
          include: {
            retailer: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    let totalSampleCount = 0;
    let totalCommercialCount = 0;
    let totalReadyToApproveCount = 0;

    const items = products.map((p) => {
      const isSample = p.productType === 'SAMPLE';
      const isCommercial = p.productType === 'COMMERCIAL' || !p.productType;

      if (isSample) totalSampleCount++;
      if (isCommercial) totalCommercialCount++;

      let totalAllocatedQty = 0;
      let totalTestedCount = 0;
      let totalLikedCount = 0;
      let totalPreorderQty = 0;
      let preorderStoresCount = 0;

      const allocations = (p.sampleAllocations || []).map((alloc) => {
        totalAllocatedQty += alloc.allocatedQty || 0;
        totalTestedCount += alloc.testedCount || 0;
        totalLikedCount += alloc.likedCount || 0;
        totalPreorderQty += alloc.storePreorderQty || 0;
        if ((alloc.storePreorderQty || 0) > 0) {
          preorderStoresCount++;
        }

        const storePopularity =
          alloc.testedCount > 0
            ? Math.round((alloc.likedCount / alloc.testedCount) * 100)
            : 0;

        return {
          id: alloc.id.toString(),
          retailerId: alloc.retailerId.toString(),
          retailerCode: alloc.retailer?.code || '',
          retailerName: alloc.retailer?.name || '',
          retailerAddress: alloc.retailer?.address || '',
          retailerPhone: alloc.retailer?.phone || '',
          allocatedQty: alloc.allocatedQty,
          receivedDate: alloc.receivedDate ? alloc.receivedDate.toISOString() : null,
          testedCount: alloc.testedCount,
          likedCount: alloc.likedCount,
          storePreorderQty: alloc.storePreorderQty,
          feedbackNotes: alloc.feedbackNotes || '',
          status: alloc.status,
          popularityRate: storePopularity,
        };
      });

      const allocatedStoresCount = allocations.length;
      const overallPopularityRate =
        totalTestedCount > 0
          ? Math.round((totalLikedCount / totalTestedCount) * 100)
          : 0;

      const conversionRate =
        allocatedStoresCount > 0
          ? Math.round((preorderStoresCount / allocatedStoresCount) * 100)
          : 0;

      const isReadyToApprove =
        isSample &&
        (overallPopularityRate >= 70 || totalPreorderQty > 0 || conversionRate >= 50);

      if (isReadyToApprove) {
        totalReadyToApproveCount++;
      }

      return {
        id: p.id.toString(),
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId ? p.categoryId.toString() : null,
        categoryName: p.category?.name || 'Chưa phân loại',
        unit: p.unit,
        retailUnit: p.retailUnit,
        conversionRate: p.conversionRate,
        basePrice: Number(p.basePrice),
        productType: p.productType || 'COMMERCIAL',
        status: p.status,
        rejectionReason: p.rejectionReason || null,
        imageUrl: p.imageUrl,
        retailImageUrl: p.retailImageUrl,
        createdAt: p.createdAt.toISOString(),
        // Thống kê thử nghiệm mẫu
        samplingStats: {
          totalAllocatedQty,
          allocatedStoresCount,
          totalTestedCount,
          totalLikedCount,
          overallPopularityRate,
          totalPreorderQty,
          preorderStoresCount,
          conversionRate,
          isReadyToApprove,
        },
        allocations,
      };
    });

    return {
      success: true,
      data: items,
      kpis: {
        totalProducts: products.length,
        totalSampleProducts: totalSampleCount,
        totalCommercialProducts: totalCommercialCount,
        totalReadyToApprove: totalReadyToApproveCount,
      },
    };
  }

  /**
   * Tạo sản phẩm mới
   */
  async createAdminProduct(data: any) {
    const {
      sku,
      name,
      categoryId,
      unit = 'THÙNG',
      retailUnit,
      conversionRate = 1,
      basePrice = 0,
      productType = 'SAMPLE',
      imageUrl,
      retailImageUrl,
      rejectionReason,
    } = data;

    if (!sku || !sku.trim()) {
      throw new Error('Mã SKU không được để trống');
    }
    if (!name || !name.trim()) {
      throw new Error('Tên sản phẩm không được để trống');
    }

    let finalSku = sku.trim().toUpperCase();
    let finalName = name.trim();

    // Nếu là hàng mẫu kiểm thử [S], đảm bảo tiền tố S- và [S]
    if (productType === 'SAMPLE') {
      if (!finalSku.startsWith('S-') && !finalSku.startsWith('S_')) {
        finalSku = `S-${finalSku}`;
      }
      if (!finalName.startsWith('[S]')) {
        finalName = `[S] ${finalName}`;
      }
    }

    // Kiểm tra SKU trùng
    const existing = await this.prisma.product.findUnique({
      where: { sku: finalSku },
    });
    if (existing) {
      throw new Error(`Mã SKU "${finalSku}" đã tồn tại trên hệ thống`);
    }

    const product = await this.prisma.product.create({
      data: {
        sku: finalSku,
        name: finalName,
        categoryId: categoryId ? BigInt(categoryId) : null,
        unit: unit.trim().toUpperCase(),
        retailUnit: retailUnit ? retailUnit.trim().toUpperCase() : null,
        conversionRate: Number(conversionRate) || 1,
        basePrice: Number(basePrice) || 0,
        productType,
        imageUrl: imageUrl?.trim() || null,
        retailImageUrl: retailImageUrl?.trim() || null,
        status: true,
      },
      include: {
        category: true,
      },
    });

    return {
      id: product.id.toString(),
      sku: product.sku,
      name: product.name,
      productType: product.productType,
      unit: product.unit,
      basePrice: Number(product.basePrice),
      categoryName: product.category?.name || 'Chưa phân loại',
    };
  }

  /**
   * Phân bổ suất hàng mẫu [S] về các Cửa hàng
   */
  async allocateSamples(productId: string, allocations: Array<{ retailerId: string; allocatedQty: number }>) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new Error('Sản phẩm không tồn tại');
    }

    if (!allocations || allocations.length === 0) {
      throw new Error('Danh sách phân bổ cửa hàng không được để trống');
    }

    const results = [];
    for (const item of allocations) {
      const retailerId = BigInt(item.retailerId);
      const allocatedQty = Number(item.allocatedQty) || 1;

      const record = await this.prisma.productSampleAllocation.upsert({
        where: {
          productId_retailerId: {
            productId: product.id,
            retailerId,
          },
        },
        create: {
          productId: product.id,
          retailerId,
          allocatedQty,
          status: 'ALLOCATED',
          receivedDate: new Date(),
        },
        update: {
          allocatedQty,
        },
        include: {
          retailer: true,
        },
      });

      results.push({
        id: record.id.toString(),
        retailerName: record.retailer.name,
        allocatedQty: record.allocatedQty,
        status: record.status,
      });
    }

    return results;
  }

  /**
   * Cập nhật phản hồi dùng thử và nhu cầu đặt thử từ Cửa hàng / Sale Sup
   */
  async updateSampleFeedback(
    allocationId: string,
    data: {
      testedCount: number;
      likedCount: number;
      storePreorderQty: number;
      feedbackNotes?: string;
    },
  ) {
    const { testedCount = 0, likedCount = 0, storePreorderQty = 0, feedbackNotes } = data;

    const record = await this.prisma.productSampleAllocation.findUnique({
      where: { id: BigInt(allocationId) },
    });

    if (!record) {
      throw new Error('Bản ghi phân bổ hàng mẫu không tồn tại');
    }

    const updated = await this.prisma.productSampleAllocation.update({
      where: { id: BigInt(allocationId) },
      data: {
        testedCount: Number(testedCount) || 0,
        likedCount: Number(likedCount) || 0,
        storePreorderQty: Number(storePreorderQty) || 0,
        feedbackNotes: feedbackNotes?.trim() || null,
        status: 'COMPLETED',
        receivedDate: record.receivedDate || new Date(),
      },
      include: {
        retailer: true,
        product: true,
      },
    });

    return {
      id: updated.id.toString(),
      productName: updated.product.name,
      retailerName: updated.retailer.name,
      testedCount: updated.testedCount,
      likedCount: updated.likedCount,
      storePreorderQty: updated.storePreorderQty,
      feedbackNotes: updated.feedbackNotes,
      status: updated.status,
    };
  }

  /**
   * Duyệt mở bán chính thức (COMMERCIAL) cho sản phẩm [S]
   */
  async approveSampleToCommercial(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new Error('Sản phẩm không tồn tại');
    }

    // Cập nhật productType thành COMMERCIAL
    const updated = await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: {
        productType: 'COMMERCIAL',
        rejectionReason: null,
      },
    });

    return {
      success: true,
      message: `Đã duyệt mở bán chính thức sản phẩm "${updated.name}" cho tất cả cửa hàng`,
      product: {
        id: updated.id.toString(),
        sku: updated.sku,
        name: updated.name,
        productType: updated.productType,
      },
    };
  }

  /**
   * Từ chối / Dừng thử nghiệm hàng mẫu [S]
   */
  async rejectSample(productId: string, rejectionReason: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });

    if (!product) {
      throw new Error('Sản phẩm không tồn tại');
    }

    const updated = await this.prisma.product.update({
      where: { id: BigInt(productId) },
      data: {
        productType: 'REJECTED',
        rejectionReason: rejectionReason?.trim() || 'Không đạt kỳ vọng thị trường',
      },
    });

    return {
      success: true,
      message: `Đã chuyển sản phẩm "${updated.name}" sang trạng thái Dừng thử nghiệm / Cải tiến R&D`,
      product: {
        id: updated.id.toString(),
        productType: updated.productType,
        rejectionReason: updated.rejectionReason,
      },
    };
  }
}


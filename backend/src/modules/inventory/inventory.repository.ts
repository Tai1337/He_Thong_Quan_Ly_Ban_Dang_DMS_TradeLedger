import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private prisma: PrismaService) {}

  async getInventoryLotsRpt083(distributorId: string | number, filters: any = {}) {
    const {
      page = 1,
      limit = 50,
      warehouseId,
      status,
      lotNumber,
      searchProduct,
      stockFilter,
      dateType,
      fromDate,
      toDate,
      productType,
      locationName,
    } = filters;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      warehouse: {
        distributorId: BigInt(distributorId),
      },
    };

    if (warehouseId) where.warehouseId = BigInt(warehouseId);
    if (status) where.status = status;
    if (lotNumber) where.lotNumber = { contains: lotNumber };

    if (locationName) {
      where.locationName = { contains: locationName };
    }

    if (stockFilter === 'POSITIVE') {
      where.stockBalance = { quantityOnHand: { gt: 0 } };
    } else if (stockFilter === 'ZERO') {
      where.stockBalance = { quantityOnHand: { equals: 0 } };
    }

    if (dateType && (fromDate || toDate)) {
      const dateQuery: any = {};
      if (fromDate) dateQuery.gte = new Date(fromDate);
      if (toDate) {
        const t = new Date(toDate);
        t.setUTCHours(23, 59, 59, 999);
        dateQuery.lte = t;
      }

      if (dateType === 'MFG') {
        where.manufactureDate = dateQuery;
      } else if (dateType === 'EXP') {
        where.expiryDate = dateQuery;
      }
    }

    const productQuery: any = {};
    if (productType) {
      productQuery.productType = productType;
    }

    if (searchProduct) {
      productQuery.OR = [
        { sku: { contains: searchProduct } },
        { name: { contains: searchProduct } },
      ];
    }

    if (Object.keys(productQuery).length > 0) {
      where.product = productQuery;
    }

    const [lots, total] = await Promise.all([
      this.prisma.stockLot.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        include: {
          product: {
            include: {
              category: true,
            },
          },
          stockBalance: true,
          warehouse: {
            include: {
              distributor: true,
            },
          },
        },
        orderBy: {
          manufactureDate: 'desc',
        },
      }),
      this.prisma.stockLot.count({ where }),
    ]);

    return { lots, total };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ICatalogRepository } from './catalog.repository.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class CatalogRepository implements ICatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findWarehouses(distributorId?: string) {
    const where: any = { status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    return this.prisma.warehouse.findMany({
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
  }

  async findRetailers(distributorId?: string, search?: string) {
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

    return this.prisma.retailer.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findDeliveryTrips(distributorId?: string) {
    const where: any = {};
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    return this.prisma.deliveryTrip.findMany({
      where,
      include: { driver: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSalesReps(distributorId?: string) {
    const salesRole = await this.prisma.role.findUnique({ where: { code: 'SALES' } });
    if (!salesRole) return [];

    const where: any = { roleId: salesRole.id, status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });
  }

  async findProducts(search?: string) {
    const where: any = { status: true };
    if (search && search.trim()) {
      where.OR = [
        { sku: { contains: search.trim() } },
        { name: { contains: search.trim() } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async findSuppliers(search?: string) {
    const where: any = { status: true };
    if (search && search.trim()) {
      where.OR = [
        { code: { contains: search.trim() } },
        { name: { contains: search.trim() } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createProduct(data: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        unit: data.unit || 'THÙNG',
        retailUnit: data.retailUnit,
        basePrice: data.basePrice ?? 0,
        conversionRate: data.conversionRate ?? 1,
        imageUrl: data.imageUrl,
        retailImageUrl: data.retailImageUrl,
      },
    });
  }

  async updateProduct(id: string, data: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.sku && { sku: data.sku }),
        ...(data.name && { name: data.name }),
        ...(data.unit && { unit: data.unit }),
        ...(data.retailUnit !== undefined && { retailUnit: data.retailUnit }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.conversionRate !== undefined && { conversionRate: data.conversionRate }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.retailImageUrl !== undefined && { retailImageUrl: data.retailImageUrl }),
      },
    });
  }
}

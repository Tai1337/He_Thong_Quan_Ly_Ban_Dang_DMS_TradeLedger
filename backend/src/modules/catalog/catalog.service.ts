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
}

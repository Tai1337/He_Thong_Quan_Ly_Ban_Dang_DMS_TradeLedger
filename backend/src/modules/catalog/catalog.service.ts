import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY, ICatalogRepository } from './catalog.repository.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepo: ICatalogRepository,
  ) {}

  async getWarehouses(distributorId?: string) {
    const warehouses = await this.catalogRepo.findWarehouses(distributorId);
    return warehouses.map((w) => ({
      id: w.id.toString(),
      code: w.code,
      name: w.name,
      type: w.type,
      category: w.category,
    }));
  }

  async getRetailers(distributorId?: string, search?: string) {
    const retailers = await this.catalogRepo.findRetailers(distributorId, search);
    return retailers.map((r) => ({
      id: r.id.toString(),
      code: r.code,
      name: r.name,
      address: r.address,
      phone: r.phone,
    }));
  }

  async getDeliveryTrips(distributorId?: string) {
    const trips = await this.catalogRepo.findDeliveryTrips(distributorId);
    return trips.map((t) => ({
      id: t.id.toString(),
      tripCode: t.tripCode,
      status: t.status,
      driverName: t.driver?.fullName || 'Chưa gán tài xế',
      driverPhone: t.driver?.phone || '',
    }));
  }

  async getSalesReps(distributorId?: string) {
    const users = await this.catalogRepo.findSalesReps(distributorId);
    return users.map((u) => ({
      id: u.id.toString(),
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
    }));
  }

  async getProducts(search?: string) {
    const products = await this.catalogRepo.findProducts(search);
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
    const suppliers = await this.catalogRepo.findSuppliers(search);
    return suppliers.map((s) => ({
      id: s.id.toString(),
      code: s.code,
      name: s.name,
      address: s.address,
      phone: s.phone,
    }));
  }

  async createProduct(dto: CreateProductDto) {
    const product = await this.catalogRepo.createProduct(dto);
    return {
      ...product,
      id: product.id.toString(),
      basePrice: Number(product.basePrice),
    };
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.catalogRepo.updateProduct(id, dto);
    return {
      ...product,
      id: product.id.toString(),
      basePrice: Number(product.basePrice),
    };
  }
}

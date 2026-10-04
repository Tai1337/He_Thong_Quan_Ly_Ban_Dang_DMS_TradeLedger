import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export const CATALOG_REPOSITORY = 'CATALOG_REPOSITORY';

export abstract class ICatalogRepository {
  abstract findWarehouses(distributorId?: string): Promise<any[]>;
  abstract findRetailers(distributorId?: string, search?: string): Promise<any[]>;
  abstract findDeliveryTrips(distributorId?: string): Promise<any[]>;
  abstract findSalesReps(distributorId?: string): Promise<any[]>;
  abstract findProducts(search?: string): Promise<any[]>;
  abstract findSuppliers(search?: string): Promise<any[]>;
  abstract createProduct(data: CreateProductDto): Promise<any>;
  abstract updateProduct(id: string, data: UpdateProductDto): Promise<any>;
}

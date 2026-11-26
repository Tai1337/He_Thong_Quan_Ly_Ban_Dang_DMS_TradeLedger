export interface PurchaseOrderItemInputDto {
  productId: string | number | bigint;
  quantity: number;
  unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  distributorId: string | number | bigint;
  warehouseId: string | number | bigint;
  supplierId?: string | number | bigint | null;
  expectedDate?: string | Date | null;
  notes?: string | null;
  items: PurchaseOrderItemInputDto[];
  createdById?: string | number | bigint | null;
  submitImmediately?: boolean;
}

export class UpdatePurchaseOrderDto {
  distributorId?: string | number | bigint;
  warehouseId?: string | number | bigint;
  supplierId?: string | number | bigint | null;
  expectedDate?: string | Date | null;
  notes?: string | null;
  items?: PurchaseOrderItemInputDto[];
  userId?: string | number | bigint | null;
  submitImmediately?: boolean;
}

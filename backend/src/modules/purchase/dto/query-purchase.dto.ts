export class QueryPurchaseOrderDto {
  distributorId?: string;
  poCode?: string;
  supplierId?: string;
  warehouseId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

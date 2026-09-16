export class QuerySalesOrderDto {
  distributorId?: string;
  status?: string;
  orderType?: string;
  warehouseId?: string;
  retailerId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

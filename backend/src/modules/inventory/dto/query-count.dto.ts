export class QueryCountDto {
  distributorId?: string;
  warehouseId?: string;
  status?: string;
  countType?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

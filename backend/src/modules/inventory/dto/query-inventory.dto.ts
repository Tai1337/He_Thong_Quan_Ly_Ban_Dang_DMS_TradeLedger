export class QueryInventoryDto {
  distributorId?: string;
  warehouseId?: string;
  status?: string;
  lotNumber?: string;
  searchProduct?: string;
  stockFilter?: string;
  dateType?: string;
  fromDate?: string;
  toDate?: string;
  productType?: string;
  locationName?: string;
  page?: number;
  limit?: number;
}

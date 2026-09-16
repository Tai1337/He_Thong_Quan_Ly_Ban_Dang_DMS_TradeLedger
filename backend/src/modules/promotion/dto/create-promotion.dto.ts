export class CreatePromotionDto {
  name: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  productIds?: string[];
  status?: boolean;
}

import { IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CountItemDto {
  @IsNotEmpty()
  lotId: string | number;

  @IsOptional()
  actualQuantity?: number;

  @IsOptional()
  reason?: string;
}

export class CreateInventoryCountDto {
  @IsNotEmpty()
  warehouseId: string | number;

  @IsOptional()
  distributorId?: string | number;

  @IsOptional()
  countType?: 'MONTHLY' | 'BY_SKU';

  @IsOptional()
  notes?: string;

  @IsOptional()
  createdById?: string | number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountItemDto)
  items?: CountItemDto[];
}

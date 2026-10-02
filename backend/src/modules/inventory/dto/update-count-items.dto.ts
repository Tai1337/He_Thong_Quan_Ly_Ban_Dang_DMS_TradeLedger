import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCountItemRowDto {
  @IsOptional()
  id?: string | number;

  @IsOptional()
  lotId?: string | number;

  @IsOptional()
  actualQuantity?: number | null;

  @IsOptional()
  reason?: string;
}

export class UpdateCountItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCountItemRowDto)
  items: UpdateCountItemRowDto[];

  @IsOptional()
  notes?: string;
}

import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  sku: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  name: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  retailUnit?: string;

  @IsNumber()
  @Min(0, { message: 'Giá cơ bản phải lớn hơn hoặc bằng 0' })
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @Min(1, { message: 'Tỷ lệ quy đổi tối thiểu là 1' })
  @IsOptional()
  conversionRate?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  retailImageUrl?: string;
}

import { IsString, IsNotEmpty, IsNumber, IsUUID, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Product name cannot be empty' })
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  price?: number;

  @IsOptional()
  @IsUUID('all', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;
}

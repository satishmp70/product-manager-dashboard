import { IsString, IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  price!: number;

  @IsUUID('all', { message: 'Category ID must be a valid UUID' })
  categoryId!: string;
}

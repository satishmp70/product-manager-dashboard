import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Category name cannot be empty' })
  name?: string;
}

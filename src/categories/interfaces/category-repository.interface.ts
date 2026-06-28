import { Category, Prisma } from '@prisma/client';

export interface ICategoryRepository {
  create(data: Prisma.CategoryCreateInput): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category>;
  findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
  }): Promise<Category[]>;
  count(params: { where?: Prisma.CategoryWhereInput }): Promise<number>;
}

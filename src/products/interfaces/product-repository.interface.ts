import { Product, Prisma } from '@prisma/client';

export interface IProductRepository {
  create(data: Prisma.ProductCreateInput): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByUniqueId(uniqueId: string): Promise<Product | null>;
  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product>;
  findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<Product[]>;
  count(params: { where?: Prisma.ProductWhereInput }): Promise<number>;
}

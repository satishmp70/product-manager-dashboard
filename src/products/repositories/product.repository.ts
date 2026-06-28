import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  IProductRepository,
  ProductCreateData,
  ProductFindParams,
  ProductUpdateData,
} from '../interfaces/product-repository.interface';
import { Product, Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ProductCreateData): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: { category: true },
    });
  }

  async findByUniqueId(uniqueId: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { uniqueId, isDeleted: false },
      include: { category: true },
    });
  }

  async update(id: string, data: ProductUpdateData): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: data as Prisma.ProductUpdateInput,
    });
  }

  async findAll(params: ProductFindParams): Promise<Product[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.product.findMany({
      skip,
      take,
      where: { ...where, isDeleted: false } as Prisma.ProductWhereInput,
      orderBy: orderBy as Prisma.ProductOrderByWithRelationInput,
      include: {
        category: true,
      },
    });
  }

  async count(params: { where?: Record<string, unknown> }): Promise<number> {
    return this.prisma.product.count({
      where: { ...params.where, isDeleted: false } as Prisma.ProductWhereInput,
    });
  }
}

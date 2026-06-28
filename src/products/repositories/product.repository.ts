import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IProductRepository } from '../interfaces/product-repository.interface';
import { Product, Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
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

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<any[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.product.findMany({
      skip,
      take,
      where: { ...where, isDeleted: false },
      orderBy,
      include: {
        category: true,
      },
    });
  }

  async count(params: { where?: Prisma.ProductWhereInput }): Promise<number> {
    return this.prisma.product.count({
      where: { ...params.where, isDeleted: false },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ICategoryRepository } from '../interfaces/category-repository.interface';
import { Category, Prisma } from '@prisma/client';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { name, isDeleted: false },
    });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
  }): Promise<Category[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.category.findMany({
      skip,
      take,
      where: { ...where, isDeleted: false },
      orderBy,
    });
  }

  async count(params: { where?: Prisma.CategoryWhereInput }): Promise<number> {
    return this.prisma.category.count({
      where: { ...params.where, isDeleted: false },
    });
  }
}

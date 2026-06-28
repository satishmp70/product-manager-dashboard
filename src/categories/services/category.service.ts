import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import type { ICategoryRepository } from '../interfaces/category-repository.interface';
import { Category } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepository.findByName(createCategoryDto.name);
    if (existing) {
      throw new ConflictException(`Category with name "${createCategoryDto.name}" already exists`);
    }
    return this.categoryRepository.create({
      name: createCategoryDto.name,
    });
  }

  async findAll(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.name = {
        contains: params.search,
      };
    }

    const [categories, total] = await Promise.all([
      this.categoryRepository.findAll({
        skip,
        take: limit,
        where,
        orderBy: { name: 'asc' },
      }),
      this.categoryRepository.count({ where }),
    ]);

    return {
      success: true,
      data: categories,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existing = await this.categoryRepository.findByName(updateCategoryDto.name);
      if (existing) {
        throw new ConflictException(`Category with name "${updateCategoryDto.name}" already exists`);
      }
    }

    return this.categoryRepository.update(id, {
      name: updateCategoryDto.name,
    });
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(id);
    // Soft delete category by setting isDeleted: true
    await this.categoryRepository.update(id, { isDeleted: true });
    return {
      success: true,
      message: `Category with ID "${id}" successfully deleted`,
    };
  }
}

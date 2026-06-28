import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import type { IProductRepository } from '../interfaces/product-repository.interface';
import type { ICategoryRepository } from '../../categories/interfaces/category-repository.interface';
import { FileStorageService } from '../../common/services/file-storage.service';
import { Product } from '@prisma/client';

const PRODUCT_SORT_FIELDS = new Set(['name', 'price', 'createdAt']);

@Injectable()
export class ProductService {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('ICategoryRepository')
    private readonly categoryRepository: ICategoryRepository,
    private readonly fileStorage: FileStorageService,
  ) {}

  async create(createProductDto: CreateProductDto, imagePath?: string): Promise<Product> {
    // Verify category exists
    const category = await this.categoryRepository.findById(createProductDto.categoryId);
    if (!category) {
      if (imagePath) this.fileStorage.delete(imagePath);
      throw new NotFoundException(`Category with ID "${createProductDto.categoryId}" not found`);
    }

    return this.productRepository.create({
      name: createProductDto.name,
      price: createProductDto.price,
      image: imagePath ? this.fileStorage.getPublicUploadPath(imagePath) : null,
      category: {
        connect: { id: createProductDto.categoryId },
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string; // price, name, createdAt
    sortOrder?: 'asc' | 'desc';
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filters
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) {
        where.price.gte = Number(params.minPrice);
      }
      if (params.maxPrice !== undefined) {
        where.price.lte = Number(params.maxPrice);
      }
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    // Search by product name or category name
    if (params.search) {
      where.OR = [
        {
          name: {
            contains: params.search,
          },
        },
        {
          category: {
            name: {
              contains: params.search,
            },
          },
        },
      ];
    }

    // Sorting
    const orderBy: any = {};
    const sortBy = PRODUCT_SORT_FIELDS.has(params.sortBy || '') ? params.sortBy! : 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      this.productRepository.findAll({
        skip,
        take: limit,
        where,
        orderBy,
      }),
      this.productRepository.count({ where }),
    ]);

    return {
      success: true,
      data: products,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, newImagePath?: string): Promise<Product> {
    const product = await this.findOne(id);

    const updateData: any = {};

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findById(updateProductDto.categoryId);
      if (!category) {
        if (newImagePath) this.fileStorage.delete(newImagePath);
        throw new NotFoundException(`Category with ID "${updateProductDto.categoryId}" not found`);
      }
      updateData.categoryId = updateProductDto.categoryId;
    }

    if (updateProductDto.name !== undefined) {
      updateData.name = updateProductDto.name;
    }

    if (updateProductDto.price !== undefined) {
      updateData.price = updateProductDto.price;
    }

    if (newImagePath) {
      // Delete old image if it exists
      if (product.image) {
        this.fileStorage.delete(product.image);
      }
      updateData.image = this.fileStorage.getPublicUploadPath(newImagePath);
    }

    return this.productRepository.update(id, updateData);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const product = await this.findOne(id);
    // Soft delete product by setting isDeleted: true
    await this.productRepository.update(id, { isDeleted: true });
    
    // We can choose to keep the image file on soft delete or delete it.
    // To preserve backup, we keep the image on disk.
    return {
      success: true,
      message: `Product with ID "${id}" successfully deleted`,
    };
  }
}

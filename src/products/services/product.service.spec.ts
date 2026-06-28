import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let mockProductRepo: any;
  let mockCategoryRepo: any;

  beforeEach(async () => {
    mockProductRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    };

    mockCategoryRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: 'IProductRepository',
          useValue: mockProductRepo,
        },
        {
          provide: 'ICategoryRepository',
          useValue: mockCategoryRepo,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Test Product', price: 99.99, categoryId: 'cat-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create product successfully', async () => {
      const mockCategory = { id: 'cat-id', name: 'Electronics' };
      const mockCreatedProduct = {
        id: 'prod-id',
        name: 'Test Product',
        price: 99.99,
        categoryId: 'cat-id',
      };

      mockCategoryRepo.findById.mockResolvedValue(mockCategory);
      mockProductRepo.create.mockResolvedValue(mockCreatedProduct);

      const result = await service.create({
        name: 'Test Product',
        price: 99.99,
        categoryId: 'cat-id',
      });

      expect(result).toEqual(mockCreatedProduct);
      expect(mockProductRepo.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if product is not found', async () => {
      mockProductRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return the product if found', async () => {
      const mockProduct = { id: 'prod-id', name: 'Product 1', price: 10 };
      mockProductRepo.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-id');
      expect(result).toEqual(mockProduct);
    });
  });
});

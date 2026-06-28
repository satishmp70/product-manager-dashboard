import { Product } from '@prisma/client';

export interface ProductCreateData {
  name: string;
  price: number;
  image?: string | null;
  category: {
    connect: {
      id: string;
    };
  };
}

export interface ProductUpdateData {
  name?: string;
  price?: number;
  image?: string | null;
  categoryId?: string;
  isDeleted?: boolean;
}

export interface ProductFindParams {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
}

export interface IProductRepository {
  create(data: ProductCreateData): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByUniqueId(uniqueId: string): Promise<Product | null>;
  update(id: string, data: ProductUpdateData): Promise<Product>;
  findAll(params: ProductFindParams): Promise<Product[]>;
  count(params: { where?: Record<string, unknown> }): Promise<number>;
}

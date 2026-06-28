import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { ProductRepository } from './repositories/product.repository';
import { CategoriesModule } from '../categories/categories.module';
import { FileStorageService } from '../common/services/file-storage.service';

@Module({
  imports: [CategoriesModule],
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: 'IProductRepository',
      useClass: ProductRepository,
    },
    FileStorageService,
  ],
  exports: [
    ProductService,
    'IProductRepository',
  ],
})
export class ProductsModule {}

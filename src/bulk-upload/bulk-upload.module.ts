import { Module } from '@nestjs/common';
import { BulkUploadService } from './services/bulk-upload.service';
import { BulkUploadController } from './controllers/bulk-upload.controller';

@Module({
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}

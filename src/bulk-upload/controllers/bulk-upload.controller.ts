import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkUploadService } from '../services/bulk-upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

// Specific multer options for bulk upload (accepts csv/xlsx)
const bulkUploadMulterOptions = {
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const uploadPath = './uploads/bulk';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req: any, file: any, cb: any) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (!file.originalname.match(/\.(csv|xlsx)$/i)) {
      return cb(new Error('Only CSV and XLSX files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
};

@Controller('bulk-upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', bulkUploadMulterOptions))
  async uploadFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    const jobId = await this.bulkUploadService.startBulkUpload(file.path, file.originalname);
    return {
      success: true,
      message: 'Bulk upload started successfully',
      data: { jobId },
    };
  }

  @Get('status/:jobId')
  async getStatus(@Param('jobId') jobId: string) {
    const status = this.bulkUploadService.getJobStatus(jobId);
    return {
      success: true,
      message: 'Job status retrieved successfully',
      data: status,
    };
  }
}

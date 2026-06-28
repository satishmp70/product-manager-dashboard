import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import * as ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';

export interface BulkUploadJob {
  id: string;
  filename: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  errors: Array<{ row: number; name?: string; error: string }>;
  startedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class BulkUploadService {
  private jobs: Map<string, BulkUploadJob> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  getJobStatus(jobId: string): BulkUploadJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new BadRequestException('Job not found');
    }
    return job;
  }

  async startBulkUpload(filePath: string, filename: string): Promise<string> {
    const jobId = randomUUID();
    const job: BulkUploadJob = {
      id: jobId,
      filename,
      status: 'PROCESSING',
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      errors: [],
      startedAt: new Date(),
    };
    this.jobs.set(jobId, job);

    // Run processing in background
    const fileExt = path.extname(filename).toLowerCase();
    if (fileExt === '.csv') {
      this.processCsv(jobId, filePath);
    } else if (fileExt === '.xlsx') {
      this.processXlsx(jobId, filePath);
    } else {
      job.status = 'FAILED';
      job.errors.push({ row: 0, error: 'Unsupported file format. Use CSV or XLSX.' });
      job.completedAt = new Date();
      this.deleteFile(filePath);
    }

    return jobId;
  }

  private async processCsv(jobId: string, filePath: string) {
    const job = this.jobs.get(jobId)!;
    const batchSize = 1000;
    let batch: any[] = [];
    let rowNumber = 1; // Row 1 is headers usually

    const stream = fs.createReadStream(filePath).pipe(csvParser());

    // Cache categories to avoid N+1 queries
    const categoryMap = await this.getCategoryMap();

    stream.on('data', (row: any) => {
      rowNumber++;
      batch.push({ rowNumber, data: row });

      if (batch.length >= batchSize) {
        stream.pause();
        this.processBatch(jobId, batch, categoryMap)
          .then(() => {
            batch = [];
            stream.resume();
          })
          .catch((err) => {
            this.handleJobError(jobId, err);
            stream.destroy();
          });
      }
    });

    stream.on('end', async () => {
      if (batch.length > 0) {
        try {
          await this.processBatch(jobId, batch, categoryMap);
        } catch (err) {
          this.handleJobError(jobId, err);
          this.deleteFile(filePath);
          return;
        }
      }
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      this.deleteFile(filePath);
    });

    stream.on('error', (err: any) => {
      this.handleJobError(jobId, err);
      this.deleteFile(filePath);
    });
  }

  private async processXlsx(jobId: string, filePath: string) {
    const job = this.jobs.get(jobId)!;
    const batchSize = 1000;
    let batch: any[] = [];
    let rowNumber = 0;

    // Cache categories
    const categoryMap = await this.getCategoryMap();

    try {
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
      for await (const worksheetReader of workbookReader) {
        for await (const row of worksheetReader) {
          rowNumber++;
          // Skip header row
          if (rowNumber === 1) continue;

          // Convert row values to object
          const values: any = row.values;
          // exceljs row values is 1-indexed, values[0] is undefined
          const rowData = {
            name: values[1],
            price: values[2],
            categoryName: values[3],
          };

          batch.push({ rowNumber, data: rowData });

          if (batch.length >= batchSize) {
            await this.processBatch(jobId, batch, categoryMap);
            batch = [];
          }
        }
      }

      if (batch.length > 0) {
        await this.processBatch(jobId, batch, categoryMap);
      }

      job.status = 'COMPLETED';
      job.completedAt = new Date();
    } catch (err: any) {
      this.handleJobError(jobId, err);
    } finally {
      this.deleteFile(filePath);
    }
  }

  private async processBatch(jobId: string, rawBatch: any[], categoryMap: Map<string, string>) {
    const job = this.jobs.get(jobId)!;
    const validProducts: any[] = [];
    const batchErrors: any[] = [];

    // 1. Validation & Mapping
    for (const item of rawBatch) {
      const { rowNumber, data } = item;
      const name = data.name || data.Name;
      const rawPrice = data.price || data.Price;
      const categoryName = data.categoryName || data.category || data.Category;

      if (!name) {
        batchErrors.push({ row: rowNumber, error: 'Product name is missing' });
        continue;
      }

      const price = Number(rawPrice);
      if (isNaN(price) || price < 0) {
        batchErrors.push({ row: rowNumber, name, error: 'Invalid or negative price' });
        continue;
      }

      if (!categoryName) {
        batchErrors.push({ row: rowNumber, name, error: 'Category name is missing' });
        continue;
      }

      let categoryId = categoryMap.get(categoryName.trim().toLowerCase());
      if (!categoryId) {
        // Auto-create category in db to be user-friendly, or return error. Let's auto-create it!
        // To prevent concurrent category creations triggering constraint failures, we'll synchronize category creations or log error.
        // For standard strict imports, we log an error. Let's log category missing.
        batchErrors.push({ row: rowNumber, name, error: `Category "${categoryName}" does not exist` });
        continue;
      }

      validProducts.push({
        name,
        price,
        categoryId,
      });
    }

    // 2. Batch inserts in transaction
    if (validProducts.length > 0) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Check for duplicate names inside this batch or in database
          // Note: In case of duplicates, we skip or fail. Let's check db duplicates and insert non-duplicates.
          // To follow "Rollback on failure" inside transaction:
          for (const product of validProducts) {
            // Check db if product with same name exists in that category
            const duplicate = await tx.product.findFirst({
              where: { name: product.name, categoryId: product.categoryId, isDeleted: false },
            });
            if (duplicate) {
              throw new Error(`Product "${product.name}" already exists in this category`);
            }
          }

          // Insert products
          await tx.product.createMany({
            data: validProducts,
          });
        });

        job.totalSuccess += validProducts.length;
      } catch (err: any) {
        // Rollback of chunk has happened. Let's mark all items in this batch as failed.
        job.totalFailed += validProducts.length;
        rawBatch.forEach((item) => {
          const name = item.data.name || item.data.Name;
          job.errors.push({
            row: item.rowNumber,
            name,
            error: `Chunk rolled back due to error: ${err.message}`,
          });
        });
      }
    }

    job.totalFailed += batchErrors.length;
    job.errors.push(...batchErrors);
    job.totalProcessed += rawBatch.length;
  }

  private async getCategoryMap(): Promise<Map<string, string>> {
    const categories = await this.prisma.category.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true },
    });
    const map = new Map<string, string>();
    categories.forEach((c) => {
      map.set(c.name.trim().toLowerCase(), c.id);
    });
    return map;
  }

  private handleJobError(jobId: string, err: any) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'FAILED';
      job.errors.push({ row: 0, error: err.message || 'Unknown processing error' });
      job.completedAt = new Date();
    }
  }

  private deleteFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete temp bulk upload file: ${filePath}`, err);
    }
  }
}

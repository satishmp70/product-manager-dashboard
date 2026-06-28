import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  private buildQueryWhere(params: {
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { isDeleted: false };

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
        // Set to end of the day so the full end date is included
        const endOfDay = new Date(params.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

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

    return where;
  }

  async streamCsv(
    res: Response,
    filters: {
      search?: string;
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products_report.csv"');
    res.write('Name,Price,Category,Created At\n');

    const where = this.buildQueryWhere(filters);
    let skip = 0;
    const take = 5000;

    while (true) {
      const products = await this.prisma.product.findMany({
        skip,
        take,
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });

      if (products.length === 0) break;

      for (const p of products) {
        const cleanName = p.name.replace(/"/g, '""');
        const cleanCatName = p.category.name.replace(/"/g, '""');
        res.write(
          `"${cleanName}",${Number(p.price)},"${cleanCatName}","${this.formatDate(p.createdAt)}"\n`,
        );
      }

      skip += take;
    }

    res.end();
  }

  async streamXlsx(
    res: Response,
    filters: {
      search?: string;
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Enterprise Product Manager';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Products');
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 25 },
    ];

    const where = this.buildQueryWhere(filters);
    let skip = 0;
    const take = 5000;

    while (true) {
      const products = await this.prisma.product.findMany({
        skip,
        take,
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });

      if (products.length === 0) break;

      for (const p of products) {
        worksheet.addRow({
          name: p.name,
          price: Number(p.price),
          category: p.category.name,
          createdAt: this.formatDate(p.createdAt),
        });
      }

      skip += take;
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getColumn('price').numFmt = '#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="products_report.xlsx"');
    res.setHeader('Content-Length', Buffer.byteLength(buffer));
    res.end(buffer);
  }
}

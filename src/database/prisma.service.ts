import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaMariaDb(process.env.DATABASE_URL || '');
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.warn('Could not connect to database on startup. Make sure MySQL is running and DATABASE_URL is correct.', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

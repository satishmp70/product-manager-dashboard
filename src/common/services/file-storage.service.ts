import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileStorageService {
  getPublicUploadPath(filePath: string): string {
    return `/uploads/${path.basename(filePath)}`;
  }

  delete(filePath: string): void {
    try {
      if (!filePath) return;

      const localPath = filePath.includes('/uploads/')
        ? `.${filePath.substring(filePath.indexOf('/uploads/'))}`
        : filePath;
      const resolvedPath = path.resolve(localPath);

      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
    } catch (error) {
      console.error(`Failed to delete file at ${filePath}:`, error);
    }
  }
}

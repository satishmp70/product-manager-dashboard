import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';

export const multerOptions = {
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const uploadPath = process.env.UPLOAD_DIR || './uploads';
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
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

export const deleteFile = (filePath: string) => {
  try {
    if (!filePath) return;
    // If it's a URL, convert it to a relative path
    let localPath = filePath;
    if (filePath.includes('/uploads/')) {
      localPath = '.' + filePath.substring(filePath.indexOf('/uploads/'));
    }
    const resolvedPath = path.resolve(localPath);
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  } catch (err) {
    console.error(`Failed to delete file at ${filePath}:`, err);
  }
};

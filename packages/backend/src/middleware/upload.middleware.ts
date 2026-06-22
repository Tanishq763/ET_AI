import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import { env } from '../config/env';
import { Request } from 'express';

const storage = new GridFsStorage({
  url: env.MONGODB_URI,
  options: { dbName: env.MONGODB_DB_NAME },
  file: (req: Request, file: Express.Multer.File) => {
    return {
      bucketName: 'documents',
      filename: `${Date.now()}-${file.originalname}`,
      metadata: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
      },
    };
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // in bytes
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = env.ALLOWED_MIME_TYPES.split(',');
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${env.ALLOWED_MIME_TYPES}`));
    }
  },
});

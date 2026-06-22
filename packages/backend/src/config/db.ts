import mongoose from 'mongoose';
import { env } from './env';
import gridfs from 'gridfs-stream';

let gfs: gridfs.Grid;
let gridFSBucket: mongoose.mongo.GridFSBucket;

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    const db = conn.connection.db;
    if (!db) {
      throw new Error('Database connection is not initialized');
    }

    gridFSBucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'documents',
    });

    gfs = gridfs(db, mongoose.mongo);
    gfs.collection('documents');
    
    console.log('✅ GridFS Bucket Initialized');
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error}`);
    process.exit(1);
  }
};

export const getGridFSBucket = (): mongoose.mongo.GridFSBucket => {
  if (!gridFSBucket) {
    throw new Error('GridFSBucket has not been initialized. Call connectDB first.');
  }
  return gridFSBucket;
};

export const getGFS = (): gridfs.Grid => {
  if (!gfs) {
    throw new Error('GridFS stream has not been initialized. Call connectDB first.');
  }
  return gfs;
};

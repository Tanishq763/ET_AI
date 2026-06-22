import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.preprocess((val) => Number(val), z.number()).default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1).default('ikip_production'),
  REDIS_URL: z.string().min(1),
  NEO4J_URI: z.string().min(1),
  NEO4J_USERNAME: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),
  QDRANT_URL: z.string().min(1),
  QDRANT_API_KEY: z.string().optional().default(''),
  QDRANT_COLLECTION_NAME: z.string().default('ikip_chunks'),
  GOOGLE_AI_API_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('24h'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  AI_SERVICES_URL: z.string().url().default('http://localhost:8000'),
  AI_SERVICES_API_KEY: z.string().min(1),
  MAX_FILE_SIZE_MB: z.preprocess((val) => Number(val), z.number()).default(100),
  ALLOWED_MIME_TYPES: z.string().default('application/pdf,image/png,image/jpeg'),
  RATE_LIMIT_WINDOW_MS: z.preprocess((val) => Number(val), z.number()).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.preprocess((val) => Number(val), z.number()).default(200),
  QUERY_RATE_LIMIT_PER_MINUTE: z.preprocess((val) => Number(val), z.number()).default(30),
  COMPLIANCE_SCAN_CRON: z.string().default('0 2 * * *'),
  LESSONS_ANALYSIS_CRON: z.string().default('*/30 * * * *'),
  PROMETHEUS_PORT: z.preprocess((val) => Number(val), z.number()).default(9090),
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import axios from 'axios';
import { env } from '../config/env';
import { DocumentModel } from '../models/Document.model';
import { emitToPlant } from '../socket/socket.manager';
import { SOCKET_EVENTS } from '../socket/events';

const connection = getRedisConnection();

export const initIngestionWorker = (): Worker => {
  const worker = new Worker(
    'ingestion',
    async (job: Job) => {
      const { documentId, gridfsId, plantId, docType, title } = job.data;
      console.log(`👷 Processing Ingestion Job ${job.id} for document ${documentId}`);

      try {
        // Update document status in Mongo to processing
        await DocumentModel.findByIdAndUpdate(documentId, {
          ingestionStatus: 'processing',
          ingestionStartedAt: new Date(),
        });

        // Notify client that ingestion started
        emitToPlant(plantId, SOCKET_EVENTS.INGESTION_QUEUED, { documentId, title });

        // Forward to Python Ingest endpoint
        const response = await axios.post(`${env.AI_SERVICES_URL}/ingest/document`, {
          gridfsId,
          documentId,
          plantId,
          docType,
        });

        const pythonJob = response.data;
        const pythonJobId = pythonJob.jobId;

        if (!pythonJobId) {
          throw new Error('Python service did not return a valid jobId');
        }

        // Poll python status until completed or failed
        let completed = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max (5s * 60)
        
        while (!completed && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;

          const statusRes = await axios.get(`${env.AI_SERVICES_URL}/ingest/status/${pythonJobId}`);
          const { status, progress, errors, entityCount, kgNodesCreated } = statusRes.data;

          console.log(`⏳ Document Ingestion Status (${attempts}/${maxAttempts}): ${status} - Progress: ${progress}%`);

          if (status === 'completed') {
            completed = true;
            console.log(`🎉 Ingestion completed successfully for doc: ${documentId}`);
            
            // Notify client of success
            emitToPlant(plantId, SOCKET_EVENTS.INGESTION_COMPLETE, {
              documentId,
              entityCount: entityCount || 0,
              kgNodesCreated: kgNodesCreated || 0,
            });
            break;
          }

          if (status === 'failed') {
            throw new Error(errors || 'Python ingestion pipeline reported a failure.');
          }
        }

        if (!completed) {
          throw new Error('Ingestion timed out on Python service.');
        }

      } catch (error: any) {
        const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
        console.error(`❌ Ingestion Job ${job.id} failed:`, errorMsg);
        
        await DocumentModel.findByIdAndUpdate(documentId, {
          ingestionStatus: 'failed',
          ingestionError: errorMsg,
          ingestionCompletedAt: new Date(),
        });

        emitToPlant(plantId, SOCKET_EVENTS.INGESTION_FAILED, { documentId, error: errorMsg });
        throw new Error(errorMsg);
      }
    },
    { connection: connection as any }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Ingestion Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Ingestion Job ${job?.id} failed with: ${err.message}`);
  });

  return worker;
};

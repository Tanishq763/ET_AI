import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import axios from 'axios';
import { env } from '../config/env';
import { emitToPlant } from '../socket/socket.manager';
import { SOCKET_EVENTS } from '../socket/events';

const connection = getRedisConnection();

export const initComplianceWorker = (): Worker => {
  const worker = new Worker(
    'compliance',
    async (job: Job) => {
      const { plantId, regulations } = job.data;
      console.log(`👷 Processing Compliance Scan Job ${job.id} for plant ${plantId}`);

      try {
        const response = await axios.post(`${env.AI_SERVICES_URL}/compliance/full-scan`, {
          plantId,
          regulations: regulations || ['OISD-118', 'FactoryAct-1948-S7', 'PESO-2016'],
        });

        const pythonJob = response.data;
        const pythonJobId = pythonJob.jobId;

        if (!pythonJobId) {
          throw new Error('Python service did not return a valid compliance jobId');
        }

        // Wait or let it run in background. We can poll until done, similar to ingestion.
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30; // 2.5 minutes max
        
        while (!completed && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;

          const statusRes = await axios.get(`${env.AI_SERVICES_URL}/compliance/status/${pythonJobId}`);
          const { status, gapCount, criticalGaps } = statusRes.data;

          if (status === 'completed') {
            completed = true;
            console.log(`🎉 Compliance scan completed for plant: ${plantId}`);
            
            emitToPlant(plantId, SOCKET_EVENTS.COMPLIANCE_ALERT, {
              regulation: regulations ? regulations.join(', ') : 'All',
              severity: criticalGaps > 0 ? 'High' : 'Medium',
              gapCount: gapCount || 0,
              plantId,
            });
            break;
          }

          if (status === 'failed') {
            throw new Error('Compliance scan failed on Python side.');
          }
        }
      } catch (error: any) {
        console.error(`❌ Compliance Scan Job ${job.id} failed:`, error.message);
        throw error;
      }
    },
    { connection: connection as any }
  );

  return worker;
};

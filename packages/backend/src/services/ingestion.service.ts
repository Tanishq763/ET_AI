import { ingestionQueue } from '../jobs/queues';
import { DocType } from '@ikip/shared';

export const enqueueIngestion = async (
  documentId: string,
  gridfsId: string,
  plantId: string,
  docType: DocType,
  title: string
): Promise<string> => {
  const job = await ingestionQueue.add(
    'ingestion-job',
    {
      documentId,
      gridfsId,
      plantId,
      docType,
      title,
    },
    {
      jobId: documentId, // ensures idempotency (no duplicate queues for same document)
    }
  );

  return job.id || '';
};

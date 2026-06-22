import { emitToPlant, emitToRoom, broadcastNotification } from '../socket/socket.manager';
import { SOCKET_EVENTS } from '../socket/events';

export const sendIngestionUpdate = (plantId: string, status: 'queued' | 'complete' | 'failed', data: any) => {
  let event: string = SOCKET_EVENTS.INGESTION_QUEUED;
  if (status === 'complete') event = SOCKET_EVENTS.INGESTION_COMPLETE;
  if (status === 'failed') event = SOCKET_EVENTS.INGESTION_FAILED;

  emitToPlant(plantId, event, data);
};

export const sendComplianceAlert = (plantId: string, regulation: string, severity: 'High' | 'Medium', gapCount: number) => {
  emitToPlant(plantId, SOCKET_EVENTS.COMPLIANCE_ALERT, {
    regulation,
    severity,
    gapCount,
    plantId,
  });
};

export const sendLessonsPatternAlert = (
  plantId: string,
  alertId: string,
  pattern: string,
  urgency: 'Low' | 'Medium' | 'High' | 'Critical',
  affectedEquipment: string[]
) => {
  // Push alerts to field room
  emitToRoom(`plant:${plantId}:field_technicians`, SOCKET_EVENTS.LESSONS_PATTERN_ALERT, {
    alertId,
    pattern,
    urgency,
    affectedEquipment,
    timestamp: new Date(),
  });
  
  // Push to supervisors too
  emitToRoom(`plant:${plantId}:maintenance_supervisors`, SOCKET_EVENTS.LESSONS_PATTERN_ALERT, {
    alertId,
    pattern,
    urgency,
    affectedEquipment,
    timestamp: new Date(),
  });
};

export const sendBroadcastMessage = (message: string, type: 'info' | 'warning' | 'success', plantId?: string) => {
  broadcastNotification(message, type, plantId);
};

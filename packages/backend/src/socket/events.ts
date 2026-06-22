export const SOCKET_EVENTS = {
  INGESTION_QUEUED: 'ingestion:queued',
  INGESTION_COMPLETE: 'ingestion:complete',
  INGESTION_FAILED: 'ingestion:failed',
  COMPLIANCE_ALERT: 'compliance:alert',
  LESSONS_PATTERN_ALERT: 'lessons:pattern_alert',
  WORKORDER_RCA_READY: 'workorder:rca_ready',
  QUERY_TOKEN: 'query:token',
  NOTIFICATION_BROADCAST: 'notification:broadcast',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

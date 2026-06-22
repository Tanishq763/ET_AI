import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, Memory, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// Define custom metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10], // seconds
});

export const ingestionJobsCounter = new client.Counter({
  name: 'ikip_ingestion_jobs_total',
  help: 'Total number of document ingestion jobs processed',
  labelNames: ['status', 'doc_type'],
});

export const complianceScansCounter = new client.Counter({
  name: 'ikip_compliance_scans_total',
  help: 'Total number of regulatory compliance scans triggered',
  labelNames: ['status'],
});

export const activeSocketConnections = new client.Gauge({
  name: 'ikip_active_socket_connections',
  help: 'Current number of active plant room websocket connections',
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(ingestionJobsCounter);
register.registerMetric(complianceScansCounter);
register.registerMetric(activeSocketConnections);

export default {
  register,
  httpRequestDurationMicroseconds,
  ingestionJobsCounter,
  complianceScansCounter,
  activeSocketConnections,
};

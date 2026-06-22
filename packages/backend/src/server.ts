import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { initSocket } from './socket/socket.manager';
import { initIngestionWorker } from './jobs/ingestion.worker';
import { initComplianceWorker } from './jobs/compliance.worker';
import { closeNeo4j } from './config/neo4j';

const startServer = async () => {
  try {
    // 1. Connect database stores
    await connectDB();

    // 2. Initialize Express application & HTTP server wrapper
    const app = createApp();
    const server = createServer(app);

    // 3. Initialize Socket.IO connection manager
    initSocket(server);

    // 4. Initialize background workers for job queues
    const ingestionWorker = initIngestionWorker();
    const complianceWorker = initComplianceWorker();

    console.log('👷 Background workers connected to Redis queue');

    // 5. Start listening
    server.listen(env.PORT, () => {
      console.log(`🚀 IKIP Express Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🔒 Received ${signal}. Closing connections...`);
      
      await ingestionWorker.close();
      await complianceWorker.close();
      await closeNeo4j();
      
      server.close(() => {
        console.log('🛑 Server stopped. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Server startup failure:', error);
    process.exit(1);
  }
};

startServer();

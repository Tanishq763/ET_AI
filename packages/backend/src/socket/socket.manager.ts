import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JWTPayload, UserRole } from '@ikip/shared';
import { SOCKET_EVENTS } from './events';

let io: Server | null = null;

export const initSocket = (server: HTTPServer): Server => {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      socket.data.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JWTPayload;
    const { plantId, role, sub: userId } = user;

    console.log(`🔌 Client connected: ${userId} (${role}) on socket ${socket.id}`);

    // Join plant room
    const plantRoom = `plant:${plantId}`;
    socket.join(plantRoom);
    console.log(`👤 User ${userId} joined room ${plantRoom}`);

    // Join role room within plant
    const roleRoom = `plant:${plantId}:${role.toLowerCase()}s`; // e.g. plant:1234:engineers
    socket.join(roleRoom);
    console.log(`👤 User ${userId} joined role room ${roleRoom}`);

    // If technician or operator, join field room
    if (role === 'Technician' || role === 'Operator') {
      const techniciansRoom = `plant:${plantId}:field_technicians`;
      socket.join(techniciansRoom);
      console.log(`👤 User ${userId} joined technicians room ${techniciansRoom}`);
    }

    // If engineer or admin or manager, join supervisor/manager room
    if (role === 'Engineer' || role === 'PlantAdmin' || role === 'SuperAdmin') {
      const supervisorRoom = `plant:${plantId}:maintenance_supervisors`;
      socket.join(supervisorRoom);
      console.log(`👤 User ${userId} joined supervisor room ${supervisorRoom}`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
};

// Room emission helpers
export const emitToPlant = (plantId: string, event: string, payload: any): void => {
  getIO().to(`plant:${plantId}`).emit(event, payload);
};

export const emitToRoleInPlant = (plantId: string, role: UserRole, event: string, payload: any): void => {
  getIO().to(`plant:${plantId}:${role.toLowerCase()}s`).emit(event, payload);
};

export const emitToRoom = (roomName: string, event: string, payload: any): void => {
  getIO().to(roomName).emit(event, payload);
};

export const broadcastNotification = (message: string, type: 'info' | 'warning' | 'success', plantId?: string): void => {
  const payload = { message, type, plantId, timestamp: new Date() };
  if (plantId) {
    emitToPlant(plantId, SOCKET_EVENTS.NOTIFICATION_BROADCAST, payload);
  } else {
    getIO().emit(SOCKET_EVENTS.NOTIFICATION_BROADCAST, payload);
  }
};

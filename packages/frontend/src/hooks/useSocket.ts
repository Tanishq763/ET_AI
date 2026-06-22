import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { useNotificationStore } from '../store/notification.store';
import { useDocumentStore } from '../store/document.store';
import toast from 'react-hot-toast';
import { API_URL } from '../api/client';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const addAlert = useNotificationStore((state) => state.addAlert);
  const updateUploadStatus = useDocumentStore((state) => state.updateUploadStatus);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to WebSocket server
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO Server');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
    });

    // 1. Ingestion Events
    socket.on('ingestion:queued', (data) => {
      console.log('Queued:', data);
      updateUploadStatus(data.documentId, 'processing');
      toast.loading(`Ingestion queued: ${data.title}`, { id: data.documentId });
    });

    socket.on('ingestion:complete', (data) => {
      console.log('Completed:', data);
      updateUploadStatus(data.documentId, 'completed');
      toast.dismiss(data.documentId);
      toast.success('Document parsing and Knowledge Graph linkage completed!', { duration: 5000 });
    });

    socket.on('ingestion:failed', (data) => {
      console.log('Failed:', data);
      updateUploadStatus(data.documentId, 'failed', data.error);
      toast.dismiss(data.documentId);
      toast.error(`Ingestion failed: ${data.error}`, { duration: 5000 });
    });

    // 2. Compliance Alerts
    socket.on('compliance:alert', (data) => {
      console.log('Compliance Alert:', data);
      addAlert({
        type: 'compliance',
        title: `Compliance Breach: ${data.regulation}`,
        message: `Discovered ${data.gapCount} potential procedural non-conformity gaps. Severity is ${data.severity}.`,
        urgency: data.severity === 'High' ? 'Critical' : 'High',
        timestamp: new Date(),
      });
      toast.error(`⚠️ Compliance Alert: ${data.gapCount} non-compliant gaps detected in ${data.regulation}!`, { duration: 6000 });
    });

    // 3. Lessons Learned / Incident Patterns
    socket.on('lessons:pattern_alert', (data) => {
      console.log('Lessons Pattern Alert:', data);
      addAlert({
        type: 'lessons',
        title: `Systemic Failure Alert`,
        message: data.message || `Repeated failure pattern observed on equipment: ${data.affectedEquipment.join(', ')}`,
        urgency: data.urgency || 'High',
        timestamp: new Date(),
      });
      toast(`🚨 Alert: Systemic failure pattern detected!`, { icon: '🚨', duration: 7000 });
    });

    // 4. Custom Broadcasts
    socket.on('notification:broadcast', (data) => {
      toast(data.message, { icon: data.type === 'warning' ? '⚠️' : 'ℹ️' });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, addAlert, updateUploadStatus]);

  return socketRef.current;
};

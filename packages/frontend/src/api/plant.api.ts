import { api, API_URL } from './client';

export const plantApi = {
  // --- Equipment ---
  listEquipment: async (params?: any) => {
    const res = await api.get('/equipment', { params });
    return res.data;
  },
  getEquipmentPassport: async (tag: string) => {
    const res = await api.get(`/equipment/${encodeURIComponent(tag)}`);
    return res.data;
  },
  createEquipment: async (data: any) => {
    const res = await api.post('/equipment', data);
    return res.data;
  },
  updateEquipment: async (tag: string, data: any) => {
    const res = await api.put(`/equipment/${encodeURIComponent(tag)}`, data);
    return res.data;
  },

  // --- Work Orders ---
  listWorkOrders: async (params?: any) => {
    const res = await api.get('/workorders', { params });
    return res.data;
  },
  getWorkOrder: async (id: string) => {
    const res = await api.get(`/workorders/${id}`);
    return res.data;
  },
  createWorkOrder: async (data: any) => {
    const res = await api.post('/workorders', data);
    return res.data;
  },
  getWorkOrderRCA: async (id: string) => {
    const res = await api.get(`/workorders/${id}/rca`);
    return res.data;
  },

  // --- Incidents ---
  listIncidents: async (params?: any) => {
    const res = await api.get('/incidents', { params });
    return res.data;
  },
  getIncident: async (id: string) => {
    const res = await api.get(`/incidents/${id}`);
    return res.data;
  },
  createIncident: async (data: any) => {
    const res = await api.post('/incidents', data);
    return res.data;
  },
  getIncidentAnalysis: async (id: string) => {
    const res = await api.get(`/incidents/${id}/analysis`);
    return res.data;
  },

  // --- Compliance ---
  getComplianceDashboard: async () => {
    const res = await api.get('/compliance/dashboard');
    return res.data;
  },
  listComplianceGaps: async (params?: any) => {
    const res = await api.get('/compliance/gaps', { params });
    return res.data;
  },
  triggerComplianceScan: async (regulations?: string[]) => {
    const res = await api.post('/compliance/scan', { regulations });
    return res.data;
  },
  getAuditPackageUrl: (regulationCode: string) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/api/v1/compliance/evidence-package/${regulationCode}?token=${token}`;
  },

  // --- Dashboard ---
  getKPIs: async () => {
    const res = await api.get('/dashboard/kpis');
    return res.data;
  },
  getAlerts: async () => {
    const res = await api.get('/dashboard/alerts');
    return res.data;
  }
};
export default plantApi;

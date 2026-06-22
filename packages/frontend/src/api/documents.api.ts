import { api, API_URL } from './client';

export const documentsApi = {
  list: async (params: any) => {
    const res = await api.get('/documents', { params });
    return res.data;
  },

  upload: async (formData: FormData) => {
    const res = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  getMetadata: async (id: string) => {
    const res = await api.get(`/documents/${id}`);
    return res.data;
  },

  getDownloadUrl: (id: string) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/api/v1/documents/${id}/download?token=${token}`;
  },

  getChunks: async (id: string) => {
    const res = await api.get(`/documents/${id}/chunks`);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },

  reingest: async (id: string) => {
    const res = await api.post(`/documents/${id}/reingest`);
    return res.data;
  }
};
export default documentsApi;

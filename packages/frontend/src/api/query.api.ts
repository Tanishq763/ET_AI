import { api } from './client';

export const queryApi = {
  getHistory: async (page = 1, limit = 10) => {
    const res = await api.get('/query/history', { params: { page, limit } });
    return res.data;
  },

  getDetail: async (id: string) => {
    const res = await api.get(`/query/${id}`);
    return res.data;
  }
};

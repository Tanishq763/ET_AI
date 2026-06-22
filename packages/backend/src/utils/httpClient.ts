import axios from 'axios';
import { env } from '../config/env';

export const aiClient = axios.create({
  baseURL: env.AI_SERVICES_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': env.AI_SERVICES_API_KEY,
  },
  timeout: 60000, // 60s timeout for heavy parsing steps
});

aiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ AI Microservice Request Failed:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
export default aiClient;

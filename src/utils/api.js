import axios from 'axios';

const api = axios.create({
  withCredentials: import.meta.env.VITE_WITH_CREDENTIALS === 'true',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
});

export default api;
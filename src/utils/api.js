import axios from 'axios';

// 기본 타임아웃: 5분 (300000ms)
const DEFAULT_TIMEOUT = 300000;

// 환경 변수에서 타임아웃 값 가져오기
const getApiTimeout = () => {
  const envTimeout = import.meta.env.VITE_API_TIMEOUT;
  // 환경 변수가 정의되고 유효한 숫자인 경우 사용, 아니면 기본값
  const timeout = envTimeout && !isNaN(parseInt(envTimeout)) ? parseInt(envTimeout) : DEFAULT_TIMEOUT;
  return timeout;
};

const api = axios.create({
  withCredentials: import.meta.env.VITE_WITH_CREDENTIALS === 'true',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: getApiTimeout(),
});

export default api;
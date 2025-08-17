import axios from 'axios';
import useStore from '../store/store'; // Zustand 스토어 임포트

const CLIENT_VERSION = import.meta.env.__BUILD_HASH__ || 'local-dev'; // Vite 환경 변수 참조, 폴백

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


// 요청 인터셉터: sessionStorage의 clientVersion 우선 사용
api.interceptors.request.use(config => {
  const { clientVersion } = useStore.getState();
  config.headers['X-Client-Version'] = clientVersion || CLIENT_VERSION;
  return config;
});

// 응답 인터셉터: 버전 불일치 시 sessionStorage 갱신 및 새로고침
api.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    if (error.response && error.response.status === 418) {
      const serverVersion = error.response.headers['x-server-version'] || error.response.data;
      if (serverVersion && serverVersion !== useStore.getState().clientVersion) {
        alert('서버가 재시작되었습니다.\n다시 로그인하시기 바랍니다.');
        useStore.getState().setClientVersion(serverVersion);
        sessionStorage.removeItem('user-storage');
        window.location.reload(true); // 캐시 무시 새로고침, 로그인 화면 이동
      }
    }
    return Promise.reject(error);
  }
);


export default api;
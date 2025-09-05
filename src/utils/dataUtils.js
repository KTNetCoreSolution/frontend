import api from './api';
import common from './common';
import useStore from '../store/store';

/**
 * 진행률 시뮬레이션 함수
 * @param {Function} setLoading - 로딩 상태를 설정하는 함수
 * @param {number} totalDuration - 전체 진행 시간 (밀리초, 기본 200ms)
 * @returns {Promise<void>} 진행률 시뮬레이션 완료 후 resolve
 */
const simulateProgress = async (setLoading, totalDuration = 200) => {
  const interval = 100;
  const increment = 100 / (totalDuration / interval);
  let currentProgress = 0;

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      currentProgress = Math.min(currentProgress + increment, 90);
      setLoading({ isLoading: true, progress: currentProgress });
    }, interval);

    setTimeout(() => {
      clearInterval(timer);
      setLoading({ isLoading: true, progress: 100 });
      resolve();
    }, totalDuration);
  });
};

/**
 * 로딩 상태와 진행률을 처리하는 공통 함수
 * @param {Function} setLoading - 로딩 상태를 설정하는 함수
 * @param {boolean} progressShow - 진행률 표시 여부
 * @param {number} [totalDuration=200] - 전체 진행 시간 (밀리초)
 * @returns {Promise<void>}
 */
const handleLoadingProgress = async (setLoading, progressShow, totalDuration = 200) => {
  if (!setLoading) {
    console.error('setLoading 함수가 정의되지 않았습니다.');
    return;
  }
  if (!progressShow) {
    setLoading({ isLoading: true, progress: 0 });
    return;
  }
  
  setLoading({ isLoading: true, progress: 0 });
  await simulateProgress(setLoading, totalDuration);
};

/**
 * JSON 데이터를 필터링하여 반환합니다.
 * @param {Object|Array} jsonData - 필터링할 JSON 데이터 (객체 또는 배열)
 * @param {Object} [filters={}] - 필터링 조건 (예: { name: 'john', status: 'active' })
 * @returns {Promise<Array|Error>} 필터링된 데이터 배열 또는 오류 객체
 */
export async function fetchJsonData(jsonData, filters = {}) {
  try {
    // Ensure jsonData is an array for consistent processing
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

    // Apply client-side filtering based on filters
    const filteredData = dataArray.filter(item => {
      let matches = true;
      for (const [key, value] of Object.entries(filters)) {
        if (value && item[key] !== value) {
          matches = false;
          break;
        }
      }
      return matches;
    });

    // Simulate async behavior to align with fetchData
    await new Promise(resolve => setTimeout(resolve, 0));

    return filteredData;
  } catch (error) {
    console.error('JSON 데이터 처리 실패:', error.message);
    const errMsg = error.response?.data?.errMsg || error.message || '서버 요청에 실패했습니다.';
    throw new Error(errMsg); // errMsg를 포함한 오류 던지기
  }
}

/**
 * API를 통해 데이터를 가져오고 클라이언트 측에서 필터링을 수행합니다.
 * @param {string} url - 데이터를 요청할 엔드포인트 URL
 * @param {Object} [filters={}] - 필터링 조건 (예: { name: 'john', status: 'active' })
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @param {Object} [directYn] - 지정 URL 사용유무
 * @returns {Promise<any|Error>} 응답 데이터 (배열 또는 객체) 또는 오류 객체
 */
export async function fetchData(url, filters = {}, config = {}, directYn = 'N', progressShow = true) {
  url = (directYn != 'Y') ? common.getServerUrl(url) : url;
  const { setLoading } = useStore.getState();
  try {
    await handleLoadingProgress(setLoading, progressShow);
    const response = await api.post(`${url}`, filters, config);
    return response.data;
  } catch (error) {
    console.error('데이터 가져오기 실패:', error.message, error.response?.data);
    const errMsg = error.response?.data?.errMsg || error.message || '서버 요청에 실패했습니다.';
    throw new Error(errMsg); // errMsg를 포함한 오류 던지기
  } finally {
    if(progressShow) setLoading({ isLoading: false, progress: 0 });
  }
}

/**
 * API를 통해 데이터를 가져오고 클라이언트 측에서 필터링을 수행합니다. (GET 방식)
 * @param {string} url - 데이터를 요청할 엔드포인트 URL
 * @param {Object} [filters={}] - 쿼리 파라미터로 보낼 필터링 조건
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @param {Object} [directYn] - 지정 URL 사용유무
 * @returns {Promise<any|Error>} 응답 데이터 (배열 또는 객체) 또는 오류 객체
 */
export async function fetchDataGet(url, filters = {}, config = {}, directYn = 'N', progressShow = true) {
  url = (directYn != 'Y') ? common.getServerUrl(url) : url;
  const { setLoading } = useStore.getState();
  try {
    await handleLoadingProgress(setLoading, progressShow);
    const queryParams = new URLSearchParams(filters).toString();
    const fullUrl = queryParams ? `${url}?${queryParams}` : `${url}`;
    const response = await api.get(fullUrl, config);
    return response.data;
  } catch (error) {
    console.error('데이터 가져오기 실패 (GET):', error.message, error.response?.data);
    const errMsg = error.response?.data?.errMsg || error.message || '서버 요청에 실패했습니다.';
    throw new Error(errMsg); // errMsg를 포함한 오류 던지기
  } finally {
    if(progressShow) setLoading({ isLoading: false, progress: 0 });
  }
}

/**
 * API를 통해 파일 데이터를 가져옵니다.
 * @param {string} url - 데이터를 요청할 엔드포인트 URL
 * @param {Object} params - 요청 파라미터
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @param {Object} [directYn] - 지정 URL 사용유무
 * @returns {Promise<Object>} 응답 데이터 또는 오류 메시지
 */
export const fetchFileData = async (url, params, config = {}, directYn = 'N', progressShow = true) => {
  url = (directYn != 'Y') ? common.getServerUrl(url) : url;
  const { setLoading } = useStore.getState();
  try {
    await handleLoadingProgress(setLoading, progressShow);
    const response = await api.post(`${url}`, params, config);
    return response.data || { success: false, message: "No data returned" };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Request failed",
    };
  } finally {
    if(progressShow) setLoading({ isLoading: false, progress: 0 });
  }
};

/**
 * API를 통해 파일을 업로드합니다.
 * @param {string} url - 업로드할 엔드포인트 URL
 * @param {FormData} formData - 업로드할 파일 데이터
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @param {Object} [directYn] - 지정 URL 사용유무
 * @returns {Promise<Object>} 응답 데이터 또는 오류 메시지
 */
export const fetchFileUpload = async (url, formData, config = {}, directYn = 'N') => {
  const { setLoading } = useStore.getState();
  url = (directYn != 'Y') ? common.getServerUrl(url) : url;

  try {
    setLoading({ isLoading: true, progress: 0 });
    const response = await api.post(`${url}`, formData, {
      ...config,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setLoading({ isLoading: true, progress });
      },
    });
    return response.data || { success: false, message: "No data returned" };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Upload failed",
    };
  } finally {
    setLoading({ isLoading: false, progress: 0 });
  }
};

/****** 외부 API를 통신하는 경우 URL를 Direct로 한다. ******/

/**
 * API를 통해 데이터를 가져오고 클라이언트 측에서 필터링을 수행합니다.
 * @param {string} url - 데이터를 요청할 엔드포인트 URL
 * @param {Object} [filters={}] - 필터링 조건 (예: { name: 'john', status: 'active' })
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @returns {Promise<any|Error>} 응답 데이터 (배열 또는 객체) 또는 오류 객체
 */
export async function externalFetchData(url, filters = {}, config = {}, progressShow = true) {
  const { setLoading } = useStore.getState();
  try {
    await handleLoadingProgress(setLoading, progressShow);
    const response = await api.post(url, filters, config);
    return response.data;
  } catch (error) {
    console.error('데이터 가져오기 실패:', error.message, error.response?.data);
    const errMsg = error.response?.data?.errMsg || error.message || '서버 요청에 실패했습니다.';
    throw new Error(errMsg); // errMsg를 포함한 오류 던지기
  } finally {
    if(progressShow) setLoading({ isLoading: false, progress: 0 });
  }
}

/**
 * API를 통해 데이터를 가져오고 클라이언트 측에서 필터링을 수행합니다. (GET 방식)
 * @param {string} url - 데이터를 요청할 엔드포인트 URL
 * @param {Object} [filters={}] - 쿼리 파라미터로 보낼 필터링 조건
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @returns {Promise<any|Error>} 응답 데이터 (배열 또는 객체) 또는 오류 객체
 */
export async function externalFetchDataGet(url, filters = {}, config = {}, progressShow = true) {
  const { setLoading } = useStore.getState();
  try {
    await handleLoadingProgress(setLoading, progressShow);
    const queryParams = new URLSearchParams(filters).toString();
    const fullUrl = queryParams ? `${url}?${queryParams}` : url;
    const response = await api.get(fullUrl, config);
    return response.data;
  } catch (error) {
    console.error('데이터 가져오기 실패 (GET):', error.message, error.response?.data);
    const errMsg = error.response?.data?.errMsg || error.message || '서버 요청에 실패했습니다.';
    throw new Error(errMsg); // errMsg를 포함한 오류 던지기
  } finally {
    if(progressShow) setLoading({ isLoading: false, progress: 0 });
  }
}

/**
 * API를 통해 파일 데이터를 가져옵니다.
 * @param {string} url - 데이터를 요청할 엔드포인트 URL
 * @param {Object} params - 요청 파라미터
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @returns {Promise<Object>} 응답 데이터 또는 오류 메시지
 */
export const externalFetchFileData = async (url, params, config = {}, progressShow = true) => {
  const { setLoading } = useStore.getState();
  try {
    await handleLoadingProgress(setLoading, progressShow);
    const response = await api.post(url, params, config);
    return response.data || { success: false, message: "No data returned" };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Request failed",
    };
  } finally {
    if(progressShow) setLoading({ isLoading: false, progress: 0 });
  }
};

/**
 * API를 통해 파일을 업로드합니다.
 * @param {string} url - 업로드할 엔드포인트 URL
 * @param {FormData} formData - 업로드할 파일 데이터
 * @param {Object} [config={}] - 추가 axios 설정 (예: headers)
 * @returns {Promise<Object>} 응답 데이터 또는 오류 메시지
 */
export const externalFetchFileUpload = async (url, formData, config = {}) => {
  const { setLoading } = useStore.getState();
  try {
    setLoading({ isLoading: true, progress: 0 });
    const response = await api.post(url, formData, {
      ...config,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setLoading({ isLoading: true, progress });
      },
    });
    return response.data || { success: false, message: "No data returned" };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Upload failed",
    };
  } finally {
    setLoading({ isLoading: false, progress: 0 });
  }
};
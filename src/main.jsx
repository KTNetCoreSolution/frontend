import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import common from './utils/common';
import "bootstrap/dist/css/bootstrap.css"; // 부트스트랩 CSS 먼저 로드
import "bootstrap-icons/font/bootstrap-icons.css"; // 부트스트랩 아이콘 CSS 로드
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // 로컬 부트스트랩 JavaScript 로드
import './index.css'; // index.css는 부트스트랩 이후 로드
import globalCss from './assets/css/global.css?raw';
import globalMobileCss from './assets/css/globalMobile.css?raw';
import useStore from './store/store';
import {fetchData} from './utils/dataUtils'

// 모바일 도메인 (서버 환경에서만 사용)
const MOBILE_DOMAIN = import.meta.env.VITE_MOBILE_DOMAIN || 'localhost:9090';
const BASE_NAME = import.meta.env.VITE_BASE_NAME || '';

const initializeVersionCheck = async () => {
  try {
    const response = await fetchData('ver/check');
    // response 자체가 문자열이거나 response.data 사용
    const serverVersion = response.headers?.['x-server-version'] || response.data || response;

    if (serverVersion) {
      useStore.getState().setClientVersion(serverVersion);
    } else {
      console.error('main.jsx: No serverVersion in response');
    }
  } catch (error) {
    console.error('main.jsx: Initial version check failed:', error);
  }
};
// 초기 버전 체크 실행
initializeVersionCheck();

const Main = () => {
  const location = useLocation();

  useEffect(() => {
    // const isMobileRoute = window.location.host === MOBILE_DOMAIN || location.pathname.startsWith(`${BASE_NAME}/mobile`);
    const isMobileRoute = location.pathname.startsWith('/mobile') || window.location.host === MOBILE_DOMAIN;

    document.body.classList.remove('web', 'mobile');
    document.body.classList.add(isMobileRoute ? 'mobile' : 'web');
    
    // 디버깅 로그
    if (import.meta.env.VITE_DEBUG === 'true') {
      console.log({
        MOBILE_DOMAIN,
        BASE_NAME,
        'window.location.host': window.location.host,
        'location.pathname': location.pathname,
        isMobileRoute,
      });
    }

    const styleId = 'dynamic-css';
    let styleElement = document.getElementById(styleId);

    // 기존 <style id="dynamic-css"> 제거
    if (styleElement) {
      styleElement.remove();
    }

    // 새 <style> 태그 생성
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = isMobileRoute ? globalMobileCss : globalCss;

    // index.css가 로드된 <style> 또는 <link> 태그 찾기
    const targetElement = Array.from(document.querySelectorAll('style[data-vite-dev-id], link[rel="stylesheet"]')).find(
      (tag) => {
        const href = tag.getAttribute('href');
        const dataId = tag.getAttribute('data-vite-dev-id');

        // local: dataId로 확인 / production: href로 index.css인지 확인
        return (dataId && dataId.endsWith('index.css')) || (href && href.includes('index'));
      }
    );

    if (targetElement && targetElement.nextSibling) {
      // index.css 다음 위치에 삽입
      targetElement.parentNode.insertBefore(styleElement, targetElement.nextSibling);
    } else {
      // Fallback: <head> 마지막에 삽입
      document.head.appendChild(styleElement);
    }

    // Cleanup: 컴포넌트가 언마운트될 때 삭제
    return () => {
      if (styleElement && document.getElementById(styleId)) {
        styleElement.remove();
      }
    };
  }, [location.pathname]);

  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter
    basename={common.getBaseName()}
    future={{
      v7_startTransition: true,
    }}
  >
    <Main />
  </BrowserRouter>
);
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useStore from './store/store';
import MainLayout from './components/main/MainLayout';
import MobileMainLayout from './components/mobile/MobileMainLayout';
import { MsgPopupProvider } from './components/popup/context/MsgPopupContext';
import { ErrorMsgPopupProvider } from './components/popup/context/ErrorMsgPopupContext';

// 로그인 컴포넌트 직접 import
import Login from './pages/Login';
import MobileLogin from './pages/mobile/MobileLogin';

const MOBILE_DOMAIN = import.meta.env.VITE_MOBILE_DOMAIN || 'localhost:9090';
const BASE_NAME = import.meta.env.VITE_BASE_NAME || '';

// 페이지 컴포넌트 자동 로딩
const modules = import.meta.glob('/src/pages/**/*.jsx', { eager: false });

const routes = Object.keys(modules).map((path) => {
  const pathMatch = path.match(/\/src\/pages\/(.*)\.jsx$/);
  if (!pathMatch) return null;
  const relativePath = pathMatch[1];
  const name = relativePath.split('/').pop();

  let isPublic = name.toLowerCase() === 'login' || name.toLowerCase() === 'join';
  let permission = isPublic ? null : name.toLowerCase();
  let routePath;

  if (relativePath.toLowerCase() === 'mobile/mobilelogin') {
    isPublic = true;
    routePath = '/mobile/Login';
  } else if (relativePath.toLowerCase() === 'mobile/mobilemain') {
    routePath = '/mobile/Main';
  } else if (name.toLowerCase() === 'login') {
    isPublic = true;
    routePath = '/Login';
  } else if (name.toLowerCase() === 'join') {
    isPublic = true;
    routePath = '/join';
  } else if (name.toLowerCase() === 'mainhome') {
    routePath = '/main';
  } else {
    if (relativePath.toLowerCase().startsWith('mobile/')) {
      const mobilePath = relativePath.split('/').slice(1).join('/');
      routePath = `/mobile/${mobilePath.charAt(0).toUpperCase() + mobilePath.slice(1)}`;
    } else {
      routePath = `/${relativePath.toLowerCase()}`;
    }
  }

  if (['board', 'boardview', 'boardwrite'].includes(name.toLowerCase())) {
    permission = 'mainBoard';
  }

  const component = lazy(() =>
    modules[path]().catch((err) => {
      console.error(`Failed to load component for ${path}:`, err);
      return { default: () => <div>Component loading failed for {path}</div> };
    })
  );

  return {
    path: routePath,
    component,
    public: isPublic,
    permission,
  };
}).filter(Boolean);

const App = () => {
  const { user } = useStore();
  const location = useLocation();

  const isMobile = window.location.host === MOBILE_DOMAIN || location.pathname.startsWith(`${BASE_NAME}/mobile`);

  // 주소창이 BASE_NAME 루트(/)인지 판별
  const currentPath = location.pathname.replace(BASE_NAME, '');
  const isRootPath = currentPath === '/' || currentPath === '';

  return (
    <ErrorMsgPopupProvider>
      <MsgPopupProvider>
        {/* 주소는 바뀌지 않고 로그인 화면을 보여줌 */}
        {isRootPath && !user && (
          isMobile ? <MobileLogin /> : <Login />
        )}

        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {routes.map(({ path, component: Component, public: isPublic }) => {
              if (!Component) return null;
              if (isPublic) {
                return (
                  <Route
                    key={path}
                    path={path}
                    element={
                      user ? (
                        <Navigate to={path === '/Login' || path === '/join' ? '/main' : '/mobile/Main'} replace />
                      ) : (
                        <Component />
                      )
                    }
                  />
                );
              }
              return null;
            })}

            {/* 일반 사용자용 레이아웃 */}
            <Route element={user ? <MainLayout /> : <Navigate to="/Login" replace />}>
              {routes
                .filter(
                  ({ path }) =>
                    !path.toLowerCase().startsWith('/mobile/') &&
                    !routes.some((r) => r.public && r.path === path)
                )
                .map(({ path, component: Component }) =>
                  Component ? <Route key={path} path={path} element={<Component />} /> : null
                )}
            </Route>

            {/* 모바일 사용자용 레이아웃 */}
            <Route element={user ? <MobileMainLayout /> : <Navigate to="/mobile/Login" replace />}>
              {routes
                .filter(
                  ({ path }) =>
                    path.toLowerCase().startsWith('/mobile/') &&
                    !routes.some((r) => r.public && r.path === path)
                )
                .map(({ path, component: Component }) =>
                  Component ? <Route key={path} path={path} element={<Component />} /> : null
                )}
            </Route>

            {/* 경로 매칭 안되면 로그인 또는 메인으로 리디렉션 */}
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    user
                      ? isMobile
                        ? '/mobile/Main'
                        : '/main'
                      : isMobile
                      ? '/mobile/Login'
                      : '/Login'
                  }
                  replace
                />
              }
            />
          </Routes>
        </Suspense>
      </MsgPopupProvider>
    </ErrorMsgPopupProvider>
  );
};

export default App;

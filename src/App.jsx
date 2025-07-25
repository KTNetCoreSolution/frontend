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
const ENV = import.meta.env.VITE_ENV || 'local';

// 페이지 컴포넌트 자동 로딩
const modules = import.meta.glob('/src/pages/**/*.jsx', { eager: false });

const routes = Object.keys(modules).map((path) => {
  const pathMatch = path.match(/\/src\/pages\/(.*)\.jsx$/);
  if (!pathMatch) return null;
  const relativePath = pathMatch[1];
  const name = relativePath.split('/').pop();

  let isPublic = name.toLowerCase() === 'join';
  let permission = isPublic ? null : name.toLowerCase();
  let routePath;

  if (relativePath.toLowerCase() === 'mobile/mobilemain') {
    routePath = '/mobile/Main';
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

  const isMobileDomain = window.location.host === MOBILE_DOMAIN;
  const isMobile = isMobileDomain || location.pathname.startsWith(`${BASE_NAME}/mobile`);
  const isLocal = ENV === 'local';

  return (
    <ErrorMsgPopupProvider>
      <MsgPopupProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {/* Root path handling for web and mobile */}
            <Route
              path="/"
              element={
                user ? (
                  <Navigate to={isMobile ? '/mobile/Main' : '/main'} replace />
                ) : (
                  isMobile ? <MobileLogin /> : <Login />
                )
              }
            />

            {/* Public routes (e.g., /join) */}
            {routes.map(({ path, component: Component, public: isPublic }) => {
              if (!Component || !isPublic) return null;
              return (
                <Route
                  key={path}
                  path={path}
                  element={
                    user ? (
                      <Navigate to={isMobile ? '/mobile/Main' : '/main'} replace />
                    ) : (
                      <Component />
                    )
                  }
                />
              );
            })}

            {/* Local environment: Allow /mobile/Login for non-mobile domain */}
            {isLocal && !isMobileDomain && (
              <Route
                path="/mobile/Login"
                element={
                  user ? (
                    <Navigate to="/mobile/Main" replace />
                  ) : (
                    <MobileLogin />
                  )
                }
              />
            )}

            {/* Development server: Redirect /Login and /mobile/Login to root */}
            {!isLocal && (
              <>
                <Route path="/Login" element={<Navigate to="/" replace />} />
                <Route path="/mobile/Login" element={<Navigate to="/" replace />} />
              </>
            )}

            {/* 일반 사용자용 레이아웃 */}
            <Route element={user ? <MainLayout /> : <Navigate to="/" replace />}>
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
            <Route element={user ? <MobileMainLayout /> : <Navigate to={isLocal && !isMobileDomain ? '/mobile/Login' : '/'} replace />}>
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
                      : isLocal && !isMobileDomain && location.pathname.startsWith(`${BASE_NAME}/mobile`)
                      ? '/mobile/Login'
                      : '/'
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
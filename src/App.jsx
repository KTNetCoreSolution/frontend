import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useStore from './store/store';
import MainLayout from './components/main/MainLayout';
import MobileMainLayout from './components/mobile/MobileMainLayout';
import { MsgPopupProvider } from './components/popup/context/MsgPopupContext';
import { ErrorMsgPopupProvider } from './components/popup/context/ErrorMsgPopupContext';

// Dynamically import all .jsx files in pages folder and subfolders
const modules = import.meta.glob('/src/pages/**/*.jsx', { eager: false });

// Generate routes from module paths
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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const normalizedPath = location.pathname.toLowerCase();
    if ((normalizedPath === '/' || normalizedPath === '') && user) {
      navigate('/main', { replace: true });
    } else if (normalizedPath === '/mobile/login' && user) {
      navigate('/mobile/Main', { replace: true });
    } else if (normalizedPath === '/login' && user) {
      navigate('/main', { replace: true });
    }
  }, [user, navigate, location.pathname]);

  return (
    <ErrorMsgPopupProvider>
      <MsgPopupProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {routes.map(({ path, component: Component, public: isPublic }) => {
              if (!Component) {
                console.warn(`Component is undefined for path: ${path}`);
                return null;
              }
              if (isPublic) {
                return (
                  <Route
                    key={path}
                    path={path}
                    element={
                      user ? (
                        <Navigate
                          to={path === '/Login' ? '/main' : path === '/join' ? '/main' : '/mobile/Main'}
                          replace
                        />
                      ) : (
                        <Component />
                      )
                    }
                  />
                );
              }
              return null;
            })}

            {/* Non-mobile routes with MainLayout */}
            <Route
              element={user ? <MainLayout /> : <Navigate to="/Login" replace />}
            >
              {routes
                .filter(
                  ({ path }) =>
                    !path.toLowerCase().startsWith('/mobile/') &&
                    !routes.some((r) => r.public && r.path === path)
                )
                .map(({ path, component: Component }) => {
                  if (!Component) {
                    console.warn(`Component is undefined for path: ${path}`);
                    return null;
                  }
                  return <Route key={path} path={path} element={<Component />} />;
                })}
            </Route>

            {/* Mobile routes with MobileMainLayout */}
            <Route
              element={
                user ? (
                  <MobileMainLayout />
                ) : (
                  <Navigate to="/mobile/Login" replace />
                )
              }
            >
              {routes
                .filter(
                  ({ path }) =>
                    path.toLowerCase().startsWith('/mobile/') &&
                    !routes.some((r) => r.public && r.path === path)
                )
                .map(({ path, component: Component }) => {
                  if (!Component) {
                    console.warn(`Component is undefined for path: ${path}`);
                    return null;
                  }
                  return <Route key={path} path={path} element={<Component />} />;
                })}
            </Route>

            {/* Catch-all route */}
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    user
                      ? location.pathname.toLowerCase().startsWith('/mobile/')
                        ? '/mobile/Main'
                        : '/main'
                      : location.pathname.toLowerCase().startsWith('/mobile/')
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
import React, { useEffect, useState, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import useStore from '../../store/store';
import { checkTokenValiditySimple } from '../../utils/authUtils';
import { fetchData } from '../../utils/dataUtils';
import logo from '../../assets/images/logo.png';
import styles from './MobileMainLayout.module.css';
import '../../assets/css/globalMobile.css';

const ENV = import.meta.env.VITE_ENV || 'local';
const MOBILE_DOMAIN = import.meta.env.VITE_MOBILE_DOMAIN || 'localhost:9090';
const BASE_NAME = import.meta.env.VITE_BASE_NAME || '';

const MobileMainLayout = () => {
  const navigate = useNavigate();
  const { user, clearUser, clearMenu, loading } = useStore();
  const [isChecking, setIsChecking] = useState(true);

  const isMobileDomain = window.location.host === MOBILE_DOMAIN;

  // 60분 자동 로그아웃 (UI 없이 백그라운드 처리)
  useEffect(() => {
    if (!user || !user.expiresAt) {
      return;
    }

    const updateTime = () => {
      if (!user || !user.expiresAt) {
        return;
      }
      const now = new Date().getTime();
      const timeLeft = user.expiresAt - now;
      if (timeLeft <= 0) {
        handleLogout();
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    const verifyUser = async () => {
      if (!user) {
        setIsChecking(false);
        sessionStorage.removeItem('user-storage');
        navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
        return;
      }

      const isValid = await checkTokenValiditySimple(clearUser);
      if (!isValid) {
        sessionStorage.removeItem('user-storage');
        navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
      }
      setIsChecking(false);
    };
    verifyUser();
  }, [user, navigate, clearUser]);

  const handleLogout = async () => {
    try {
      await fetchData('auth/logout', {}, { withCredentials: true });
      clearUser();
      clearMenu();
      sessionStorage.removeItem('user-storage');
      navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      clearUser();
      clearMenu();
      sessionStorage.removeItem('user-storage');
      navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
    }
  };

  if (isChecking || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo" onClick={() => navigate('/mobile/Main')}>
          <img src={logo} alt="Logo" className="logoImage" />
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </header>
      {loading.isLoading && (
        <div className="progressBarContainer">
          <CircularProgressbar
            value={loading.progress}
            text={`${Math.round(loading.progress)}%`}
            styles={buildStyles({
              pathColor: '#007bff',
              trailColor: '#f0f0f0',
              textColor: '#007bff',
              textSize: '24px',
            })}
          />
        </div>
      )}
      <section className="main">
        <Suspense fallback={<div>Loading...</div>}>
          <Outlet />
        </Suspense>
      </section>
      {/* <footer className={styles.footer}>
        <p>© 2025 xAI. All rights reserved.</p>
      </footer> */}
    </div>
  );
};

export default MobileMainLayout;
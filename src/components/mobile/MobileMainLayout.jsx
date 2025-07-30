import React, { useEffect, useState, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import useStore from '../../store/store';
import { checkTokenValiditySimple } from '../../utils/authUtils';
import { fetchData } from '../../utils/dataUtils';
import logo from '../../assets/images/logo.png';
import styles from './MobileMainLayout.module.css';

const ENV = import.meta.env.VITE_ENV || 'local';
const MOBILE_DOMAIN = import.meta.env.VITE_MOBILE_DOMAIN || 'localhost:9090';
const BASE_NAME = import.meta.env.VITE_BASE_NAME || '';

const MobileMainLayout = () => {
  const navigate = useNavigate();
  const { user, clearUser, loading } = useStore();
  const [isChecking, setIsChecking] = useState(true);

  const isMobileDomain = window.location.host === MOBILE_DOMAIN;

  useEffect(() => {
    const verifyUser = async () => {
      // 로그아웃 상태(user가 null 또는 undefined)면 토큰 검증 생략
      if (!user) {
        setIsChecking(false);
        navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
        return;
      }

      const isValid = await checkTokenValiditySimple(clearUser);
      if (!isValid) {
        navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
      }
      setIsChecking(false);
    };
    verifyUser();
  }, [user, navigate, clearUser]);

  const handleLogout = async () => {
    try {
      await fetchData('auth/logout', {});
      clearUser();
      navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate(ENV === 'local' && !isMobileDomain ? '/mobile/Login' : '/', { replace: true });
    }
  };

  if (isChecking || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo} onClick={() => navigate('/mobile/Main')}>
          <img src={logo} alt="Logo" className={styles.logoImage} />
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </header>
      {loading.isLoading && (
        <div className={styles.progressBarContainer}>
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
      <section className={styles.main}>
        <Suspense fallback={<div>Loading...</div>}>
          <Outlet />
        </Suspense>
      </section>
      <footer className={styles.footer}>
        <p>© 2025 xAI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MobileMainLayout;
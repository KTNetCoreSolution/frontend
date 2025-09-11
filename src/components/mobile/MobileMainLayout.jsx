import React, { useState, Suspense, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import useStore from '../../store/store';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import logo from '../../assets/images/logo.png';
import styles from './MobileMainLayout.module.css';
// import '../../assets/css/globalMobile.css';

const ENV = import.meta.env.VITE_ENV || 'local';
const MOBILE_DOMAIN = import.meta.env.VITE_MOBILE_DOMAIN || 'localhost:9090';

const MobileMainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, setLoading } = useStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const isMainPage = location.pathname === '/mobile/Main';
  const handleToggleSidebar = () => { setShowSidebar(!showSidebar); };

  // 경로 변화 감지: 뒤로 가기나 네비게이션 시 로딩 상태 리셋
  useEffect(() => {
    // 네비게이션이 완료된 후 (idle 상태 확인) 로딩 리셋
    if (!loading.isLoading) return;  // 이미 false면 무시

    const timer = setTimeout(() => {
      setLoading({ isLoading: false, progress: 0 });  // 100ms 지연으로 네비게이션 완료 대기
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, loading.isLoading, setLoading]);


  return (
    <div className="container">
      {isMainPage && (
        <>
          <header className="header">
            <div onClick={() => navigate('/mobile/Main')}>
              <img src={logo} alt="Logo" className="logoImage" />
            </div>
            <button className="btn text-white" onClick={handleToggleSidebar} aria-label="Toggle menu">
              <i className="bi bi-list"></i>
            </button>
          </header>
          <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} />
        </>
      )}
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
      <section className={isMainPage ? "main" : "sub"}>
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
import React, { useState, Suspense } from 'react';
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
  const { loading } = useStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const isMainPage = location.pathname === '/mobile/Main';
  const handleToggleSidebar = () => { setShowSidebar(!showSidebar); };

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
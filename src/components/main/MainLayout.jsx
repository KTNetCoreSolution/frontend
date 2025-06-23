import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import MainHeader from './MainHeader';
import MainTopNav from './MainTopNav';
import MainTopNavLoc from './MainTopNavLoc';
import MainFooter from './MainFooter';
import useStore from '../../store/store';
import { fetchData } from '../../utils/dataUtils';
import { hasPermission, checkTokenValiditySimple } from '../../utils/authUtils';
import styles from './MainLayout.module.css';
import logo from '../../assets/images/logo.png';

const MainLayout = () => {
  const navigate = useNavigate();
  const { user, clearUser, setMenu, menu } = useStore();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  const handleLogoClick = useCallback(async (e) => {
    e.preventDefault();
    if (!hasPermission(user?.auth, 'main')) {
      console.warn('Permission denied for main');
      navigate('/', { replace: true });
      return;
    }

    const isValid = await checkTokenValiditySimple(clearUser);
    if (!isValid) {
      navigate('/', { replace: true });
      return;
    }
    navigate('/main');
  }, [navigate, user, clearUser]);

  useEffect(() => {
    const initialize = async () => {
      // Token verification
      const isValid = await checkTokenValiditySimple(clearUser);
      if (!isValid && user) {
        navigate('/', { replace: true });
        setIsChecking(false);
        return;
      }

      // Fetch menu if needed
      if (!menu?.length && user?.empNo) {
        try {
          const response = await fetchData('auth/menu', { userId: user.empNo });
          if (response.success && response.data?.length > 0) {
            setMenu(response.data);
          }
        } catch (error) {
          console.error('Failed to fetch menu:', error);
        }
      }

      setIsChecking(false);
    };

    if (user) initialize();
  }, [user, navigate, clearUser, setMenu, menu?.length]);

  useEffect(() => {
    const handleClick = async (e) => {
      if (!e.target.classList.contains(styles.scrolly)) return;

      const isValid = await checkTokenValiditySimple(clearUser);
      if (!isValid) {
        e.preventDefault();
        navigate('/', { replace: true });
        return;
      }

      const scrollTarget = e.target.getAttribute('data-scroll-target');
      const path = e.target.getAttribute('data-path');

      const screen = path ? path.split('/').filter(Boolean).pop() : '';
      if (screen && !hasPermission(user?.auth, screen)) {
        console.warn(`Permission denied for ${screen}`);
        e.preventDefault();
        return;
      }

      if (path) {
        e.preventDefault();
        navigate(path);
      }

      if (scrollTarget) {
        const target = document.querySelector(scrollTarget);
        if (target) {
          const navHeight = document.querySelector(`#${styles.nav}`)?.offsetHeight || 0;
          window.scrollTo({
            top: target.offsetTop - navHeight - 5,
            behavior: 'smooth',
          });
        } else {
          console.warn(`Target not found for scrollTarget: ${scrollTarget}`);
        }
      }
    };

    const nav = document.querySelector(`#${styles.nav}`);
    if (nav) nav.addEventListener('click', handleClick);

    return () => {
      if (nav) nav.removeEventListener('click', handleClick);
    };
  }, [navigate, user, clearUser]);

  useEffect(() => {
  }, [location.pathname]);

  if (isChecking || !user) {
    return <div>Loading...</div>;
  }

  return (
  <div>
    <header id="header" className={styles.header}>
      <div className={styles.logo} onClick={handleLogoClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleLogoClick(e)}>
        <img src={logo} alt="Logo" className={styles.logoImage} />
      </div>
      <div className={styles.headerNavGroup}>
        <MainHeader />
        <div className={styles.headerNav}>
          <nav className={styles.nav}>
            <MainTopNav />
          </nav>
        </div>
      </div>
    </header>
    <div>
      <MainTopNavLoc />
    </div>
    <section className={styles.main}>
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </section>
    <footer id="footer">
      <MainFooter />
    </footer>
  </div>
);
};

export default MainLayout;
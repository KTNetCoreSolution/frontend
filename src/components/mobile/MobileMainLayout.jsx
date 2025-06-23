import React, { useEffect, useState, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { checkTokenValiditySimple } from '../../utils/authUtils';
import { fetchData } from '../../utils/dataUtils';
import logo from '../../assets/images/logo.png';
import styles from './MobileMainLayout.module.css';

const MobileMainLayout = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const isValid = await checkTokenValiditySimple(clearUser);
      if (!isValid && user) {
        navigate('/mobile/Login', { replace: true });
      }
      setIsChecking(false);
    };
    verifyUser();
  }, [user, navigate, clearUser]);

  const handleLogout = async () => {
    try {
      // Assume backend clears the HTTP-only cookie via logout endpoint
      await fetchData('auth/logout', {});
      clearUser();
      navigate('/mobile/Login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/mobile/Login', { replace: true });
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
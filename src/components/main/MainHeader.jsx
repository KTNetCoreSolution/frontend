import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { checkTokenValidity } from '../../utils/authUtils';
import { fetchData } from '../../utils/dataUtils';
import styles from './MainLayout.module.css';

const MainHeader = () => {
  const [logout, setLogout] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState('00:00');
  const { user, setUser, clearUser, clearMenu } = useStore();
  const navigate = useNavigate();

  const calculateTimeDisplay = (expiresAt) => {
    const now = new Date().getTime();
    const timeLeft = expiresAt - now;
    if (timeLeft <= 0) {
      return '00:00';
    }
    const minutes = Math.floor(timeLeft / 1000 / 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExtend = async () => {
    await checkTokenValidity(navigate, user, setUser, clearUser);
  };

  const handleLogout = async () => {
    setLogout(true);
    try {
      // Assume backend clears the HTTP-only cookie via logout endpoint
      await fetchData('auth/logout', {});
      clearUser();
      if (clearMenu) {
        clearMenu();
      } else {
        console.error('clearMenu is undefined');
      }
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    if (logout) {
      navigate('/', { replace: true });
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (!user || !user.expiresAt) {
      checkTokenValidity(navigate, user, setUser, clearUser);
      return;
    }

    setTimeDisplay(calculateTimeDisplay(user.expiresAt));

    const updateTime = () => {
      const now = new Date().getTime();
      const timeLeft = user.expiresAt - now;
      if (timeLeft <= 0) {
        handleLogout();
        return;
      }
      setTimeDisplay(calculateTimeDisplay(user.expiresAt));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [user, navigate, setUser, clearUser]);

  return (
    <div className={styles.headerTop}>
      <div className={styles.headerMenu}>
        {user && user.empNm ? (
          <>
            <ul>
              <li>{user.empNm} 님 안녕하세요.</li>
            </ul>
            <ul>
              <li className={styles.time}>{timeDisplay}</li>
            </ul>
            <ul>
              <li onClick={handleExtend} className={styles.extendLink}>
                연장
              </li>
            </ul>
            <ul>
              <li onClick={handleLogout} className={styles.logoutLink}>
                로그아웃
              </li>
            </ul>
          </>
        ) : (
          <ul>
            <li>로그인해주세요.</li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default MainHeader;
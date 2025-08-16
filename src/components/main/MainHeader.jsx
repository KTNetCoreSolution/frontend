import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { checkTokenValidity } from '../../utils/authUtils';
import { fetchData } from '../../utils/dataUtils';
import styles from './MainLayout.module.css';

const MainHeader = () => {
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
    try {
      const response = await fetchData('auth/logout', {}, { withCredentials: true });
      if (response.success) {
        console.log('Logout successful, cookie cleared');
        clearUser();
        clearMenu();
        sessionStorage.removeItem('user-storage');
        navigate('/', { replace: true });
      } else {
        console.error('Logout failed:', response.errMsg);
        clearUser();
        clearMenu();
        sessionStorage.removeItem('user-storage');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Logout error:', error);
      clearUser();
      clearMenu();
      sessionStorage.removeItem('user-storage');
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    if (!user || !user.expiresAt) {
      setTimeDisplay('00:00');
      return;
    }

    setTimeDisplay(calculateTimeDisplay(user.expiresAt));

    const updateTime = () => {
      if (!user || !user.expiresAt) {
        setTimeDisplay('00:00');
        return;
      }
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
    <div className="headerTop">
      <div className="headerMenu">
        {user && user.empNm ? (
          <>
            <ul>
              <li>{user.empNm} 님 안녕하세요.</li>
              <li className={styles.time}>{timeDisplay}</li>
              <li onClick={handleExtend} className={styles.extendLink}>
                연장
              </li>
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
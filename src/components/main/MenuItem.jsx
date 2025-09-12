import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { checkTokenValidity, hasPermission } from '../../utils/authUtils';
import styles from './MainLayout.module.css';
import arrowDown from '../../assets/images/icon_arrow_down_white.svg';

const MenuItem = ({ item }) => {
  const [showChildren, setShowChildren] = useState(false);
  const timeoutRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, clearUser } = useStore();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current); // 기존 타임아웃 취소
    setShowChildren(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowChildren(false);
    }, 200); // 200ms 지연 후 숨김
  };

  const hasValidPath = item.URL && item.URL.trim() !== '';
  const hasChildren =
    item.children &&
    item.children.length > 0 &&
    item.children.some(child => child.URL || child.children?.length > 0);

  const getScreenName = (url) => {
    if (!url) return '';
    const segments = url.split('/').filter(Boolean);
    return segments[segments.length - 1] || segments[0] || '';
  };

  const toggleChildren = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setShowChildren(prev => !prev);
    }
  };

  // ⛳ 페이지 이동 시 서브메뉴 자동 닫힘
  useEffect(() => {
    setShowChildren(false);
  }, [location.pathname]);

  return (
    <li
      className={`menuItem ${hasChildren ? 'menu' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hasChildren ? (
        <>
          <a
            href="#"
            className="menuLink scrolly"
            onClick={toggleChildren}
            data-path={item.URL}
          >
            <span>{item.MENUNM}</span>
            <img src={arrowDown} alt=" " className='menuIcon' />
          </a>

          {/* 하위 메뉴는 showChildren일 때만 렌더링 */}
          {showChildren && (
            <ul className="subMenu visible">
              {item.children
                .filter(child => child.URL || (child.children && child.children.length > 0))
                .map((child) => (
                  <MenuItem key={child.MENUID} item={child} />
                ))}
            </ul>
          )}
        </>
      ) : hasValidPath ? (
        <NavLink
          to={item.URL}
          className={({ isActive }) =>
            // `${styles.navLink} ${styles.scrolly} ${isActive ? styles.navLinkActive : ''}`
            `navLink scrolly ${isActive ? 'navLinkActive' : ''}`
          }
          data-path={item.URL}
          end={item.URL === '/main'}
          onClick={async (e) => {
            const screen = getScreenName(item.URL);
            if (!hasPermission(user?.auth, screen)) {
              e.preventDefault();
              console.warn(`Permission denied for ${screen}`);
              return;
            }

            const isValid = await checkTokenValidity(navigate, user, setUser, clearUser);
            if (!isValid) {
              e.preventDefault();
            }
          }}
        >
          {item.MENUNM}
        </NavLink>
      ) : (
        <span className="menuLink scrolly">
          {item.MENUNM}
        </span>
      )}
    </li>
  );
};

export default MenuItem;

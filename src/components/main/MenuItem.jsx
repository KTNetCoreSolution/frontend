import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { checkTokenValidity, hasPermission } from '../../utils/authUtils';
import styles from './MainLayout.module.css';

const MenuItem = ({ item }) => {
  const [showChildren, setShowChildren] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, clearUser } = useStore();

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
      className={`${styles.menuItem} ${hasChildren ? styles.menu : ''}`}
      onMouseEnter={() => hasChildren && setShowChildren(true)}
      onMouseLeave={() => hasChildren && setShowChildren(false)}
    >
      {hasChildren ? (
        <>
          <a
            href="#"
            className={`${styles.menuLink} ${styles.scrolly}`}
            onClick={toggleChildren}
            data-path={item.URL}
          >
            {item.MENUNM}
          </a>

          {/* 하위 메뉴는 showChildren일 때만 렌더링 */}
          {showChildren && (
            <ul className={`${styles.subMenu} ${styles.visible}`}>
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
            `${styles.navLink} ${styles.scrolly} ${isActive ? styles.navLinkActive : ''}`
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
        <span className={`${styles.menuLink} ${styles.scrolly}`}>
          {item.MENUNM}
        </span>
      )}
    </li>
  );
};

export default MenuItem;

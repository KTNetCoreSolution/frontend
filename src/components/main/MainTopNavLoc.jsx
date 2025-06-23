import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../../store/store';
import common from '../../utils/common';
import styles from './MainLayout.module.css';

const MainTopNavLoc = () => {
  const { pathname } = useLocation();
  const { menu } = useStore();
  const basename = common.getBaseName();

  const getBreadcrumbTrail = (path, menuItems) => {
    const normalizedPath = path.replace(/\/$/, '').replace(new RegExp(`^${basename}`), '');
    if (normalizedPath === '/main') {
      return [''];
    }
    let trail = ['Home'];
    const searchMenu = (items, parentName = null) => {
      for (const item of items) {
        const itemPath = item.URL ? item.URL.replace(/\/$/, '') : '';
        if (itemPath && itemPath === normalizedPath) {
          return parentName
            ? ['Home', parentName, item.MENUNM]
            : ['Home', item.MENUNM];
        }
        if (item.children && item.children.length > 0) {
          const childResult = searchMenu(item.children, item.MENUNM);
          if (childResult.length > 1) {
            return childResult;
          }
        }
      }
      return trail;
    };
    return searchMenu(menuItems);
  };

  const breadcrumbTrail = useMemo(() => {
    if (!menu) {
      return ['Home'];
    }
    return getBreadcrumbTrail(pathname, menu);
  }, [pathname, menu]);

  if (!breadcrumbTrail.length) {
    return null;
  }

  return (
    <div className={styles.topNavLoc}>
      {breadcrumbTrail.map((name, index) => (
        <span key={index}>
          {name}
          {index < breadcrumbTrail.length - 1 && ' > '}
        </span>
      ))}
    </div>
  );
};

export default MainTopNavLoc;
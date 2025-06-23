import React from 'react';
import MenuItem from './MenuItem';
import useStore from '../../store/store';
import styles from './MainLayout.module.css';

const MainTopNav = () => {
  const { menu } = useStore();

  if (!menu || menu.length === 0) {
    return <div>메뉴를 불러오는 중...</div>;
  }

  return (
    <ul className={styles.navList}>
      {menu.map((item) => (
        <MenuItem key={item.MENUID} item={item} />
      ))}
    </ul>
  );
};

export default MainTopNav;
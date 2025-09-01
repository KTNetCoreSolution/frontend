import React from 'react';
import styles from './MainLayout.module.css';

const MainFooter = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <ul className={styles.footerMenu}>
          <li>Copyright &copy;KT NetCore. All rights reserved.</li>
        </ul>
      </div>
    </footer>
  );
};

export default MainFooter;
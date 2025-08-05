import React from 'react';
import useStore from '../../store/store'; // 경로와 내보내기 확인
import { hasPermission } from '../../utils/authUtils';
import Board from './Board';
import styles from './BoardMain.module.css';

const BoardMain = () => {
  const { user } = useStore();
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');

  return (
    <div className={`d-flex ${styles.boardMainContainer}`}>
      <div className={`w-50 ${styles.boardContainer} p-3`}>
        <Board canWriteBoard={canWriteBoard} type="notice" />
      </div>
      <div className={`w-50 ${styles.boardContainer} p-3`}>
        <Board canWriteBoard={canWriteBoard} type="carnotice" />
      </div>
    </div>
  );
};

export default BoardMain;
import React from 'react';
import useStore from '../../store/store'; // 경로와 내보내기 확인
import { hasPermission } from '../../utils/authUtils';
import Board from './Board';

const BoardMain = () => {
  const { user } = useStore();
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');

  return (
    <div className='boardMainContainer'>
      <div className='boardContainer'>
        <Board canWriteBoard={canWriteBoard} type="notice" />
      </div>
      <div className='boardContainer'>
        <Board canWriteBoard={canWriteBoard} type="carnotice" />
      </div>
    </div>
  );
};

export default BoardMain;
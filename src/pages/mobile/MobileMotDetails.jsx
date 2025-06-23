import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import useStore from '../../store/store';
import api from '../../utils/api';
import common from '../../utils/common';

const MobileMotDetails = () => {
  const navigate = useNavigate();
  const { clearUser } = useStore();
  const [showSidebar, setShowSidebar] = useState(false);

  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleLogout = async () => {
    try {
      const response = await api.post(common.getServerUrl('auth/logout'), {});
      if (response) {
        clearUser();
        navigate('/mobile/Login');
      }
    } catch (error) {
      console.error('Logout failed:', error.message);
      clearUser();
      navigate('/mobile/Login');
    }
  };

  return (
    <div className="container-fluid p-0">
      <header className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
        <h1 className="h5 mb-0">메뉴2 조회</h1>
        <button className="btn btn-outline-light" onClick={handleToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
      </header>

      <MobileMainUserMenu
        show={showSidebar}
        handleClose={handleToggleSidebar}
        onLogout={handleLogout}
      />

      <div className="p-3">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">메뉴2 조회</h5>
            <p className="card-text">여기에 메뉴2 조회 콘텐츠가 표시됩니다.</p>
            <ul className="list-group list-group-flush">
              <li className="list-group-item">항목 ID: MOT001</li>
              <li className="list-group-item">상태: 완료</li>
              <li className="list-group-item">날짜: 2025-05-20</li>
              <li className="list-group-item">담당자: 이영희</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMotDetails;
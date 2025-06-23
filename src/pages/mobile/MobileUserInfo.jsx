import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import api from '../../utils/api';
import common from '../../utils/common';
import useStore from '../../store/store';

const MobileUserInfo = () => {
  const navigate = useNavigate();
  const { clearUser } = useStore();
  const [showSidebar, setShowSidebar] = useState(false);

  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

const handleLogout = async () => {
  try {
    const response = await api.post(common.getServerUrl('auth/logout'), {});
    if(response)
    {
      clearUser();
      navigate('/Mobile/Login');
    }
  } catch (error) {
    console.error('Logout failed:', error.message);
    clearUser();
    navigate('/Mobile/Login'); // 실패 시에도 로그인 페이지로 이동
  }
};

  return (
    <div className="container-fluid p-0">
      <header className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
        <h1 className="h5 mb-0">기본정보</h1>
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
        <ul className="nav nav-tabs" id="infoTabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className="nav-link active"
              id="info-tab"
              data-bs-toggle="tab"
              data-bs-target="#info"
              type="button"
              role="tab"
              aria-controls="info"
              aria-selected="true"
            >
              인사정보
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className="nav-link"
              id="equipment-tab"
              data-bs-toggle="tab"
              data-bs-target="#equipment"
              type="button"
              role="tab"
              aria-controls="equipment"
              aria-selected="false"
            >
              공기구
            </button>
          </li>
        </ul>

        <div className="tab-content p-3">
          <div
            className="tab-pane fade show active"
            id="info"
            role="tabpanel"
            aria-labelledby="info-tab"
          >
            <ul className="list-group">
              <li className="list-group-item">사번: 12345</li>
              <li className="list-group-item">사원명: 홍길동</li>
              <li className="list-group-item">부서: 개발팀</li>
              <li className="list-group-item">입사일: 2023-01-15</li>
            </ul>
          </div>
          <div
            className="tab-pane fade"
            id="equipment"
            role="tabpanel"
            aria-labelledby="equipment-tab"
          >
            <ul className="list-group">
              <li className="list-group-item">장비ID: EQ001</li>
              <li className="list-group-item">장비명: 노트북 A100</li>
              <li className="list-group-item">상태: 사용 중</li>
              <li className="list-group-item">배정일: 2024-05-01</li>
            </ul>
          </div>
          <div
            className="tab-pane fade"
            id="ultimate"
            role="tabpanel"
            aria-labelledby="ultimate-tab"
          >
            <div className="alert alert-info">
              항목이 발견되지 않았습니다.
            </div>
          </div>
          <div
            className="tab-pane fade"
            id="safety"
            role="tabpanel"
            aria-labelledby="safety-tab"
          >
            <div className="alert alert-info">
              항목이 발견되지 않았습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileUserInfo;
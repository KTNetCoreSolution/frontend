import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import api from '../../utils/api.js';

const MobileCarReservation = () => {
  const { clearUser } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  const handleLogout = async () => {
    try {
      const response = await api.post(commonUtils.getServerUrl('auth/logout'), {});
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
      <header className="header">
        <h1 className="h5 mb-0">차량예약</h1>
        <button className="btn text-white" onClick={handleToggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
      </header>  
      <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />
      <div className="pageMain">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">차량 예약</h5>
            <p className="card-text">여기에 차량 예약 콘텐츠가 표시됩니다.</p>
            <ul className="list-group list-group-flush">
              <li className="list-group-item">예약 ID: CR001</li>
              <li className="list-group-item">차량: 세단 C</li>
              <li className="list-group-item">예약 날짜: 2025-05-21</li>
              <li className="list-group-item">상태: 예약됨</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileCarReservation;
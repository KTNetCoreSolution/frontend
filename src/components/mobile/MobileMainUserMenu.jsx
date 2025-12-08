import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/store';
import { fetchDataGet } from '../../utils/dataUtils';
import { mobileMenuStandardPermission } from '../../utils/authUtils';
import mobileUserMenu from '../../data/mobileUserMenu.json';
import './MobileMainUserMenu.css';

const MobileMainUserMenu = ({ show, handleClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useStore();
  const offcanvasRef = useRef(null);

  const [titleClickCount, setTitleClickCount] = useState(0);

  const handleTitleClick = () => {
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);

    // 10번 클릭하면 알림 + 30초 후에 다시 리셋 (원한다면 제거 가능)
    if (newCount === 10) {
      setTimeout(() => setTitleClickCount(0), 30000); // 30초 후 리셋 (선택사항)
    }
  };

  // Validate props
  const isValidProps = typeof show === 'boolean' && typeof handleClose === 'function';
  if (!isValidProps) {
    console.error('Invalid props passed to MobileMainUserMenu:', { show, handleClose });
  }

  // Handle outside clicks
  useEffect(() => {
    if (!isValidProps) return;

    const handleOutsideClick = (event) => {
      if (show && offcanvasRef.current && !offcanvasRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [show, handleClose, isValidProps]);

  // Handle menu item click
  const handleMenuClick = async (path) => {
    try {
      // JWT 토큰 갱신
      const response = await fetchDataGet('auth/live?extend=true', {}, { withCredentials: true });
      if (response.success && response.data) {
        setUser({
          ...user,
          expiresAt: response.data.expiresAt * 1000, // 초를 밀리초로 변환
        });
      }
    } catch (error) {
      console.error('Failed to extend token:', error);
    }

    navigate(path);
    handleClose();
  };

  const baseMenu = mobileUserMenu.filter((item) => 
    mobileMenuStandardPermission(user?.auth, user?.standardSectionCd, item.MENUID)
  );

  //10번 클릭 시 나오는 테스트 메뉴 설정
  const filteredUserMenu = titleClickCount >= 10 
    ? [
        ...baseMenu,
        // {MENUID: "MMENU0091", MENUNM: "카메라테스트", URL: "/mobile/MobileOdometerReader", children: []}  
        //테스트화면 메뉴를 추가 시
      ]
    : baseMenu;

  if (!isValidProps) {
    return null;
  }

  return (
    <>
      {show && (
        <div
          className={`custom-offcanvas-overlay ${show ? 'show' : ''}`}
          onClick={handleClose} // 오버레이 클릭 시 닫기
        />
      )}
      <div
        ref={offcanvasRef}
        className={`custom-offcanvas ${show ? 'show' : ''}`}
        aria-hidden={!show}
      >
        <div className="custom-offcanvas-header">
          <h5 onClick={handleTitleClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
            메뉴
          </h5>
          <button type="button" className="btn text-white" onClick={handleClose} aria-label="Close">
            <i className="bi bi-x"></i>
          </button>
        </div>
        <div className="custom-offcanvas-body">
          <ul className="list-group">
            {filteredUserMenu.map((item) => (
              <li
                key={item.MENUID}
                className={`list-group-item ${location.pathname === item.URL ? 'text-primary-custom' : ''}`}
                onClick={() => handleMenuClick(item.URL)}
                style={{ cursor: 'pointer' }}
              >
                {item.MENUNM}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

MobileMainUserMenu.defaultProps = {
  show: false,
  handleClose: () => console.warn('handleClose not provided'),
};

export default MobileMainUserMenu;
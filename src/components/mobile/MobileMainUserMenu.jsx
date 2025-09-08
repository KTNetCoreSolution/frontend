import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/store';
import { fetchDataGet } from '../../utils/dataUtils';
import mobileUserMenu from '../../data/mobileUserMenu.json';
import './MobileMainUserMenu.css';

const MobileMainUserMenu = ({ show, handleClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useStore();
  const offcanvasRef = useRef(null);

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
          ...response.data.user,
          expiresAt: response.data.expiresAt * 1000, // 초를 밀리초로 변환
        });
      }
    } catch (error) {
      console.error('Failed to extend token:', error);
    }

    navigate(path);
    handleClose();
  };

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
          <h5>메뉴</h5>
          <button
            className="custom-offcanvas-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="custom-offcanvas-body">
          <ul className="list-group">
            {mobileUserMenu.map((item) => (
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
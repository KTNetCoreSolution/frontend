import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import mobileUserMenu from '../../data/mobileUserMenu.json';
import './MobileMainUserMenu.css';

const MobileMainUserMenu = ({ show, handleClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const offcanvasRef = useRef(null);

  // Validate props and log error without returning early
  const isValidProps = typeof show === 'boolean' && typeof handleClose === 'function';
  if (!isValidProps) {
    console.error('Invalid props passed to MobileMainUserMenu:', { show, handleClose });
  }

  // Handle outside clicks to close offcanvas
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
  const handleMenuClick = (path) => {
    navigate(path);
    handleClose();
  };

  // Render nothing if props are invalid
  if (!isValidProps) {
    return null;
  }

  return (
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
              className={`list-group-item ${location.pathname === item.URL ? 'text-danger' : ''}`}
              onClick={() => handleMenuClick(item.URL)}
              style={{ cursor: 'pointer' }}
            >
              {item.MENUNM}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

MobileMainUserMenu.defaultProps = {
  show: false,
  handleClose: () => console.warn('handleClose not provided'),
  onLogout: () => console.warn('onLogout not provided'),
};

export default MobileMainUserMenu;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import mobileMenu from '../../data/mobileMenu.json';

const MobileMainMenu = () => {
  const navigate = useNavigate();

  const handleMenuClick = (path) => {
    // Ensure path starts with /mobile/
    const normalizedPath = path.toLowerCase().startsWith('/mobile/')
      ? path
      : `/mobile/${path.replace(/^\//, '').charAt(0).toUpperCase() + path.replace(/^\//, '').slice(1)}`;
    navigate(normalizedPath);
  };

  return (
    <div className="container-fluid p-0">
      <div className="p-3">
        <div className="row row-cols-2 g-3">
          {mobileMenu.map((item) => (
            <div key={item.MENUID} className="col">
              <div
                className="card text-center p-3 shadow-sm"
                onClick={() => handleMenuClick(item.URL)}
                style={{ cursor: 'pointer' }}
              >
                <i className={`bi bi-${item.ICON} display-6 text-primary`}></i>
                <p className="mt-2 mb-0">{item.MENUNM}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileMainMenu;
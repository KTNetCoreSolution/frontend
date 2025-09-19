import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import { fetchDataGet } from '../../utils/dataUtils';
import mobileMenu from '../../data/mobileMenu.json';

const images = import.meta.glob('../../assets/images/*', { eager: true, query: '?url', import: 'default' });

const MobileMainMenu = () => {
  const navigate = useNavigate();
  const { user, setUser } = useStore();

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

    // 메뉴 이동
    const normalizedPath = path.toLowerCase().startsWith('/mobile/')
      ? path
      : `/mobile/${path.replace(/^\//, '').charAt(0).toUpperCase() + path.replace(/^\//, '').slice(1)}`;
    navigate(normalizedPath);
  };

  return (
    <div className="container-fluid p-0">
      <div className="row row-cols-2 g-3">
        {mobileMenu.map((item) => {
          const imgSrc = images[`../../assets/images/${item.ICON}`];
          return (
            <div key={item.MENUID}>
              <div
                className="card cardMenu"
                onClick={() => handleMenuClick(item.URL)}
              >
                <img
                  src={imgSrc}
                  alt={item.MENUNM}
                  className='menu'
                />
                <p>{item.MENUNM}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileMainMenu;
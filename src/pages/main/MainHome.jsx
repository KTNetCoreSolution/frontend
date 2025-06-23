import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import Board from './Board';
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import styles from './MainHome.module.css';

const MainHome = () => {
  const { user, notices, fetchNotices } = useStore();
  const navigate = useNavigate();
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');

  const slideImages = [
    'https://images.pexels.com/photos/13127331/pexels-photo-13127331.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'https://images.pexels.com/photos/14247145/pexels-photo-14247145.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  ];

  useEffect(() => {
    if (!user || !hasPermission(user.auth, 'mainhome')) {
      // navigate('/');
      return;
    }

    const swiperButtonPrev = document.querySelector('.swiper-button-prev');
    const swiperButtonNext = document.querySelector('.swiper-button-next');

    if (swiperButtonPrev) {
      swiperButtonPrev.style.color = '#547574';
    }

    if (swiperButtonNext) {
      swiperButtonNext.style.color = '#547574';
    }
  }, [user, navigate, fetchNotices]);

  return (
    <div>
      <div className="d-flex flex-column h-100 p-2" style={{ width: "98vw" }}>
        <div className="border w-100 mb-3">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={0}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop
            style={{ height: '120px' }}
          >
            {slideImages.map((image, index) => (
              <SwiperSlide key={index}>
                <img
                  src={image}
                  alt={`Slide ${index + 1}`}
                  className="w-100 h-100 object-fit-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className="d-flex w-100 flex-grow-1">
          <div className={`w-50 ${styles.contentLeftContainer}`}>
            <Board notices={notices} canWriteBoard={canWriteBoard} />
          </div>
          <div className='px-1'></div>
          <div className={`w-50 p-3 border ${styles.contentRightContainer}`}>
            <h3 className={`mb-3 fs-5 text-dark ${styles.boardTitle}`}>AI 검색</h3>
            <ul className="list-group">
              <li className="list-group-item">
                <a href="https://www.google.com" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                  Google AI 검색
                </a>
              </li>
              <li className="list-group-item">
                <a href="https://www.bing.com" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                  Bing AI 검색
                </a>
              </li>
              <li className="list-group-item">
                <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                  ChatGPT
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHome;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Card, CardContent, Button, Typography } from '@mui/material';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Pagination, Autoplay, Navigation } from 'swiper/modules';
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import { fetchData } from '../../utils/dataUtils';
import styles from './MainHome.module.css';
import banner1 from '../../assets/images/banner1.png';
import banner2 from '../../assets/images/banner2.png';

const MainHome = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState('left');

  useEffect(() => {
    const fetchNotices = async () => {
      if (!user || !hasPermission(user.auth, 'mainhome')) {
        return;
      }
      try {
        const noticeResult = await fetchData('notice/list', { gubun: 'LISTTOP', noticeId: '', debug: 'F' });
        if (noticeResult.errCd === '00' && noticeResult.data.length > 0) {
          const mappedNotices = noticeResult.data.map((item) => {
            const boardgubun = item.BOARDGUBUN?.toLowerCase() === 'carnotice' ? 'carnotice' : 'notice';
            return {
              noticeid: item.NOTICEID,
              title: item.TITLE,
              contents: item.CONTENTS,
              date: item.REGEDT,
              boardgubun: boardgubun,
            };
          });
          setNotices(mappedNotices);
          setCurrentIndex(0);
        } else {
          console.error('No notices found or error:', noticeResult.errMsg);
          setNotices([]);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('Error fetching notices:', error);
        setNotices([]);
        setCurrentIndex(0);
      }
    };
    fetchNotices();
  }, [user]);

  const handleNavigate = (path, state = {}) => {
    navigate(path, { state });
  };

  const slideImages = [banner1, banner2].filter(img => img);

  // Swiper에 표시할 공지사항
  const getVisibleNotices = () => {
    if (notices.length <= 4) return notices;
    const maxIndex = notices.length - 4;
    const adjustedIndex = Math.min(Math.max(currentIndex, 0), maxIndex);
    return notices.slice(adjustedIndex, adjustedIndex + 4);
  };

  // 자동 슬라이드
  useEffect(() => {
    let interval;
    if (notices.length > 4) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (direction === 'left') {
            if (prev >= notices.length - 4) {
              setDirection('right');
              return prev - 1;
            }
            return prev + 1;
          } else {
            if (prev <= 0) {
              setDirection('left');
              return prev + 1;
            }
            return prev - 1;
          }
        });
      }, 10000); // 공지사항 Swiper 딜레이를 10초로 설정
    }
    return () => clearInterval(interval);
  }, [notices, direction]);

  return (
    <div>
      <div className="d-flex flex-column h-100 p-2" style={{ width: '98vw' }}>
        <div className="border w-100 mb-5">
          <Swiper
            modules={[Pagination, Autoplay, Navigation]}
            spaceBetween={0}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }} // 배너 Swiper 딜레이를 5초로 설정
            navigation
            loop
            style={{ height: '200px' }}
          >
            {slideImages.length > 0 ? (
              slideImages.map((image, index) => (
                <SwiperSlide key={index}>
                  <img
                    src={image || 'https://via.placeholder.com/300x200'} // 플레이스홀더 크기 조정
                    alt={`Slide ${index + 1}`}
                    className="w-100 h-100 object-fit-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200'; }}
                  />
                </SwiperSlide>
              ))
            ) : (
              <SwiperSlide>
                <img
                  src="https://via.placeholder.com/300x200"
                  alt="Default Slide"
                  className="w-100 h-100 object-fit-cover"
                />
              </SwiperSlide>
            )}
          </Swiper>
        </div>
        <div className={`w-100 ${styles.contentContainer} p-3`}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className={`fs-5 text-dark ${styles.boardTitle}`} style={{ margin: 0 }}>
              공지사항
            </h3>
            <Button
              variant="text"
              onClick={() => handleNavigate('/main/boardMain')}
              style={{ color: '#000', textTransform: 'none', padding: 0 }}
            >
              더보기 &gt;
            </Button>
          </div>
          <Swiper
            modules={[Autoplay]}
            spaceBetween={10}
            slidesPerView={4}
            slidesPerGroup={1}
            autoplay={{
              delay: 10000, // 공지사항 Swiper 딜레이 10초
              disableOnInteraction: false,
              enabled: notices.length > 4,
            }}
            loop={false}
            style={{ paddingBottom: '10px', width: '100%' }}
          >
            {getVisibleNotices().map((notice, index) => (
              <SwiperSlide
                key={index}
                style={{ width: '25%', height: 'auto' }}
                onClick={() => handleNavigate('/main/boardView', {
                  noticeid: notice.noticeid,
                  type: notice.boardgubun,
                })}
              >
                <Card sx={{ minHeight: 200, height: 200, margin: '10px', cursor: 'pointer' }}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {notice.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {notice.contents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {notice.date || new Date().toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
};

export default MainHome;
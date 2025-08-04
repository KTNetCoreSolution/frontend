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
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');
  const [notices, setNotices] = useState([]);
  const [carnotices, setCarnotices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 공통 인덱스 사용

  useEffect(() => {
    const fetchNotices = async () => {
      if (!user || !hasPermission(user.auth, 'mainhome')) {
        return;
      }
      try {
        const noticeResult = await fetchData('notice/list', { gubun: 'LISTTOP', noticeId: '', debug: 'F' });
        if (noticeResult.errCd === '00' && noticeResult.data.length > 0) {
          const mappedNotices = noticeResult.data.map((item) => ({
            noticeid: item.NOTICEID,
            title: item.TITLE,
            contents: item.CONTENTS,
            date: item.REGEDT,
          }));
          setNotices(mappedNotices.slice(0, 10));
          setCurrentIndex(0); // 데이터 로드 시 인덱스 초기화
        } else {
          setNotices([]);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('Error fetching notices:', error);
        setNotices([]);
        setCurrentIndex(0);
      }

      try {
        const carnoticeResult = await fetchData('carnotice/list', { gubun: 'LISTTOP', noticeId: '', debug: 'F' });
        if (carnoticeResult.errCd === '00' && carnoticeResult.data.length > 0) {
          const mappedCarnotices = carnoticeResult.data.map((item) => ({
            noticeid: item.NOTICEID,
            title: item.TITLE,
            contents: item.CONTENTS,
            date: item.REGEDT,
          }));
          setCarnotices(mappedCarnotices.slice(0, 10));
        } else {
          setCarnotices([]);
        }
      } catch (error) {
        console.error('Error fetching carnotices:', error);
        setCarnotices([]);
      }
    };
    fetchNotices();
  }, [user]);

  const handleNavigate = (path, state = {}) => {
    navigate(path, { state });
  };

  const slideImages = [
    banner1,
    banner2
  ].filter(img => img);

  // 표준활동 공지사항 슬라이드 데이터
  const getVisibleNotices = () => {
    if (notices.length < 4) return [notices.slice(0, 2), notices.slice(2, 4)];
    const maxIndex = notices.length - 4;
    const adjustedIndex = Math.min(currentIndex, maxIndex);
    return [
      notices.slice(adjustedIndex, adjustedIndex + 2),
      notices.slice(adjustedIndex + 2, adjustedIndex + 4),
    ];
  };

  // 차량관리 공지사항 슬라이드 데이터
  const getVisibleCarNotices = () => {
    if (carnotices.length < 4) return [carnotices.slice(0, 2), carnotices.slice(2, 4)];
    const maxIndex = carnotices.length - 4;
    const adjustedIndex = Math.min(currentIndex, maxIndex);
    return [
      carnotices.slice(adjustedIndex, adjustedIndex + 2),
      carnotices.slice(adjustedIndex + 2, adjustedIndex + 4),
    ];
  };

  // 자동 이동 시 인덱스 업데이트
  useEffect(() => {
    let interval;
    const shouldAutoPlay = (notices.length >= 4 && notices.slice(0, 2).length >= 2 && notices.slice(2, 4).length >= 2) ||
                          (carnotices.length >= 4 && carnotices.slice(0, 2).length >= 2 && carnotices.slice(2, 4).length >= 2);
    if (shouldAutoPlay) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % Math.max(notices.length - 3, carnotices.length - 3, 1));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [notices, carnotices]);

  return (
    <div>
      <div className="d-flex flex-column h-100 p-2" style={{ width: "98vw" }}>
        <div className="border w-100 mb-3">
          <Swiper
            modules={[Pagination, Autoplay, Navigation]}
            spaceBetween={0}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            navigation
            loop
            style={{ height: '120px' }}
          >
            {slideImages.length > 0 ? (
              slideImages.map((image, index) => (
                <SwiperSlide key={index}>
                  <img
                    src={image || 'https://via.placeholder.com/300x120'}
                    alt={`Slide ${index + 1}`}
                    className="w-100 h-100 object-fit-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x120'; }}
                  />
                </SwiperSlide>
              ))
            ) : (
              <SwiperSlide>
                <img
                  src="https://via.placeholder.com/300x120"
                  alt="Default Slide"
                  className="w-100 h-100 object-fit-cover"
                />
              </SwiperSlide>
            )}
          </Swiper>
        </div>
        <div className="d-flex w-100 flex-grow-1">
          <div className={`w-50 ${styles.contentLeftContainer} p-3`}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className={`fs-5 text-dark ${styles.boardTitle}`} style={{ margin: 0 }}>
                표준활동 공지사항
              </h3>
              <div className="d-flex align-items-center">
                {canWriteBoard && (
                  <Button
                    variant="contained"
                    onClick={() => handleNavigate('/main/boardWrite', { type: 'notice' })}
                    style={{ marginRight: '5px' }}
                  >
                    등록
                  </Button>
                )}
                {canWriteBoard && (
                  <Button
                    variant="text"
                    onClick={() => handleNavigate('/main/board', { type: 'notice' })}
                    style={{ color: '#000', textTransform: 'none', padding: 0 }}
                  >
                    더보기 &gt;
                  </Button>
                )}
              </div>
            </div>
            <Swiper
              modules={[Autoplay]}
              spaceBetween={10}
              slidesPerView={getVisibleNotices()[0].length > 0 ? 2 : 0}
              slidesPerGroup={1}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                enabled: getVisibleNotices()[0].length >= 2,
              }}
              loop={false}
              style={{ paddingBottom: '10px', width: '100%' }}
            >
              {getVisibleNotices()[0].map((notice, index) => (
                <SwiperSlide key={index} style={{ width: '50%', height: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'notice' })}>
                  <Card sx={{ minHeight: 200, height: 200, margin: '10px', cursor: 'pointer' }}>
                    <CardContent>
                      <Typography variant="h6" component="div" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notice.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <Swiper
              modules={[Autoplay]}
              spaceBetween={10}
              slidesPerView={getVisibleNotices()[1].length > 0 ? 2 : 0}
              slidesPerGroup={1}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                enabled: getVisibleNotices()[1].length >= 2,
                reverseDirection: currentIndex + 3 >= notices.length,
              }}
              loop={false}
              style={{ paddingTop: '10px', width: '100%' }}
            >
              {getVisibleNotices()[1].map((notice, index) => (
                <SwiperSlide key={index + 2} style={{ width: '50%', height: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'notice' })}>
                  <Card sx={{ minHeight: 200, height: 200, margin: '10px', cursor: 'pointer' }}>
                    <CardContent>
                      <Typography variant="h6" component="div" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notice.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <div className="px-1"></div>
          <div className={`w-50 ${styles.contentRightContainer} p-3`}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className={`fs-5 text-dark ${styles.boardTitle}`} style={{ margin: 0 }}>
                차량관리 공지사항
              </h3>
              <div className="d-flex align-items-center">
                {canWriteBoard && (
                  <Button
                    variant="contained"
                    onClick={() => handleNavigate('/main/boardWrite', { type: 'carnotice' })}
                    style={{ marginRight: '5px' }}
                  >
                    등록
                  </Button>
                )}
                {canWriteBoard && (
                  <Button
                    variant="text"
                    onClick={() => handleNavigate('/main/board', { type: 'carnotice' })}
                    style={{ color: '#000', textTransform: 'none', padding: 0 }}
                  >
                    더보기 &gt;
                  </Button>
                )}
              </div>
            </div>
            <Swiper
              modules={[Autoplay]}
              spaceBetween={10}
              slidesPerView={getVisibleCarNotices()[0].length > 0 ? 2 : 0}
              slidesPerGroup={1}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                enabled: getVisibleCarNotices()[0].length >= 2,
              }}
              loop={false}
              style={{ paddingBottom: '10px', width: '100%' }}
            >
              {getVisibleCarNotices()[0].map((notice, index) => (
                <SwiperSlide key={index} style={{ width: '50%', height: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'carnotice' })}>
                  <Card sx={{ minHeight: 200, height: 200, margin: '10px', cursor: 'pointer' }}>
                    <CardContent>
                      <Typography variant="h6" component="div" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notice.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <Swiper
              modules={[Autoplay]}
              spaceBetween={10}
              slidesPerView={getVisibleCarNotices()[1].length > 0 ? 2 : 0}
              slidesPerGroup={1}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                enabled: getVisibleCarNotices()[1].length >= 2,
                reverseDirection: currentIndex + 3 >= carnotices.length,
              }}
              loop={false}
              style={{ paddingTop: '10px', width: '100%' }}
            >
              {getVisibleCarNotices()[1].map((notice, index) => (
                <SwiperSlide key={index + 2} style={{ width: '50%', height: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'carnotice' })}>
                  <Card sx={{ minHeight: 200, height: 200, margin: '10px', cursor: 'pointer' }}>
                    <CardContent>
                      <Typography variant="h6" component="div" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {notice.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
    </div>
  );
};

export default MainHome;
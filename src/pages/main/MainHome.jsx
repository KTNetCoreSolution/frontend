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
          setNotices(mappedNotices.slice(0, 4)); // 상위 4개 로드
        } else {
          setNotices([]);
        }
      } catch (error) {
        console.error('Error fetching notices:', error);
        setNotices([]);
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
          setCarnotices(mappedCarnotices.slice(0, 4)); // 상위 4개 로드
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
              spaceBetween={10}
              slidesPerView={2}
              pagination={{ clickable: true }}
              style={{ paddingBottom: '10px', width: '100%' }}
            >
              {notices.slice(0, 2).map((notice, index) => ( // 위쪽 2개
                <SwiperSlide key={index} style={{ width: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'notice' })}>
                  <Card sx={{ minWidth: 275, margin: '10px', cursor: 'pointer' }}>
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
              spaceBetween={10}
              slidesPerView={2}
              pagination={{ clickable: true }}
              style={{ paddingTop: '10px', width: '100%' }}
            >
              {notices.slice(2, 4).map((notice, index) => ( // 아래쪽 2개
                <SwiperSlide key={index + 2} style={{ width: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'notice' })}>
                  <Card sx={{ minWidth: 275, margin: '10px', cursor: 'pointer' }}>
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
              spaceBetween={10}
              slidesPerView={2}
              pagination={{ clickable: true }}
              style={{ paddingBottom: '10px', width: '100%' }}
            >
              {carnotices.slice(0, 2).map((notice, index) => ( // 위쪽 2개
                <SwiperSlide key={index} style={{ width: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'carnotice' })}>
                  <Card sx={{ minWidth: 275, margin: '10px', cursor: 'pointer' }}>
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
              spaceBetween={10}
              slidesPerView={2}
              pagination={{ clickable: true }}
              style={{ paddingTop: '10px', width: '100%' }}
            >
              {carnotices.slice(2, 4).map((notice, index) => ( // 아래쪽 2개
                <SwiperSlide key={index + 2} style={{ width: 'auto' }} onClick={() => handleNavigate('/main/boardView', { noticeid: notice.noticeid, type: 'carnotice' })}>
                  <Card sx={{ minWidth: 275, margin: '10px', cursor: 'pointer' }}>
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
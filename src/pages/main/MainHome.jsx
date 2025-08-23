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
import mainImg from '../../assets/images/mainImg.png';
import arrowRight from '../../assets/images/icon_arrow_right.svg';

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

  // 항상 8개의 공지사항 슬롯을 반환 (데이터 없으면 빈 객체 추가)
  const getVisibleNotices = () => {
    const filledNotices = [...notices];
    while (filledNotices.length < 8) {
      filledNotices.push({});
    }
    if (filledNotices.length <= 8) return filledNotices.slice(0, 8);
    const maxIndex = filledNotices.length - 8;
    const adjustedIndex = Math.min(Math.max(currentIndex, 0), maxIndex);
    return filledNotices.slice(adjustedIndex, adjustedIndex + 8);
  };

  // 자동 슬라이드 (데이터가 8개 초과일 때만 동작)
  useEffect(() => {
    let interval;
    if (notices.length > 8) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (direction === 'left') {
            if (prev >= notices.length - 8) {
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
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [notices, direction]);

  return (
    <div className='mainContentWrap'>
      <div className='mainImgWrap'
        style={{
          background: `#D9F7FF url(${mainImg}) left 64px bottom 0 / 218px auto no-repeat`,
        }}
      >
        <div className='mainTxtWrap'>
          <div className='mainTxt01'>AICT 네트워크 인프라 선로 설계부터 유지/보수, 운영까지<br />대한민국 ICT 인프라 운영/관리 전문기업</div>
          <div className='mainTxt02'>케이티넷코어</div>
        </div>
      </div>
      <div className={`w-100 ${styles.contentContainer}`}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className='boardTitle'>
            공지사항
          </h3>
          <Button
            variant="text"
            onClick={() => handleNavigate('/main/boardMain')}
            className='boardBtn01'
          >
            더보기
            <img src={arrowRight} className="arrow-icon" />
          </Button>
        </div>
        <div className={styles.noticeGrid}>
          {getVisibleNotices().map((notice, index) => (
            <div key={index} className={styles.gridItem}>
              <Card 
                className='cardMain' 
                onClick={() => handleNavigate('/main/boardView', {
                  noticeid: notice.noticeid,
                  type: notice.boardgubun,
                })}>
                <CardContent className='cardContent'>
                  {notice.title ? (
                    <>
                      <div>
                        <Typography
                          variant="h6"
                          component="div"
                          className='title'
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
                          className='body'
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
                      </div>
                      <Typography variant="body2" className='date'>
                        {notice.date || new Date().toLocaleDateString()}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" className={styles.emptyNotice}>
                      공지사항 없음
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainHome;
import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Card, CardContent, Button } from '@mui/material';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Pagination, Autoplay, Navigation } from 'swiper/modules';
import useStore from '../../store/store';
import { hasPermission } from '../../utils/authUtils';
import styles from './MainHome.module.css';
import banner1 from '../../assets/images/banner1.png';
import banner2 from '../../assets/images/banner2.png';
import mainImg from '../../assets/images/mainImg.png';
import Board from './Board';
import BoardMainPopup from './popup/BoardMainPopup';
import BoardWritePopup from './popup/BoardWritePopup';
import BoardViewPopup from './popup/BoardViewPopup';
import arrowRight from '../../assets/images/icon_arrow_right.svg';

const MainHome = () => {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState('tab1');
  const [activeCarTab, setActiveCarTab] = useState('carTab1');
  const [showBoardMainModal, setShowBoardMainModal] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null); // { type, noticeid, notice, files }
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');

  const handleNavigate = (type) => {
    setSelectedNotice({ type });
    setShowBoardMainModal(true);
  };

  const handleWrite = (type) => {
    setSelectedNotice({ type });
    setShowWriteModal(true);
  };

  const handleView = (noticeid, type) => {
    setSelectedNotice({ noticeid, type });
    setShowViewModal(true);
  };

  const handleEdit = (notice, files) => {
    setShowViewModal(false);
    setSelectedNotice({ type: selectedNotice?.type, notice, files });
    setShowWriteModal(true);
  };

  const slideImages = [banner1, banner2].filter(img => img);

  return (
    <div className='mainContentWrap'>
      <div
        className='mainImgWrap'
        style={{
          background: `#D9F7FF url(${mainImg}) left 45px bottom 0 / 192px auto no-repeat`,
        }}
      >
        <div className='mainTxtWrap'>
          <div className='mainTxt01'>
            AICT 네트워크 인프라 선로 설계부터 유지/보수, 운영까지<br />
            대한민국 ICT 인프라 운영/관리 전문기업
          </div>
          <div className='mainTxt02'>케이티넷코어</div>
        </div>
      </div>

      <div className='boardContainer'>
        <div className='boardSection'>
          <div className='tabHeader'>
            <ul className='nav nav-tabs' role='tablist'>
              <li className='nav-item' role='presentation'>
                <button
                  className={`nav-link ${activeTab === 'tab1' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tab1')}
                  type='button'
                  role='tab'
                  aria-controls='tab1'
                  aria-selected={activeTab === 'tab1'}
                >
                  표준활동 공지사항
                </button>
              </li>
              <li className='nav-item' role='presentation'>
                <button
                  className={`nav-link ${activeTab === 'tab2' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tab2')}
                  type='button'
                  role='tab'
                  aria-controls='tab2'
                  aria-selected={activeTab === 'tab2'}
                >
                  표준활동 패치내역
                </button>
              </li>
            </ul>
            <Button
              variant='text'
              onClick={() => handleNavigate(activeTab === 'tab1' ? 'notice' : 'notice2')}
              className='boardBtn01'
            >
              더보기
              <img src={arrowRight} className='arrowIcon' alt='arrow' />
            </Button>
          </div>

          <div className='tab-content'>
            <div
              className={`tab-pane fade ${activeTab === 'tab1' ? 'show active' : ''}`}
              id='tab1'
              role='tabpanel'
              aria-labelledby='tab1'
            >
              <div className='boardBox'>
                <Board
                  key={`notice-${activeTab}`} // 탭 변경 시 강제 리렌더링
                  canWriteBoard={canWriteBoard}
                  type='notice'
                  onWrite={() => handleWrite('notice')}
                  onView={handleView}
                  showHeader={false}
                />
              </div>
            </div>
            <div
              className={`tab-pane fade ${activeTab === 'tab2' ? 'show active' : ''}`}
              id='tab2'
              role='tabpanel'
              aria-labelledby='tab2'
            >
              <div className='boardBox'>
                <Board
                  key={`notice2-${activeTab}`} // 탭 변경 시 강제 리렌더링
                  canWriteBoard={canWriteBoard}
                  type='notice2'
                  onWrite={() => handleWrite('notice2')}
                  onView={handleView}
                  showHeader={false}
                />
              </div>
            </div>
          </div>
        </div>
        <div className='boardSection'>
          <div className='tabHeader'>
            <ul className='nav nav-tabs' role='tablist'>
              <li className='nav-item' role='presentation'>
                <button
                  className={`nav-link ${activeCarTab === 'carTab1' ? 'active' : ''}`}
                  onClick={() => setActiveCarTab('carTab1')}
                  type='button'
                  role='tab'
                  aria-controls='carTab1'
                  aria-selected={activeCarTab === 'carTab1'}
                >
                  차량 공지사항
                </button>
              </li>
              <li className='nav-item' role='presentation'>
                <button
                  className={`nav-link ${activeCarTab === 'carTab2' ? 'active' : ''}`}
                  onClick={() => setActiveCarTab('carTab2')}
                  type='button'
                  role='tab'
                  aria-controls='carTab2'
                  aria-selected={activeCarTab === 'carTab2'}
                >
                  차량 과태료
                </button>
              </li>
            </ul>
            <Button
              variant='text'
              onClick={() => handleNavigate(activeCarTab === 'carTab1' ? 'carnotice' : 'carnotice2')}
              className='boardBtn01'
            >
              더보기
              <img src={arrowRight} className='arrowIcon' alt='arrow' />
            </Button>
          </div>

          <div className='tab-content'>
            <div
              className={`tab-pane fade ${activeCarTab === 'carTab1' ? 'show active' : ''}`}
              id='carTab1'
              role='tabpanel'
              aria-labelledby='carTab1'
            >
              <div className='boardBox'>
                <Board
                  key={`carnotice-${activeCarTab}`} // 탭 변경 시 강제 리렌더링
                  canWriteBoard={canWriteBoard}
                  type='carnotice'
                  onWrite={() => handleWrite('carnotice')}
                  onView={handleView}
                  showHeader={false}
                />
              </div>
            </div>
            <div
              className={`tab-pane fade ${activeCarTab === 'carTab2' ? 'show active' : ''}`}
              id='carTab2'
              role='tabpanel'
              aria-labelledby='carTab2'
            >
              <div className='boardBox'>
                <Board
                  key={`carnotice2-${activeCarTab}`} // 탭 변경 시 강제 리렌더링
                  canWriteBoard={canWriteBoard}
                  type='carnotice2'
                  onWrite={() => handleWrite('carnotice2')}
                  onView={handleView}
                  showHeader={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBoardMainModal && (
        <BoardMainPopup
          show={showBoardMainModal}
          onHide={() => setShowBoardMainModal(false)}
          type={selectedNotice?.type}
        />
      )}
      {showWriteModal && (
        <BoardWritePopup
          show={showWriteModal}
          onHide={() => setShowWriteModal(false)}
          notice={selectedNotice?.notice}
          files={selectedNotice?.files || []}
          type={selectedNotice?.type}
        />
      )}
      {showViewModal && selectedNotice?.noticeid && (
        <BoardViewPopup
          show={showViewModal}
          onHide={() => setShowViewModal(false)}
          noticeid={selectedNotice?.noticeid}
          type={selectedNotice?.type}
          onEdit={(notice, files) => handleEdit(notice, files)}
        />
      )}
    </div>
  );
};

export default MainHome;
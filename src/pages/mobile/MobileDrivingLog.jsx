import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import useStore from '../../store/store';
import commonUtils from '../../utils/common';
import fileUtils from '../../utils/fileUtils';
import { fetchData } from "../../utils/dataUtils";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu';
import styles from './MobileDrivingLog.Module.css';
import api from '../../utils/api';

const MobileDrivingLog = () => {
  const { user } = useStore();
  const { clearUser } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carId, setCarId] = useState('');
  const [carList, setCarList] = useState([]);
  const [boardList, setBoardList] = useState([]);
  const [carInfo, setCarInfo] = useState({CARNO: '', CARNM: '', MANAGER_EMPNM: '', MANAGER_MOBILE: '', GARAGE_ADDR: '', src: null, bookMark: false, REQCNT: 0});
  const [isFilled, setIsFilled] = useState(false);

  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleLogout = async () => {
    try {
      const response = await api.post(commonUtils.getServerUrl('auth/logout'), {});
      if (response) {
        clearUser();
        navigate('/mobile/Login');
      }
    } catch (error) {
      console.error('Logout failed:', error.message);
      clearUser();
      navigate('/mobile/Login');
    }
  };

  const initializeComponent = async () => {
    // Component에 들어갈 데이터 로딩
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const params = { pEMPNO: user?.empNo, pDEBUG: "F" };
      const response = await fetchData('carlogM/userCarList', params);

      if (!response.success) {
        throw new Error(response.errMsg || '차량목록 조회 중 오류가 발생했습니다.');
      } else {
        setCarList(response.data);
        if (response.data.length > 0) {
          getCarImgInfo(response.data[0].CARID);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량목록 조회 중 오류가 발생했습니다.');
    }

    try {
      const params = { pDEBUG: "F" };
      const response = await fetchData('carlogM/carNoticeList', params);

      if (!response.success) {
        throw new Error(response.errMsg || '차량관리 공지사항 조회 중 오류가 발생했습니다.');
      } else {
        if(response.data != null) {
          setBoardList(response.data);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량관리 공지사항 조회 중 오류가 발생했습니다.');
    }
  };
    
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    initializeComponent();
    //return () => {
    //};
  }, []);
  
  
  const calculateActiveIndex = (index) => {
    setCurrentIndex(index);

    if (index === 0) {
      return 0; // 첫 페이지
    } else if (index === carList.length - 1) {
      return Math.min(9, carList.length - 1); // 마지막 페이지
    } else if(carList.length <= 10) {
      // 페이지가 10개 이하일 때
      return index; 
    } else if (carList.length > 10 && index < 9) {
      // 페이지가 10개 초과일 때
      if (activeIndex === 1 && index <= currentIndex) {
        return 1; // currentIndex가 1일 때는 첫 도트
      }
      else if (index > activeIndex && index >= currentIndex) {
        return index; // currentIndex가 9 이하일 때는 1:1 매핑
      } else {
        return activeIndex - 1; // currentIndex가 9 초과일 때는 9번째 도트 유지
      }
    } else if (carList.length > 10 && index >= 9) { 
      if (index >= currentIndex) {
        if (activeIndex == 8) {
          return 8;
        }
        else {
          return activeIndex + 1; // currentIndex가 9 초과일 때는 도트 하나씩 이동
        }
      } else if (index < currentIndex) {         
        if (activeIndex == 1) {
          return 1;
        }
        else {
          return activeIndex - 1; // currentIndex가 9 초과일 때는 도트 하나씩 이동
        }
      } else {
        return 1; // currentIndex가 1일 때는 첫 도트
      }
    } else {
      return index - 1; // 직전 도트
    }
  };

  const handlers = useSwipeable({
    onSwiped: () => {
    },
    onSwipedLeft: () => {
      const index = currentIndex + 1;
      if (currentIndex < carList.length - 1) {
        const carId = carList[index].CARID;
        getCarImgInfo(carId);
        setActiveIndex(calculateActiveIndex(index));
      }
    },
    onSwipedRight: () => {
      const index = currentIndex - 1;
      if (currentIndex > 0) {
        const carId = carList[index].CARID;
        getCarImgInfo(carId);
        setActiveIndex(calculateActiveIndex(index));
      };
    },
    trackTouch: true,
    trackMouse: true, // 마우스 드래그도 지원 (선택 사항)
  });
    
  const handleBookMark = async (e) => {
    e.preventDefault();  

    try{
      const gubun = !isFilled ? 'I' : 'D';
      const params = {pGUBUN: gubun, pEMPNO: user?.empNo, pCARID: carId};
      
      const response = await fetchData('carlog/carBookMarkTransaction', params);

      if (!response.success) {
        throw new Error(response.errMsg || '차량 즐겨찾기 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          setIsFilled(!isFilled);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량 즐겨찾기 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const getCarImgInfo = async (carId) => {
    setCarId(carId);
    //alert(carId);
    try{      
      const params = { pEMPNO: user?.empNo, pCARID: carId, pDEBUG: "F" };
      const response = await fetchData('carlogM/carInfo', params);

      if (!response.success) {
        throw new Error(response.errMsg || '차량정보 조회 중 오류가 발생했습니다.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;
          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          errorMsgPopup(errMsg);
        } else {
          const extension = fileUtils.getFileExtension(response.data[0].IMGNM)?.toLowerCase();
          const mimeType = fileUtils.mimeTypes[extension] || 'application/octet-stream';
          const fileData = response.data[0].IMGDATA;

          const dataUrl = `data:${mimeType};base64,${fileData}`;
          const carNo = response.data[0].CARNO;
          const carNm = response.data[0].CARNM;
          const managerEmpNm = response.data[0].PRIMARY_MANAGER_EMPNM;
          const managerMobile = response.data[0].PRIMARY_MANAGER_MOBILE;
          const garageAddr = response.data[0].PRIMARY_GARAGE_ADDR;
          const reqCnt = response.data[0].REQCNT;
          
          const bBookMark = response.data[0].BOOKMARK === 'Y' ? true : false;
          
          setCarInfo({CARNO: carNo, CARNM: carNm, MANAGER_EMPNM: managerEmpNm, MANAGER_MOBILE: managerMobile, GARAGE_ADDR: garageAddr, src: dataUrl, bookMark: bBookMark, REQCNT: reqCnt});
          setIsFilled(bBookMark);
        }

      }
    } catch (error) {
      setCarId('');
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '차량정보 조회 중 오류가 발생했습니다.');
    }
  };

  const moveToRegLog = () => {
    if(carId === '' || carId === null) {
      return;
    }
    navigate('/mobile/MobileCarLogReg', { state: { carId: carId } });
  };

  const moveToConfirm = () => {
    if (carInfo.REQCNT > 0) {
      navigate('/mobile/MobileCarLogConfirm');      
    } else {
      alert('미결재건이 없습니다.');
    }
  }

  return (
      <div className="container-fluid p-0">
        <header className="header">
          <h1 className="h5 mb-0">운행일지</h1>
          <button className="btn text-white" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>        
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
          <div>
            <div className="p-1 align-items-center">
              <div {...handlers} className={styles.sliderContainer}>
                <div className={styles.sliderWrapper} style={{transform: `translateX(-${currentIndex * 100}%)`}}>
                    {carList.map((item, index) =>  
                      <div key={item.CARID} className={styles.slide}>            
                        <div className={styles.container}>
                            <div className='d-flex justify-content-center align-items-center gap-2'>
                              <label className={`${styles.formCarNm}`}>{carInfo.CARNM} - {carInfo.CARNO}</label>
                              {/* <div className={`${styles.starBorder}`}>
                                <button onClick={(e) => {handleBookMark(e)}} className={`${styles.star} ${isFilled ? styles.filled : ''}`}  />
                              </div> */}
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill={isFilled ? 'gold' : '#e0e0e0'}
                                // stroke="#888"
                                // strokeWidth="1" 
                                strokeLinejoin="round"
                                onClick={handleBookMark}
                                style={{ cursor: 'pointer' }}
                              >
                                <path d="M12 2.5l2.95 6.11 6.73.98-4.87 4.74 1.15 6.7L12 17.77 6.04 21l1.15-6.7-4.87-4.74 6.73-.98L12 2.5z" />
                              </svg>
                            </div>
                            <img src={carInfo.src} className={styles.carImage} />
                        </div>
                      </div>
                    )}
                </div>
              </div>
              <div className={styles.dotNavigation}>
                {carList.slice(0, Math.min(10, carList.length)).map((item, index) => (
                  <span key={index} className={`dot ${index === activeIndex ? styles.dotActive : styles.dot}`}></span>
                ))}
              </div>
            </div>
          </div>
          <div className="formDivBox">
            <div className="formListData">
              <span className="formLabel" style={{width: '120px'}}>차고지</span>
              <div className="formData">{carInfo.GARAGE_ADDR}</div>
            </div>
          </div>
          <div className="formDivBox">
            <ul className='formListData'>
              <li>
                <span className="formLabel" style={{width: '120px'}}>운전자(정)</span>
                <div className="formData">{carInfo.MANAGER_EMPNM}</div>
              </li>
              <li className={`d-flex ${styles.container}`}>
                <span className="formLabel" style={{width: '120px'}}>연락처</span>
                <div className="formData">{carInfo.MANAGER_MOBILE}</div>
              </li>
            </ul>
          </div>
          <button className="btn btn-primary btn-custom w-100" onClick={moveToRegLog}>차량점검 및 일지작성</button>
          <div className="formDivBox" onClick={(e) => navigate('/mobile/MobileCarNotice')} >
            <div>      
              {boardList.length > 0 ? (
                boardList.map((item, index) =>  
                  <div key={item.NOTICEID} className={`d-flex ${index === 0 ? styles.formDivNotiICON : ''}`} ><span className="formNotiList">{item.SIMPLE_TITLE}</span></div>
                )) : (
                  <div className="nodataWrap">등록된 공지사항이 없습니다.</div>
                )
              }
            </div>
          </div>
          <div className="formDivBtnBox" onClick={moveToConfirm} >
            <div>
              <label className="formListTitle">결재</label>
              <label className="formDesc">미결재 {carInfo.REQCNT} 건 있습니다.</label>
            </div>
            <div className="arrowContainer"></div>
          </div>
          <div className="formDivBtnBox" onClick={(e) => navigate('/mobile/MobileCarLogList')} >
            <div>
              <label className="formListTitle">운행이력</label>
              <label className="formDesc">내 운행이력을 확인합니다.</label>
            </div>
            <div className="arrowContainer"></div>
          </div>
          <div className="formDivBtnBox" onClick={(e) => navigate('/mobile/MobileCarCheckStatus')} >
            <div>
              <label className="formListTitle">차량상태</label>
              <label className="formDesc">내 조직의 차량상태를 확인합니다</label>
            </div>
            <div className="arrowContainer"></div>
          </div>
        </div>
      </div>
  );
};

export default MobileDrivingLog;
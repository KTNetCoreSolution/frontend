import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import { fetchData } from "../../utils/dataUtils.js";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import styles from './MobileCarPenaltyList.module.css';
import api from '../../utils/api.js';

const MobileCarPenaltyList = () => {
  const { user } = useStore();
  const { clearUser } = useStore();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [list, setList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [id, setId] = useState('');
  const itemsPerPage = 10;
  const maxPageButtons = 5;

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
    
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    initializeComponent();
    //return () => {
    //};
  }, []);
  
  const initializeComponent = async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const carId = state?.carId || '';

    if (carId === '') {
      errorMsgPopup("잘못된 접근입니다.");
      navigate(-1);
      return;
    }

    try {
      const params = { CARID: carId, pDEBUG: "F" };
      const response = await fetchData('carlogM/penalyList', params);

      if (!response.success) {
        throw new Error(response.errMsg || '과태료 미납 목록 조회 중 오류가 발생했습니다.');
      } else {
        setList(response.data);
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '과태료 미납 목록 조회 중 오류가 발생했습니다.');
    }
  };

  const handleReturnPage = () => {
    navigate('/mobile/MobileDrivingLog');
  };

  const handleListClick = (item) => {
    if (item.ID === id) {
      setId('');
    }
    else {
      setId(item.ID);
    }
  };
  
  const handlePament = async (e, item) => {
    e.stopPropagation();

    if(!confirm('과태료를 납부한 후 완료처리 해야 합니다. 납부 완료처리 하시겠습니까?')) {
      return;
    }

    try {
      const params = { pGUBUN: item.GUBUN, pPENALTYNO: item.PENALTY_NO, pEMPNO: user?.empNo };
      
      const response = await fetchData('carlogM/paymentTransaction', params);

      if (!response.success) {
        throw new Error(response.errMsg || '과태료 납부 완료처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("과태료 납부 완료처리 되었습니다.");
          await initializeComponent();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '과태료 납부 완료처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
  const totalCnt = list === null ? 0 : list.length || 0;
  const totalPages = Math.ceil(totalCnt / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentList = list === null ? [] : list.slice(indexOfFirstItem, indexOfLastItem);

  const halfMaxButtons = Math.floor(maxPageButtons / 2);
  let startPage = Math.max(1, currentPage - halfMaxButtons);
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
      <div className="container-fluid p-0">
        <header className="header">
          <h1 className="h5 mb-0">과태료 미납목록</h1>
          <button className="btn text-white" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>
        
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
          <div className="d-flex justify-content-end">
            <button className="btn btn-secondary" style={{width: '80px'}} onClick={handleReturnPage}>돌아가기</button>
          </div>
        {currentList.length > 0 ? (
          currentList.map((item, index) => (
          <div key={`${item.CARID}_${index}`} className="formDivBox" onClick={(e) => handleListClick(item)} >
            <ul className="formListData">          
              <li>
                <span className="formLabel" style={{width: '120px'}}>차량번호</span>
                <div className="formText">{item.CARNO}</div>
              </li>
              <li>
                <span className="formLabel" style={{width: '120px'}}>위반일시</span>
                <div className="formText">{item.VIOLATION_DATETIME}</div>
              </li>
              <li>
                <span className="formLabel" style={{width: '120px'}}>관할</span>
                <div className="formText">{item.OFFICE}</div>
              </li>
              <li>
                <span className="formLabel" style={{width: '120px'}}>납부금액</span>
                <div className="formText">{item.PAYABLE_AMOUNT}원</div>
              </li>
              <li>
                <span className="formLabel" style={{width: '120px'}}>납부기한</span>
                <div className="formText">{item.DUE_DATE}</div>
              </li>
            </ul>
            <ul className={`formListData mt-2 ${styles.formDivOverlayHide} ${id === item.ID ? styles.formDivOverlayShow : ''}`}>
              <li>
                <span className="formLabel" style={{width: '120px'}}>위반장소</span>
                <div className="formText">{item.VIOLATION_LOCATION}</div>
              </li>
              <li>
                <span className="formLabel" style={{width: '120px'}}>위반내용</span>
                <div className="formText">{item.VIOLATION_DETAILS}</div>
              </li>
              <li>
                <span className="formLabel" style={{width: '120px'}}>{item.GUBUN === 'LOCAL' ? ('전자납부번호') : ('과태료번호')}</span>
                <div className="formText">{item.PENALTY_NO}</div>
              </li>
              {item.GUBUN === 'LOCAL' ? (
                <li>
                  <span className="formLabel" style={{width: '120px'}}>납세번호</span>
                  <div className="formText">{item.TAXPAYER_ID}</div>
                </li>
                ) : ('')}
              <li>
                <span className="formLabel" style={{width: '120px'}}>가상계좌</span>
              </li>
              <li>
                <div className="formText" style={{paddingLeft:'10px'}}>{item.VIRTUAL_ACCOUNT}</div>
              </li>
              <li>
                <div className="btnWrap w-100">
                    <button className='btn btn-primary flex-grow-1' onClick={(e) => handlePament(e, item)}>납부완료처리</button>
                  </div>
                </li>
            </ul>
          </div>
          ))
         ) : (
          <div className="nodataWrap">조회된 목록이 없습니다.</div>
        )}
        {totalPages > 1 && (
          <nav aria-label="Page navigation" className="mt-3">
            <ul className={`pagination justify-content-center ${styles.pagination}`}>
              {totalPages > maxPageButtons && (
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className={`page-link ${styles.pageLink}`} onClick={() => handlePageChange(1)}  disabled={currentPage === 1} >
                    &lt;&lt;
                  </button>
                </li>
              )}
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className={`page-link ${styles.pageLink}`} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                  &lt;
                </button>
              </li>
              {pageNumbers.map((page) => (
                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                  <button className={`page-link ${styles.pageLink}`} onClick={() => handlePageChange(page)} >
                    {page}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className={`page-link ${styles.pageLink}`} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} >
                  &gt;
                </button>
              </li>
              {totalPages > maxPageButtons && (
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`} >
                  <button className={`page-link ${styles.pageLink}`} onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} >
                    &gt;&gt;
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
        </div>
      </div>
  );
};

export default MobileCarPenaltyList;
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import { fetchData } from "../../utils/dataUtils.js";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import styles from './MobileCarLogConfirm.module.css';
import api from '../../utils/api.js';

const MobileCarLogConfirm = () => {
  const { user } = useStore();
  const { clearUser } = useStore();
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

  const initializeComponent = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const params = { pEMPNO: user?.empNo, pDEBUG: "F" };
      const response = await fetchData('carlogM/carLogRequestList', params);

      if (!response.success) {
        throw new Error(response.errMsg || '운행이력 조회 중 오류가 발생했습니다.');
      } else {
        setList(response.data);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message || '운행이력 조회 중 오류가 발생했습니다.');
    }
  };
    
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    initializeComponent();
    //return () => {
    //};
  }, []);

  const handleListClick = (logInfo) => {
    if (logInfo.ID === id) {
      setId('');
    }
    else {
      setId(logInfo.ID);
    }
  };
  
  const handleConfrim = async (e, item, stat) => {
    e.preventDefault();

    let confMsg  = '승인';

    if(stat === 'N') {
      confMsg  = '반려';
    }
    else if (stat === 'R') {
      confMsg  = '재승인 요청';
    }
    
    if(!confirm('선택한 운행일지를 ' + confMsg + ' 하시겠습니까?')) {
      return;
    }

    try {
      const params = { pLOGDATE: item.LOGDATE, pLOGSTTIME: item.LOGSTTIME, pCARID: item.CARID, pLOGSTAT: stat, pTRTEMPNO: user?.empNo };
      const response = await fetchData("carlog/logConfirmTransaction", params );

      if (!response.success) {
        throw new Error(response.errMsg || '운행일지 ' + confMsg + ' 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup('선택한 운행일지가 ' + confMsg + ' 되었습니다.');
          await initializeComponent();
        }
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const handleConfrimAll = async (e) => {
    e.preventDefault();
    
    if(!confirm('승인 대기 중인 운행일지를 모두 승인하시겠습니까?')) {
      return;
    }
    try {
      const params = { pTRTEMPNO: user?.empNo };
      
      const response = await fetchData('carlog/logConfirmAllTransaction', params);

      if (!response.success) {
        throw new Error(response.errMsg || '운행일지 일괄승인 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        if (response.errMsg !== '' || response.data[0].errCd !== '00') {
          let errMsg = response.errMsg;

          if (response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;

          errorMsgPopup(errMsg);
        } else {
          msgPopup("운행일지 일괄 승인 되었습니다.");
          await initializeComponent();
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행일지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleReturnPage = () => {
    navigate('/mobile/MobileDrivingLog');
  };
  
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
          <h1 className="h5 mb-0">운행일지 미결재 목록</h1>
          <button className="btn text-white" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>         
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
          <div style={{display: 'flex', marginTop:-5 + 'px', marginBottom:10 + 'px', marginRight:4 + 'px', justifyContent: 'flex-end'}}>
            <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{width: 80 + 'px', display: user?.levelCd === '41' ? 'block' : 'none' }} onClick={(e) => handleConfrimAll(e)}>일괄승인</button>
            <button className={`btn ${styles.btnReturn} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={handleReturnPage}>돌아가기</button>
          </div>
          {currentList.length > 0 ? (
            currentList.map((item, index) => (
          <div key={`${item.CARID}_${index}`} className={`${styles.formDivBox}`} onClick={(e) => handleListClick(item)} >
            <div className={styles.container}>              
              <div className={`d-flex ${styles.formList}`} >
                <span className={`${styles.formText}`} style={{width:50 + '%'}} >차량번호: {item.CARNO}</span>
                <span className={`${styles.formText}`} >차대번호: {item.CARID}</span>
              </div>
              <div className={`${styles.formList}`} >
                <span className={`${styles.formText}`}>운행일시: {item.LOGDATE} {item.LOGSTTIME} ~ {item.LOGENTIME}</span>
              </div>
              <div className={`${styles.formList}`} >
                <span className={`${styles.formText}`}>운행시간: {item.DIFFTIME}</span>
              </div>
              <div className={`d-flex ${styles.formList}`} >
                <span className={`${styles.formText}`}>운행자: {item.EMPNM} ({item.EMPNO})</span>
              </div>
              <div className={`d-flex ${styles.formList}`} >
                <span className={`${styles.formText}`} style={{width:33 + '%'}}>시작Km: {item.STKM}</span>
                <span className={`${styles.formText}`} style={{width:33 + '%'}}>종료Km: {item.ENKM}</span>
                <span className={`${styles.formText}`} style={{width:33 + '%'}}>운행거리: {item.LEAVEKM}</span>
              </div>
              <div className={`d-flex ${styles.formList}`} >
                <span className={`${styles.formText}`} style={{width:33 + '%'}}>주유(ℓ): {item.FUEL}</span>
                <span className={`${styles.formText}`} style={{width:66 + '%'}} >승인상태: <span className={`${styles.formText}`} style={{color: item.LOGSTAT === 'N' ? 'red' : '#525252'}}>{item.LOGSTATNM} </span></span>                 
              </div>
            </div>
            <div className={`${styles.container} ${styles.formDivOverlayHide} ${id === item.ID ? styles.formDivOverlayShow : ''}`}>
              <div className={`${styles.formList}`} >
                <span className={`${styles.formText}`}>차량파손:</span>
                <span className={`${styles.formText}`} style={{color: item.DAMAGE === '양호' ? '#22cc00' : 'red'}}>{item.DAMAGE}</span>
                <span className={`${styles.formText}`}>오일누수:</span>
                <span className={`${styles.formText}`} style={{color: item.OILLEAK === '양호' ? '#22cc00' : 'red'}}>{item.OILLEAK}</span>
                <span className={`${styles.formText}`}>타이어:</span>
                <span className={`${styles.formText}`} style={{color: item.TIRE === '양호' ? '#22cc00' : 'red'}}>{item.TIRE}</span>
              </div>
              <div className={`${styles.formList}`} >
                <span className={`${styles.formText}`}>적재물안전:</span>
                <span className={`${styles.formText}`} style={{color: item.LUGGAGE === '양호' ? '#22cc00' : 'red'}}>{item.LUGGAGE}</span>
                <span className={`${styles.formText}`}>기타:</span>
                <span className={`${styles.formText}`} style={{color: item.ETC1 === '양호' ? '#22cc00' : 'red'}}>{item.ETC1}</span>
                <span className={`${styles.formText}`}>특이사항:</span>
                <span className={`${styles.formText}`} style={{color: item.ETC2 === '양호' ? '#22cc00' : 'red'}}>{item.ETC2}</span>
              </div>
                {item.LEVELCD === '41' ? (
                  <div className={`${styles.formList}`} style={{display:'flex', marginTop:10 + 'px', justifyContent:'center'}} >
                    <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={(e) => handleConfrim(e, item, 'Y')}>승인</button>
                    <button className={`btn ${styles.btnReject} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={(e) => handleConfrim(e, item, 'N')}>반려</button>
                  </div>
                  ) : item.LOGSTAT === 'N' ? (
                  <div className={`${styles.formList}`} style={{display:'flex', marginTop:10 + 'px', justifyContent:'center'}} >
                    <button className={`btn ${styles.btnCheck} ${styles.btn}`} style={{width: 80 + 'px'}} onClick={(e) => handleConfrim(e, item, 'R')}>재승인요청</button>
                  </div>
                  ) : ('')
                }
            </div>
          </div>
            ))
          ) : (
            <li className="list-group-item text-center">미결재 목록이 없습니다.</li>
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

export default MobileCarLogConfirm;
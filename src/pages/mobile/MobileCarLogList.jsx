import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import { fetchData } from "../../utils/dataUtils.js";
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import styles from './MobileCarLogList.module.css';
import api from '../../utils/api.js';

const MobileCarLogList = () => {
  const { user } = useStore();
  const { clearUser } = useStore();
  const navigate = useNavigate();
  const todayDate = commonUtils.getTodayDate();  
  const [showSidebar, setShowSidebar] = useState(false);
  const [dateInfo, setDateInfo] = useState({startDate: todayDate, endDate: todayDate});
  const [list, setList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
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
  };
    
  useEffect(() => {
    // 컴포넌트 언마운트 시 테이블 정리
    initializeComponent();
    //return () => {
    //};
  }, []);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    let chkValue = new Date(value);
    let stdt = new Date(dateInfo.startDate);
    let endt = new Date(dateInfo.endDate);

    let returnDate = value;
    
    if (name === 'startDate' && chkValue > endt) {
      returnDate = dateInfo.endDate;
    }
    else if (name === 'endDate' && chkValue < stdt) {
      returnDate = dateInfo.startDate;
    }

    setDateInfo((prev) => ({ ...prev, [name]: returnDate }));
  }

  const handleSearchClick = async () => {
    try {
      const params = { pSTDT: dateInfo.startDate, pENDT: dateInfo.endDate, pEMPNO: user?.empNo, pDEBUG: "F" };
      const response = await fetchData('carlogM/carLogList', params);

      if (!response.success) {
        throw new Error(response.errMsg || '운행이력 조회 중 오류가 발생했습니다.');
      } else {
        setList(response.data);
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMsgPopup(error.message || '운행이력 조회 중 오류가 발생했습니다.');
    }
  };
  
  const totalCnt = list.length || 0;
  const totalPages = Math.ceil(totalCnt / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentList = list.slice(indexOfFirstItem, indexOfLastItem);

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
        <header className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
          <h1 className="h5 mb-0">기동장비 운행이력</h1>
          <button className="btn" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>  
        
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
          <div className={`${styles.formDivBox}`}>
            <div className={styles.container}>              
              <div className={`d-flex ${styles.formList}`} >
                <span className={`${styles.formSearch}`} style={{width:56 + 'px'}} >운행일자 </span>
                <input name="startDate" type="date" className={`${styles.formInputDate}`} style={{marginRight:5 +'px'}} value={dateInfo.startDate} onChange={(e) => handleDateChange(e)} />~
                <input name="endDate" type="date" className={`${styles.formInputDate}`} style={{marginLeft:5 +'px'}} value={dateInfo.endDate} onChange={(e) => handleDateChange(e)} />
                <button className={`btn ${styles.btnCheck} ${styles.btn}`} onClick={(e) => handleSearchClick()}>조회</button>
              </div>
            </div>
          </div>
        {currentList.length > 0 ? (
          currentList.map((item, index) => (
          <div key={item.CARID} className={`${styles.formDivBox}`} onClick={(e) => handleNoticeClick(item)} >
            <div className={styles.container}>              
              <div className={`d-flex ${styles.formList}`} >
                <span className={`${styles.formText}`} style={{width:50 + '%'}} >차량번호: {item.CARNO}</span>
                <span className={`${styles.formText}`} >차대번호: {item.CARID}</span>
              </div>
              <div className={`${styles.formList}`} >
                <span className={`${styles.formText}`}>운행일시: {item.LOGDATE} {item.LOGSTTIME} ~ {item.LOGENTIME}</span>
              </div>
              <div className={`d-flex ${styles.formList}`} >
                <span className={`${styles.formText}`} style={{width:54 + 'px'}} >승인상태: </span> 
                <span className={`${styles.formText}`} style={{color: item.LOGSTAT === 'N' ? 'red' : '#525252'}}>{item.LOGSTATNM} </span>
              </div>
              {item.LOGDATE === "" ? ('') : (
                <div className={`${styles.formList}`} style={{marginTop:10 + 'px'}} >
                  <span className={`${styles.formText}`}>차량파손:</span>
                  <span className={`${styles.formText}`} style={{color: item.DAMAGE === '양호' ? '#22cc00' : 'red'}}>{item.DAMAGE}</span>
                  <span className={`${styles.formText}`}>오일누수:</span>
                  <span className={`${styles.formText}`} style={{color: item.OILLEAK === '양호' ? '#22cc00' : 'red'}}>{item.OILLEAK}</span>
                  <span className={`${styles.formText}`}>타이어:</span>
                  <span className={`${styles.formText}`} style={{color: item.TIRE === '양호' ? '#22cc00' : 'red'}}>{item.TIRE}</span>
                </div>
              )}
              {item.LOGDATE === "" ? ('') : (
                <div className={`${styles.formList}`} >
                  <span className={`${styles.formText}`}>적재물안전:</span>
                  <span className={`${styles.formText}`} style={{color: item.LUGGAGE === '양호' ? '#22cc00' : 'red'}}>{item.LUGGAGE}</span>
                  <span className={`${styles.formText}`}>기타:</span>
                  <span className={`${styles.formText}`} style={{color: item.ETC1 === '양호' ? '#22cc00' : 'red'}}>{item.ETC1}</span>
                  <span className={`${styles.formText}`}>특이사항:</span>
                  <span className={`${styles.formText}`} style={{color: item.ETC2 === '양호' ? '#22cc00' : 'red'}}>{item.ETC2}</span>
                </div>
              )}
            </div>
          </div>
          ))
         ) : (
          <li className="list-group-item text-center">조회된 목록이 없습니다.</li>
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

export default MobileCarLogList;
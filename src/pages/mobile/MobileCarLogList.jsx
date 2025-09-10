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
        <header className="header">
          <h1 className="h5 mb-0">기동장비 운행이력</h1>
          <button className="btn text-white" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>
        
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
          <div className='formDivBox'>
            <div className='formList'>
              <span className='formSearch'>운행일자 </span>
              <div className="formGroupContainer" >
                <input name="startDate" type="date" className='formInputDate' value={dateInfo.startDate} onChange={(e) => handleDateChange(e)} />~
                <input name="endDate" type="date" className='formInputDate' value={dateInfo.endDate} onChange={(e) => handleDateChange(e)} />
              </div>
              <button className='btn btn-secondary btnCheck' onClick={(e) => handleSearchClick()}>조회</button>
            </div>
          </div>
        {currentList.length > 0 ? (
          currentList.map((item, index) => (
          <div key={item.CARID} className='formDivBox' onClick={(e) => handleNoticeClick(item)} >
            <ul className='formListData'>
              <li>
                <span className='formLabel'>차량번호</span>  
                <span className='formText'>{item.CARNO}</span> 
              </li>  
              <li>
                <span className='formLabel'>운행일시</span>  
                <span className='formText'>{item.LOGDATE} {item.LOGSTTIME} ~ {item.LOGENTIME}</span> 
              </li>
              <li>
                <span className='formLabel'>승인상태</span>  
                <span className='formText' style={{color: item.LOGSTAT === 'N' ? 'red' : '#525252'}}>{item.LOGSTATNM}</span> 
              </li>  
              
              {item.LOGDATE === "" ? ('') : (
                <>
                  <li>
                    <span className='formLabel'>차량파손</span>
                    <span className='formText' style={{color: item.DAMAGE === '양호' ? 'var(--bs-font-primary-dark-color)' : 'red'}}>{item.DAMAGE}</span>
                  </li>
                  <li>
                    <span className='formLabel'>오일누수</span>
                    <span className='formText' style={{color: item.OILLEAK === '양호' ? 'var(--bs-font-primary-dark-color)' : 'red'}}>{item.OILLEAK}</span>
                  </li>
                  <li>
                    <span className='formLabel'>타이어</span>
                    <span className='formText' style={{color: item.TIRE === '양호' ? 'var(--bs-font-primary-dark-color)' : 'red'}}>{item.TIRE}</span>
                  </li>
                </>
              )}
            
              {item.LOGDATE === "" ? ('') : (
                <>
                  <li>
                    <span className='formLabel'>적재물안전</span>
                    <span className='formText' style={{color: item.LUGGAGE === '양호' ? 'var(--bs-font-primary-dark-color)' : 'red'}}>{item.LUGGAGE}</span>
                  </li>
                  <li>
                    <span className='formLabel'>기타</span>
                    <span className='formText' style={{color: item.ETC1 === '양호' ? 'var(--bs-font-primary-dark-color)' : 'red'}}>{item.ETC1}</span>
                  </li>
                  <li>
                    <span className='formLabel'>특이사항</span>
                    <span className='formText' style={{color: item.ETC2 === '양호' ? 'var(--bs-font-primary-dark-color)' : 'red'}}>{item.ETC2}</span>
                  </li>
                </>
              )}
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

export default MobileCarLogList;
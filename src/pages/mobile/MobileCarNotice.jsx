import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store.js';
import commonUtils from '../../utils/common.js';
import { fetchData } from "../../utils/dataUtils.js";
import { msgPopup } from '../../utils/msgPopup.js';
import { errorMsgPopup } from '../../utils/errorMsgPopup.js';
import MobileMainUserMenu from '../../components/mobile/MobileMainUserMenu.jsx';
import styles from './MobileCarNotice.module.css';
import api from '../../utils/api.js';

const MobileCarNotice = () => {
  const { user } = useStore();
  const { clearUser } = useStore();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(false);
  const [notices, setNotices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const maxPageButtons = 10;

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
    const fetchNotices = async () => {
      const params = {gubun: 'LIST', noticeId: '', debug: 'F' };
      try {
        const result = await fetchData('carnotice/list', params);
        if (result.errCd === '00') {
          const mappedNotices = result.data.map((item) => ({
            id: item.NOTICEID,
            noticeid: item.NOTICEID, // 명시적으로 noticeid 추가
            title: item.TITLE,
            date: item.REGEDT,
          }));
          setNotices(mappedNotices);
        } else {
          console.error('Failed to fetch notices:', result.errMsg);
          setNotices([]);
        }
      } catch (e) {
        console.error('Error fetching notices:', e);
      }
    };
    fetchNotices();
  }, []);

  const handleNoticeClick = (notice) => {
    navigate('/mobile/MobileCarNoticeView', { state: { noticeid: notice.noticeid } });
    //alert(notice.noticeid);
  };
  
  const totalNotices = notices === null ? 0 : notices.length || 0;
  const totalPages = Math.ceil(totalNotices / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotices = notices === null ? [] : notices.slice(indexOfFirstItem, indexOfLastItem);

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
          <h1 className="h5 mb-0">기동장비 공지사항</h1>
          <button className="btn text-white" onClick={handleToggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        </header>
        
        <MobileMainUserMenu show={showSidebar} handleClose={handleToggleSidebar} onLogout={handleLogout} />

        <div className="pageMain">
        {currentNotices.length > 0 ? (
          currentNotices.map((item, index) => (
          <div className='formDivBox02' onClick={(e) => handleNoticeClick(item)} >
            <div key={item.NOTICEID} className='formList'>
              {/* <span className='formTitle'>{totalNotices - (indexOfFirstItem + index)}. {item.title}</span> */}
              <span className='formTitle'>{item.title}</span>
              <span className='contentDate'>{item.date || new Date().toLocaleDateString()}</span>
            </div>
          </div>
          ))
         ) : (
          <div className="list-group-item text-center">공지사항이 없습니다.</div>
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

export default MobileCarNotice;
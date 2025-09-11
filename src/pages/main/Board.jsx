import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchData } from '../../utils/dataUtils';
import styles from './Board.module.css';

const Board = ({ canWriteBoard, type = 'notice' }) => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const maxPageButtons = 10;

  useEffect(() => {
    const fetchNotices = async () => {
      const apiEndpoint = type === 'carnotice' ? 'carnotice/list' : 'notice/list';
      const params = {
        gubun: 'LIST',
        noticeId: '',
        debug: 'F',
      };
      try {
        const result = await fetchData(apiEndpoint, params);
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
  }, [type]);

  const handleNoticeClick = (notice) => {
    navigate('/main/boardView', { state: { noticeid: notice.noticeid, type } });
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
    <div className='boardBox'>
      <div className="list-group-item d-flex justify-content-between align-items-center">
        <h3 className='boardTitle'>
          {type === 'carnotice' ? '차량관리' : '공지사항'}
        </h3>
        {canWriteBoard && (
          <button
            className='btn btn-primary'
            onClick={() => navigate('/main/boardWrite', { state: { type } })}
          >
            등록
          </button>
        )}
      </div>
      <ul className='list-group contentContainer'>
        {currentNotices.length > 0 ? (
          currentNotices.map((notice, idx) => (
            <li
              key={idx}
              className="list-group-item"
            >
              <span
                onClick={() => handleNoticeClick(notice)}
                style={{ cursor: 'pointer' }}
              >
                <span className='me-2'>{totalNotices - (indexOfFirstItem + idx)}.</span>
                <span>{notice.title}</span>
              </span>
              <div>
                <span className='contentDate'>
                  {notice.date || new Date().toLocaleDateString()}
                </span>
              </div>
            </li>
          ))
        ) : (
          <li className="list-group-item text-center">공지사항이 없습니다.</li>
        )}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Page navigation" className="mt-3">
          <ul className={`pagination justify-content-center ${styles.pagination}`}>
            {totalPages > maxPageButtons && (
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className={`page-link ${styles.pageLink}`}
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  &lt;&lt;
                </button>
              </li>
            )}
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className={`page-link ${styles.pageLink}`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
            </li>
            {pageNumbers.map((page) => (
              <li
                key={page}
                className={`page-item ${currentPage === page ? 'active' : ''}`}
              >
                <button
                  className={`page-link ${styles.pageLink}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              </li>
            ))}
            <li
              className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}
            >
              <button
                className={`page-link ${styles.pageLink}`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </li>
            {totalPages > maxPageButtons && (
              <li
                className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}
              >
                <button
                  className={`page-link ${styles.pageLink}`}
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  &gt;&gt;
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
      {/* <button
        className="btn btn-secondary me-2 mb-3 mt-5"
        onClick={() => navigate('/main')}
      >
        뒤로 가기
      </button> */}
    </div>
  );
};

export default Board;
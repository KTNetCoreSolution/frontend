import React, { useState, useEffect } from 'react';
import { fetchData } from '../../utils/dataUtils';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styles from './Board.module.css';

const Board = ({ canWriteBoard, type = 'notice', onWrite, onView, showHeader = true, pagination = true }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [localNotices, setLocalNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 5;
  const maxPageButtons = 10;

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      const apiMap = {
        notice: 'notice/list',
        notice2: 'notice2/list',
        carnotice: 'carnotice/list',
        carnotice2: 'carnotice2/list',
      };

      const apiEndpoint = apiMap[type] || '';  // type에 따라 개별 엔드포인트 설정
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
            noticeid: item.NOTICEID,
            title: item.TITLE,
            date: item.REGEDT,
          }));
          setLocalNotices(mappedNotices);
        } else {
          setLocalNotices([]);
        }
      } catch (e) {
        console.error('Error fetching notices:', e);
        errorMsgPopup('공지사항을 불러오는 중 오류가 발생했습니다.');
        setLocalNotices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, [type]);

  const handleNoticeClick = (notice) => {
    if (notice.noticeid) {
      onView(notice.noticeid, type);
    }
  };

  const totalNotices = localNotices.length || 0;
  const totalPages = Math.ceil(totalNotices / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotices = localNotices.slice(indexOfFirstItem, indexOfLastItem);

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

  const textMap = {
    notice: '표준활동 공지사항',
    notice2: '표준활동 패치내역',
    carnotice: '차량 공지사항',
    carnotice2: '차량 과태료',
  };

  return (
    <div className='boardBox position-relative'>
      {showHeader && (
        <div className='position-absolute bottom-0 end-0 mb-3'>
          {canWriteBoard && (
            <button
              className='btn btn-primary'
              onClick={() => onWrite(type)}
            >
              등록
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className='text-center'>로딩 중...</div>
      ) : (
        <ul className='list-group contentContainer'>
          {currentNotices.length > 0 ? (
            currentNotices.map((notice, idx) => (
              <li
                key={idx}
                className='list-group-item'
              >
                <div
                  onClick={() => handleNoticeClick(notice)}
                  className='list-group-item-link'
                >
                  <span className={`${styles.boardContentTitle}`}>{notice.title}</span>
                  <span className='contentDate'>
                    {notice.date || new Date().toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <li className='list-group-item nodata'>공지사항이 없습니다.</li>
          )}
        </ul>
      )}

      {pagination && totalPages > 1 && (
        <nav aria-label='Page navigation' className='mt-3'>
          <ul className='pagination'>
            {totalPages > maxPageButtons && (
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className='page-link'
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  &lt;&lt;
                </button>
              </li>
            )}
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className='page-link'
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
                  className='page-link'
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
    </div>
  );
};

export default Board;
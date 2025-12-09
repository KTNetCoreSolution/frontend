import { useState, useEffect, useRef } from "react";
import useStore from '../../store/store.js';
import MainSearch from '../main/MainSearch';
import { fetchData } from "../../utils/dataUtils";
import { createTable } from "../../utils/tableConfig";
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import Modal from 'react-bootstrap/Modal';
import styled from 'styled-components';
import styles from "./MobileUserListPopup.module.css";
import { is } from "date-fns/locale";

const TableWrapper = styled.div``;

const MobileUserListPopup = ({ show, onHide, onConfirm }) => {
  const { user } = useStore();
  const { clearUser } = useStore();
  const [filters, setFilters] = useState({ searchField: "EMP", searchText: "" });
  const [list, setList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const maxPageButtons = 5;

  const searchConfig = {
    areas: [
      { type: "search", fields: [
        { id: "searchText", type: "text", row: 1, label: "", labelVisible: false, placeholder: "이름을 입력하세요", maxLength: 100, enabled: true },
      ]},
      { type: "buttons", fields: [
        { id: "searchBtn", type: "button", row: 1, label: "검색", eventType: "search", enabled: true },
      ]},
    ],
  };

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    };

    if (show) {
      initializeTable();
    }

    //return () => {
    //};

  }, [show]);

  const handleSearch = async () => {
  try {
      const params = {pGUBUN: filters.searchField || "", pSEARCH: filters.searchText || "", pDEBUG: "F"};

      const response = await fetchData("common/userinfo/list", params);
      
      if (!response.success) {
        errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
        setList([]);
        return;
      }
      if (response.errMsg !== "") {
        setList([]);
        return;
      }

      setList(response.data);
    } catch (err) {
      alert(err.response);
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setList([]);
    }
  };

  const handleDynamicEvent = (eventType) => {
    if (eventType === "search") handleSearch();
  };

  const handleClose = () => {
    setList([]);
    setFilters({ searchField: "EMP", searchText: "" });
    setCurrentPage(1);
    if (onHide) onHide();
  };

  const handleListClick = (userInfo) => {    
    if (onConfirm) {
      onConfirm(userInfo);
    }
    handleClose();
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

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>사원 검색</Modal.Title>
      </Modal.Header>
      <Modal.Body className={'modal-body'}>
        <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
        <TableWrapper>
            <div style={{marginTop:'5px'}}>
              <div className="formDivBox">
                <ul className="formListData">          
                  <li>
                    <span className="formLabel" style={{width: '30%'}}>사번</span>
                    <span className="formLabel" style={{width: '30%'}}>이름</span>
                    <span className="formLabel" style={{width: '40%'}}>조직명</span>
                  </li>
                </ul>
              </div>
              {currentList.length > 0 ? (
                currentList.map((item, index) => (
              <div key={`${item.CARID}_${index}`} className="formDivBox" style={{marginTop:'5px'}} onClick={(e) => handleListClick(item)} >
                <ul className="formListData">          
                  <li>
                    <div className="formText" style={{width: '30%'}}>{item.EMPNO}</div>
                    <div className="formText" style={{width: '30%'}}>{item.EMPNM}</div>
                    <div className="formText" style={{width: '40%'}}>{item.ORGNM}</div>
                  </li>
                </ul>
              </div>
                ))
              ) : ''}
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
        </TableWrapper>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={handleClose}>닫기</button>
      </Modal.Footer>
    </Modal>
  );
};

export default MobileUserListPopup;
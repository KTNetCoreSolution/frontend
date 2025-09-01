import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import { initialFilters } from '../../../utils/tableEvent';
import { handleDownloadExcel } from '../../../utils/tableExcel';
import TableSearch from '../../../components/table/TableSearch';
import { fetchData } from '../../../utils/dataUtils';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import styles from './StandardEmpStatisticPopup.module.css';

const StandardEmpStatisticPopup = ({ show, onHide, data }) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [filters, setFilters] = useState(initialFilters([
    { id: "filterSelect", label: "", type: "select", options: [
      { value: "", label: "선택" },
      { value: "CLASSANM", label: "대분류" },
      { value: "CLASSBNM", label: "중분류" },
      { value: "CLASSCNM", label: "소분류" }
    ]},
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ]));
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [classPopupState, setClassPopupState] = useState({ show: false, editingIndex: -1 });

  // 테이블 초기화
  useEffect(() => {
    if (!show || !tableRef.current) return;

    let isMounted = true;

    const initializeTable = async () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
      }
      try {
        tableInstance.current = createTable(tableRef.current, [
          { headerHozAlign: 'center', title: '대분류코드', field: 'CLASSACD', hozAlign: 'center', width: 100, frozen:true, visible:false },
          { headerHozAlign: 'center', title: '대분류', field: 'CLASSANM', hozAlign: 'center', width: 150, frozen:true },
          { headerHozAlign: 'center', title: '중분류코드', field: 'CLASSBCD', hozAlign: 'center', width: 100, frozen:true, visible:false },
          { headerHozAlign: 'center', title: '중분류', field: 'CLASSBNM', hozAlign: 'center', width: 150, frozen:true },
          { headerHozAlign: 'center', title: '소분류코드', field: 'CLASSCCD', hozAlign: 'center', width: 100, frozen:true, visible:false },
          { headerHozAlign: 'center', title: '소분류', field: 'CLASSCNM', hozAlign: 'left', width: 200, frozen:true },
          { headerHozAlign: 'center', title: '1월', field: 'MDATE1', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '2월', field: 'MDATE2', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '3월', field: 'MDATE3', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '4월', field: 'MDATE4', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '5월', field: 'MDATE5', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '6월', field: 'MDATE6', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '7월', field: 'MDATE7', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '8월', field: 'MDATE8', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '9월', field: 'MDATE9', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '10월', field: 'MDATE10', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '11월', field: 'MDATE11', hozAlign: 'center', width: 80, sorter: 'number' },
          { headerHozAlign: 'center', title: '12월', field: 'MDATE12', hozAlign: 'center', width: 80, sorter: 'number' },
        ], [], {
          /*
          layout: 'fitColumns',
          groupBy: ['CLASSANM', 'CLASSBNM'],
          groupStartOpen: true,
          groupToggleElement: 'arrow',
          groupHeader: (value, count, data, groupComponent) => {
            if (groupComponent.getField() === 'CLASSANM') {
              return `${data[0].CLASSANM} (${count} items)`;
            } else {
              return `${data[0].CLASSBNM} (${count} items)`;
            }
          },
          pagination: false,
          */
        });

        if (!tableInstance.current) throw new Error('createTable returned undefined or null');

        // ✅ tableBuilt 이벤트가 발생해야만 ready
        tableInstance.current.on("tableBuilt", () => {
          if (isMounted) setTableStatus("ready");
        });

      } catch (err) {
        if (isMounted) setTableStatus('error');
        console.error('Table initialization failed:', err.message);
      }
    };

    initializeTable();

    return () => {
      isMounted = false;
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus('initializing');
      }
    };
  }, [show]);

  // 데이터 로딩
  useEffect(() => {
    if (!show) return;
    let isMounted = true;

    const loadData = async () => {
      // ✅ 필수 파라미터 검증
      if (
        !data || !Array.isArray(data) || data.length === 0 ||
        !data[0] || !data[0].SECTIONCD || !data[0].DDATE || !data[0].EMPNO ||
        data[0].SECTIONCD.trim() === "" || data[0].DDATE.trim() === "" || data[0].EMPNO.trim() === ""
      ) {
        if (isMounted) {
          // ✅ 아예 테이블 데이터 비우고 "검색 안 함" 상태 유지
          setTableData([]);
          setHasSearched(false);
          setLoading(false);
        }
        return;
      }

      if (isMounted && !loading) {
        setLoading(true);
        setHasSearched(true);
      }

      try {
        const params = {
          pGUBUN: "DETAIL",
          pSECTIONCD: data[0].SECTIONCD,
          pEMPNO: data[0].EMPNO,
          pORGCD: "",
          pDATE1: data[0].DDATE,
          pCLASSCD: data[0].CLASSCD,
          pDEBUG: "F",
        };

        const response = await fetchData("standard/teamJob/list", params);

        if (!response.success && isMounted) {
          errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
          setTableData([]);
          return;
        }

        const responseData = Array.isArray(response.data) ? response.data : [];
        if (isMounted) setTableData(responseData);
      } catch (err) {
        console.error("데이터 로드 실패:", err);
        if (isMounted) {
          errorMsgPopup("데이터를 가져오는 중 오류가 발생했습니다.");
          setTableData([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [show, JSON.stringify(data)]);


  // 데이터 반영
  useEffect(() => {
    if (!tableInstance.current || tableStatus !== 'ready' || loading) return;
    if (!tableData || tableData.length === 0) return;

    try {
      tableInstance.current.setData(tableData);
      setRowCount(tableInstance.current.getDataCount());

      if (hasSearched && tableData.length === 0) {
        tableInstance.current.alert("검색 결과 없음", "info");
      } else {
        tableInstance.current.clearAlert();
      }
    } catch (err) {
      console.warn("setData 호출 시점 문제:", err.message);
    }
  }, [tableData, tableStatus, loading, hasSearched]);



  // 필터 적용
  useEffect(() => {
    if (!tableInstance.current || tableStatus !== 'ready' || loading) return;

    const { filterSelect, filterText } = filters;
    try {
      if (filterText && filterSelect) {
        tableInstance.current.setFilter(filterSelect, 'like', filterText);
      } else if (filterText) {
        tableInstance.current.setFilter([
          { field: 'CLASSANM', type: 'like', value: filterText },
          { field: 'CLASSBNM', type: 'like', value: filterText },
          { field: 'CLASSCNM', type: 'like', value: filterText },
        ], 'or');
      } else {
        tableInstance.current.clearFilter();
      }
      setRowCount(tableInstance.current.getDataCount());
    } catch (err) {
      console.error('필터 적용 실패:', err);
    }
  }, [filters, tableStatus, loading]);

  const onDownloadExcel = () => {
    handleDownloadExcel(tableInstance.current, tableStatus, '개인별분야별월별통계.xlsx');
  };

    const handleClose = () => {
    setClassPopupState({ show: false, editingIndex: -1 });
    onHide(); // 모달을 닫기 위해 onHide 호출
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>개인별 년간 분야별, 월별 통계</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} modal-body`}>
        <TableSearch
          filterFields={[
            { id: 'filterSelect', label: '', type: 'select', options: [
              { value: '', label: '선택' },
              { value: 'CLASSANM', label: '대분류' },
              { value: 'CLASSBNM', label: '중분류' },
              { value: 'CLASSCNM', label: '소분류' }
            ]},
            { id: 'filterText', label: '', type: 'text', placeholder: '검색값을 입력하세요', width: '200px' },
          ]}
          filters={filters}
          setFilters={setFilters}
          rowCount={rowCount}
          onDownloadExcel={onDownloadExcel}
          buttonStyles={styles}
        />
        {tableStatus === 'initializing' && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ height: '300px', visibility: loading || tableStatus !== 'ready' ? 'hidden' : 'visible' }} />
        <div className={styles.inputButtonWrapper}>
          <button className={`btn text-bg-secondary`} onClick={() => handleClose()}>
              닫기
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default StandardEmpStatisticPopup;

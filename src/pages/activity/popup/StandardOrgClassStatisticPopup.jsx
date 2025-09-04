import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import { initialFilters } from '../../../utils/tableEvent';
import { handleDownloadExcel } from '../../../utils/tableExcel';
import TableSearch from '../../../components/table/TableSearch';
import { fetchData } from '../../../utils/dataUtils';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import styles from './StandardOrgClassStatisticPopup.module.css';

const StandardOrgClassStatisticPopup = ({ show, onHide, data }) => {
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

  const columns = [
    { headerHozAlign: 'center', hozAlign: 'center', title: 'No', field: 'ID', sorter: 'number', width: 60, frozen: true },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업일자', field: 'DDATE', sorter: 'string', width: 100, frozen: true },
    { headerHozAlign: 'center', title: '대분류코드', field: 'CLASSACD', hozAlign: 'center', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '대분류', field: 'CLASSANM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', title: '중분류코드', field: 'CLASSBCD', hozAlign: 'center', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '중분류', field: 'CLASSBNM', sorter: 'string', width: 180 },
    { headerHozAlign: 'center', title: '소분류코드', field: 'CLASSCCD', hozAlign: 'center', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'left', title: '소분류', field: 'CLASSCNM', sorter: 'string', width: 220 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '이름', field: 'EMPNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무형태코드', field: 'WORKCD', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '근무', field: 'WORKNM', sorter: 'string', width: 100 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업일시', field: 'WORKDT', sorter: 'string', width: 200 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '업무분야코드', field: 'SECTIONCD', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '시작시간', field: 'STARTTM', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: 'BIZ입력키', field: 'BIZINPUTKEY', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '사원번호', field: 'EMPNO', sorter: 'string', width: 100, visible: false },
    { headerHozAlign: 'center', hozAlign: 'center', title: '작업시간(시간)', field: 'WORKH', sorter: 'number', width: 120 },
    { headerHozAlign: 'center', hozAlign: 'center', title: '건(구간/본/개소)', field: 'WORKCNT', sorter: 'number', width: 130 },
  ];

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
        tableInstance.current = createTable(tableRef.current, columns, [], {
          layout: 'fitColumns',
        });

        if (!tableInstance.current) throw new Error('createTable returned undefined or null');

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

  useEffect(() => {
    if (!show) return;
    let isMounted = true;

    const loadData = async () => {
      if (
        !data || !Array.isArray(data) || data.length === 0 ||!data[0] ||!data[0].SECTIONCD?.trim() ||!data[0].EMPNO?.trim() || !data[0].ORGCD?.trim() ||!data[0].DATEGB?.trim() ||!data[0].DATE1?.trim() ||!data[0].DATE2?.trim() ||!data[0].CLASSCD?.trim() ||!data[0].ORGLEVELGB?.trim()
      ) {
        if (isMounted) {
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
          pGUBUN: 'DETAIL',
          pSECTIONCD: data[0].SECTIONCD||'',
          pEMPNO: data[0].EMPNO||'',
          pORGCD: data[0].ORGCD||'',
          pORGLEVELGB: data[0].ORGLEVELGB||'',
          pDATEGB: data[0].DATEGB||'',
          pDATE1: data[0].DATE1||'',
          pDATE2: data[0].DATE2||'',
          pCLASSCD: data[0].CLASSCD||'',
          pDEBUG: 'F',
        };

        console.log(params);

        const response = await fetchData('standard/orgStatistic/list', params);

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
    handleDownloadExcel(tableInstance.current, tableStatus, '업무량세부현황.xlsx');
  };

  const handleClose = () => {
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>업무량 세부 현황</Modal.Title>
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

export default StandardOrgClassStatisticPopup;
import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import { initialFilters } from '../../../utils/tableEvent';
import { handleDownloadExcel } from '../../../utils/tableExcel';
import TableSearch from '../../../components/table/TableSearch';
import styles from './StandardOrgWorkStatisticsPopup.module.css';
import { fetchJsonData } from '../../../utils/dataUtils';
import standardOrgworkPopupData from '../../../data/standardorgwork_popup_data.json';

const StandardOrgWorkStatisticsPopup = ({ show, onHide, workHours }) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [filters, setFilters] = useState(initialFilters([
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "센터/부", label: "센터/부" }, { value: "부", label: "부" }, { value: "팀", label: "팀" }, { value: "업무량(시간)", label: "업무량(시간)" }] },
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ]));
  const [rowCount, setRowCount] = useState(0);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchJsonData(standardOrgworkPopupData, {});
        const processedData = Array.isArray(result) && result.length > 0
          ? result.map(row => ({ ...row, '업무량(시간)': parseFloat(row['업무량(시간)']) || 0 }))
          : [{ "센터/부": "오류", "부": "데이터 없음", "팀": "", "업무량(시간)": 0 }];
        setData(processedData);
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        setData([{ "센터/부": "오류", "부": "데이터 없음", "팀": "", "업무량(시간)": 0 }]);
      } finally {
        setLoading(false);
      }
    };

    if (show) {
      loadData();
    }
  }, [show]);

  // Tabulator 초기화
  useEffect(() => {
    if (!show || !tableRef.current) return;

    const initializeTable = async () => {
      // DOM 준비 대기
      await new Promise((resolve) => setTimeout(resolve, 100)); // 지연 시간을 100ms로 줄여 성능 개선
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        setTableStatus("error");
        return;
      }
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
      }
      try {
        tableInstance.current = createTable(tableRef.current, [
          { title: '센터/부', field: '센터/부', hozAlign: 'left', width: 150 },
          { title: '부', field: '부', hozAlign: 'left', width: 150 },
          { title: '팀', field: '팀', hozAlign: 'left', width: 150 },
          { title: '업무량(시간)', field: '업무량(시간)', hozAlign: 'right' },
        ], data, {
          layout: 'fitColumns',
          groupBy: ['센터/부', '부'],
          groupStartOpen: true,
          groupToggleElement: 'arrow',
          groupHeader: (value, count, data) => {
            const sum = data.reduce((sum, row) => sum + (row['업무량(시간)'] || 0), 0);
            return `${value} (${count} items, ${sum.toFixed(2)} 시간)`;
          },
        });
        if (!tableInstance.current) throw new Error("createTable returned undefined or null");
        setTableStatus("ready");
        setRowCount(tableInstance.current.getDataCount());
      } catch (err) {
        setTableStatus("error");
        console.error("Table initialization failed:", err.message);
      }
    };

    initializeTable();

    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus("initializing");
      }
    };
  }, [show]); // data 의존성 제거

  // 데이터 변경 시 테이블 갱신
  useEffect(() => {
    if (tableInstance.current && tableStatus === "ready" && !loading && data.length > 0) {
      try {
        // 테이블이 완전히 초기화되었는지 확인 (isTableReady는 Tabulator에서 제공되지 않으므로 대안으로 setTimeout 사용)
        const timer = setTimeout(() => {
          if (tableInstance.current) {
            tableInstance.current.setData(data);
            setRowCount(tableInstance.current.getDataCount());
          }
        }, 100);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error('데이터 설정 실패:', err);
      }
    }
  }, [data, tableStatus, loading]);

  // 필터 적용
  useEffect(() => {
    if (!tableInstance.current || loading || tableStatus !== "ready") return;
    const { filterSelect, filterText } = filters;
    try {
      if (filterText && filterSelect) {
        tableInstance.current.setFilter(filterSelect, "like", filterText);
      } else if (filterText) {
        tableInstance.current.setFilter([
          { field: "센터/부", type: "like", value: filterText },
          { field: "부", type: "like", value: filterText },
          { field: "팀", type: "like", value: filterText },
          { field: "업무량(시간)", type: "like", value: filterText },
        ], "or");
      } else {
        tableInstance.current.clearFilter();
      }
      setRowCount(tableInstance.current.getDataCount());
    } catch (err) {
      console.error('필터 적용 실패:', err);
    }
  }, [filters, loading, tableStatus]);

  // 엑셀 다운로드 호출
  const onDownloadExcel = () => {
    handleDownloadExcel(tableInstance.current, tableStatus, "본부별업무현황.xlsx");
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>본부별 업무 현황</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>선택된 업무량(시간): {workHours}</p>
        <TableSearch
          filterFields={[
            { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "센터/부", label: "센터/부" }, { value: "부", label: "부" }, { value: "팀", label: "팀" }, { value: "업무량(시간)", label: "업무량(시간)" }] },
            { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
          ]}
          filters={filters}
          setFilters={setFilters}
          rowCount={rowCount}
          onDownloadExcel={onDownloadExcel}
          buttonStyles={styles}
        />
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }} />
        {tableStatus === "initializing" && <div className={styles.loading}>초기화 중...</div>}
        {loading && <div className={styles.loading}>로딩 중...</div>}
      </Modal.Body>
    </Modal>
  );
};

export default StandardOrgWorkStatisticsPopup;
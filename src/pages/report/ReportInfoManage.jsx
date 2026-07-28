import React, { useState, useEffect, useRef } from 'react';
import { createTable } from '../../utils/tableConfig.js';
import { initialFilters } from '../../utils/tableEvent.js';
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { hasPermission } from '../../utils/authUtils';
import { msgPopup } from "../../utils/msgPopup";
import useStore from '../../store/store.js';
import MainSearch from "../../components/main/MainSearch";
import TableSearch from "../../components/table/TableSearch";
import styles from "../../components/table/TableSearch.module.css";
import reportStyles from './ReportInfoList.module.css';
import CommonPopup from "../../components/popup/CommonPopup";
import ReportViewPopup from "./ReportViewPopup";
import ReportWritePopup from "./ReportWritePopup";
import fileUtils from '../../utils/fileUtils';

const ReportInfoManage = ({ reportId: initialReportId, reportTitle, number, onBack }) => {
  const { user } = useStore();
  const canWriteBoard = user && hasPermission(user.auth, 'mainBoard');
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportFiles, setReportFiles] = useState(null);
  const [reportId] = useState(initialReportId || '');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [isSearched, setIsSearched] = useState(false);

  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const searchConfig = {
    areas: [
      { type: 'search', fields: [] },
      { 
        type: 'buttons', 
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true }
        ]
      }
    ]
  };

  const filterTableFields = [
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "TITLE", label: "제목" }] },
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find(a => a.type === 'search')?.fields || []));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));

  const handleSearch = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = { pREPORTID: reportId, pDEBUG: "F" };
      const response = await fetchData("report/listData", params);

      const responseData = Array.isArray(response?.data) ? response.data : [];
      setData(responseData);

    } catch (err) {
      console.error(err);
      errorMsgPopup("데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicEvent = (eventType) => {
    if (eventType === 'search') handleSearch();
    else if (eventType === 'showWriteModal') {
      setShowWriteModal(true);
    }
  };

  const handleEdit = (report, files) => {
    setShowViewModal(false);
    setSelectedReport(report);
    setReportFiles(files)
    setShowWriteModal(true);
  };

  const handleClose = () => {
    setShowViewModal(false);
    setShowWriteModal(false);
    setSelectedReport(null);
    setReportFiles(null);
  };

  const columns = [
    { headerHozAlign: "center", hozAlign: "center", title: "순번", field: "ID", sorter: "number", width: 100, editable: false },
    { headerHozAlign: "center", hozAlign: "center", title: "등록일", field: "REGDT", sorter: "string", width: 120 },
    { headerHozAlign: "center", hozAlign: "center", title: "REPORTID", field: "REPORTID", sorter: "number", width: 100, editable: false, visible: false },
    { headerHozAlign: "center", hozAlign: "center", title: "REPORTNO", field: "REPORTNO", sorter: "number", width: 100, editable: false, visible: false },
    { headerHozAlign: "center", hozAlign: "center", title: "제목", field: "TITLE", sorter: "string", width: 500 },
    { headerHozAlign: "center", hozAlign: "center", title: "내용", field: "CONTENTS", sorter: "string", width: 500, editable: false, visible: false },
    { headerHozAlign: "center", hozAlign: "center", title: "부서", field: "ORGNM", sorter: "string", width: 200 },
    { headerHozAlign: "center", hozAlign: "center", title: "작성자", field: "EMPNM", sorter: "string", width: 120 },
  ];

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (!tableRef.current) return;

      try {
        tableInstance.current = createTable(tableRef.current, columns, [], {
          headerHozAlign: "center",
          headerFilter: true,
          layout: 'fitData'
        });
        setTableStatus("ready");
        
        tableInstance.current.on("rowClick", (e, row) => {
          const rowData = row.getData();
          setSelectedReport(rowData);
          setShowViewModal(true);
        });
      } catch (err) {
        console.error("Table initialization failed:", err);
        setTableStatus("error");
      }
    };

    initializeTable();

    return () => {
      tableInstance.current?.destroy();
    };
  }, []);

  // 데이터 변경 시 테이블 업데이트
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const table = tableInstance.current;
    if (!table || tableStatus !== "ready") return;

    table.setData(data);
    setRowCount(table.getDataCount());
  }, [data, tableStatus]);
  
  return (
    <div className='container'>
      <div className="d-flex justify-content-between align-items-center mb-2">      
        <div className={reportStyles.detailBanner}>
          <div className={reportStyles.detailTitleLeft}>
            <div className={reportStyles.detailTitle}>{number}.&nbsp;&nbsp;{reportTitle || "REPORT 관리"}</div>        
          </div>
        </div>
        {onBack && (
          <button className="btn btn-secondary" onClick={onBack} >
            ← 돌아가기
          </button>
        )}
      </div>

      <MainSearch 
        config={searchConfig} 
        filters={filters} 
        setFilters={setFilters} 
        onEvent={handleDynamicEvent} 
      />
      
      <TableSearch 
        filterFields={filterTableFields} 
        filters={tableFilters} 
        setFilters={setTableFilters} 
        rowCount={rowCount} 
        buttonStyles={styles}
        excelYn={'N'}
      >
        <div className='btnGroupCustom'>
          <button className='btn btn-secondary' onClick={() => handleDynamicEvent('showWriteModal')}>
            추가
          </button>
        </div>
      </TableSearch>

      <div className={styles.tableWrapper}>
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div 
          ref={tableRef} 
          className={styles.tableSection} 
          style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }} 
        />
      </div>

      {showWriteModal && (
        <ReportWritePopup
          show={showWriteModal}
          onHide={handleClose}
          reportTitle={reportTitle}
          reportId={reportId}
          report={selectedReport}
          files={reportFiles || []}
          onParentSearch={handleSearch}
        />
      )}
      {showViewModal && selectedReport?.REPORTID && selectedReport?.REPORTNO && (
        <ReportViewPopup
          show={showViewModal}
          onHide={handleClose}
          reportTitle={reportTitle}
          reportId={reportId}
          report={selectedReport}
          onEdit={(report, files) => handleEdit(report, files)}
        />
      )}
    </div>
  );
};

export default ReportInfoManage;
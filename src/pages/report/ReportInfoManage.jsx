import React, { useState, useEffect, useRef } from 'react';
import { createTable } from '../../utils/tableConfig.js';
import { initialFilters } from '../../utils/tableEvent.js';
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import useStore from '../../store/store.js';
import MainSearch from "../../components/main/MainSearch";
import TableSearch from "../../components/table/TableSearch";
import styles from "../../components/table/TableSearch.module.css";
import reportStyles from './ReportInfoList.module.css';
import CommonPopup from "../../components/popup/CommonPopup";
import fileUtils from '../../utils/fileUtils';

const ReportInfoManage = ({ reportId: initialReportId, reportTitle, color, onBack }) => {
  const { user } = useStore();
  const [reportId] = useState(initialReportId || '');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [isSearched, setIsSearched] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newReport, setNewReport] = useState({ GBN: '', TITLE: '', FILES: [] });

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
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "GBN", label: "구분" }, { value: "TITLE", label: "제목" }] },
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find(a => a.type === 'search')?.fields || []));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  
  const fn_CellButton = (label, className, onClick) => ({
    formatter: (cell) => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";
      wrapper.style.alignItems = "center";
      const button = document.createElement("button");
      button.className = `btn btn-sm ${className}`;
      button.innerText = label;
      button.onclick = () => onClick(cell.getData());
      wrapper.appendChild(button);
      return wrapper;
    },
  });

  const fn_FileDownload = (onClick) => ({
    formatter: (cell) => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "center";
      div.style.gap = "5px";
      div.style.cursor = "pointer";
      div.onclick = () => onClick(cell.getData());
      const span = document.createElement("span");
      span.innerText = "다운로드";
      div.appendChild(span);
      return div;
    },
  });

  const handleCellEdit = (cell, field) => {
    const rowData = cell.getRow().getData();
    setData(prev =>
      prev.map(row =>
        row.ID === rowData.ID ? { ...row, [field]: cell.getValue(), isChanged: "Y" } : row
      )
    );
  };

  const handleDownload = async (rowData) => {
    try {
      const params = { pREPORTID: reportId, pREPORTNO: rowData.REPORTNO, pDEBUG: 'F' };
      const result = await fetchData('report/filedata', params);

      if (result?.errCd === '00' && result.data?.length > 0) {
        const fileInfo = result.data[0];
        const mimeType = fileUtils.mimeTypes[fileUtils.getFileExtension(fileInfo.FILENAME || fileInfo.FILENM)] || 'application/octet-stream';

        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${fileInfo.FILEDATA}`;
        link.download = fileInfo.FILENAME || fileInfo.FILENM || 'report_file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        errorMsgPopup('파일을 다운로드할 수 없습니다.');
      }
    } catch (error) {
      console.error('Download error:', error);
      errorMsgPopup('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = (rowData) => {
    setData(prev =>
      prev.map(row =>
        row.ID === rowData.ID
          ? { ...row, isDeleted: row.isDeleted === "Y" ? "N" : "Y" }
          : row
      )
    );
  };

  const handleSearch = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = { pREPORTID: reportId, pDEBUG: "F" };
      const response = await fetchData("report/dataList", params);

      const responseData = Array.isArray(response?.data) ? response.data : [];
      setData(responseData.map(row => ({
        ...row,
        isChanged: "N",
        isDeleted: "N"
      })));
    } catch (err) {
      console.error(err);
      errorMsgPopup("데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {// 1. 기본 입력값 체크
    if (!newReport.GBN || !newReport.TITLE) {
      errorMsgPopup("분류와 제목을 모두 입력해주세요.");
      return;
    }

    if (newReport.FILES.length === 0) {
      errorMsgPopup("업로드할 파일을 선택해주세요.");
      return;
    }

    const allowedExtensions = ['xlsx', 'xls'];
    
    // 파일 형식 검사
    for (const file of newReport.FILES) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        errorMsgPopup(`허용되지 않는 파일 형식입니다.\n\n허용 형식: ${allowedExtensions.join(', ')}`);
        return;
      }
    }

    const formData = new FormData();
    formData.append("pGUBUN", "I");
    formData.append("pREPORTID", reportId);
    formData.append("pGBN", newReport.GBN);
    formData.append("pTITLE", newReport.TITLE);
    newReport.FILES.forEach(file => formData.append("files", file));

    try {
      const result = await fetchFileUpload("report/reportUpload", formData);
      if (result?.errCd === "00") {
        msgPopup("REPORT가 성공적으로 등록되었습니다.");
        setShowAddPopup(false);
        setNewReport({ GBN: '', TITLE: '', FILES: [] });
        await handleSearch();
      } else {
        errorMsgPopup(result?.errMsg || "등록 실패");
      }
    } catch (error) {
      console.error(error);
      errorMsgPopup("REPORT 업로드 중 오류가 발생했습니다.");
    }
  };

  const handleDynamicEvent = (eventType) => {
    if (eventType === 'search') handleSearch();
    else if (eventType === 'showAddPopup') setShowAddPopup(true);
  };

  const handleUploadCancel = () => {
    setShowAddPopup(false);
    setNewReport({ GBN: '', TITLE: '', FILES: [] });
  };

  const handleSave = async () => {
    const changedRows = data.filter(row => row.isDeleted === "Y" || row.isChanged === "Y");
    if (changedRows.length === 0) {
      errorMsgPopup("변경된 데이터가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const promises = changedRows.map(async (row) => {
        let gubun = "";

        if (row.isDeleted === "Y") {
          gubun = "D";
        } else if (row.isChanged === "Y" && row.isDeleted === "N") {
          gubun = "U";
        }

        const params = {
          pGUBUN: gubun,
          pREPORTID: row.REPORTID.toString(),
          pREPORTNO: row.REPORTNO.toString(),
          pGBN: row.GBN.toString(),
          pTITLE: row.TITLE.toString(),
        };

        try {
          const response = await fetchData("report/reportInfoSave", params );
          if (!response.success) {
            throw new Error(response.message || `Failed to ${pGUBUN} file ${row.REPORTID}`);
          }
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing ${pGUBUN} for REPORTID: ${row.REPORTID}`, error);
          return { ...row, success: false, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const errors = results.filter((result) => !result.success);

      if (errors.length > 0) {
        errorMsgPopup(`일부 작업이 실패했습니다: ${errors.map((e) => e.error).join(", ")}`);
      } else {
        msgPopup("모든 변경사항이 성공적으로 저장되었습니다.");
        await handleSearch();
      }
    } catch (err) {
      errorMsgPopup("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업", field: "actions", width: 80, ...fn_CellButton("삭제", `btn-danger ${styles.deleteButton}`, handleDelete) },
    { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업대상", field: "applyTarget", sorter: "string", width: 100, formatter: (cell) => {
          const rowData = cell.getRow().getData();
          let label = "";
          let stateField = "";
          if (rowData.isDeleted === "Y") {
          label = "삭제";
          stateField = "isDeleted";
          } else if (rowData.isChanged === "Y") {
          label = "변경";
          stateField = "isChanged";
          }
          if (!label) return "";
          const div = document.createElement("div");
          div.style.display = "flex";
          div.style.alignItems = "center";
          div.style.justifyContent = "center";
          div.style.gap = "5px";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "checkbox-custom";
          checkbox.checked = rowData[stateField] === "Y";
          checkbox.onclick = () => {
          setTimeout(() => {
              setData((prevData) =>
              prevData.map((row) => {
                  if (row.CARCD === rowData.CARCD) {
                  const updatedRow = { ...row, [stateField]: checkbox.checked ? "Y" : "N" };
                  if (stateField === "isDeleted" && !checkbox.checked) {
                      updatedRow.isChanged = "N";
                  }
                  return updatedRow;
                  }
                  return row;
              }).filter(Boolean)
              );
          }, 0);
          };
          const span = document.createElement("span");
          span.innerText = label;
          div.appendChild(checkbox);
          div.appendChild(span);
          return div;
      }
    },
    { headerHozAlign: "center", hozAlign: "center", title: "순번", field: "ID", sorter: "number", width: 100, editable: false },
    { headerHozAlign: "center", hozAlign: "center", title: "REPORTNO", field: "REPORTNO", sorter: "number", width: 100, editable: false, visible: false },
    { headerHozAlign: "center", hozAlign: "center", title: "분류", field: "GBN", sorter: "string", width: 250, editor: "input", cellEdited: (cell) => handleCellEdit(cell, "GBN") },
    { headerHozAlign: "center", hozAlign: "center", title: "제목", field: "TITLE", sorter: "string", width: 500, editor: "input", cellEdited: (cell) => handleCellEdit(cell, "TITLE") },
    { headerHozAlign: "center", hozAlign: "center", title: "부서", field: "ORGNM", sorter: "string", width: 200 },
    { headerHozAlign: "center", hozAlign: "center", title: "작성자", field: "EMPNM", sorter: "string", width: 120 },
    { headerHozAlign: "center", hozAlign: "center", title: "등록일", field: "REGDT", sorter: "string", width: 120 },
    { headerHozAlign: "center", hozAlign: "center", title: "다운로드", field: "IMGNM", width: 120, ...fn_FileDownload(handleDownload) },
  ];

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (!tableRef.current) return;

      try {
        tableInstance.current = createTable(tableRef.current, columns, [], {
          editable: true,
          rowFormatter: (row) => {
            const el = row.getElement();
            const d = row.getData();
            el.classList.remove(styles.deletedRow, styles.editedRow);
            if (d.isDeleted === "Y") el.classList.add(styles.deletedRow);
            else if (d.isChanged === "Y") el.classList.add(styles.editedRow);
          },
        });
        setTableStatus("ready");
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

  // ==================== Render ====================
  return (
    <div className='container'>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className={reportStyles.title} style={{ backgroundColor: color || '#002b5f' }}>{reportTitle || "REPORT 관리"}</div>        
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
          <button className='btn btn-secondary' onClick={() => handleDynamicEvent('showAddPopup')}>
            추가
          </button>
          <button className='btn btn-primary' onClick={handleSave}>
            저장
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

      {/* REPORT 추가 팝업 */}
      <CommonPopup
        show={showAddPopup}
        onHide={handleUploadCancel}
        title="REPORT 추가"
        buttons={[
          { label: "닫기", className: "btn btn-secondary", action: handleUploadCancel },
          { label: "등록", className: "btn btn-success", action: handleUpload }
        ]}
      >
        <div className='formColWrap'>
          <div className='formGroup'>
            <label className="form-label w40">분류</label>
            <input type="text" className="form-control" value={newReport.GBN} onChange={(e) => setNewReport(prev => ({ ...prev, GBN: e.target.value }))} />
          </div>
          <div className='formGroup'>
            <label className="form-label w40">제목</label>
            <input type="text" className="form-control" value={newReport.TITLE} onChange={(e) => setNewReport(prev => ({ ...prev, TITLE: e.target.value }))} />
          </div>
          <div className='formGroup'>
            <label className="form-label w40">파일</label>
            <input type="file" className="form-control" multiple accept=".xls,.xlsx" onChange={(e) => setNewReport(prev => ({ ...prev, FILES: Array.from(e.target.files) }))} />
          </div>
        </div>
      </CommonPopup>
    </div>
  );
};

export default ReportInfoManage;
import React, { useState, useEffect, useRef } from 'react';
import { createTable } from '../../utils/tableConfig.js';
import { initialFilters } from '../../utils/tableEvent.js';
import { fetchData, fetchFileUpload } from "../../utils/dataUtils.js";
import { errorMsgPopup } from "../../utils/errorMsgPopup.js";
import { msgPopup } from "../../utils/msgPopup.js";
import useStore from '../../store/store.js';
import MainSearch from "../../components/main/MainSearch.jsx";
import TableSearch from "../../components/table/TableSearch.jsx";
import styles from "../../components/table/TableSearch.module.css";
import reportStyles from './ReportInfoList.module.css';
import CommonPopup from "../../components/popup/CommonPopup.jsx";
import UserSearchPopup from "../../components/popup/UserSearchPopup";
import ReportAddPopup from './ReportAddPopup.jsx';
import fileUtils from '../../utils/fileUtils.js';

const ReportListManage = () => {
  const { user } = useStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [isSearched, setIsSearched] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);

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
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "TITLE", label: "제목" }, { value: "CONTENT", label: "내용" }] },
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

  const handleCellEdit = (cell, field) => {
    const rowData = cell.getRow().getData();
    setData(prev =>
      prev.map(row =>
        row.ID === rowData.ID ? { ...row, [field]: cell.getValue(), isChanged: "Y" } : row
      )
    );
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
      const params = { pDEBUG: "F" };
      const response = await fetchData("report/list", params);

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
  
  const handleUserConfirm = (selectedRows) => {
    if (!selectedRowData) return;

    const user = selectedRows[0];
    const newEmpNo = user.EMPNO || "";
    const newEmpNm = user.EMPNM || "";
    const newOrgNm = user.ORGNM || "";

    if (!newEmpNo) {
      errorMsgPopup("선택된 사원정보가 없습니다.");
      return;
    }

    setData((prevData) => prevData.map((row) => {
      if (String(row.ID) === String(selectedRowData.ID)) {        
        const oldEmpNo = (row["MNGEMPNO"] || "").trim();
        const oldEmpNm = (row["EMPNM"] || "").trim();
        const oldOrgNm = (row["ORGNM"] || "").trim();

        // 실제로 값이 변경되었는지 확인
        const isActuallyChanged = newEmpNo !== oldEmpNo || newEmpNm !== oldEmpNm || newOrgNm !== oldOrgNm;

        const updatedRow = { 
          ...row,
          ["MNGEMPNO"]: newEmpNo,
          ["EMPNM"]: newEmpNm,
          ["ORGNM"]: newOrgNm
        };

        // 실제 변경된 경우에만 isChanged = "Y"
        if (isActuallyChanged) {
          updatedRow.isChanged = "Y";
        }

        return updatedRow;
      }
      return row;
    }));

    if (tableInstance.current) tableInstance.current.redraw();

    setShowUserPopup(false);
    setSelectedRowData(null);
  };

  const handleUserCancel = () => {
    setShowUserPopup(false);
    setSelectedRowData(null);
  };

  const createUserFormatter = (field) => (cell) => {
    const rowData = cell.getRow().getData();
    cell.getElement().style.backgroundColor = "#eaeaea";

    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";

    const span = document.createElement("span");
    span.innerText = rowData[field] || "";
    span.style.cursor = "pointer";
    span.style.flex = "1";

    div.appendChild(span);
    return div;
  };

  const cellClickHandler = (e, cell) => {
    const rowData = cell.getRow().getData();

    setSelectedRowData(rowData);    
    setShowUserPopup(true);
  };

  const handleDynamicEvent = (eventType) => {
    if (eventType === 'search') handleSearch();
    else if (eventType === 'showAddPopup') setShowAddPopup(true);
  };

  const handleAddCancel = () => {
    setShowAddPopup(false);
  };

  const handleSave = async () => {
    const changedRows = data.filter(row => row.isDeleted === "Y" || row.isChanged === "Y");
    if (changedRows.length === 0) {
      errorMsgPopup("변경된 데이터가 없습니다.");
      return;
    }

    const invalidRows = changedRows.filter(row => {
        // 삭제된 행은 검증 제외
        if (row.isDeleted === "Y") return false;

        const title = String(row.TITLE || "").trim();
        const contents = String(row.CONTENTS || "").trim();
        const reportOrder = String(row.REPORTORDER || "").trim();
        const mngEmpNo = String(row.MNGEMPNO || "").trim();

        return !title || !contents || !reportOrder || !mngEmpNo;
    });

    if (invalidRows.length > 0) {
      errorMsgPopup("제목, 내용, 정렬순서, 담당자사번은 필수 입력값입니다.\n빈 값이 있는 행을 확인해주세요.");
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
          pTITLE: row.TITLE.toString(),
          pCONTENTS: row.CONTENTS.toString(),
          pREPORTORDER: row.REPORTORDER.toString(),
          pMNGEMPNO: row.MNGEMPNO.toString(),
        };

        try {
          const response = await fetchData('report/reportlistSave', params);
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
    { headerHozAlign: "center", hozAlign: "center", title: "REPORTID", field: "REPORTID", sorter: "number", width: 100, editable: false, visible: false },
    { headerHozAlign: "center", hozAlign: "center", title: "제목", field: "TITLE", sorter: "string", width: 500, editor: "input", cellEdited: (cell) => handleCellEdit(cell, "TITLE") },
    { headerHozAlign: "center", hozAlign: "center", title: "내용", field: "CONTENTS", sorter: "string", width: 250, editor: "input", cellEdited: (cell) => handleCellEdit(cell, "CONTENTS") },
    { headerHozAlign: "center", hozAlign: "center", title: "정렬순서", field: "REPORTORDER", sorter: "number", width: 100, editor: "number", cellEdited: (cell) => handleCellEdit(cell, "REPORTORDER") },
    { headerHozAlign: "center", hozAlign: "center", title: "부서", field: "ORGNM", sorter: "string", width: 200 },
    { headerHozAlign: "center", hozAlign: "center", title: "담당자사번", field: "MNGEMPNO", sorter: "string", width: 120, formatter: createUserFormatter("MNGEMPNO"), cellClick: (e, cell) => {cellClickHandler(e, cell);}  },
    { headerHozAlign: "center", hozAlign: "center", title: "담당자명", field: "EMPNM", sorter: "string", width: 120, formatter: createUserFormatter("EMPNM"), cellClick: (e, cell) => {cellClickHandler(e, cell);} },
    { headerHozAlign: "center", hozAlign: "center", title: "등록일", field: "REGDT", sorter: "string", width: 120 },
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
      <CommonPopup
        show={showUserPopup}
        onHide={handleUserCancel}
        onConfirm={() => {}}
        title="사용자 선택"
      >
        <UserSearchPopup
          onClose={handleUserCancel}
          onConfirm={handleUserConfirm}
        />
      </CommonPopup>
      <ReportAddPopup
        show={showAddPopup}
        onHide={handleAddCancel}
        onParentSearch={handleSearch}
      />
    </div>
  );
};

export default ReportListManage;
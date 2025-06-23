import React, { useState, useEffect, useRef } from "react";
import useStore from "../../store/store";
import { hasPermission } from "../../utils/authUtils";
import MainSearch from "../../components/main/MainSearch";
import TableSearch from "../../components/table/TableSearch";
import { createTable } from "../../utils/tableConfig";
import { initialFilters } from "../../utils/tableEvent";
import { handleDownloadExcel } from "../../utils/tableExcel";
import styles from "../../components/table/TableSearch.module.css";
import CommonPopup from "../../components/popup/CommonPopup";
import { fetchData } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";

const getFieldOptions = (fieldId) => {
  const optionsMap = {
    GU: [
      { value: "ALL", label: "전체" },
      { value: "EMPNO", label: "사원번호" },
      { value: "EMPNM", label: "이름" },
      { value: "ORGCD", label: "조직코드" },
      { value: "ORGNM", label: "조직명" },
      { value: "COMPANYCD", label: "회사코드" },
      { value: "COMPANYNM", label: "회사명" },
    ],
  };
  return optionsMap[fieldId] || [];
};

const UserAuthManage = () => {
  const { user } = useStore();
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const searchConfig = { areas: [
    { type: 'search', fields: [
      { id: 'GU', type: 'select', row: 1, label: '구분', labelVisible: true, options: getFieldOptions('GU'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
      { id: 'searchText', type: 'text', row: 1, label: '', labelVisible: false, placeholder: '검색값을 입력하세요', maxLength: 100, width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
    ]},
    { type: 'buttons', fields: [
      { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
    ]},
  ]};

  const filterTableFields = [
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "EMPNO", label: "사원번호" }, { value: "EMPNM", label: "이름" }, { value: "ORGCD", label: "조직코드" }, { value: "ORGNM", label: "조직명" }, { value: "COMPANYCD", label: "회사코드" }, { value: "COMPANYNM", label: "회사명" }, { value: "AUTHID", label: "권한ID" }, { value: "AUTHNM", label: "권한명" }], width: "auto" },
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [data, setData] = useState([]);
  const [authList, setAuthList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [selectedEmpNo, setSelectedEmpNo] = useState(null);
  const [newAuth, setNewAuth] = useState({ AUTHID: "", AUTHNM: "" });
  const [rowCount, setRowCount] = useState(0);
  const [isSearched, setIsSearched] = useState(false);

  useEffect(() => {
    if (!user || !hasPermission(user.auth, "userAuthManage")) window.location.href = "/";
  }, [user]);

  useEffect(() => {
    const loadAuthList = async () => {
      setLoading(true);
      try {
        const params = { pGUBUN: "AUTHINFO", pSEARCH: "", pDEBUG: "F" };
        const response = await fetchData("oper/usermng/list", params);
        if (!response.success) {
          errorMsgPopup(response.message || "권한 데이터를 가져오는 중 오류가 발생했습니다.");
          setAuthList([]);
          return;
        }
        if (response.errMsg !== "") {
          errorMsgPopup(response.errMsg);
          setAuthList([]);
          return;
        }
        setAuthList(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        errorMsgPopup(err.response?.data?.message || "권한 데이터를 가져오는 중 오류가 발생했습니다.");
        setAuthList([]);
      } finally {
        setLoading(false);
      }
    };
    loadAuthList();
  }, []);

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        return;
      }
      try {
        tableInstance.current = createTable(tableRef.current, [
          { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업대상", field: "applyTarget", sorter: "string", width: 100, formatter: (cell) => {
            const rowData = cell.getRow().getData();
            let label = rowData.isChanged === "Y" ? "변경" : "";
            if (!label) return "";
            const div = document.createElement("div");
            div.style.display = "flex"; div.style.alignItems = "center"; div.style.justifyContent = "center"; div.style.gap = "5px";
            const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = rowData.isChanged === "Y";
            checkbox.onclick = () => {
              setTimeout(() => {
                setData((prevData) => prevData.map((row) => row.EMPNO === rowData.EMPNO ? { ...row, isChanged: checkbox.checked ? "Y" : "N" } : row));
              }, 0);
            };
            const span = document.createElement("span"); span.innerText = label;
            div.appendChild(checkbox); div.appendChild(span);
            return div;
          }},
          { headerHozAlign: "center", hozAlign: "center", title: "사원번호", field: "EMPNO", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "left", title: "이름", field: "EMPNM", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "left", title: "조직코드", field: "ORGCD", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "left", title: "조직명", field: "ORGNM", sorter: "string", width: 150, editable: false },
          { headerHozAlign: "center", hozAlign: "left", title: "회사코드", field: "COMPANYCD", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "left", title: "회사명", field: "COMPANYNM", sorter: "string", width: 150, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "권한ID", field: "AUTHID", sorter: "string", width: 100, editable: false, cellClick: (e, cell) => { setSelectedEmpNo(cell.getRow().getData().EMPNO); setShowAuthPopup(true); }, cellStyle: { backgroundColor: "#d3d3d3" } },
          { headerHozAlign: "center", hozAlign: "left", title: "권한명", field: "AUTHNM", sorter: "string", width: 150, editable: false, cellClick: (e, cell) => { setSelectedEmpNo(cell.getRow().getData().EMPNO); setShowAuthPopup(true); }, cellStyle: { backgroundColor: "#d3d3d3" } },
        ], [], {
          editable: false, 
          //headerSort: false, // defaultOptions의 headerSort: true를 false로 재정의
          //responsiveLayout: true로, // defaultOptions의 responsiveLayout: false를 true로 재정의
          rowFormatter: (row) => {
            const data = row.getData();
            const el = row.getElement();
            el.classList.remove(styles.editedRow);
            if (data.isChanged === "Y") el.classList.add(styles.editedRow);
          },
        });
        if (!tableInstance.current) throw new Error("createTable returned undefined or null");
        setTableStatus("ready");
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
  }, []);

  useEffect(() => {
    if (isInitialRender.current) { isInitialRender.current = false; return; }
    const table = tableInstance.current;
    if (!table || tableStatus !== "ready" || loading) return;
    if (table.rowManager?.renderer) {
      table.setData(data);
      if (isSearched && data.length === 0 && !loading) {
        tableInstance.current.alert("검색 결과 없음", "info");
      } else {
        tableInstance.current.clearAlert();
        const rows = tableInstance.current.getDataCount();
        setRowCount(rows);
      }
    }
  }, [data, loading, tableStatus, isSearched]);

  useEffect(() => {
    if (!tableInstance.current || tableStatus !== "ready" || loading) return;
    const { filterSelect, filterText } = tableFilters;
    if (filterText && filterSelect) {
      tableInstance.current.setFilter(filterSelect, "like", filterText);
    } else if (filterText) {
      if (filterText !== "") {
        tableInstance.current.setFilter([
          { field: "EMPNO", type: "like", value: filterText },
          { field: "EMPNM", type: "like", value: filterText },
          { field: "ORGCD", type: "like", value: filterText },
          { field: "ORGNM", type: "like", value: filterText },
          { field: "COMPANYCD", type: "like", value: filterText },
          { field: "COMPANYNM", type: "like", value: filterText },
          { field: "AUTHID", type: "like", value: filterText },
          { field: "AUTHNM", type: "like", value: filterText },
        ], "or");
      } else {
        tableInstance.current.clearFilter();
      }
    } else {
      tableInstance.current.clearFilter();
    }
  }, [tableFilters, tableStatus, loading]);

  const handleDynamicEvent = (eventType) => { if (eventType === 'search') handleSearch(); };

  const handleSearch = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = { pGUBUN: filters.GU || "ALL", pSEARCH: filters.searchText || "", pDEBUG: "F" };
      const response = await fetchData("oper/usermng/list", params);
      if (!response.success) {
        errorMsgPopup(response.message || "사용자 데이터를 가져오는 중 오류가 발생했습니다.");
        setData([]);
        return;
      }
      if (response.errMsg !== "") {
        setData([]);
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      setData(responseData.map(row => ({ ...row, isChanged: "N" })));
    } catch (err) {
      errorMsgPopup(err.response?.data?.message || "사용자 데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthConfirm = () => {
    if (!selectedEmpNo) return;
    const newAuthId = newAuth.AUTHID;
    setData((prevData) => prevData.map((row) => {
      if (row.EMPNO === selectedEmpNo) {
        const auth = authList.find((a) => a.AUTHID === newAuthId);
        return { ...row, AUTHID: newAuthId, AUTHNM: auth ? auth.AUTHNM : "", isChanged: row.isChanged === "N" ? "Y" : row.isChanged };
      }
      return row;
    }));
    if (tableInstance.current) tableInstance.current.redraw();
    setShowAuthPopup(false);
    setSelectedEmpNo(null);
    setNewAuth({ AUTHID: "", AUTHNM: "" });
  };

  const handleAuthCancel = () => {
    setShowAuthPopup(false);
    setSelectedEmpNo(null);
    setNewAuth({ AUTHID: "", AUTHNM: "" });
  };

  const handleSave = async () => {
    const changedRows = data.filter((row) => row.isChanged === "Y");
    if (changedRows.length === 0) {
      errorMsgPopup("변경된 데이터가 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const promises = changedRows.map(async (row) => {
        const params = { pGUBUN: "I", pEMPNO: row.EMPNO, pAUTHID: row.AUTHID };
        try {
          const response = await fetchData("oper/usermng/save", params);
          if (!response.success) throw new Error(response.message || `Failed to update user ${row.EMPNO}`);
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing update for EMPNO: ${row.EMPNO}`, error);
          return { ...row, error: error.message };
        }
      });
      const results = await Promise.all(promises);
      const errors = results.filter((result) => result?.error);
      if (errors.length > 0) {
        errorMsgPopup(`일부 작업이 실패했습니다: ${errors.map((e) => e.error).join(", ")}`);
      } else {
        msgPopup("모든 변경사항이 성공적으로 저장되었습니다.");
        setData((prevData) => prevData.map((row) => ({ ...row, isChanged: "N" })));
      }
    } catch (err) {
      errorMsgPopup(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
      <TableSearch filterFields={filterTableFields} filters={tableFilters} setFilters={setTableFilters} rowCount={rowCount} onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "사용자권한관리.xlsx")} buttonStyles={styles}>
        <div className={styles.btnGroupCustom}>
          <button className={`${styles.btn} text-bg-success`} onClick={handleSave}>저장</button>
        </div>
      </TableSearch>
      <div className={styles.tableWrapper}>
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }} />
      </div>
      <CommonPopup show={showAuthPopup} onHide={handleAuthCancel} onConfirm={handleAuthConfirm} title="권한 선택">
        <div className="mb-3">
          <label htmlFor="authIdSelect" className="form-label">권한</label>
          <select className={`form-select ${styles.formSelect}`} id="authIdSelect" value={newAuth.AUTHID} onChange={(e) => {
            const auth = authList.find((a) => a.AUTHID === e.target.value);
            setNewAuth({ AUTHID: e.target.value, AUTHNM: auth ? auth.AUTHNM : "" });
          }}>
            <option value="">선택하세요</option>
            {authList.map((auth) => (
              <option key={auth.AUTHID} value={auth.AUTHID}>{auth.AUTHNM}</option>
            ))}
          </select>
        </div>
      </CommonPopup>
    </div>
  );
};

export default UserAuthManage;
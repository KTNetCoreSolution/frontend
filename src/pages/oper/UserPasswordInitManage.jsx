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

// 초기화 버튼 생성 함수
const fn_CellButton = (label, className, onClick) => ({
  formatter: (cell) => {
    const button = document.createElement("button");
    button.className = `btn btn-sm ${className}`;
    button.innerText = label;
    button.onclick = () => onClick(cell.getData());
    return button;
  },
});

const UserPasswordInitManage = () => {
  const { user } = useStore();
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const searchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'GU', type: 'select', row: 1, label: '구분', labelVisible: true, options: getFieldOptions('GU'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'searchText', type: 'text', row: 1, label: '', labelVisible: false, placeholder: '검색값을 입력하세요', maxLength: 100, width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
        ],
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ],
      },
    ],
  };

  const filterTableFields = [
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "EMPNO", label: "사원번호" }, { value: "EMPNM", label: "이름" }, { value: "ORGCD", label: "조직코드" }, { value: "ORGNM", label: "조직명" }, { value: "COMPANYCD", label: "회사코드" }, { value: "COMPANYNM", label: "회사명" }, { value: "AUTHID", label: "권한ID" }, { value: "AUTHNM", label: "권한명" }], width: "auto" },
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [rowCount, setRowCount] = useState(0);
  const [isSearched, setIsSearched] = useState(false);

  useEffect(() => {
    if (!user || !hasPermission(user.auth, "UserPasswordInitManage")) window.location.href = "/";
  }, [user]);

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        return;
      }
      try {
        tableInstance.current = createTable(tableRef.current, [
          { 
            frozen: true,
            headerHozAlign: "center", 
            hozAlign: "center", 
            title: "작업", 
            field: "actions", 
            width: 80, 
            formatter: (cell) => {
              const rowData = cell.getRow().getData();
              return fn_CellButton('초기화', `btn-danger ${styles.deleteButton}`, (rowData) => {
                  setSelectedRow(rowData);
                  setShowDeletePopup(true);
                }).formatter(cell);
            }
          },
          { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "사원번호", field: "EMPNO", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "이름", field: "EMPNM", sorter: "string", width: 160, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "직책코드", field: "LEVELCD", sorter: "string", width: 80, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "직책명", field: "LEVELNM", sorter: "string", width: 80, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "호칭코드", field: "TITLECD", sorter: "string", width: 80, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "호칭명", field: "TITLENM", sorter: "string", width: 120, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "조직코드", field: "ORGCD", sorter: "string", width: 80, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "조직명", field: "ORGNM", sorter: "string", width: 150, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "회사코드", field: "COMPANYCD", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "회사명", field: "COMPANYNM", sorter: "string", width: 150, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "입사일", field: "ENTERDT", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "퇴사일", field: "EXFIREDT", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "퇴사유무", field: "EXFIREYN", sorter: "string", width: 80, editable: false },
        ], [], {
          editable: false,
          layout: "fitColumns",
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
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const table = tableInstance.current;
    if (!table || tableStatus !== "ready" || loading) return;
    if (table.rowManager?.renderer) {
      table.setData(data);
      if (isSearched && data.length === 0 && !loading) {
        tableInstance.current.alert("검색 결과 없음", "info");
        setRowCount(0);
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

  const handleDynamicEvent = (eventType) => {
    if (eventType === 'search') handleSearch();
  };

  const handleSearch = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = { pGUBUN: filters.GU || "ALL", pSEARCH: filters.searchText || "", pDEBUG: "F" };
      const response = await fetchData("oper/userpasswordinitmng/list", params);
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
      setData(responseData);
    } catch (err) {
      errorMsgPopup(err.response?.data?.message || "사용자 데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRow) return;
    setShowDeletePopup(false);
    setLoading(true);
    try {
      const params = {
        pGUBUN: "U",
        pEMPNO: selectedRow.EMPNO
      };
      const response = await fetchData("oper/userpasswordinitmng/save", params);
      if (!response.success) {
        errorMsgPopup(response.message || "초기화 중 오류가 발생했습니다.");
        return;
      }
      if (response.errMsg !== "" || (response.data[0] && response.data[0].errCd !== "00")) {
        let errMsg = response.errMsg;
        if (response.data[0] && response.data[0].errMsg !== "") errMsg = response.data[0].errMsg;
        msgPopup(errMsg);
        return;
      }
      msgPopup("초기화되었습니다.");
      handleSearch();
    } catch (err) {
      console.error("초기화 실패:", err);
      errorMsgPopup("초기화 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setSelectedRow(null);
    }
  };

  return (
    <div className={styles.container}>
      <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
      <TableSearch filterFields={filterTableFields} filters={tableFilters} setFilters={setTableFilters} rowCount={rowCount} onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "사용자비밀번호초기화관리.xlsx")} buttonStyles={styles} />
      <div className={styles.tableWrapper}>
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }} />
      </div>
      <CommonPopup
        show={showDeletePopup}
        onHide={() => { setShowDeletePopup(false); setSelectedRow(null); }}
        onConfirm={handleDeleteConfirm}
        title="초기화 확인"
      >
        <p className='commonInnerTxt'>{selectedRow?.EMPNM ? `${selectedRow.EMPNM} 초기화하시겠습니까?` : "초기화하시겠습니까?"}</p>
      </CommonPopup>
    </div>
  );
};

export default UserPasswordInitManage;
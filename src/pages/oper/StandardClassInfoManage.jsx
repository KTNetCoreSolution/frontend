import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../../store/store";
import { hasPermission } from "../../utils/authUtils";
import MainSearch from "../../components/main/MainSearch";
import TableSearch from "../../components/table/TableSearch";
import { createTable } from "../../utils/tableConfig";
import { initialFilters } from "../../utils/tableEvent";
import { handleDownloadExcel } from "../../utils/tableExcel";
import { fetchData } from "../../utils/dataUtils";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import CommonPopup from "../../components/popup/CommonPopup";
import common from "../../utils/common";
import styles from "../../components/table/TableSearch.module.css";

const fn_CellText = { editor: "input", editable: true };
const fn_CellNumber = { editor: "number", editorParams: { min: 0 }, editable: true };
const fn_CellSelect = (values) => ({ editor: "list", editorParams: { values, autocomplete: true }, editable: true });
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

const fn_HandleCellEdit = (cell, field, setAddRowData, setData, tableInstance) => {
  const rowData = cell.getRow().getData();
  const newValue = cell.getValue();

  // 추가 행인 경우
  if (rowData.isAddRow) {
    setTimeout(() => {
      setAddRowData((prev) => ({ ...prev, [field]: newValue }));
      if (tableInstance.current) tableInstance.current.redraw();
    }, 0);
    return;
  }

  // 일반 행인 경우
  const rowId = rowData.ID;
  setTimeout(() => {
    setData((prevData) =>
      prevData.map((row) => {
        if (String(row.ID) === String(rowId)) {
          return { ...row, [field]: newValue, isChanged: "Y" };
        }
        return row;
      })
    );
    if (tableInstance.current) tableInstance.current.redraw();
  }, 0);
};

const ADD_CONFIRM_MESSAGE = "추가하시겠습니까?";
const EDIT_CONFIRM_MESSAGE = "변경하시겠습니까?";
const DELETE_CONFIRM_MESSAGE = "삭제하시겠습니까?";

const StandardClassInfoManage = () => {
  const { user } = useStore();
  const navigate = useNavigate();

  const searchConfig = {
    areas: [
      { type: "search", fields: [{ id: "classGubun", type: "select", row: 1, label: "분야", labelVisible: true, options: [{ value: "LINE", label: "선로" }, { value: "DESIGN", label: "설계" }, { value: "BIZ", label: "BIZ" }], defaultValue: "LINE", enabled: true, eventType: "selectChange" }] },
      { type: "buttons", fields: [{ id: "searchBtn", type: "button", row: 1, label: "검색", eventType: "search", width: "80px", height: "30px", backgroundColor: "#00c4b4", color: "#ffffff", enabled: true }] },
    ],
  };

  const filterTableFields = [
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "CLASSANM", label: "대분류" }, { value: "CLASSBNM", label: "중분류" }, { value: "CLASSCNM", label: "소분류" }] },
    { id: "filterText", label: "", type: "text", placeholder: "찾을 내용을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === "search").fields));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [loading, setLoading] = useState(false);
  const [addRowData, setAddRowData] = useState({ USEYN: "Y", SECTIONCD: "LINE", isAddRow: true });
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [showPopup, setShowPopup] = useState({ show: false, type: "", rowData: null });
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const columns = [
    {
      frozen: true,
      headerHozAlign: "center",
      hozAlign: "center",
      title: "작업",
      field: "actions",
      width: 120,
      formatter: (cell) => {
        const rowData = cell.getData();
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.alignItems = "center";
        if (rowData.isAddRow) {
          // 추가 행: 추가 버튼만 표시
          const addButton = document.createElement("button");
          addButton.className = `btn btn-sm btn-success`;
          addButton.innerText = "추가";
          addButton.onclick = () => setShowPopup({ show: true, type: "add", rowData });
          wrapper.appendChild(addButton);
        } else {
          // 일반 행: 변경, 삭제 버튼 표시
          const editButton = document.createElement("button");
          editButton.className = `btn btn-sm btn-primary`;
          editButton.innerText = "변경";
          editButton.style.marginRight = "5px";
          editButton.onclick = () => setShowPopup({ show: true, type: "edit", rowData });
          wrapper.appendChild(editButton);

          const deleteButton = document.createElement("button");
          deleteButton.className = `btn btn-sm btn-danger`;
          deleteButton.innerText = "삭제";
          deleteButton.onclick = () => setShowPopup({ show: true, type: "delete", rowData });
          wrapper.appendChild(deleteButton);
        }
        return wrapper;
      },
    },
    { headerHozAlign: "center", hozAlign: "center", title: "ID", field: "ID", sorter: "string", width: 100, visible: false },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "분야 코드", field: "SECTIONCD", sorter: "string", width: 120, 
      editor: "list", editorParams: { values: ["LINE", "DESIGN", "BIZ"], autocomplete: true }, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "SECTIONCD", setAddRowData, setData, tableInstance) 
    },
    { headerHozAlign: "center", hozAlign: "center", title: "대분류 코드", field: "CLASSACD", sorter: "string", width: 120, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSACD", setAddRowData, setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "대분류", field: "CLASSANM", sorter: "string", width: 150, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSANM", setAddRowData, setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "중분류 코드", field: "CLASSBCD", sorter: "string", width: 120, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSBCD", setAddRowData, setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "중분류", field: "CLASSBNM", sorter: "string", width: 150, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSBNM", setAddRowData, setData, tableInstance) },
    { 
      headerHozAlign: "center", 
      hozAlign: "center", 
      title: "소분류 코드", 
      field: "CLASSCCD", 
      sorter: "string", 
      width: 120, 
      formatter: (cell) => {
        const rowData = cell.getData();
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.alignItems = "center";
        wrapper.style.height = "100%";
        if (!rowData.isAddRow) {
          wrapper.style.backgroundColor = "#e1e1e1"; // 리스트 행에 연한 회색 배경
          wrapper.contentEditable = false; // 리스트 행에서 readonly 설정
        }
        wrapper.innerText = cell.getValue() || "";
        return wrapper;
      },
      ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSCCD", setAddRowData, setData, tableInstance)
    },
    { headerHozAlign: "center", hozAlign: "left", title: "소분류", field: "CLASSCNM", sorter: "string", width: 190, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSCNM", setAddRowData, setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "분류순서", field: "CLASSODR", sorter: "string", width: 100, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSODR", setAddRowData, setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "업무부가설명", field: "DETAIL", sorter: "string", width: 250, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "DETAIL", setAddRowData, setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "단위문구", field: "UTYPE", sorter: "string", width: 200, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "UTYPE", setAddRowData, setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "BIZMCODE", field: "BIZMCODE", sorter: "string", width: 120, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, "BIZMCODE", setAddRowData, setData, tableInstance) },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "사용유무", field: "USEYN", sorter: "string", width: 100, 
      editor: "list", editorParams: { values: ["Y", "N"], autocomplete: true }, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "USEYN", setAddRowData, setData, tableInstance) 
    },
  ];

  const fieldToTitleMap = columns.reduce((map, column) => {
    if (column.field && column.title) {
      map[column.field] = column.title;
    }
    return map;
  }, {});

  const validateRequiredFields = (rowData, requiredFields) => {
    const missingFields = requiredFields.filter((field) => {
      const value = rowData[field];
      if (field === "CLASSODR") {
        return value == null || value === "";
      }
      return typeof value === "string" ? !value.trim() : !value;
    });
    return missingFields.map((field) => fieldToTitleMap[field] || field);
  };

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = { pGUBUN: filters.classGubun || "", DEBUG: "F" };
      const response = await fetchData("oper/standard/class/list", params);
      if (!response.success) {
        errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
        setData([]);
        return;
      }
      if (response.errMsg !== "") {
        setData([]);
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      const leveledData = responseData.map((row) => ({ ...row, isDeleted: "N", isChanged: "N", isAdded: "N", isAddRow: false }));
      setData(leveledData);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !hasPermission(user.auth, "menuManage")) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        return;
      }
      try {
        tableInstance.current = createTable(tableRef.current, columns, [], {
          editable: true,
          rowFormatter: (row) => {
            const rowData = row.getData();
            const rowElement = row.getElement();
            if (rowData.isChanged === "Y") {
              rowElement.style.backgroundColor = "#fff3cd"; // 노란색 배경
            } else {
              rowElement.style.backgroundColor = ""; // 기본 배경
            }
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
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const table = tableInstance.current;
    if (!table || tableStatus !== "ready" || loading) return;
    if (table.rowManager?.renderer) {
      table.setData([...data]); // 기존 데이터 설정
      table.addRow({ ...addRowData }, true); // 추가 행을 맨 위에 추가
      // 첫 번째 행(추가 행)을 고정
      table.getRows().forEach((row, index) => {
        if (index === 0) {
          row.freeze(); // 첫 번째 행 고정
        } 
      });
      if (isSearched && data.length === 0 && !loading) {
        table.alert("검색 결과 없음", "info");
      } else {
        table.clearAlert();
      }
      setRowCount(data.length);
    } else {
      console.warn("renderer가 아직 초기화되지 않았습니다.");
    }
  }, [data, loading, tableStatus, isSearched, addRowData]);

  useEffect(() => {
    if (isInitialRender.current || !tableInstance.current || tableStatus !== "ready" || loading) return;
    const { filterSelect, filterText } = tableFilters;
    if (filterText && filterSelect) {
      tableInstance.current.setFilter(filterSelect, "like", filterText);
    } else if (filterText) {
      if (filterText !== "") {
        tableInstance.current.setFilter(
          [
            { field: "CLASSANM", type: "like", value: filterText },
            { field: "CLASSBNM", type: "like", value: filterText },
            { field: "CLASSCNM", type: "like", value: filterText },
          ],
          "or"
        );
      } else {
        tableInstance.current.clearFilter();
      }
    } else if (filterSelect) {
      tableInstance.current.clearFilter();
    }
  }, [tableFilters.filterSelect, tableFilters.filterText, tableStatus, loading]);

  const handleDynamicEvent = (eventType) => {
    if (eventType === "search") {
      loadData();
    }
  };

  const handleAdd = async () => {
    const requiredFields = ["SECTIONCD", "CLASSACD", "CLASSANM", "CLASSBCD", "CLASSBNM", "CLASSCCD", "CLASSCNM", "CLASSODR", "USEYN"];
    const missingFields = validateRequiredFields(addRowData, requiredFields);
    if (missingFields.length > 0) {
      errorMsgPopup(`다음 필드를 입력해주세요: ${missingFields.join(", ")}`);
      return;
    }

    let validation = common.validateVarcharLength(addRowData.CLASSACD, 300, "대분류코드");
    if (!validation.valid) {
      errorMsgPopup(validation.error);
      return;
    }

    validation = common.validateVarcharLength(addRowData.CLASSANM, 300, "대분류");
    if (!validation.valid) {
      errorMsgPopup(validation.error);
      return;
    }

    setLoading(true);
    try {
      const newRow = { 
        SECTIONCD: addRowData.SECTIONCD || "LINE", 
        CLASSACD: addRowData.CLASSACD || "", 
        CLASSANM: addRowData.CLASSANM || "", 
        CLASSBCD: addRowData.CLASSBCD || "", 
        CLASSBNM: addRowData.CLASSBNM || "", 
        CLASSCCD: addRowData.CLASSCCD || "", 
        CLASSCNM: addRowData.CLASSCNM || "", 
        CLASSODR: addRowData.CLASSODR || "", 
        DETAIL: addRowData.DETAIL || "", 
        UTYPE: addRowData.UTYPE || "", 
        USEYN: addRowData.USEYN || "Y", 
        isDeleted: "N", 
        isChanged: "N", 
        isAdded: "Y",
        isAddRow: false 
      };
      const params = { 
        pGUBUN: "I", 
        pSECTIONCD: newRow.SECTIONCD || "", 
        pCLASSACD: newRow.CLASSACD || "", 
        pCLASSANM: newRow.CLASSANM || "", 
        pCLASSBCD: newRow.CLASSBCD || "", 
        pCLASSBNM: newRow.CLASSBNM || "", 
        pCLASSCCD: newRow.CLASSCCD || "", 
        pCLASSCNM: newRow.CLASSCNM || "", 
        pCLASSODR: newRow.CLASSODR || "", 
        pDETAIL: newRow.DETAIL || "", 
        pUTYPE: newRow.UTYPE || "", 
        pUSEYN: newRow.USEYN || "", 
        pEMPNO: user?.empNo || "" 
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "추가 실패");
      }
      const newId = response.data?.ID || `temp_${Date.now()}`;
      setData((prevData) => [{ ...newRow, ID: newId }, ...prevData]);
      setAddRowData({ USEYN: "Y", SECTIONCD: "LINE", isAddRow: true }); // 추가 행 초기화
      msgPopup("추가가 성공적으로 완료되었습니다.");
    } catch (err) {
      console.error("추가 실패:", err);
      errorMsgPopup(err.message || "추가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setShowPopup({ show: false, type: "", rowData: null });
    }
  };

  const handleEdit = async (rowData) => {
    const requiredFields = ["SECTIONCD", "CLASSACD", "CLASSANM", "CLASSBCD", "CLASSBNM", "CLASSCCD", "CLASSCNM", "CLASSODR", "USEYN"];
    const missingFields = validateRequiredFields(rowData, requiredFields);
    if (missingFields.length > 0) {
      errorMsgPopup(`다음 필드를 입력해주세요: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const params = { 
        pGUBUN: "U", 
        pSECTIONCD: rowData.SECTIONCD || "", 
        pCLASSACD: rowData.CLASSACD || "", 
        pCLASSANM: rowData.CLASSANM || "", 
        pCLASSBCD: rowData.CLASSBCD || "", 
        pCLASSBNM: rowData.CLASSBNM || "", 
        pCLASSCCD: rowData.CLASSCCD || "", 
        pCLASSCNM: rowData.CLASSCNM || "", 
        pCLASSODR: rowData.CLASSODR || "", 
        pDETAIL: rowData.DETAIL || "", 
        pUTYPE: rowData.UTYPE || "", 
        pUSEYN: rowData.USEYN || "", 
        pEMPNO: user?.empNo || "" 
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "변경 실패");
      }
      setData((prevData) => prevData.map((row) => String(row.ID) === String(rowData.ID) ? { ...row, isChanged: "N" } : row));
      msgPopup("변경이 성공적으로 완료되었습니다.");
    } catch (err) {
      console.error("변경 실패:", err);
      errorMsgPopup(err.message || "변경 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setShowPopup({ show: false, type: "", rowData: null });
    }
  };

  const handleDelete = async (rowData) => {
    const requiredFields = ["CLASSCCD"];
    const missingFields = validateRequiredFields(rowData, requiredFields);
    if (missingFields.length > 0) {
      errorMsgPopup(`다음 필드를 입력해주세요: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const params = { 
        pGUBUN: "D", 
        pSECTIONCD: rowData.SECTIONCD || "", 
        pCLASSACD: rowData.CLASSACD || "", 
        pCLASSANM: rowData.CLASSANM || "", 
        pCLASSBCD: rowData.CLASSBCD || "", 
        pCLASSBNM: rowData.CLASSBNM || "", 
        pCLASSCCD: rowData.CLASSCCD || "", 
        pCLASSCNM: rowData.CLASSCNM || "", 
        pCLASSODR: rowData.CLASSODR || "", 
        pDETAIL: rowData.DETAIL || "", 
        pUTYPE: rowData.UTYPE || "", 
        pUSEYN: rowData.USEYN || "", 
        pEMPNO: user?.empNo || "" 
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "삭제 실패");
      }
      setData((prevData) => prevData.filter((row) => String(row.ID) !== String(rowData.ID)));
      msgPopup("삭제가 성공적으로 완료되었습니다.");
    } catch (err) {
      console.error("삭제 실패:", err);
      errorMsgPopup(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setShowPopup({ show: false, type: "", rowData: null });
    }
  };

  const handlePopupConfirm = () => {
    if (showPopup.type === "add") {
      handleAdd();
    } else if (showPopup.type === "edit") {
      handleEdit(showPopup.rowData);
    } else if (showPopup.type === "delete") {
      handleDelete(showPopup.rowData);
    }
  };

  const handlePopupCancel = () => {
    setShowPopup({ show: false, type: "", rowData: null });
  };

  return (
    <div className={styles.container}>
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "표준활동분류관리.xlsx")}
        buttonStyles={styles}
      />
      <div className={styles.tableWrapper}>
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div
          ref={tableRef}
          className={styles.tableSection}
          style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }}
        />
      </div>
      
      {/* 확인 팝업만 표시 */}
      <CommonPopup
        show={showPopup.show}
        onHide={handlePopupCancel}
        title="확인"
        requiresConfirm={false}
        buttons={[
          { label: "취소", className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`, action: handlePopupCancel },
          { 
            label: showPopup.type === "add" ? "추가" : showPopup.type === "edit" ? "변경" : "삭제", 
            className: `${styles.btn} ${styles.btnPrimary} btn text-bg-success`, 
            action: handlePopupConfirm 
          },
        ]}
      >
        {showPopup.type === "add" ? ADD_CONFIRM_MESSAGE : showPopup.type === "edit" ? EDIT_CONFIRM_MESSAGE : DELETE_CONFIRM_MESSAGE}
      </CommonPopup>
    </div>
  );
};

export default StandardClassInfoManage;
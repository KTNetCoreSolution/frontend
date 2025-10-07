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
  const table = tableInstance.current;

  // 실제 스크롤 컨테이너 참조
  const scrollContainer = table ? table.element.querySelector('.tabulator-tableholder') : null;
  const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  // 편집 모드 종료
  if (table && table.modules.edit.currentCell) {
    table.modules.edit.currentCell = false;
  }

  // 셀 배경색 초기화
  cell.getElement().style.backgroundColor = "#ffffff";

  // 추가 행인 경우
  if (rowData.isAddRow) {
    setAddRowData((prev) => ({ ...prev, [field]: newValue }));
    if (table) {
      cell.getRow().update({ [field]: newValue });
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollTop;
        }, 0);
      }
    }
    return;
  }

  // 일반 행인 경우
  const rowId = rowData.ID;
  setData((prevData) =>
    prevData.map((row) => {
      if (String(row.ID) === String(rowId)) {
        return { ...row, [field]: newValue, isChanged: "Y" };
      }
      return row;
    })
  );
  if (table) {
    cell.getRow().update({ [field]: newValue, isChanged: "Y" });
    if (scrollContainer) {
      setTimeout(() => {
        scrollContainer.scrollTop = scrollTop;
      }, 0);
    }
  }
};

const ADD_CONFIRM_MESSAGE = "추가하시겠습니까?";
const EDIT_CONFIRM_MESSAGE = "대분류코드, 중분류코드, 대분류, 중분류는 이미 존재하는 것으로 입력되어야 하며,<br>소분류코드는 키값으로 변경할 수 없습니다.<br>존재하는 대분류코드, 중분류코드에 대해 대분류, 중분류 문구가 변경되면<br>대분류, 중분류는 전체 반영됩니다.<br>변경하시겠습니까?";
const DELETE_CONFIRM_MESSAGE = "삭제하시겠습니까?";

const StandardClassInfoManage = () => {
  const { user } = useStore();
  const navigate = useNavigate();

  const searchConfig = {
    areas: [
      { type: "search", fields: [
        { id: "classGubun", type: "select", row: 1, label: "분야", labelVisible: true, options: [{ value: "LINE", label: "선로" }, { value: "DESIGN", label: "설계" }, { value: "BIZ", label: "BIZ" }], defaultValue: "LINE", enabled: true, eventType: "selectChange" },
        { id: 'msgLabel', type: 'label', row: 2, label: '입력 중일때는 초록색 배경입니다. [추가], [변경], [삭제] 버튼은 입력 중인 초록색 배경색일 경우는 더블클릭하셔야 합니다.', labelVisible: true, width: '800px', height: '30px', backgroundColor: '#ffffff', color: '#d62424', enabled: true },
      ] },
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
          const addButton = document.createElement("button");
          addButton.className = `btn btn-sm btn-success`;
          addButton.innerText = "추가";
          addButton.onclick = () => setShowPopup({ show: true, type: "add", rowData });
          wrapper.appendChild(addButton);
        } else {
          const editButton = document.createElement("button");
          editButton.className = `btn btn-sm btn-primary`;
          editButton.innerText = "변경";
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
      headerHozAlign: "center", hozAlign: "center", title: "분야코드", field: "SECTIONCD", sorter: "string", width: 120, 
      editor: "list", editorParams: { values: ["LINE", "DESIGN", "BIZ"], autocomplete: true }, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "SECTIONCD", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "대분류코드", field: "CLASSACD", sorter: "string", width: 120, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSACD", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "left", title: "대분류", field: "CLASSANM", sorter: "string", width: 150, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSANM", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "중분류코드", field: "CLASSBCD", sorter: "string", width: 120, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSBCD", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "left", title: "중분류", field: "CLASSBNM", sorter: "string", width: 150, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSBNM", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", 
      hozAlign: "center", 
      title: "소분류코드", 
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
          wrapper.style.backgroundColor = "#e1e1e1";
          wrapper.contentEditable = false;
        }
        wrapper.innerText = cell.getValue() || "";
        return wrapper;
      },
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSCCD", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "left", title: "소분류", field: "CLASSCNM", sorter: "string", width: 190, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSCNM", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "분류순서", field: "CLASSODR", sorter: "string", width: 100, 
      ...fn_CellNumber, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSODR", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "left", title: "업무부가설명", field: "DETAIL", sorter: "string", width: 250, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "DETAIL", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "left", title: "단위문구", field: "UTYPE", sorter: "string", width: 200, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "UTYPE", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "BIZMCODE", field: "BIZMCODE", sorter: "string", width: 120, 
      ...fn_CellNumber, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "BIZMCODE", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "사용유무", field: "USEYN", sorter: "string", width: 100, 
      editor: "list", editorParams: { values: ["Y", "N"], autocomplete: true }, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "USEYN", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
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
      const sectionCd = filters.classGubun || "LINE";
      setAddRowData((prev) => ({ ...prev, SECTIONCD: sectionCd, isAddRow: true }));
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
          movableRows: false,
          rowFormatter: (row) => {
            const rowData = row.getData();
            const rowElement = row.getElement();
            if (rowData.isChanged === "Y") {
              rowElement.style.backgroundColor = "#fff3cd";
            } else {
              rowElement.style.backgroundColor = "";
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
      table.setData([...data]);
      table.addRow({ ...addRowData }, true);
      table.getRows().forEach((row, index) => {
        if (index === 0) {
          row.freeze();
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

  const validateFieldsLength = (rowData) => {
    const fieldValidations = [
      { field: "CLASSACD", maxLength: 8, label: "대분류코드" },
      { field: "CLASSANM", maxLength: 150, label: "대분류" },
      { field: "CLASSBCD", maxLength: 8, label: "중분류코드" },
      { field: "CLASSBNM", maxLength: 150, label: "중분류" },
      { field: "CLASSCCD", maxLength: 8, label: "소분류코드" },
      { field: "CLASSCNM", maxLength: 200, label: "소분류" },
    ];

    if (rowData.DETAIL && rowData.DETAIL.trim()) {
      fieldValidations.push({ field: "DETAIL", maxLength: 300, label: "업무부가설명" });
    }
    if (rowData.UTYPE && rowData.UTYPE.trim()) {
      fieldValidations.push({ field: "UTYPE", maxLength: 100, label: "단위문구" });
    }

    for (const { field, maxLength, label } of fieldValidations) {
      const validation = common.validateVarcharLength(rowData[field], maxLength, label);
      if (!validation.valid) {
        errorMsgPopup(validation.error);
        return false;
      }
    }
    return true;
  };

  const handleAdd = async () => {
    const requiredFields = ["SECTIONCD", "CLASSACD", "CLASSANM", "CLASSBCD", "CLASSBNM", "CLASSCCD", "CLASSCNM", "CLASSODR", "USEYN"];
    const missingFields = validateRequiredFields(addRowData, requiredFields);
    if (missingFields.length > 0) {
      errorMsgPopup(`다음 필드를 입력해주세요: ${missingFields.join(", ")}`);
      return;
    }

    if (!validateFieldsLength(addRowData)) {
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
        BIZMCODE: addRowData.BIZMCODE || "", 
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
        pBIZMCODE: newRow.BIZMCODE || "", 
        pUTYPE: newRow.UTYPE || "", 
        pUSEYN: newRow.USEYN || "", 
        pEMPNO: user?.empNo || "" 
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "추가 실패");
      } else {
        if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
          let errMsg = response.errMsg;
          if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          msgPopup(errMsg);
          return;
        }
      }

      // 서버에서 반환된 ID를 newRow에 추가
      const newId = response.data?.[0]?.ID || addRowData.CLASSCCD;
      setData((prevData) => [{ ...newRow, ID: newId, CLASSCCD: newId }, ...prevData]);
      setAddRowData({ USEYN: "Y", SECTIONCD: "LINE", isAddRow: true });
      msgPopup("추가가 성공적으로 완료되었습니다.");

      // /list API 호출
      await loadData();
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

    if (!validateFieldsLength(rowData)) {
      return;
    }

    if (rowData.CLASSCCD !== rowData.ID) {
      errorMsgPopup("소분류코드는 변경할 수 없습니다.");
      rowData.CLASSCCD = rowData.ID;
      setData((prevData) =>
        prevData.map((row) =>
          String(row.ID) === String(rowData.ID) ? { ...row, CLASSCCD: rowData.ID, isChanged: "Y" } : row
        )
      );
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
        pBIZMCODE: rowData.BIZMCODE || "", 
        pUTYPE: rowData.UTYPE || "", 
        pUSEYN: rowData.USEYN || "", 
        pEMPNO: user?.empNo || "" 
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "변경 실패");
      } else {
        if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
          let errMsg = response.errMsg;
          if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          msgPopup(errMsg);
          return;
        }
      }
      
      setData((prevData) => prevData.map((row) => String(row.ID) === String(rowData.ID) ? { ...row, isChanged: "N" } : row));
      msgPopup("변경이 성공적으로 완료되었습니다.");

      // /list API 호출
      await loadData();
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

    if (rowData.CLASSCCD !== rowData.ID) {
      errorMsgPopup("소분류코드는 변경할 수 없습니다.");
      rowData.CLASSCCD = rowData.ID;
      setData((prevData) =>
        prevData.map((row) =>
          String(row.ID) === String(rowData.ID) ? { ...row, CLASSCCD: rowData.ID, isChanged: "Y" } : row
        )
      );
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
        pBIZMCODE: rowData.BIZMCODE || "", 
        pUTYPE: rowData.UTYPE || "", 
        pUSEYN: rowData.USEYN || "", 
        pEMPNO: user?.empNo || "" 
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "삭제 실패");
      } else {
        if (response.errMsg !== '' || (response.data[0] && response.data[0].errCd !== '00')) {
          let errMsg = response.errMsg;
          if (response.data[0] && response.data[0].errMsg !== '') errMsg = response.data[0].errMsg;
          msgPopup(errMsg);
          return;
        }
      }

      setData((prevData) => prevData.filter((row) => String(row.ID) !== String(rowData.ID)));
      msgPopup("삭제가 성공적으로 완료되었습니다.");

      // /list API 호출
      await loadData();
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
        <div dangerouslySetInnerHTML={{ __html: showPopup.type === "add" ? ADD_CONFIRM_MESSAGE : showPopup.type === "edit" ? EDIT_CONFIRM_MESSAGE : DELETE_CONFIRM_MESSAGE }} />
      </CommonPopup>
    </div>
  );
};

export default StandardClassInfoManage;
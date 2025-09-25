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
      // 비동기적으로 스크롤 복원
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
    // 비동기적으로 스크롤 복원
    if (scrollContainer) {
      setTimeout(() => {
        scrollContainer.scrollTop = scrollTop;
      }, 0);
    }
  }
};

const ADD_CONFIRM_MESSAGE = "추가하시겠습니까?";
const EDIT_CONFIRM_MESSAGE = "업무명은<br>다른 BIZMCODE의 업무명도 같이 변경됩니다. <br>변경하시겠습니까?";
const DELETE_CONFIRM_MESSAGE = "삭제하시겠습니까?";

const StandardBizProcessManage = () => {
  const { user } = useStore();
  const navigate = useNavigate();

  const [searchConfig, setSearchConfig] = useState({
    areas: [
      { type: "search", fields: [
        { id: "bizMCodeGubun", type: "select", row: 1, label: "BIZMCODE", labelVisible: true, options: [], defaultValue: "", enabled: true, eventType: "selectChange" },
        { id: 'msgLabel', type: 'label', row: 2, label: '입력 중일때는 초록색 배경입니다. [추가], [변경], [삭제] 버튼은 입력 중인 초록색 배경색일 경우는 더블클릭하셔야 합니다.', labelVisible: true, width: '800px', height: '30px', backgroundColor: '#ffffff', color: '#d62424', enabled: true },
      ] },
      { type: "buttons", fields: [{ id: "searchBtn", type: "button", row: 1, label: "검색", eventType: "search", width: "80px", height: "30px", backgroundColor: "#00c4b4", color: "#ffffff", enabled: true }] },
    ]
  });

  const filterTableFields = [
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "WORKCD", label: "업무코드" }, { value: "WORKNM", label: "업무명" }] },
    { id: "filterText", label: "", type: "text", placeholder: "찾을 내용을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState({ bizMCodeGubun: "" });
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [loading, setLoading] = useState(false);
  const [addRowData, setAddRowData] = useState({ USEYN: "Y", isAddRow: true });
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [showPopup, setShowPopup] = useState({ show: false, type: "", rowData: null });
  const [bizMCodeOptions, setBizMCodeOptions] = useState([]);
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
          addButton.setAttribute("data-action", "add");
          wrapper.appendChild(addButton);
        } else {
          const editButton = document.createElement("button");
          editButton.className = `btn btn-sm btn-primary`;
          editButton.innerText = "변경";
          editButton.style.marginRight = "5px";
          editButton.setAttribute("data-action", "edit");
          wrapper.appendChild(editButton);

          const deleteButton = document.createElement("button");
          deleteButton.className = `btn btn-sm btn-danger`;
          deleteButton.innerText = "삭제";
          deleteButton.setAttribute("data-action", "delete");
          wrapper.appendChild(deleteButton);
        }
        return wrapper;
      },
    },
    { headerHozAlign: "center", hozAlign: "center", title: "ID", field: "ID", sorter: "string", width: 100, visible: false },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "BIZMCODE", field: "BIZMCODE", sorter: "string", width: 120, 
      ...fn_CellNumber, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "BIZMCODE", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "업무코드", field: "WORKCD", sorter: "string", width: 120, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "WORKCD", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "left", title: "업무명", field: "WORKNM", sorter: "string", width: 300, 
      ...fn_CellText, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "WORKNM", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "분류순서", field: "ODR", sorter: "string", width: 100, 
      ...fn_CellNumber, 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "ODR", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { 
      headerHozAlign: "center", hozAlign: "center", title: "사용유무", field: "USEYN", sorter: "string", width: 100, 
      ...fn_CellSelect(["Y", "N"]), 
      cellEdited: (cell) => fn_HandleCellEdit(cell, "USEYN", setAddRowData, setData, tableInstance),
      cellEditing: (cell) => {
        cell.getElement().style.backgroundColor = "#e6ffe6";
      }
    },
    { headerHozAlign: "center", hozAlign: "left", title: "원본BIZMCODE", field: "ORIGINBIZMCODE", sorter: "string", width: 100, visible: false },
    { headerHozAlign: "center", hozAlign: "left", title: "원본업무코드", field: "ORIGINWORKCD", sorter: "string", width: 100, visible: false },
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
      if (field === "ODR") {
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
      const params = { pGUBUN: filters.bizMCodeGubun || "", DEBUG: "F" };
      const response = await fetchData("oper/standard/bizProcess/list", params);
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
      const leveledData = responseData.map((row) => ({ ...row, ORIGINBIZMCODE: row.ORIGINBIZMCODE || "", ORIGINWORKCD: row.ORIGINWORKCD || "", isDeleted: "N", isChanged: "N", isAdded: "N", isAddRow: false }));
      setData(leveledData);
      const bizMCode = filters.bizMCodeGubun || "";
      setAddRowData((prev) => ({ ...prev, BIZMCODE: bizMCode, isAddRow: true }));
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBizMCodeOptions = async () => {
      try {
        const params = {
          pGUBUN: 'BIZMCODE',
          pDEBUG: 'F',
        };
        const response = await fetchData('standard/ddlList', params);
        if (!response.success) {
          errorMsgPopup(response.message || 'BIZMCODE 옵션을 가져오는 중 오류가 발생했습니다.');
          return;
        }
        const fetchedOptions = Array.isArray(response.data) ? response.data : [];
        const options = fetchedOptions.map((item) => ({ value: item.DDLCD, label: item.DDLNM }));
        setBizMCodeOptions(options);
        setSearchConfig((prev) => ({
          ...prev,
          areas: prev.areas.map((area) => {
            if (area.type === "search") {
              return {
                ...area,
                fields: area.fields.map((field) =>
                  field.id === "bizMCodeGubun"
                    ? { ...field, options }
                    : field
                )
              };
            }
            return area;
          })
        }));
      } catch (err) {
        console.error('BIZMCODE 옵션 로드 실패:', err);
        errorMsgPopup(err.response?.data?.message || 'BIZMCODE 옵션을 가져오는 중 오류가 발생했습니다.');
      }
    };
    fetchBizMCodeOptions();
  }, []);

  useEffect(() => {
    if (bizMCodeOptions.length > 0) {
      setFilters((prev) => ({
        ...prev,
        bizMCodeGubun: bizMCodeOptions[0]?.value || ""
      }));
    }
  }, [bizMCodeOptions]);

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
              rowElement.style.backgroundColor = "#fff3cd"; // 노란색 배경
            } else {
              rowElement.style.backgroundColor = ""; // 기본 배경
            }
          },
        });
        if (!tableInstance.current) throw new Error("createTable returned undefined or null");
        tableInstance.current.on("cellClick", (e, cell) => {
          if (cell.getColumn().getField() === "actions" && e.target.tagName === "BUTTON") {
            e.stopPropagation();
            // 편집 모드 강제 종료
            if (tableInstance.current.modules.edit.currentCell) {
              tableInstance.current.modules.edit.currentCell = false;
            }
            const rowData = cell.getData();
            const action = e.target.getAttribute("data-action");
            if (action) {
              setShowPopup({ show: true, type: action, rowData });
            }
          }
        });
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
            { field: "WORKCD", type: "like", value: filterText },
            { field: "WORKNM", type: "like", value: filterText },
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

  const handleDynamicEvent = (eventType, payload) => {
    if (eventType === "search") {
      loadData();
    } else if (eventType === "selectChange") {
      const { id, value } = payload;
      setFilters((prev) => ({ ...prev, [id]: value }));
      setAddRowData((prev) => ({ ...prev, BIZMCODE: value }));
    }
  };

  const validateFieldsLength = (rowData) => {
    const fieldValidations = [
      { field: "WORKCD", maxLength: 8, label: "업무코드" },
      { field: "WORKNM", maxLength: 150, label: "업무명" },
    ];

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
    const requiredFields = ["BIZMCODE", "WORKCD", "WORKNM", "USEYN"];
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
      const params = {
        pGUBUN: "I",
        pORIGINBIZMCODE: addRowData.BIZMCODE || "",
        pORIGINWORKCD: addRowData.WORKCD || "",
        pBIZMCODE: addRowData.BIZMCODE || "",
        pWORKCD: addRowData.WORKCD || "",
        pWORKNM: addRowData.WORKNM || "",
        pODR: addRowData.ODR || "",
        pUSEYN: addRowData.USEYN || "Y",
        pEMPNO: user?.empNo || ""
      };
      const response = await fetchData("oper/standard/bizProcess/save", params);
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

      await loadData(); // 재조회
      setAddRowData({ USEYN: "Y", isAddRow: true, BIZMCODE: filters.bizMCodeGubun });
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
    const requiredFields = ["BIZMCODE", "WORKCD", "WORKNM", "ODR", "USEYN"];
    const missingFields = validateRequiredFields(rowData, requiredFields);
    if (missingFields.length > 0) {
      errorMsgPopup(`다음 필드를 입력해주세요: ${missingFields.join(", ")}`);
      return;
    }

    if (!validateFieldsLength(rowData)) {
      return;
    }

    setLoading(true);
    try {
      const params = {
        pGUBUN: "U",
        pORIGINBIZMCODE: rowData.ORIGINBIZMCODE || "",
        pORIGINWORKCD: rowData.ORIGINWORKCD || "",
        pBIZMCODE: rowData.BIZMCODE || "",
        pWORKCD: rowData.WORKCD || "",
        pWORKNM: rowData.WORKNM || "",
        pODR: rowData.ODR || "",
        pUSEYN: rowData.USEYN || "Y",
        pEMPNO: user?.empNo || ""
      };
      const response = await fetchData("oper/standard/bizProcess/save", params);
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

      await loadData(); // 재조회
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
    const requiredFields = ["BIZMCODE", "WORKCD"];
    const missingFields = validateRequiredFields(rowData, requiredFields);
    if (missingFields.length > 0) {
      errorMsgPopup(`다음 필드를 입력해주세요: ${missingFields.join(", ")}`);
      return;
    }

    if (rowData.BIZMCODE !== rowData.ORIGINBIZMCODE) {
      errorMsgPopup("BIZMCODE는 변경할 수 없습니다.");
      rowData.BIZMCODE = rowData.ORIGINBIZMCODE;
      setData((prevData) =>
        prevData.map((row) =>
          String(row.ID) === String(rowData.ID) ? { ...row, BIZMCODE: rowData.ORIGINBIZMCODE, isChanged: "Y" } : row
        )
      );
      return;
    }

    if (rowData.WORKCD !== rowData.ORIGINWORKCD) {
      errorMsgPopup("업무코드는 변경할 수 없습니다.");
      rowData.WORKCD = rowData.ORIGINWORKCD;
      setData((prevData) =>
        prevData.map((row) =>
          String(row.ID) === String(rowData.ID) ? { ...row, WORKCD: rowData.ORIGINWORKCD, isChanged: "Y" } : row
        )
      );
      return;
    }

    setLoading(true);
    try {
      const params = {
        pGUBUN: "D",
        pORIGINBIZMCODE: rowData.ORIGINBIZMCODE || "",
        pORIGINWORKCD: rowData.ORIGINWORKCD || "",
        pBIZMCODE: rowData.BIZMCODE || "",
        pWORKCD: rowData.WORKCD || "",
        pWORKNM: rowData.WORKNM || "",
        pODR: rowData.ODR || "",
        pUSEYN: rowData.USEYN || "Y",
        pEMPNO: user?.empNo || ""
      };
      const response = await fetchData("oper/standard/bizProcess/save", params);
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

      await loadData(); // 재조회
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "표준활동BIZ업무정보관리.xlsx")}
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

export default StandardBizProcessManage;
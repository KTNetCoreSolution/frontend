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
const fn_HandleCellEdit = (cell, field, setData, tableInstance) => {
  const rowId = cell.getRow().getData().ID;
  const newValue = cell.getValue();
  setTimeout(() => {
    setData((prevData) =>
      prevData.map((row, index) => {
        if (index === 0 && field !== "USEYN") return row; // 고정 행은 사용유무만 수정 가능
        if (index === 0 || String(row.ID) === String(rowId)) {
          return { ...row, [field]: newValue, isChanged: index !== 0 ? "Y" : row.isChanged };
        }
        return row;
      })
    );
    if (tableInstance.current) tableInstance.current.redraw();
  }, 0);
};

const StandardClassInfoManage = () => {
  const { user } = useStore();
  const navigate = useNavigate();

  const searchConfig = {
    areas: [
      {
        type: "search",
        fields: [
          {
            id: "classGubun",
            type: "select",
            row: 1,
            label: "분야",
            labelVisible: true,
            options: [
              { value: "LINE", label: "선로" },
              { value: "DESIGN", label: "설계" },
              { value: "BIZ", label: "BIZ" },
            ],
            defaultValue: "LINE",
            enabled: true,
            eventType: "selectChange",
          },
        ],
      },
      {
        type: "buttons",
        fields: [
          {
            id: "searchBtn",
            type: "button",
            row: 1,
            label: "검색",
            eventType: "search",
            width: "80px",
            height: "30px",
            backgroundColor: "#00c4b4",
            color: "#ffffff",
            enabled: true,
          },
        ],
      },
    ],
  };

  const filterTableFields = [
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "CLASSANM", label: "대분류" }, { value: "CLASSBNM", label: "중분류" }, { value: "CLASSCNM", label: "소분류" }] },
    { id: "filterText", label: "", type: "text", placeholder: "찾을 내용을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === "search").fields));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([{ USEYN: "Y" }]); // 첫 번째 행은 고정 행, 사용유무 기본값 Y
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
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
        const rowIndex = cell.getRow().getPosition();
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.alignItems = "center";
        if (rowIndex === 1) {
          // 첫 번째 행: 추가 버튼 (모든 페이지에서)
          const addButton = document.createElement("button");
          addButton.className = `btn btn-sm btn-success`;
          addButton.innerText = "추가";
          addButton.onclick = () => handleAdd(cell.getData());
          wrapper.appendChild(addButton);
        } else {
          // 두 번째 행부터: 변경, 삭제 버튼
          const editButton = document.createElement("button");
          editButton.className = `btn btn-sm btn-primary`;
          editButton.innerText = "변경";
          editButton.style.marginRight = "5px";
          editButton.onclick = () => handleEdit(cell.getData());
          wrapper.appendChild(editButton);

          const deleteButton = document.createElement("button");
          deleteButton.className = `btn btn-sm btn-danger`;
          deleteButton.innerText = "삭제";
          deleteButton.onclick = () => handleDelete(cell.getData());
          wrapper.appendChild(deleteButton);
        }
        return wrapper;
      },
    },
    { headerHozAlign: "center", hozAlign: "center", title: "ID", field: "ID", sorter: "string", width: 100, visible: false },
    { headerHozAlign: "center", hozAlign: "center", title: "분야 코드", field: "SECTIONCD", sorter: "string", width: 120, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "SECTIONCD", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "대분류 코드", field: "CLASSACD", sorter: "string", width: 120, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSACD", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "대분류", field: "CLASSANM", sorter: "string", width: 150, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSANM", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "중분류 코드", field: "CLASSBCD", sorter: "string", width: 120, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSBCD", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "중분류", field: "CLASSBNM", sorter: "string", width: 150, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSBNM", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "소분류 코드", field: "CLASSCCD", sorter: "string", width: 120, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSCCD", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "소분류", field: "CLASSCNM", sorter: "string", width: 190, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSCNM", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "분류순서", field: "CLASSODR", sorter: "string", width: 190, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, "CLASSODR", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "업무부가설명", field: "DETAIL", sorter: "string", width: 250, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "DETAIL", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "left", title: "단위문구", field: "UTYPE", sorter: "string", width: 200, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "UTYPE", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "사용유무", field: "USEYN", sorter: "string", width: 100, ...fn_CellSelect(["Y", "N"]), cellEdited: (cell) => fn_HandleCellEdit(cell, "USEYN", setData, tableInstance) },
  ];

  // 필드 이름과 타이틀 매핑 객체
  const fieldToTitleMap = columns.reduce((map, column) => {
    if (column.field && column.title) {
      map[column.field] = column.title;
    }
    return map;
  }, {});

  // 필수 필드 검증 및 오류 메시지 생성 함수
  const validateRequiredFields = (rowData, requiredFields) => {
    const missingFields = requiredFields.filter((field) => {
      const value = rowData[field];
      // CLASSODR은 숫자 타입이므로 별도 처리
      if (field === "CLASSODR") {
        return value == null || value === "";
      }
      // 문자열 필드에 대해 trim 적용
      return typeof value === "string" ? !value.trim() : !value;
    });
    // 타이틀로 변환
    return missingFields.map((field) => fieldToTitleMap[field] || field);
  };

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = {
        pGUBUN: filters.classGubun || "",
        DEBUG: "F",
      };
      const response = await fetchData("oper/standard/class/list", params);
      if (!response.success) {
        errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
        setData([{ USEYN: "Y" }]);
        return;
      }
      if (response.errMsg !== "") {
        setData([{ USEYN: "Y" }]);
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      const leveledData = responseData.map((row) => ({
        ...row,
        isDeleted: "N",
        isChanged: "N",
        isAdded: "N",
      }));
      setData([{ USEYN: "Y" }, ...leveledData]); // 첫 번째 행은 고정 행
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setData([{ USEYN: "Y" }]);
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
          frozenRows: 1,
          rowFormatter: (row) => {
            const rowData = row.getData();
            if (rowData.isChanged === "Y") {
              row.getElement().style.backgroundColor = "#fff3cd"; // 노란색 배경
            } else {
              row.getElement().style.backgroundColor = ""; // 기본 배경
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
      table.setData(data);
      if (isSearched && data.length === 1 && !loading) {
        tableInstance.current.alert("검색 결과 없음", "info");
      } else {
        tableInstance.current.clearAlert();
        const rows = tableInstance.current.getDataCount();
        setRowCount(rows - 1); // 고정 행 제외
      }
    } else {
      console.warn("renderer가 아직 초기화되지 않았습니다.");
    }
  }, [data, loading, tableStatus, isSearched]);

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
    const firstRow = data[0];
    const requiredFields = [
      "SECTIONCD",
      "CLASSACD",
      "CLASSANM",
      "CLASSBCD",
      "CLASSBNM",
      "CLASSCCD",
      "CLASSCNM",
      "CLASSODR",
      "USEYN",
    ];
    const missingFields = validateRequiredFields(firstRow, requiredFields);
    if (missingFields.length > 0) {
      errorMsgPopup(`다음 필드를 입력해주세요: ${missingFields.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const newRow = {
        SECTIONCD: firstRow.SECTIONCD || "",
        CLASSACD: firstRow.CLASSACD || "",
        CLASSANM: firstRow.CLASSANM || "",
        CLASSBCD: firstRow.CLASSBCD || "",
        CLASSBNM: firstRow.CLASSBNM || "",
        CLASSCCD: firstRow.CLASSCCD || "",
        CLASSCNM: firstRow.CLASSCNM || "",
        CLASSODR: firstRow.CLASSODR || "",
        DETAIL: firstRow.DETAIL || "",
        UTYPE: firstRow.UTYPE || "",
        USEYN: firstRow.USEYN || "Y",
        isDeleted: "N",
        isChanged: "N",
        isAdded: "Y",
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
        pEMPNO: user?.empNo || "",
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "추가 실패");
      }
      setData((prevData) => [prevData[0], { ...newRow, ID: response.data?.ID || newRow.ID }, ...prevData.slice(1)]);
      msgPopup("추가가 성공적으로 완료되었습니다.");
    } catch (err) {
      console.error("추가 실패:", err);
      errorMsgPopup(err.message || "추가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (rowData) => {
    const requiredFields = [
      "SECTIONCD",
      "CLASSACD",
      "CLASSANM",
      "CLASSBCD",
      "CLASSBNM",
      "CLASSCCD",
      "CLASSCNM",
      "CLASSODR",
      "USEYN",
    ];
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
        pEMPNO: user?.empNo || "",
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "변경 실패");
      }
      setData((prevData) =>
        prevData.map((row, index) =>
          index === 0 || row.ID !== rowData.ID ? row : { ...row, isChanged: "N" }
        )
      );
      msgPopup("변경이 성공적으로 완료되었습니다.");
    } catch (err) {
      console.error("변경 실패:", err);
      errorMsgPopup(err.message || "변경 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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
        pEMPNO: user?.empNo || "",
      };
      const response = await fetchData("oper/standard/class/save", params);
      if (!response.success) {
        throw new Error(response.message || "삭제 실패");
      }
      setData((prevData) => prevData.filter((row, index) => index === 0 || row.ID !== rowData.ID));
      msgPopup("삭제가 성공적으로 완료되었습니다.");
    } catch (err) {
      console.error("삭제 실패:", err);
      errorMsgPopup(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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
    </div>
  );
};

export default StandardClassInfoManage;
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../../store/store";
import { hasPermission } from "../../utils/authUtils";
import CommonPopup from "../../components/popup/CommonPopup";
import MainSearch from "../../components/main/MainSearch";
import TableSearch from "../../components/table/TableSearch";
import { createTable } from "../../utils/tableConfig";
import { initialFilters } from "../../utils/tableEvent";
import { handleDownloadExcel } from "../../utils/tableExcel";
import styles from "../../components/table/TableSearch.module.css";
import { fetchData } from "../../utils/dataUtils";
import common from "../../utils/common";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import OrgSearchPopup from "../../components/popup/OrgSearchPopup";
import UserSearchPopup from "../../components/popup/UserSearchPopup";

const fn_CellText = { editor: "input", editable: true };
const fn_CellSelect = (values) => ({ editor: "list", editorParams: { values, autocomplete: true }, editable: true });
const fn_CellButton = (label, className, onClick) => ({
  formatter: (cell) => {
    const button = document.createElement("button");
    button.className = `btn btn-sm ${className}`;
    button.innerText = label;
    button.onclick = () => onClick(cell.getData());
    return button;
  },
});

const fn_HandleCellEdit = (cell, field, setData, tableInstance) => {
  const rowId = cell.getRow().getData().ID;
  const newValue = cell.getValue();
  if (field === "EMPORG") {
    const validation = common.validateVarcharLength(newValue, 100, "담당조직/담당자");
    if (!validation.valid) {
      errorMsgPopup(validation.error);
      return;
    }
  }
  setTimeout(() => {
    setData((prevData) =>
      prevData.map((row) => {
        if (String(row.ID) === String(rowId)) {
          const updatedRow = { ...row, [field]: newValue };
          if (updatedRow.isDeleted === "N" && updatedRow.isAdded === "N") {
            updatedRow.isChanged = "Y";
          }
          return updatedRow;
        }
        return row;
      })
    );
    if (tableInstance.current) tableInstance.current.redraw();
  }, 0);
};

const ModuleOrgAuthInfo = () => {
  const { user } = useStore();
  const navigate = useNavigate();

  const searchConfig = {
    areas: [
      {
        type: "search",
        fields: [
          {
            id: "orgText",
            type: "text",
            row: 1,
            label: "조직",
            labelVisible: true,
            placeholder: "조직 선택",
            width: "150px",
            height: "30px",
            backgroundColor: "#f0f0f0",
            color: "#000000",
            enabled: false,
          },
          {
            id: "orgPopupBtn",
            type: "popupIcon",
            row: 1,
            label: "조직 선택",
            labelVisible: false,
            eventType: "showOrgPopup",
            width: "30px",
            height: "30px",
            backgroundColor: "#f0f0f0",
            color: "#000000",
            enabled: true,
          },
          {
            id: "MODULETYPE",
            type: "select",
            row: 1,
            label: "업무",
            labelVisible: true,
            options: [
              { value: "", label: "전체" },
              { value: "CAR", label: "차량관리" },
              { value: "STANDARD", label: "표준활동관리" },
              { value: "RENTAL", label: "렌탈관리" },
              { value: "TOOL", label: "공기구관리" },
            ],
            width: "150px",
            height: "30px",
            backgroundColor: "#ffffff",
            color: "#000000",
            enabled: true,
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
            label: "조회",
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
    {
      id: "filterSelect",
      label: "",
      type: "select",
      options: [
        { value: "", label: "선택" },
        { value: "EMPORG", label: "담당조직/담당자" },
        { value: "MODULETYPE", label: "업무" },
        { value: "ORGNM", label: "권한조직" },
      ],
    },
    {
      id: "filterText",
      label: "",
      type: "text",
      placeholder: "찾을 내용을 입력하세요",
      width: "200px",
    },
  ];

  const [filters, setFilters] = useState({...initialFilters(searchConfig.areas.find((area) => area.type === "search").fields), orgText: user?.orgNm || '', ORGCD: user?.orgCd || '',});
  const [_popupType, setPopupType] = useState(null);
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showOrgPopup, setShowOrgPopup] = useState(false);
  const [showEmpOrgPopup, setShowEmpOrgPopup] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showSearchOrgPopup, setShowSearchOrgPopup] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [newAuth, setNewAuth] = useState({ ID: "", EMPNO: "", EMPORG: "", ORGCD: "", ORGNM: "", MODULETYPE: "CAR", inputType: "EMP", AUTHOPERATOR: "" });
  const [imsiCounter, setImsiCounter] = useState(1);
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const initialSelectedOrgs = useMemo(() => (newAuth.ORGCD ? newAuth.ORGCD.split("^") : []), [newAuth.ORGCD]);

  const columns = [
    {
      frozen: true,
      headerHozAlign: "center",
      hozAlign: "center",
      title: "작업",
      field: "actions",
      width: 80,
      visible: true,
      ...fn_CellButton("삭제", `btn-danger ${styles.deleteButton}`, (rowData) => handleDelete(rowData)),
    },
    {
      frozen: true,
      headerHozAlign: "center",
      hozAlign: "center",
      title: "작업대상",
      field: "applyTarget",
      sorter: "string",
      width: 100,
      formatter: (cell) => {
        const rowData = cell.getRow().getData();
        let label = "";
        let stateField = "";
        if (rowData.isDeleted === "Y") {
          label = "삭제";
          stateField = "isDeleted";
        } else if (rowData.isAdded === "Y") {
          label = "추가";
          stateField = "isAdded";
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
        checkbox.checked = rowData[stateField] === "Y";
        checkbox.onclick = () => {
          setTimeout(() => {
            setData((prevData) =>
              prevData.map((row) => {
                if (row.ID === rowData.ID) {
                  const updatedRow = { ...row, [stateField]: checkbox.checked ? "Y" : "N" };
                  if (stateField === "isDeleted" && !checkbox.checked) {
                    updatedRow.isChanged = "N";
                  }
                  if (stateField === "isAdded" && !checkbox.checked) {
                    return null;
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
      },
    },
    {
      title: "ID",
      field: "ID",
      sorter: "string",
      width: 100,
      visible: true,
    },
    {
      headerHozAlign: "center",
      hozAlign: "left",
      title: "담당조직/담당자",
      field: "EMPORG",
      sorter: "string",
      width: 300,
      ...fn_CellText,
      cellEdited: (cell) => fn_HandleCellEdit(cell, "EMPORG", setData, tableInstance),
      formatter: (cell) => {
        const rowData = cell.getRow().getData();
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "5px";
        const span = document.createElement("span");
        span.innerText = rowData.EMPORG || "";
        const orgButton = document.createElement("button");
        orgButton.className = `btn btn-sm ${styles.popupIcon}`;
        orgButton.innerText = "담당조직";
        orgButton.style.width = "60px";
        orgButton.style.height = "30px";
        orgButton.style.backgroundColor = "#f0f0f0";
        orgButton.style.color = "#000000";
        orgButton.onclick = () => {
          setPopupType("EMPORG");
          setSelectedId(rowData.ID);
          setSelectedRowData(rowData);
          setNewAuth({ ...newAuth, ID: rowData.ID, EMPORG: rowData.EMPORG || "", EMPNO: rowData.EMPNO || "", MODULETYPE: rowData.MODULETYPE || "CAR", AUTHOPERATOR: rowData.AUTHOPERATOR || "" });
          setTimeout(() => setShowEmpOrgPopup(true), 0);
        };
        const userButton = document.createElement("button");
        userButton.className = `btn btn-sm ${styles.popupIcon}`;
        userButton.innerText = "담당자";
        userButton.style.width = "60px";
        userButton.style.height = "30px";
        userButton.style.backgroundColor = "#f0f0f0";
        userButton.style.color = "#000000";
        userButton.onclick = () => {
          setSelectedId(rowData.ID);
          setNewAuth({ ...newAuth, ID: rowData.ID, EMPORG: rowData.EMPORG || "", EMPNO: rowData.EMPNO || "", AUTHOPERATOR: rowData.AUTHOPERATOR || "" });
          setShowUserPopup(true);
        };
        div.appendChild(span);
        div.appendChild(orgButton);
        div.appendChild(userButton);
        return div;
      },
    },
    {
      headerHozAlign: "center",
      hozAlign: "center",
      title: "업무",
      field: "MODULETYPE",
      sorter: "string",
      width: 120,
      ...fn_CellSelect(["CAR", "STANDARD", "RENTAL", "TOOL"]),
      cellEdited: (cell) => fn_HandleCellEdit(cell, "MODULETYPE", setData, tableInstance),
      formatter: (cell) => {
        const value = cell.getValue();
        switch (value) {
          case "CAR": return "차량관리";
          case "STANDARD": return "표준활동관리";
          case "RENTAL": return "렌탈관리";
          case "TOOL": return "공기구관리";
          default: return value;
        }
      },
    },
    {
      headerHozAlign: "center",
      hozAlign: "center",
      title: "권한조직",
      field: "ORGNM",
      sorter: "string",
      width: 500,
      formatter: (cell) => {
        const rowData = cell.getRow().getData();
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "5px";
        const span = document.createElement("span");
        span.innerText = rowData.ORGNM || "";
        const button = document.createElement("button");
        button.className = `btn btn-sm btn-primary ${styles.popupIcon}`;
        button.innerText = "+";
        button.onclick = () => {
          setSelectedId(rowData.ID);
          setSelectedRowData(rowData);
          setNewAuth({ ...newAuth, ID: rowData.ID, ORGCD: rowData.ORGCD || "", ORGNM: rowData.ORGNM || "", AUTHOPERATOR: rowData.AUTHOPERATOR || "" });
          setShowOrgPopup(true);
        };
        div.appendChild(span);
        div.appendChild(button);
        return div;
      },
    },
    {
      title: "ORGCD",
      field: "ORGCD",
      visible: false,
    },
    {
      title: "EMPNO",
      field: "EMPNO",
      visible: false,
    },
    {
      title: "AUTHOPERATOR",
      field: "AUTHOPERATOR",
      visible: false,
    },
    {
      title: "inputType",
      field: "inputType",
      visible: false,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = {
        ORGCD: filters.ORGCD || "",
        MODULETYPE: filters.MODULETYPE || "",
        DEBUG: "F",
      };
      const response = await fetchData("oper/moduleorgauth/list", params);
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
      const formattedData = responseData.map((row, index) => ({
        ...row,
        ID: row.ID || String(index + 1),
        ORGNM: row.ORGNM || "",
        EMPNO: row.EMPNO || "",
        AUTHOPERATOR: row.inputType === "EMP" ? row.EMPNO : row.ORGCD || "",
        inputType: row.inputType || "EMP",
        isDeleted: "N",
        isEdited: "N",
        isAdded: "N",
      }));
      setData(formattedData);
      setImsiCounter(formattedData.length + 1);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !hasPermission(user.auth, "moduleOrgAuthManage")) navigate("/");
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
            const data = row.getData();
            const el = row.getElement();
            el.classList.remove(styles.deletedRow, styles.addedRow, styles.editedRow);
            if (data.isDeleted === "Y") el.classList.add(styles.deletedRow);
            else if (data.isAdded === "Y") el.classList.add(styles.addedRow);
            else if (data.isChanged === "Y") el.classList.add(styles.editedRow);
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
      if (isSearched && data.length === 0 && !loading) {
        tableInstance.current.alert("검색 결과 없음", "info");
      } else {
        tableInstance.current.clearAlert();
        const rows = tableInstance.current.getDataCount();
        setRowCount(rows);
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
            { field: "EMPORG", type: "like", value: filterText },
            { field: "MODULETYPE", type: "like", value: filterText },
            { field: "ORGNM", type: "like", value: filterText },
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
    } else if (eventType === "showOrgPopup") {
      setShowSearchOrgPopup(true);
    }
  };

  const handleAddClick = () => {
    const newId = `IMSI${String(imsiCounter).padStart(4, "0")}`;
    setNewAuth({ ID: newId, EMPNO: "", EMPORG: "", ORGCD: "", ORGNM: "", MODULETYPE: "CAR", inputType: "EMP", AUTHOPERATOR: "" });
    setShowAddPopup(true);
  };

  const handleAddConfirm = () => {
    if (!newAuth.MODULETYPE) {
      errorMsgPopup("업무를 선택해주세요.");
      return;
    }
    if (!newAuth.EMPORG) {
      errorMsgPopup("담당자 또는 담당조직을 입력해주세요.");
      return;
    }
    if (!newAuth.ORGCD || !newAuth.ORGNM) {
      errorMsgPopup("권한조직을 선택해주세요.");
      return;
    }
    if (!newAuth.AUTHOPERATOR) {
      errorMsgPopup("담당자 또는 담당조직 코드를 설정해주세요.");
      return;
    }
    const newRow = {
      ID: newAuth.ID,
      EMPORG: newAuth.EMPORG,
      EMPNO: newAuth.inputType === "EMP" ? newAuth.EMPNO : "",
      AUTHOPERATOR: newAuth.AUTHOPERATOR,
      MODULETYPE: newAuth.MODULETYPE,
      ORGCD: newAuth.ORGCD,
      ORGNM: newAuth.ORGNM,
      inputType: newAuth.inputType,
      isDeleted: "N",
      isEdited: "N",
      isAdded: "Y",
    };
    setData((prevData) => [newRow, ...prevData]);
    setImsiCounter((prev) => prev + 1);
    setShowAddPopup(false);
    setNewAuth({ ID: "", EMPNO: "", EMPORG: "", ORGCD: "", ORGNM: "", MODULETYPE: "CAR", inputType: "EMP", AUTHOPERATOR: "" });
  };

  const handleAddCancel = () => {
    setShowAddPopup(false);
    setNewAuth({ ID: "", EMPNO: "", EMPORG: "", ORGCD: "", ORGNM: "", MODULETYPE: "CAR", inputType: "EMP", AUTHOPERATOR: "" });
  };

  const handleOrgConfirm = (selectedRows) => {
    const newOrgCd = selectedRows[0]?.ORGCD || "";
    const newOrgNm = selectedRows[0]?.ORGNM || "";
    if (showAddPopup && showEmpOrgPopup) {
      setNewAuth((prev) => ({
        ...prev,
        EMPORG: newOrgNm,
        AUTHOPERATOR: newOrgCd,
        inputType: "ORG",
      }));
    } else if (showAddPopup && showOrgPopup) {
      setNewAuth((prev) => ({
        ...prev,
        ORGCD: newOrgCd,
        ORGNM: newOrgNm,
      }));
    } else if (selectedId && showEmpOrgPopup) {
      setData((prevData) =>
        prevData.map((row) => {
          if (row.ID === selectedId) {
            const updatedRow = {
              ...row,
              EMPORG: newOrgNm,
              EMPNO: "",
              AUTHOPERATOR: newOrgCd,
              inputType: "ORG",
              isChanged: row.isDeleted === "N" && row.isAdded === "N" ? "Y" : row.isChanged,
            };
            return updatedRow;
          }
          return row;
        })
      );
      if (tableInstance.current) {
        tableInstance.current.redraw();
      }
    } else if (selectedId && showOrgPopup) {
      setData((prevData) =>
        prevData.map((row) => {
          if (row.ID === selectedId) {
            const updatedRow = {
              ...row,
              ORGCD: newOrgCd,
              ORGNM: newOrgNm,
              isChanged: row.isDeleted === "N" && row.isAdded === "N" ? "Y" : row.isChanged,
            };
            return updatedRow;
          }
          return row;
        })
      );
      if (tableInstance.current) {
        tableInstance.current.redraw();
      }
    } else if (showSearchOrgPopup) {
      setFilters((prev) => ({ ...prev, orgText: newOrgNm, ORGCD: newOrgCd }));
    }
    setShowOrgPopup(false);
    setShowEmpOrgPopup(false);
    setShowSearchOrgPopup(false);
    setSelectedId(null);
    setSelectedRowData(null);
  };

  const handleUserConfirm = (selectedRows) => {
    const newEmpNo = selectedRows[0]?.EMPNO || "";
    const newEmpNm = selectedRows[0]?.EMPNM || "";
    if (showAddPopup && showUserPopup) {
      setNewAuth((prev) => ({
        ...prev,
        EMPNO: newEmpNo,
        EMPORG: newEmpNm,
        AUTHOPERATOR: newEmpNo,
        inputType: "EMP",
      }));
    } else if (selectedId && showUserPopup) {
      setData((prevData) =>
        prevData.map((row) => {
          if (row.ID === selectedId) {
            const updatedRow = {
              ...row,
              EMPORG: newEmpNm,
              EMPNO: newEmpNo,
              AUTHOPERATOR: newEmpNo,
              inputType: "EMP",
              isChanged: row.isDeleted === "N" && row.isAdded === "N" ? "Y" : row.isChanged,
            };
            return updatedRow;
          }
          return row;
        })
      );
      if (tableInstance.current) {
        tableInstance.current.redraw();
      }
    }
    setShowUserPopup(false);
    setSelectedId(null);
    setSelectedRowData(null);
  };

  const handleOrgCancel = () => {
    setShowOrgPopup(false);
    setShowEmpOrgPopup(false);
    setShowSearchOrgPopup(false);
    setShowUserPopup(false);
    setSelectedId(null);
    setSelectedRowData(null);
  };

  const handleDelete = (rowData) => {
    setTimeout(() => {
      if (rowData.isAdded === "Y") {
        setData((prevData) => prevData.filter((r) => r.ID !== rowData.ID));
      } else {
        const newIsDeleted = rowData.isDeleted === "Y" ? "N" : "Y";
        setData((prevData) =>
          prevData.map((r) =>
            r.ID === rowData.ID
              ? { ...r, isDeleted: newIsDeleted, isChanged: newIsDeleted === "Y" ? "N" : r.isChanged }
              : r
          )
        );
      }
    }, 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const changedRows = data.filter((row) =>
      (row.isDeleted === "Y" && row.isAdded !== "Y") ||
      (row.isAdded === "Y") ||
      (row.isChanged === "Y" && row.isDeleted === "N")
    );
    if (changedRows.length === 0) {
      errorMsgPopup("변경된 데이터가 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const promises = changedRows.map(async (row) => {
        let pGUBUN = "";
        if (row.isDeleted === "Y" && row.isAdded !== "Y") {
          pGUBUN = "D";
        } else if (row.isAdded === "Y") {
          pGUBUN = "I";
        } else if (row.isChanged === "Y" && row.isDeleted === "N") {
          pGUBUN = "U";
        }
        const params = {
          pGUBUN,
          pMODULETYPE: row.MODULETYPE || "",
          pAUTHOPERATOR: row.AUTHOPERATOR || "",
          pORGCD: row.ORGCD || "",
          pUPPERYN: "N",
        };
        try {
          const response = await fetchData("oper/moduleorgauth/save", params);
          if (!response.success) {
            throw new Error(response.message || `Failed to ${pGUBUN} auth ${row.ID}`);
          }
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing ${pGUBUN} for ID: ${row.ID}`, error);
          return { ...row, success: false, error: error.message };
        }
      });
      const results = await Promise.all(promises);
      const errors = results.filter((result) => !result.success);
      if (errors.length > 0) {
        errorMsgPopup(`일부 작업이 실패했습니다: ${errors.map((e) => e.error).join(", ")}`);
      } else {
        msgPopup("모든 변경사항이 성공적으로 저장되었습니다.");
        await loadData();
      }
    } catch (err) {
      console.error("Save operation failed:", err);
      errorMsgPopup(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getPgubunForOrgPopup = () => {
    if (showEmpOrgPopup || showOrgPopup) {
      const moduleType = selectedRowData?.MODULETYPE || newAuth.MODULETYPE;
      if (moduleType === "CAR") {
        return "CAREMPNO";
      }
      return "EMPNO";
    }
    return "EMPNO";
  };

  const pGUBUN = useMemo(
    () => getPgubunForOrgPopup(),
    [showEmpOrgPopup, showOrgPopup, showSearchOrgPopup, selectedId, selectedRowData, newAuth.MODULETYPE]
  );

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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "업무조직권한관리.xlsx")}
        buttonStyles={styles}
      >
        <div className={styles.btnGroupCustom}>
          <button className={`${styles.btn} text-bg-primary`} onClick={handleAddClick}>
            추가
          </button>
          <button className={`${styles.btn} text-bg-success`} onClick={handleSave}>
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
        show={showAddPopup}
        onHide={handleAddCancel}
        onConfirm={handleAddConfirm}
        title="권한 추가"
      >
        <div className="mb-3">
          <label className="form-label">입력 유형</label>
          <select
            className={`form-select ${styles.formSelect}`}
            value={newAuth.inputType}
            onChange={(e) => setNewAuth({ ...newAuth, inputType: e.target.value, EMPNO: "", EMPORG: "", AUTHOPERATOR: "" })}
          >
            <option value="EMP">담당자</option>
            <option value="ORG">담당조직</option>
          </select>
        </div>
        {newAuth.inputType === "EMP" && (
          <div className="mb-3">
            <label className="form-label">담당자</label>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="text"
                className={`form-control ${styles.formControl}`}
                value={newAuth.EMPORG}
                readOnly
                placeholder="담당자를 선택하세요"
                style={{ width: "150px", height: "30px", backgroundColor: "#f0f0f0", color: "#000000" }}
              />
              <button
                className={`btn btn-sm ${styles.popupIcon}`}
                onClick={() => {
                  setShowUserPopup(true);
                }}
                style={{ width: "30px", height: "30px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f0f0", color: "#000000" }}
              >
                +
              </button>
            </div>
          </div>
        )}
        {newAuth.inputType === "ORG" && (
          <div className="mb-3">
            <label className="form-label">담당조직</label>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="text"
                className={`form-control ${styles.formControl}`}
                value={newAuth.EMPORG}
                readOnly
                placeholder="조직 선택"
                style={{ width: "150px", height: "30px", backgroundColor: "#f0f0f0", color: "#000000" }}
              />
              <button
                className={`btn btn-sm ${styles.popupIcon}`}
                onClick={() => {
                  setTimeout(() => setShowEmpOrgPopup(true), 0);
                }}
                style={{ width: "30px", height: "30px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f0f0", color: "#000000" }}
              >
                +
              </button>
            </div>
          </div>
        )}
        <div className="mb-3">
          <label className="form-label">업무</label>
          <select
            className={`form-select ${styles.formSelect}`}
            value={newAuth.MODULETYPE}
            onChange={(e) => {
              setNewAuth({ ...newAuth, MODULETYPE: e.target.value });
            }}
          >
            <option value="CAR">차량관리</option>
            <option value="STANDARD">표준활동관리</option>
            <option value="RENTAL">렌탈관리</option>
            <option value="TOOL">공기구관리</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">권한조직</label>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="text"
              className={`form-control ${styles.formControl}`}
              value={newAuth.ORGNM}
              readOnly
              placeholder="조직 선택"
              style={{ width: "150px", height: "30px", backgroundColor: "#f0f0f0", color: "#000000" }}
            />
            <button
              className={`btn btn-sm ${styles.popupIcon}`}
              onClick={() => {
                setShowOrgPopup(true);
              }}
              style={{ width: "30px", height: "30px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f0f0", color: "#000000" }}
            >
              +
            </button>
          </div>
        </div>
      </CommonPopup>
      <CommonPopup
        show={showOrgPopup || showEmpOrgPopup || showSearchOrgPopup}
        onHide={handleOrgCancel}
        onConfirm={() => {}}
        title="조직 선택"
      >
        <OrgSearchPopup
          onClose={handleOrgCancel}
          onConfirm={handleOrgConfirm}
          initialSelectedOrgs={initialSelectedOrgs}
          pGUBUN={pGUBUN}
          isMulti={showEmpOrgPopup ? false : true}
        />
      </CommonPopup>
      <CommonPopup
        show={showUserPopup}
        onHide={handleOrgCancel}
        onConfirm={() => {}}
        title="사용자 선택"
      >
        <UserSearchPopup
          onClose={handleOrgCancel}
          onConfirm={handleUserConfirm}
        />
      </CommonPopup>
    </div>
  );
};

export default ModuleOrgAuthInfo;
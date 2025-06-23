import React, { useState, useEffect, useRef } from "react";
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

const fn_CellText = { editor: "input", editable: true };
const fn_CellNumber = { editor: "number", editorParams: { min: 0 }, editable: true };
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
  const rowId = cell.getRow().getData().MENUID;
  const newValue = cell.getValue();
  if (field === "MENUNM") {
    const validation = common.validateVarcharLength(newValue, 100, "메뉴명");
    if (!validation.valid) {
      errorMsgPopup(validation.error);
      return;
    }
  } else if (field === "URL") {
    const validation = common.validateVarcharLength(newValue, 250, "URL");
    if (!validation.valid) {
      errorMsgPopup(validation.error);
      return;
    }
  }
  setTimeout(() => {
    setData((prevData) =>
      prevData.map((row) => {
        if (String(row.MENUID) === String(rowId)) {
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

const fn_FormatUpperMenu = (cell, _ignored, formatMenuName) => {
  const rowData = cell.getRow().getData();
  const tableData = cell.getTable().getData();
  const parent = tableData.find((item) => String(item.MENUID) === String(rowData.UPPERMENUID));
  return parent ? formatMenuName(parent.MENUNM, parent.MENULEVEL) : "없음";
};

/**
 * 필드 옵션 데이터를 반환
 * @param {string} fieldId - 필드 식별자
 * @returns {Array} 옵션 배열
 */
const getFieldOptions = (fieldId) => {
  const optionsMap = {
    USEYN: [
      { value: '', label: '전체' },
      { value: 'Y', label: '사용' },
      { value: 'N', label: '미사용' },
    ],
  };
  return optionsMap[fieldId] || [];
};

const MenuManageInfo = () => {
  const { user } = useStore();
  const navigate = useNavigate();

  const searchConfig = {
    areas: [
      {
        type: 'search',
        fields: [
          { id: 'MENUNM', type: 'text', row: 1, label: '메뉴명', labelVisible: true, placeholder: '메뉴명 검색', maxLength: 100, width: '200px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
          { id: 'USEYN', type: 'select', row: 1, label: '사용', labelVisible: true, options: getFieldOptions('USEYN'), width: '150px', height: '30px', backgroundColor: '#ffffff', color: '#000000', enabled: true },
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
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "MENUNM", label: "메뉴명" }, { value: "URL", label: "URL" }, { value: "USEYN", label: "사용" }] },
    { id: "filterText", label: "", type: "text", placeholder: "찾을 내용을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showUpperMenuPopup, setShowUpperMenuPopup] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [newMenu, setNewMenu] = useState({ MENUNM: "", UPPERMENUID: "", URL: "", MENULEVEL: "1", LEAFMENUYN: "Y", MENUORDER: "", USEYN: "Y" });
  const [imsiCounter, setImsiCounter] = useState(1);
  const [rowCount, setRowCount] = useState(0);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const formatMenuName = (menuName, level) => (level <= 1 ? menuName : `${"  ".repeat(level - 1)}└${menuName}`);

  const columns = [
    { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업", field: "actions", width: 80, visible: true, ...fn_CellButton("삭제", `btn-danger ${styles.deleteButton}`, (rowData) => handleDelete(rowData)) },
    {
      frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업대상", field: "applyTarget", sorter: "string", width: 100,
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
                if (row.MENUID === rowData.MENUID) {
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
    { headerHozAlign: "center", hozAlign: "center", title: "ID", field: "MENUID", sorter: "string", width: 100 },
    { headerHozAlign: "center", hozAlign: "left", title: "메뉴명", field: "MENUNM", sorter: "string", width: 200, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "MENUNM", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "상위메뉴", field: "UPPERMENUID", sorter: "string", width: 120, formatter: (cell) => fn_FormatUpperMenu(cell, data, formatMenuName), cellClick: (e, cell) => { setSelectedMenuId(cell.getRow().getData().MENUID); setNewMenu({ ...newMenu, UPPERMENUID: cell.getRow().getData().UPPERMENUID || "" }); setShowUpperMenuPopup(true); } },
    { headerHozAlign: "center", hozAlign: "left", title: "URL", field: "URL", sorter: "string", width: 300, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "URL", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "레벨", field: "MENULEVEL", sorter: "number", width: 80, editable: false },
    { headerHozAlign: "center", hozAlign: "center", title: "하위포함", field: "LEAFMENUYN", sorter: "string", width: 100, ...fn_CellSelect(["Y", "N"]), cellEdited: (cell) => fn_HandleCellEdit(cell, "LEAFMENUYN", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "순서", field: "MENUORDER", sorter: "number", width: 80, ...fn_CellNumber, cellEdited: (cell) => fn_HandleCellEdit(cell, "MENUORDER", setData, tableInstance) },
    { headerHozAlign: "center", hozAlign: "center", title: "사용", field: "USEYN", sorter: "string", width: 80, ...fn_CellSelect(["Y", "N"]), cellEdited: (cell) => fn_HandleCellEdit(cell, "USEYN", setData, tableInstance) },
  ];

  const loadData = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = {
        MENUNM: filters.MENUNM || "",
        USEYN: filters.USEYN || "",
        DEBUG: "F"
      };
      const response = await fetchData("oper/menumng/list", params );
      if (!response.success) {
        errorMsgPopup(response.message || "메뉴 데이터를 가져오는 중 오류가 발생했습니다.");
        setData([]);
        return;
      }
      if (response.errMsg !== "") {
        setData([]);
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      const leveledData = responseData.map((row) => ({
        ...row,
        MENULEVEL: calculateMenuLevel(row, responseData),
        MENUORDER: Number(row.MENUORDER),
        isDeleted: "N",
        isEdited: "N",
        isAdded: "N",
      }));
      setData(leveledData);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      errorMsgPopup(err.response?.data?.message || "메뉴 데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMenuLevel = (row, data, visited = new Set()) => {
    if (!row.UPPERMENUID) return 1;
    if (visited.has(row.MENUID)) return 1;
    visited.add(row.MENUID);
    const parent = data.find((item) => item.MENUID === row.UPPERMENUID);
    return parent ? calculateMenuLevel(parent, data, visited) + 1 : 1;
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
            { field: "MENUNM", type: "like", value: filterText },
            { field: "URL", type: "like", value: filterText },
            { field: "USEYN", type: "like", value: filterText },
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
    if (eventType === 'search') {
      loadData();
    }
  };

  const handleAddClick = () => {
    setNewMenu({ MENUNM: "", UPPERMENUID: "", URL: "", MENULEVEL: "1", LEAFMENUYN: "Y", MENUORDER: "", USEYN: "Y" });
    setShowAddPopup(true);
  };

  const handleAddConfirm = () => {
    const menuNameValidation = common.validateVarcharLength(newMenu.MENUNM, 100, "메뉴명");
    if (!menuNameValidation.valid) {
      errorMsgPopup(menuNameValidation.error);
      return;
    }
    const urlValidation = common.validateVarcharLength(newMenu.URL, 250, "URL");
    if (!urlValidation.valid) {
      errorMsgPopup(urlValidation.error);
      return;
    }
    if (!newMenu.MENUNM.trim()) {
      errorMsgPopup("메뉴명을 입력해주세요.");
      return;
    }
    if (!newMenu.MENUORDER || isNaN(newMenu.MENUORDER)) {
      errorMsgPopup("메뉴 순서를 숫자로 입력해주세요.");
      return;
    }
    const newMenuId = `IMSI${String(imsiCounter).padStart(4, "0")}`;
    const newRow = {
      MENUID: newMenuId,
      MENUNM: newMenu.MENUNM,
      UPPERMENUID: newMenu.UPPERMENUID,
      URL: newMenu.URL,
      MENULEVEL: newMenu.MENULEVEL,
      LEAFMENUYN: newMenu.LEAFMENUYN,
      MENUORDER: parseInt(newMenu.MENUORDER),
      USEYN: newMenu.USEYN,
      isDeleted: "N",
      isEdited: "N",
      isAdded: "Y",
    };
    setData((prevData) => [newRow, ...prevData]);
    setImsiCounter((prev) => prev + 1);
    setShowAddPopup(false);
    setNewMenu({ MENUNM: "", UPPERMENUID: "", URL: "", MENULEVEL: "1", LEAFMENUYN: "Y", MENUORDER: "", USEYN: "Y" });
  };

  const handleAddCancel = () => {
    setShowAddPopup(false);
    setNewMenu({ MENUNM: "", UPPERMENUID: "", URL: "", MENULEVEL: "1", LEAFMENUYN: "Y", MENUORDER: "", USEYN: "Y" });
  };

  const handleUpperMenuConfirm = () => {
    if (!selectedMenuId) return;
    const newUpperMenuId = newMenu.UPPERMENUID;
    const newLevel = newUpperMenuId
      ? calculateMenuLevel({ UPPERMENUID: newUpperMenuId, MENUID: selectedMenuId }, data)
      : 1;
    setData((prevData) =>
      prevData.map((row) => {
        if (row.MENUID === selectedMenuId) {
          const updatedRow = {
            ...row,
            UPPERMENUID: newUpperMenuId,
            MENULEVEL: newLevel,
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
    setShowUpperMenuPopup(false);
    setSelectedMenuId(null);
    setNewMenu({ MENUNM: "", UPPERMENUID: "", URL: "", MENULEVEL: "1", LEAFMENUYN: "Y", MENUORDER: "", USEYN: "Y" });
  };

  const handleUpperMenuCancel = () => {
    setShowUpperMenuPopup(false);
    setSelectedMenuId(null);
    setNewMenu({ MENUNM: "", UPPERMENUID: "", URL: "", MENULEVEL: "1", LEAFMENUYN: "Y", MENUORDER: "", USEYN: "Y" });
  };

  const handleDelete = (rowData) => {
    setTimeout(() => {
      if (rowData.isAdded === "Y") {
        setData((prevData) => prevData.filter((r) => r.MENUID !== rowData.MENUID));
      } else {
        const newIsDeleted = rowData.isDeleted === "Y" ? "N" : "Y";
        setData((prevData) =>
          prevData.map((r) =>
            r.MENUID === rowData.MENUID
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
          pMENUID: row.MENUID,
          pMENUNM: row.MENUNM || "",
          pUPPERMENUID: row.UPPERMENUID || "",
          pURL: row.URL || "",
          pMENULEVEL: String(row.MENULEVEL) || "1",
          pMENUORDER: String(row.MENUORDER) || "",
          pUSEYN: row.USEYN || "Y",
        };
        try {
          const response = await fetchData("oper/menumng/save", params );
          if (!response.success) {
            throw new Error(response.message || `Failed to ${pGUBUN} menu ${row.MENUID}`);
          }
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing ${pGUBUN} for MENUID: ${row.MENUID}`, error);
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
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "메뉴관리.xlsx")}
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
        title="메뉴 추가"
      >
        <div className="mb-3">
          <label className="form-label">메뉴명</label>
          <input
            type="text"
            className={`form-control ${styles.formControl}`}
            value={newMenu.MENUNM}
            onChange={(e) => setNewMenu({ ...newMenu, MENUNM: e.target.value })}
            placeholder="메뉴명을 입력하세요"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">상위메뉴</label>
          <select
            className={`form-select ${styles.formSelect}`}
            value={newMenu.UPPERMENUID}
            onChange={(e) => {
              const upperMenuId = e.target.value;
              const newLevel = upperMenuId
                ? calculateMenuLevel({ UPPERMENUID: upperMenuId, MENUID: "temp" }, data)
                : 1;
              setNewMenu({ ...newMenu, UPPERMENUID: upperMenuId, MENULEVEL: String(newLevel) });
            }}
          >
            <option value="">없음</option>
            {data
              .filter((row) => row.MENUID !== newMenu.MENUID)
              .map((row) => (
                <option key={row.MENUID} value={row.MENUID}>
                  {formatMenuName(row.MENUNM, row.MENULEVEL)}
                </option>
              ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">URL</label>
          <input
            type="text"
            className={`form-control ${styles.formControl}`}
            value={newMenu.URL}
            onChange={(e) => setNewMenu({ ...newMenu, URL: e.target.value })}
            placeholder="URL을 입력하세요"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">메뉴순서</label>
          <input
            type="number"
            className={`form-control ${styles.formControl}`}
            value={newMenu.MENUORDER}
            onChange={(e) => setNewMenu({ ...newMenu, MENUORDER: e.target.value })}
            placeholder="메뉴 순서를 입력하세요"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">하위포함</label>
          <select
            className={`form-select ${styles.formSelect}`}
            value={newMenu.LEAFMENUYN}
            onChange={(e) => setNewMenu({ ...newMenu, LEAFMENUYN: e.target.value })}
          >
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">사용</label>
          <select
            className={`form-select ${styles.formSelect}`}
            value={newMenu.USEYN}
            onChange={(e) => setNewMenu({ ...newMenu, USEYN: e.target.value })}
          >
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </div>
      </CommonPopup>
      <CommonPopup
        show={showUpperMenuPopup}
        onHide={handleUpperMenuCancel}
        onConfirm={handleUpperMenuConfirm}
        title="상위메뉴 선택"
      >
        <div className="mb-3">
          <label className="form-label">상위메뉴</label>
          <select
            className={`form-select ${styles.formSelect}`}
            value={newMenu.UPPERMENUID}
            onChange={(e) => setNewMenu({ ...newMenu, UPPERMENUID: e.target.value })}
          >
            <option value="">없음</option>
            {data
              .filter((row) => row.MENUID !== selectedMenuId)
              .map((row) => (
                <option key={row.MENUID} value={row.MENUID}>
                  {formatMenuName(row.MENUNM, row.MENULEVEL)}
                </option>
              ))}
          </select>
        </div>
      </CommonPopup>
    </div>
  );
};

export default MenuManageInfo;
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
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import common from "../../utils/common";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";

const getFieldOptions = (fieldId) => {
  const optionsMap = {
    GU: [
      { value: "TITLE", label: "제목" },
    ],
  };
  return optionsMap[fieldId] || [];
};

const fn_CellText = { editor: "input", editable: true };
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
  const rowId = cell.getRow().getData().FILEID;
  const newValue = cell.getValue();
  if (field === "TITLE") {
    const validation = common.validateVarcharLength(newValue, 100, "제목");
    if (!validation.valid) {
      errorMsgPopup(validation.error);
      return;
    }
  }
  setTimeout(() => {
    setData((prevData) =>
      prevData.map((row) => {
        if (String(row.FILEID) === String(rowId)) {
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

const ExcelUploadTemplateManage = () => {
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
        ]
      },
      {
        type: 'buttons',
        fields: [
          { id: 'searchBtn', type: 'button', row: 1, label: '검색', eventType: 'search', width: '80px', height: '30px', backgroundColor: '#00c4b4', color: '#ffffff', enabled: true },
        ]
      }
    ]
  };

  const filterTableFields = [
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "TITLE", label: "제목" }, { value: "FILENM", label: "파일명" }]},
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ];

  const [filters, setFilters] = useState(initialFilters(searchConfig.areas.find((area) => area.type === 'search').fields));
  const [tableFilters, setTableFilters] = useState(initialFilters(filterTableFields));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [isSearched, setIsSearched] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ TITLE: "", FILES: [] });

  useEffect(() => {
    if (!user || !hasPermission(user.auth, "userAuthManage")) window.location.href = "/";
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
            visible: true, 
            ...fn_CellButton("삭제", `btn-danger ${styles.deleteButton}`, (rowData) => handleDelete(rowData)) 
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
                      if (row.FILEID === rowData.FILEID) {
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
            }
          },
          { headerHozAlign: "center", hozAlign: "center", title: "파일ID", field: "FILEID", sorter: "number", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "left", title: "제목", field: "TITLE", sorter: "string", width: 200, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "TITLE", setData, tableInstance) },
          { headerHozAlign: "center", hozAlign: "center", title: "파일명", field: "FILENM", sorter: "string", width: 200, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "파일타입", field: "FILETYPE", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "right", title: "파일용량", field: "FILESIZE", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "등록일", field: "REGEDT", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "등록자", field: "REGEDBY", sorter: "string", width: 100, editable: false },
        ], [], {
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
          { field: "TITLE", type: "like", value: filterText },
          { field: "FILENM", type: "like", value: filterText },
        ], "or");
      } else {
        tableInstance.current.clearFilter();
      }
    } else {
      tableInstance.current.clearFilter();
    }
  }, [tableFilters, tableStatus, loading]);

  const handleUploadCancel = () => {
    setShowAddPopup(false);
    setNewTemplate({ TITLE: "", FILES: [] });
  };

  const handleDynamicEvent = (eventType) => {
    if (eventType === 'search') handleSearch();
    else if (eventType === 'showAddPopup') setShowAddPopup(true);
  };

  const handleSearch = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = { pGUBUN: "LIST", pTITLE: filters.searchText || "", pFILEID: "", pRPTCD: "", pDEBUG: "F" };
      const response = await fetchData("excelupload/template/filelist", params);
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
      setData(responseData.map(row => ({ ...row, isChanged: "N", isDeleted: "N", isAdded: "N" })));
    } catch (err) {
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!newTemplate.TITLE.trim()) {
      return { error: "제목을 입력해주세요." };
    }
    if (!newTemplate.FILES.length) {
      return { error: "파일을 선택해 주세요." };
    }
    const formData = new FormData();
    formData.append("gubun", "I");
    formData.append("fileId", "0");
    formData.append("title", newTemplate.TITLE);
    newTemplate.FILES.forEach((file) => {
      formData.append("files", file);
    });
    try {
      const result = await fetchFileUpload("excelupload/template/fileupload", formData);
      if (result.errCd !== "00") {
        return { error: result.errMsg || "파일 업로드 실패" };
      }
      return { success: "파일 업로드를 성공했습니다." };
    } catch (error) {
      return { error: "파일 업로드 중 오류가 발생했습니다: " + error.message };
    }
  };

  const handleDelete = (rowData) => {
    setTimeout(() => {
      if (rowData.isAdded === "Y") {
        setData((prevData) => prevData.filter((r) => r.FILEID !== rowData.FILEID));
      } else {
        const newIsDeleted = rowData.isDeleted === "Y" ? "N" : "Y";
        setData((prevData) =>
          prevData.map((r) =>
            r.FILEID === rowData.FILEID
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
          gubun: pGUBUN,
          fileId: row.FILEID.toString(),
          title: row.TITLE || "",
        };

        try {
          const response = await fetchData("excelupload/template/filesave", params );
          if (!response.success) {
            throw new Error(response.message || `Failed to ${pGUBUN} file ${row.FILEID}`);
          }
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing ${pGUBUN} for FILEID: ${row.FILEID}`, error);
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
      console.error("Save operation failed:", err);
      errorMsgPopup(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
      <TableSearch 
        filterFields={filterTableFields} 
        filters={tableFilters} 
        setFilters={setTableFilters} 
        rowCount={rowCount} 
        onDownloadExcel={() => handleDownloadExcel(tableInstance.current, tableStatus, "템플릿관리.xlsx")} 
        buttonStyles={styles}
      >
        <div className={styles.btnGroupCustom}>
          <button
            className={`${styles.btn} text-bg-primary`}
            onClick={() => handleDynamicEvent('showAddPopup')}
          >
            추가
          </button>
          <button 
            className={`${styles.btn} text-bg-success`} 
            onClick={handleSave}
          >
            저장
          </button>
        </div>
      </TableSearch>
      <div className={styles.tableWrapper}>
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        {loading && <div>로딩 중...</div>}
        <div ref={tableRef} className={styles.tableSection} style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }} />
      </div>
      <CommonPopup
        show={showAddPopup}
        onHide={handleUploadCancel}
        title="템플릿 추가"
        requiresConfirm={true} // Enable confirmation for "템플릿추가"
        confirmMessage="템플릿을 추가하시겠습니까?" // Custom confirmation message
        buttons={[
          { label: "닫기", className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`, action: handleUploadCancel },
          {
            label: "템플릿추가",
            className: `${styles.btn} ${styles.btnPrimary} btn text-bg-success`,
            action: () => handleUpload().then((result) => ({ result, onSuccess: handleSearch })),
          },
        ]}
      >
        <div className="mb-3">
          <label className="form-label">제목</label>
          <input
            type="text"
            className={`form-control ${styles.formControl}`}
            value={newTemplate.TITLE}
            onChange={(e) => setNewTemplate({ ...newTemplate, TITLE: e.target.value })}
            placeholder="템플릿 제목을 입력하세요"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">파일</label>
          <input
            type="file"
            className={`form-control ${styles.formControl}`}
            accept=".xlsx,.xls"
            multiple
            onChange={(e) => {
              const selectedFiles = Array.from(e.target.files || []);
              setNewTemplate({ ...newTemplate, FILES: selectedFiles });
            }}
          />
        </div>
      </CommonPopup>
    </div>
  );
};

export default ExcelUploadTemplateManage;
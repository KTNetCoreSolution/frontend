import React, { useState, useEffect, useRef } from "react";
import useStore from "../../store/store";
import MainSearch from "../../components/main/MainSearch";
import TableSearch from "../../components/table/TableSearch";
import { createTable } from "../../utils/tableConfig";
import { initialFilters } from "../../utils/tableEvent";
import styles from "../../components/table/TableSearch.module.css";
import CommonPopup from "../../components/popup/CommonPopup";
import { fetchData, fetchFileUpload } from "../../utils/dataUtils";
import common from "../../utils/common";
import { errorMsgPopup } from "../../utils/errorMsgPopup";
import { msgPopup } from "../../utils/msgPopup";
import ImageViewPopup from '../../components/popup/ImageViewPopup';
import fileUtils from '../../utils/fileUtils';

const getFieldOptions = (fieldId) => {
  const optionsMap = {
    TYPE: [
      { value: "승용차", label: "승용차" },
      { value: "승합차", label: "승합차" },
      { value: "특수차", label: "특수차" },
      { value: "화물차", label: "화물차" },
    ],
    CLASS: [
      { value: "RV형", label: "RV형" },
      { value: "경형", label: "경형" },
      { value: "소형", label: "소형" },
      { value: "중형", label: "중형" },
    ],
    SIZE: [
      { value: "1톤", label: "1톤" },
      { value: "1톤미만", label: "1톤미만" },
      { value: "2.5톤", label: "2.5톤" },
      { value: "2인", label: "2인" },
      { value: "4인", label: "4인" },
      { value: "5인", label: "5인" },
      { value: "9인", label: "9인" },
      { value: "3밴", label: "3밴" },
      { value: "5밴", label: "5밴" },
      { value: "6밴", label: "6밴" },
    ],
  };
  return optionsMap[fieldId] || [];
};

const fn_CellText = { editor: "input", editable: true };
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

const fn_CellImageView = (onClick) => ({
  formatter: (cell) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.gap = "5px";
    div.style.cursor = "pointer";
    div.onclick = () => onClick(cell.getData());

    const span = document.createElement("span");
    span.innerText = cell.getData().IMGNM || "";

    div.appendChild(span);
    return div;
  },
});

const fn_HandleCellEdit = (cell, field, setData, tableInstance) => {
  const rowId = cell.getRow().getData().CARCD;
  const newValue = cell.getValue();
  if (field === "CARNM") {
    const validation = common.validateVarcharLength(newValue, 20, "차명");
    if (!validation.valid) {
      errorMsgPopup(validation.error);
      return;
    }
  }
  setTimeout(() => {
    setData((prevData) =>
      prevData.map((row) => {
        if (String(row.CARCD) === String(rowId)) {
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

const CarCodeManage = () => {
  const { user } = useStore();
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const isInitialRender = useRef(true);

  const searchConfig = {
    areas: [
      {
        type: 'search',
        fields: [],
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
    { id: "filterSelect", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "CARNM", label: "차명" }, { value: "IMGNM", label: "이미지명" }]},
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
  const [newCodeInfo, setNewCodeInfo] = useState({CARTYPE: '', CARCLASS: '', CARSIZE: '', CARNM: '', FILES: [] });
  const [selectedImage, setSelectedImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const showImagePopup = (rowData) => {
    if (rowData.CARCD !== '' && rowData.IMGNM !== '' ) {
      handleImageClick(rowData.CARCD);
    }
  };

  const closeImagePopup = () => {
    setSelectedImage(null);
    setZoomLevel(1);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.1));
  };

  const handleImageClick = async (carcd) => {
    try {
      const params = { pCARCD: carcd, pDEBUG: "F" };
      const result = await fetchData('carcode/CarCodeImage', params);

      if (result.errCd === '00' && result.data.length > 0) {
        const extension = fileUtils.getFileExtension(result.data[0].IMGNM)?.toLowerCase();
        const mimeType = fileUtils.mimeTypes[extension] || 'application/octet-stream';
        const fileData = result.data[0].IMGDATA;

        const dataUrl = `data:${mimeType};base64,${fileData}`;
        setSelectedImage({ src: dataUrl, fileName: result.data[0].IMGNM });
      } else {
        console.error('Failed to fetch image details:', result.errMsg);
        errorMsgPopup('이미지를 불러오지 못했습니다.');
      } 
    } catch (error) {
      console.error('Error fetching image details:', error);
      errorMsgPopup('이미지를 불러오는 중 오류가 발생했습니다.');
    }
  };

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
                      if (row.CARCD === rowData.CARCD) {
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
          { headerHozAlign: "center", hozAlign: "center", title: "차량코드", field: "CARCD", sorter: "number", width: 100, editable: false, visible: false },
          { headerHozAlign: "center", hozAlign: "center", title: "차종", field: "CARTYPE", sorter: "string", width: 100, ...fn_CellSelect(getFieldOptions('TYPE')), cellEdited: (cell) => fn_HandleCellEdit(cell, "CARTYPE", setData, tableInstance) },
          { headerHozAlign: "center", hozAlign: "center", title: "차형", field: "CARCLASS", sorter: "string", width: 100, ...fn_CellSelect(getFieldOptions('CLASS')), cellEdited: (cell) => fn_HandleCellEdit(cell, "CARCLASS", setData, tableInstance) },
          { headerHozAlign: "center", hozAlign: "center", title: "규모", field: "CARSIZE", sorter: "string", width: 100, ...fn_CellSelect(getFieldOptions('SIZE')), cellEdited: (cell) => fn_HandleCellEdit(cell, "CARSIZE", setData, tableInstance) },
          { headerHozAlign: "center", hozAlign: "left", title: "차명", field: "CARNM", sorter: "string", width: 150, ...fn_CellText, cellEdited: (cell) => fn_HandleCellEdit(cell, "CARNM", setData, tableInstance) },
          { headerHozAlign: "center", hozAlign: "center", title: "이미지명", field: "IMGNM", sorter: "string", width: 200, ...fn_CellImageView((rowData) => showImagePopup(rowData)) },
          { headerHozAlign: "center", hozAlign: "center", title: "이미지타입", field: "IMGTYPE", sorter: "string", width: 100, editable: false },
          { headerHozAlign: "center", hozAlign: "right", title: "이미지용량", field: "IMGSIZE", sorter: "string", width: 100, editable: false },
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
          { field: "CARNM", type: "like", value: filterText },
          { field: "IMGSIZE", type: "like", value: filterText },
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
    setNewCodeInfo({ FILES: [] });
  };

  const handleDynamicEvent = (eventType) => {
    if (eventType === 'search') handleSearch();
    else if (eventType === 'showAddPopup') setShowAddPopup(true);
  };

  const handleSearch = async () => {
    setLoading(true);
    setIsSearched(true);
    try {
      const params = { pDEBUG: "F" };
      const response = await fetchData("carcode/codeInfoList", params);
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
    if (!newCodeInfo.CARTYPE) {
      return { error: "차종을 선택해 주세요." };
    }
    else if (!newCodeInfo.CARCLASS) {
      return { error: "차형을 선택해 주세요." };
    }
    else if (!newCodeInfo.CARSIZE) {
      return { error: "규모를 선택해 주세요." };
    }
    else if (!newCodeInfo.CARNM) {
      return { error: "차명을 입력해 주세요" };
    }
    else if (!newCodeInfo.FILES.length) {
      return { error: "이미지를 선택해 주세요." };
    }
    const formData = new FormData();
    formData.append("gubun", "I");
    formData.append("CARCD", "");
    formData.append("CARTYPE", newCodeInfo.CARTYPE);
    formData.append("CARCLASS", newCodeInfo.CARCLASS);
    formData.append("CARSIZE", newCodeInfo.CARSIZE);
    formData.append("CARNM", newCodeInfo.CARNM);
    newCodeInfo.FILES.forEach((file) => {
      formData.append("files", file);
    });
    try {
      const result = await fetchFileUpload("carcode/carCodeInfoUpload", formData);
      if (result.errCd !== "00") {
        return { error: result.errMsg || "이미지 업로드 실패" };
      }

      setShowAddPopup(false);
      setNewCodeInfo([]);
      msgPopup("이미지 업로드를 성공했습니다.");
      await handleSearch();

      return { success: "이미지 업로드를 성공했습니다." };
    } catch (error) {
      return { error: "이미지 업로드 중 오류가 발생했습니다: " + error.message };
    }
  };

  const handleDelete = (rowData) => {
    setTimeout(() => {
      if (rowData.isAdded === "Y") {
        setData((prevData) => prevData.filter((r) => r.CARCD !== rowData.CARCD));
      } else {
        const newIsDeleted = rowData.isDeleted === "Y" ? "N" : "Y";
        setData((prevData) =>
          prevData.map((r) =>
            r.CARCD === rowData.CARCD
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
          CARCD: row.CARCD.toString(),
          CARTYPE: row.CARTYPE.toString(),
          CARCLASS: row.CARCLASS.toString(),
          CARSIZE: row.CARSIZE.toString(),
          CARNM: row.CARNM.toString(),
        };

        try {
          const response = await fetchData("carcode/carCodeInfoSave", params );
          if (!response.success) {
            throw new Error(response.message || `Failed to ${pGUBUN} file ${row.CARCD}`);
          }
          return { ...row, success: true };
        } catch (error) {
          console.error(`Error processing ${pGUBUN} for CARCD: ${row.CARCD}`, error);
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
    <div className='container'>
      <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
      
      <TableSearch 
        filterFields={filterTableFields} 
        filters={tableFilters} 
        setFilters={setTableFilters} 
        rowCount={rowCount} 
        buttonStyles={styles}
        excelYn={'N'}
      >
        <div className='btnGroupCustom'>
          <button
            className='btn btn-secondary'
            onClick={() => handleDynamicEvent('showAddPopup')}
          >
            추가
          </button>
          <button 
            className='btn btn-primary'
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
        title="차량정보 추가"
        requiresConfirm={true} // Enable confirmation for "템플릿추가"
        confirmMessage="차량정보를 추가하시겠습니까?" // Custom confirmation message
        buttons={[
          { label: "닫기", className: `${styles.btn} ${styles.btnSecondary} btn btn-secondary`, action: handleUploadCancel },
          {
            label: "차량정보 추가",
            className: `${styles.btn} ${styles.btnPrimary} btn text-bg-success`,
            action: () => handleUpload().then((result) => ({ result, onSuccess: handleSearch })),
          },
        ]}
      >
        <div className='formColWrap'>
          <div className='formGroup'>
            <label className="form-label w40">차종</label>
            <select className={`form-select ${styles.formSelect}`}
              onChange={(e) => {
                setNewCodeInfo({ ...newCodeInfo, CARTYPE: e.target.value });
              }}
            >
              <option value="all">선택</option>
              {getFieldOptions('TYPE').map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
            </select>
          </div>
          <div className='formGroup'>
            <label className="form-label w40">차형</label>
            <select className={`form-select ${styles.formSelect}`}
              onChange={(e) => {
                setNewCodeInfo({ ...newCodeInfo, CARCLASS: e.target.value });
              }}
            >
              <option value="all">선택</option>
              {getFieldOptions('CLASS').map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
            </select>
          </div>
          <div className='formGroup'>
            <label className="form-label w40">규모</label>
            <select className={`form-select ${styles.formSelect}`}
              onChange={(e) => {
                setNewCodeInfo({ ...newCodeInfo, CARSIZE: e.target.value });
              }}
            >
              <option value="all">선택</option>
              {getFieldOptions('SIZE').map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
            </select>
          </div>
          <div className='formGroup'>
            <label className="form-label w40">차명</label>
            <input type="text" className={`form-control ${styles.formControl}`} placeholder="차량명 입력" 
              onChange={(e) => {
                setNewCodeInfo({ ...newCodeInfo, CARNM: e.target.value });
              }}
            />
          </div>
          <div className='formGroup'>
            <label className="form-label w40">이미지</label>
            <input
              type="file"
              className={`form-control ${styles.formControl}`}
              accept="image/*"
              multiple
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                setNewCodeInfo({ ...newCodeInfo, FILES: selectedFiles });
              }}
            />
          </div>
        </div>
      </CommonPopup>
      {selectedImage && <ImageViewPopup
        imageSrc={selectedImage.src}
        fileName={selectedImage.fileName}
        onClose={closeImagePopup}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />}
    </div>
  );
};

export default CarCodeManage;
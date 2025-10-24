import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import { initialFilters } from '../../../utils/tableEvent';
import { handleDownloadExcel } from '../../../utils/tableExcel';
import TableSearch from '../../../components/table/TableSearch';
import { fetchData } from '../../../utils/dataUtils';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import styles from './RentalProductPopup.module.css';

const RentalProductPopup = ({ show, onHide, data: classData, onSave }) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [filters, setFilters] = useState(initialFilters([
    { id: "filterSelect", label: "", type: "select", options: [
      { value: "", label: "선택" },
      { value: "CLASSNM", label: "분류명" },
      { value: "PRODUCTNM", label: "상품명" },
      { value: "MODELNM", label: "모델명" }
    ] },
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" }
  ]));
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [data, setData] = useState([]);
  const [selectedClassCd, setSelectedClassCd] = useState('all');
  const [tableBuilt, setTableBuilt] = useState(false);

  const classOptions = classData && Array.isArray(classData)
    ? [{ value: 'all', label: '==분류==' }, ...new Map(classData.map(item => [item.DDLCD, { value: item.DDLCD, label: item.DDLNM }])).values()]
    : [{ value: 'all', label: '==분류==' }];

  const loadData = async (classCd = 'all') => {
    setTableStatus("loading");
    try {
      const params = {
        pGUBUN: 'LIST2',
        pCLASSCD: classCd,
        pDEBUG: 'F'
      };
      const response = await fetchData('rental/productInfo/list', params);
      if (!response.success) {
        errorMsgPopup(response.message || '데이터를 가져오는 중 오류가 발생했습니다.');
        setData([]);
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      const dataWithSelect = responseData.map((item, index) => ({
        ...item,
        seq: index + 1,
        select: "N"
      }));
      setData(dataWithSelect);
      if (tableInstance.current && tableStatus !== 'error') {
        tableInstance.current.setData(dataWithSelect);
        setRowCount(dataWithSelect.length);
      }
      setTableStatus("ready");
    } catch (err) {
      setTableStatus("error");
      errorMsgPopup('데이터 로드 실패:', err);
      console.error('데이터 로드 실패:', err);
      setData([]);
    }
  };

  useEffect(() => {
    if (show) {
      loadData(selectedClassCd);
    } else {
      setData([]);
      setTableStatus("initializing");
      setRowCount(0);
    }
  }, [show, selectedClassCd]);

  useEffect(() => {
    if (!show || !tableRef.current) return;

    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        setTableStatus("error");
        return;
      }
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
      }
      try {
        tableInstance.current = createTable(tableRef.current, [
          {
            frozen: true,
            headerHozAlign: "center",
            hozAlign: "center",
            title: "선택",
            field: "select",
            width: 80,
            formatter: (cell) => {
              const rowData = cell.getRow().getData();
              const div = document.createElement("div");
              div.style.display = "flex";
              div.style.alignItems = "center";
              div.style.justifyContent = "center";
              div.style.gap = "5px";
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.className = "checkbox-custom";
              checkbox.checked = rowData.select === "Y";
              checkbox.onclick = (e) => {
                e.stopPropagation();
                const updates = tableInstance.current.getData().map((row) => ({
                  seq: row.seq,
                  select: row.seq === rowData.seq ? (row.select === "Y" ? "N" : "Y") : "N",
                }));
                try {
                  tableInstance.current.updateData(updates).catch((err) => {
                    console.error("updateData failed:", err, updates);
                  });
                } catch (err) {
                  console.error("updateData error:", err, updates);
                }
              };
              const span = document.createElement("span");
              span.innerText = "선택";
              span.style.cursor = "pointer";
              span.onclick = (e) => {
                e.stopPropagation();
                const updates = tableInstance.current.getData().map((row) => ({
                  seq: row.seq,
                  select: row.seq === rowData.seq ? (row.select === "Y" ? "N" : "Y") : "N",
                }));
                try {
                  tableInstance.current.updateData(updates).catch((err) => {
                    console.error("updateData failed:", err, updates);
                  });
                } catch (err) {
                  console.error("updateData error:", err, updates);
                }
              };
              div.appendChild(checkbox);
              div.appendChild(span);
              return div;
            },
            editable: false
          },
          { headerHozAlign: 'center', hozAlign: 'center', title: '순번', field: 'ID', sorter: 'string', width: 80, frozen: true, editable: false },
          { headerHozAlign: 'center', hozAlign: 'center', title: '분류코드', field: 'CLASSCD', sorter: 'string', width: 100, editable: false },
          { headerHozAlign: 'center', hozAlign: 'center', title: '분류명', field: 'CLASSNM', sorter: 'string', width: 120, editable: false },
          { headerHozAlign: 'center', hozAlign: 'center', title: '상품코드', field: 'PRODUCTCD', sorter: 'string', width: 100, editable: false },
          { headerHozAlign: 'center', hozAlign: 'center', title: '상품명', field: 'PRODUCTNM', sorter: 'string', width: 150, editable: false },
          { headerHozAlign: 'center', hozAlign: 'left', title: '모델명', field: 'MODELNM', sorter: 'string', width: 400, editable: false },
          { headerHozAlign: 'center', hozAlign: 'left', title: '비고', field: 'MEMO', sorter: 'string', width: 300, editable: false },
        ], [], {
          headerHozAlign: 'center',
          layout: 'fitColumns',
          reactiveData: true,
          index: 'seq',
          tableBuilt: () => {
            setTableBuilt(true);
            setTableStatus("ready");
            if (data.length > 0) {
              tableInstance.current.setData(data);
              setRowCount(data.length);
            }
          }
        });

        tableInstance.current.on("rowClick", (e, row) => {
          const rowData = row.getData();
          const updates = tableInstance.current.getData().map((row) => ({
            seq: row.seq,
            select: row.seq === rowData.seq ? (row.select === "Y" ? "N" : "Y") : "N",
          }));
          try {
            tableInstance.current.updateData(updates).catch((err) => {
              console.error("updateData failed:", err, updates);
            });
          } catch (err) {
            console.error("updateData error:", err, updates);
          }
        });

        if (!tableInstance.current) throw new Error("createTable returned undefined or null");
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
        setTableBuilt(false);
      }
    };
  }, [show]);

  useEffect(() => {
    if (!tableInstance.current || tableStatus !== "ready" || !tableBuilt) return;
    const { filterSelect, filterText } = filters;
    try {
      if (filterText && filterSelect) {
        tableInstance.current.setFilter(filterSelect, "like", filterText);
      } else if (filterText) {
        tableInstance.current.setFilter([
          { field: "CLASSNM", type: "like", value: filterText },
          { field: "PRODUCTNM", type: "like", value: filterText },
          { field: "MODELNM", type: "like", value: filterText }
        ], "or");
      } else {
        tableInstance.current.clearFilter();
      }
      setRowCount(tableInstance.current.getDataCount());
    } catch (err) {
      console.error('필터 적용 실패:', err);
    }
  }, [filters, tableStatus, tableBuilt]);

  const onDownloadExcel = () => {
    handleDownloadExcel(tableInstance.current, tableStatus, "상품관리목록.xlsx");
  };

  const handleClose = () => {
    onHide();
    setSelectedClassCd('all');
  };

  const handleConfirm = () => {
    const selectedData = data.find((row) => row.select === "Y") || null;
    if (onSave) {
      onSave(selectedData ? selectedData : {});
    }
    handleClose();
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>상품 관리</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} modal-body`}>
        <div className={`searchSection`}>
          <div className={styles.searchGroup}>
            <label>분류</label>
            <select value={selectedClassCd} onChange={(e) => setSelectedClassCd(e.target.value)}>
              {classOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <TableSearch
          filterFields={[
            { id: "filterSelect", label: "", type: "select", options: [
              { value: "", label: "선택" },
              { value: "CLASSNM", label: "분류명" },
              { value: "PRODUCTNM", label: "상품명" },
              { value: "MODELNM", label: "모델명" }
            ] },
            { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" }
          ]}
          filters={filters}
          setFilters={setFilters}
          rowCount={rowCount}
          onDownloadExcel={onDownloadExcel}
          buttonStyles={styles}
        />
        <div ref={tableRef} className={styles.tableSection} style={{ height: '400px', visibility: tableStatus !== "ready" ? "hidden" : "visible" }} />
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        {tableStatus === "loading" && <div>로딩 중...</div>}
        {tableStatus === "error" && <div>데이터 로드 실패</div>}
        <div className={styles.inputButtonWrapper}>
          <button className={`btn text-bg-secondary`} onClick={handleClose}>
            닫기
          </button>
          <button className={`btn text-bg-success`} onClick={handleConfirm}>
            확인
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default RentalProductPopup;
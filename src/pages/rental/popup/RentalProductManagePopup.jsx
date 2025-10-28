// RentalProductManagePopup.jsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import { initialFilters } from '../../../utils/tableEvent';
import { handleDownloadExcel } from '../../../utils/tableExcel';
import TableSearch from '../../../components/table/TableSearch';
import { fetchData } from '../../../utils/dataUtils';
import { errorMsgPopup } from '../../../utils/errorMsgPopup';
import { msgPopup } from '../../../utils/msgPopup';
import CommonPopup from '../../../components/popup/CommonPopup';
import common from '../../../utils/common';
import useStore from '../../../store/store';
import RentalProductAddPopup from './RentalProductAddPopup';
import styles from './RentalProductManagePopup.module.css';
import { createGlobalStyle } from 'styled-components';

const GlobalProductStyles = createGlobalStyle`
  .tabulator-cell.bg-readonly {
    background-color: #eaeaea !important;
  }

  .tabulator-row.edited .tabulator-cell {
    background-color: #fff3cd !important;
  }
`;

const RentalProductManagePopup = ({ show, onHide, data: classData, onSave }) => {
  const { user } = useStore();
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
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

  const classOptions = classData && Array.isArray(classData)
    ? [{ value: 'all', label: '==분류==' }, ...new Map(classData.map(item => [item.DDLCD, { value: item.DDLCD, label: item.DDLNM }])).values()]
    : [{ value: 'all', label: '==분류==' }];

  const loadData = async (classCd = 'all') => {
    setTableStatus("initializing");
    try {
      const params = {
        pGUBUN: 'LIST',
        pCLASSCD: classCd,
        pDEBUG: 'F'
      };
      const response = await fetchData('rental/productInfo/list', params);
      if (!response.success) {
        errorMsgPopup(response.message || '데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }
      const responseData = Array.isArray(response.data) ? response.data : [];
      setData(responseData); // 상태 업데이트
      setTableStatus("ready");
    } catch (err) {
      setTableStatus("error");
      errorMsgPopup('데이터 로드 실패:', err);
      console.error('데이터 로드 실패:', err);
    }
  };

  useEffect(() => {
    if (show) {
      loadData(selectedClassCd);
    }
  }, [show, selectedClassCd]);

  // 공통 cellEdited 핸들러
  const handleCellEdited = (cell) => {
    const field = cell.getField();
    const newVal = cell.getValue();
    const oldVal = cell.getOldValue();
    const row = cell.getRow();
    const rowEl = row.getElement();

    let markEdited = false;

    markEdited = newVal !== oldVal;

    if (markEdited) {
      setTimeout(() => rowEl.classList.add('edited'), 0);
    } else {
      rowEl.classList.remove('edited');
    }
  };

  useEffect(() => {
    if (!show || !tableRef.current) return;

    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!tableRef.current) {
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
            title: "작업",
            field: "actions",
            width: 120,
            formatter: (cell) => {
              const rowData = cell.getData();
              const wrapper = document.createElement("div");
              wrapper.style.display = "flex";
              wrapper.style.justifyContent = "center";
              wrapper.style.alignItems = "center";
              wrapper.style.gap = "8px";

              const editButton = document.createElement("button");
              editButton.className = `btn btn-sm btn-primary`;
              editButton.innerText = "변경";
              editButton.onclick = () => {
                setSelectedRow(rowData);
                setShowEditPopup(true);
              };
              wrapper.appendChild(editButton);

              const deleteButton = document.createElement("button");
              deleteButton.className = `btn btn-sm btn-danger`;
              deleteButton.innerText = "삭제";
              deleteButton.onclick = () => {
                setSelectedRow(rowData);
                setShowDeletePopup(true);
              };
              wrapper.appendChild(deleteButton);
              return wrapper;
            },
            editable: false
          },
          { headerHozAlign: 'center', hozAlign: 'center', title: '순번', field: 'ID', sorter: 'string', width: 80, frozen: true, editable: false },
          { headerHozAlign: 'center', hozAlign: 'center', title: '분류코드', field: 'CLASSCD', sorter: 'string', width: 100, editable: false, cssClass: 'bg-readonly' },
          { headerHozAlign: 'center', hozAlign: 'center', title: '분류명', field: 'CLASSNM', sorter: 'string', width: 120, editor: 'input', editable: true, cellEdited: handleCellEdited },
          { headerHozAlign: 'center', hozAlign: 'center', title: '상품코드', field: 'PRODUCTCD', sorter: 'string', width: 100, editable: false, cssClass: 'bg-readonly' },
          { headerHozAlign: 'center', hozAlign: 'center', title: '상품명', field: 'PRODUCTNM', sorter: 'string', width: 150, editor: 'input', editable: true, cellEdited: handleCellEdited },
          { headerHozAlign: 'center', hozAlign: 'left', title: '모델명', field: 'MODELNM', sorter: 'string', width: 400, editor: 'input', editable: true, cellEdited: handleCellEdited },
          { headerHozAlign: 'center', hozAlign: 'center', title: '상품순서', field: 'PRODUCTODR', sorter: 'number', width: 100, editor: 'number', editable: true, cellEdited: handleCellEdited },
          { headerHozAlign: 'center', hozAlign: 'center', title: '분류순서', field: 'CLASSODR', sorter: 'number', width: 100, editor: 'number', editable: true, cellEdited: handleCellEdited },
          { headerHozAlign: 'center', hozAlign: 'left', title: '비고', field: 'MEMO', sorter: 'string', width: 300, editor: 'input', editable: true, cellEdited: handleCellEdited },
          { headerHozAlign: 'center', hozAlign: 'center', title: '사용여부', field: 'USEYN', sorter: 'string', width: 80, editor: 'list', editorParams: { values: { 'Y': 'Y', 'N': 'N' }, autocomplete: true }, editable: true, cellEdited: handleCellEdited },
        ], data, {
          headerHozAlign: 'center',
          layout: 'fitColumns',
          reactiveData: true,
          index: 'ID',
        });

        setTableStatus("ready");
        setRowCount(data.length);
      } catch (err) {
        setTableStatus("error");
        console.error("Table initialization failed:", err);
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
  }, [show, data]);

  // 필터 적용
  useEffect(() => {
    if (!tableInstance.current || tableStatus !== "ready") return;
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
  }, [filters, tableStatus]);

  // React 상태 → 테이블 동기화 (최초 로드 및 검색 후)
  useEffect(() => {
    if (!tableInstance.current || tableStatus !== "ready") return;
    tableInstance.current.setData(data);
  }, [data, tableStatus]);

  // 저장/삭제 후 리로드
  const refreshData = () => {
    loadData(selectedClassCd);
    if (onSave) onSave();
  };

  const handleEditConfirm = async () => {
    if (!selectedRow) return;

    const validations = [
      { value: selectedRow.PRODUCTNM, maxLength: 150, label: "상품명" },
      { value: selectedRow.MODELNM, maxLength: 500, label: "모델명" },
      { value: selectedRow.CLASSNM, maxLength: 100, label: "분류명" },
      { value: selectedRow.PRODUCTODR, maxLength: 20, label: "상품순서", isNumber: true },
      { value: selectedRow.CLASSODR, maxLength: 20, label: "분류순서", isNumber: true },
      { value: selectedRow.MEMO, maxLength: 500, label: "비고" },
    ];

    for (const validation of validations) {
      if (validation.value !== undefined && validation.value !== null) {
        const valueToCheck = validation.isNumber ? String(validation.value) : validation.value;
        const result = common.validateVarcharLength(valueToCheck, validation.maxLength, validation.label);
        if (!result.valid) {
          errorMsgPopup(result.error);
          setShowEditPopup(false);
          return;
        }
      }
    }

    setShowEditPopup(false);
    try {
      const params = {
        pGUBUN: 'U',
        pPRODUCTCD: selectedRow.PRODUCTCD,
        pPRODUCTNM: selectedRow.PRODUCTNM,
        pMODELNM: selectedRow.MODELNM,
        pCLASSCD: selectedRow.CLASSCD,
        pCLASSNM: selectedRow.CLASSNM,
        pPRODUCTODR: selectedRow.PRODUCTODR,
        pCLASSODR: selectedRow.CLASSODR,
        pMEMO: selectedRow.MEMO,
        pUSEYN: selectedRow.USEYN,
        pEMPNO: user?.empNo || ''
      };
      const response = await fetchData('rental/productInfo/save', params);
      if (!response.success || (response.data[0]?.errCd !== "00")) {
        const errMsg = response.errMsg || response.data[0]?.errMsg || '변경 실패';
        msgPopup(errMsg);
        return;
      }
      msgPopup("변경되었습니다.");
      refreshData();
    } catch (err) {
      errorMsgPopup("변경 중 오류가 발생했습니다.");
    } finally {
      setSelectedRow(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRow) return;
    setShowDeletePopup(false);
    try {
      const params = {
        pGUBUN: 'D',
        pPRODUCTCD: selectedRow.PRODUCTCD,
        pPRODUCTNM: selectedRow.PRODUCTNM,
        pMODELNM: selectedRow.MODELNM,
        pCLASSCD: selectedRow.CLASSCD,
        pCLASSNM: selectedRow.CLASSNM,
        pPRODUCTODR: selectedRow.PRODUCTODR,
        pCLASSODR: selectedRow.CLASSODR,
        pMEMO: selectedRow.MEMO,
        pUSEYN: selectedRow.USEYN,
        pEMPNO: user?.empNo || ''
      };
      const response = await fetchData('rental/productInfo/save', params);
      if (!response.success || (response.data[0]?.errCd !== "00")) {
        const errMsg = response.errMsg || response.data[0]?.errMsg || '삭제 실패';
        msgPopup(errMsg);
        return;
      }
      msgPopup("삭제되었습니다.");
      refreshData();
    } catch (err) {
      errorMsgPopup("삭제 중 오류가 발생했습니다.");
    } finally {
      setSelectedRow(null);
    }
  };

  const handleAdd = () => setShowAddPopup(true);
  const handleAddSave = () => refreshData();

  const onDownloadExcel = () => {
    handleDownloadExcel(tableInstance.current, tableStatus, "상품관리목록.xlsx");
  };

  const handleClose = () => {
    onHide();
    setSelectedClassCd('all');
  };

  return (
    <Modal show={show} onHide={handleClose} centered dialogClassName={styles.customModal}>
      <GlobalProductStyles />
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
        >
          <div className='btnGroupCustom'>
            <button className={`btn text-bg-success ${styles.btn}`} onClick={handleAdd}>추가</button>
          </div>
        </TableSearch>
        <div ref={tableRef} className={styles.tableSection} style={{ height: '400px', visibility: tableStatus !== "ready" ? "hidden" : "visible" }} />
        {tableStatus === "initializing" && <div>초기화 중...</div>}
        <div className={styles.inputButtonWrapper}>
          <button className={`btn text-bg-secondary`} onClick={handleClose}>닫기</button>
        </div>

        <CommonPopup show={showEditPopup} onHide={() => { setShowEditPopup(false); setSelectedRow(null); }} onConfirm={handleEditConfirm} title="변경 확인">
          <p className='commonInnerTxt'>{selectedRow?.PRODUCTNM ? `${selectedRow.PRODUCTNM} 변경하시겠습니까?` : "변경하시겠습니까?"}</p>
        </CommonPopup>
        <CommonPopup show={showDeletePopup} onHide={() => { setShowDeletePopup(false); setSelectedRow(null); }} onConfirm={handleDeleteConfirm} title="삭제 확인">
          <p className='commonInnerTxt'>{selectedRow?.PRODUCTNM ? `${selectedRow.PRODUCTNM} 삭제하시겠습니까?` : "삭제하시겠습니까?"}</p>
        </CommonPopup>
        <RentalProductAddPopup show={showAddPopup} onHide={() => setShowAddPopup(false)} onSave={handleAddSave} />
      </Modal.Body>
    </Modal>
  );
};

export default RentalProductManagePopup;
import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-bootstrap/Modal';
import { createTable } from '../../../utils/tableConfig';
import { initialFilters } from '../../../utils/tableEvent';
import { handleDownloadExcel } from '../../../utils/tableExcel';
import TableSearch from '../../../components/table/TableSearch';
import styles from './StandardClassSelectPopup.module.css';

const StandardClassSelectPopup = ({ show, onHide, onSelect, data }) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [_selectedRow, setSelectedRow] = useState(null);
  const [filters, setFilters] = useState(initialFilters([
    { id: "filterSelect2", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "CLASSANM", label: "대분류" }, { value: "CLASSBNM", label: "중분류" }, { value: "CLASSCNM", label: "소분류" }] },
    { id: "filterText2", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
  ]));
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);

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
          { title: '대분류', field: 'CLASSANM', hozAlign: 'left', width: 150 },
          { title: '중분류', field: 'CLASSBNM', hozAlign: 'left', width: 150 },
          { title: '소분류', field: 'CLASSCNM', hozAlign: 'left' },
        ], data, {
          layout: 'fitColumns',
          groupBy: ['CLASSACD', 'CLASSBCD'],
          groupStartOpen: true,
          groupToggleElement: 'header',
          groupHeader: (value, count, data, groupComponent) => {
            if (groupComponent.getField() === 'CLASSACD') {
              return `${data[0].CLASSANM} (${count} items)`;
            } else {
              return `${data[0].CLASSBNM} (${count} items)`;
            }
          },
          pagination: false,
        });
        if (!tableInstance.current) throw new Error("createTable returned undefined or null");
        tableInstance.current.on('rowClick', (e, row) => {
          if (row.getData().CLASSCNM) { // 소분류 행만 클릭 가능
            const rowData = row.getData();
            setSelectedRow(rowData);
            if (onSelect && typeof onSelect === 'function') {
              onSelect({
                major: rowData.CLASSACD || '',
                middle: rowData.CLASSBCD || '',
                minor: rowData.CLASSCCD || '',
              });
            }
            if (onHide && typeof onHide === 'function') {
              onHide();
            }
          }
        });
        setTableStatus("ready");
        setRowCount(tableInstance.current.getDataCount());
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
  }, [show, data, onHide, onSelect]);

  useEffect(() => {
    if (tableInstance.current && tableStatus === "ready" && data.length > 0) {
      const timer = setTimeout(() => {
        if (tableInstance.current) {
          tableInstance.current.setData(data);
          setRowCount(tableInstance.current.getDataCount());
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data, tableStatus]);

  useEffect(() => {
    if (!tableInstance.current || tableStatus !== "ready") return;
    const { filterSelect2, filterText2 } = filters;
    try {
      if (filterText2 && filterSelect2) {
        tableInstance.current.setFilter(filterSelect2, "like", filterText2);
      } else if (filterText2) {
        tableInstance.current.setFilter([
          { field: "CLASSANM", type: "like", value: filterText2 },
          { field: "CLASSBNM", type: "like", value: filterText2 },
          { field: "CLASSCNM", type: "like", value: filterText2 },
        ], "or");
      } else {
        tableInstance.current.clearFilter();
      }
      setRowCount(tableInstance.current.getDataCount());
    } catch (err) {
      console.error('필터 적용 실패:', err);
    }
  }, [filters, tableStatus]);

  const onDownloadExcel = () => {
    handleDownloadExcel(tableInstance.current, tableStatus, "분류목록.xlsx");
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>업무구분 선택</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} modal-body`}>
        <TableSearch
          filterFields={[
            { id: "filterSelect2", label: "", type: "select", options: [{ value: "", label: "선택" }, { value: "CLASSANM", label: "대분류" }, { value: "CLASSBNM", label: "중분류" }, { value: "CLASSCNM", label: "소분류" }] },
            { id: "filterText2", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" },
          ]}
          filters={filters}
          setFilters={setFilters}
          rowCount={rowCount}
          onDownloadExcel={onDownloadExcel}
          buttonStyles={styles}
        />
        <div ref={tableRef} className={styles.tableSection} style={{ height: '300px', visibility: tableStatus !== "ready" ? "hidden" : "visible" }} />
        {tableStatus === "initializing" && <div>초기화 중...</div>}
      </Modal.Body>
    </Modal>
  );
};

export default StandardClassSelectPopup;
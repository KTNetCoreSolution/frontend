import { useState, useEffect, useRef } from "react";
import MainSearch from '../../components/main/MainSearch';
import { fetchData } from "../../utils/dataUtils";
import { createTable } from "../../utils/tableConfig";
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import Modal from 'react-bootstrap/Modal';
import styled from 'styled-components';
import styles from "./CarListPopup.module.css";
import { is } from "date-fns/locale";

const TableWrapper = styled.div``;

const getFieldOptions = () => [
  { value: "CARNO", label: "차량번호" }, { value: "CARDNO", label: "카드번호" }, 
];

const CarListPopup = ({ show, onHide, onConfirm, checkCardNo}) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [filters, setFilters] = useState({ searchField: "CARNO", searchText: "" });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [hasSearched, setHasSearched] = useState(false);

  const searchConfig = {
    areas: [
      { type: "search", fields: [
        { id: "searchField", type: "select", row: 1, label: "구분", labelVisible: true, options: getFieldOptions(), enabled: true },
        { id: "searchText", type: "text", row: 1, label: "", labelVisible: false, placeholder: "검색값을 입력하세요", maxLength: 100, width: "200px", enabled: true },
      ]},
      { type: "buttons", fields: [
        { id: "searchBtn", type: "button", row: 1, label: "검색", eventType: "search", enabled: true },
      ]},
    ],
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
          { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업", field: "select", width: 80, formatter: (cell) => {
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
          }},
          { headerHozAlign: "center", hozAlign: "center", title: "순번", field: "seq", sorter: "number", width: 60, editable: false, formatter: (cell) => cell.getRow().getData().seq },
          { headerHozAlign: "center", hozAlign: "center", title: "차량번호", field: "CARNO", sorter: "string", width: 90 },
          { headerHozAlign: "center", hozAlign: "center", title: "차대번호", field: "CARID", sorter: "string", width: 140 },
          { headerHozAlign: "center", hozAlign: "center", title: "카드번호", field: "CARDNO", sorter: "string", width: 200 },
          { headerHozAlign: "center", hozAlign: "center", title: "유효기간", field: "EXFIREDT", sorter: "string", width: 80 },
        ], [], { height: '360px', headerHozAlign: "center", headerFilter: true, layout: 'fitColumns', index: "seq" });
        if (!tableInstance.current) throw new Error("createTable returned undefined or null");

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

        setTableStatus("ready");
      } catch (err) {
        setTableStatus("error");
        console.error("Table initialization failed:", err.message);
      }
    };

    if (show) {
      initializeTable();
    }

    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus("initializing");
      }
    };
  }, [show]);

  useEffect(() => {
    if (tableInstance.current && tableStatus === "ready" && !loading) {
      tableInstance.current.setData(data);
      if (hasSearched && data.length === 0) {
        tableInstance.current.alert("검색 결과 없음", "info");
      } else {
        tableInstance.current.clearAlert();
      }
    }
  }, [data, tableStatus, loading, hasSearched]);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);

  try {
      const params = {pGUBUN: filters.searchField || "", pSEARCH: filters.searchText || "", pDEBUG: "F"};

      const response = await fetchData("fuelcard/carList", params);

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
      const dataWithSeq = responseData.map((item, index) => ({
        ...item,
        seq: index + 1,
        select: "N",
      }));
      setData(dataWithSeq);
    } catch (err) {
      errorMsgPopup(err.response?.data?.message || "데이터를 가져오는 중 오류가 발생했습니다.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicEvent = (eventType) => {
    if (eventType === "search") handleSearch();
  };

  const handleClose = () => {
    if (tableInstance.current) {
      tableInstance.current.destroy();
      tableInstance.current = null;
      setTableStatus("initializing");
    }
    if (onHide) onHide();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      const selectedData = data.find((row) => row.select === "Y") || null;
      let isConfirmed = false;
      
      if(selectedData.CARDNO === "" || checkCardNo === selectedData.CARDNO) {
        isConfirmed = true;
      }
      else {
        if(confirm("다른 카드가 등록된 차량입니다. 그래도 확인하시겠습니까?")) {
          isConfirmed = true;
        }
      }
      
      if(isConfirmed) { 
        onConfirm(selectedData ? [selectedData] : []);
        handleClose();
      }
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>차량 선택</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} modal-body`}>
        <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
        <TableWrapper>
          {tableStatus === "initializing" && <div className={styles.loading}>초기화 중...</div>}
          {loading && <div className={styles.loading}>로딩 중...</div>}
          <div
            ref={tableRef}
            className={styles.tableSection}
            style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }}
          />
        </TableWrapper>
      </Modal.Body>
      <Modal.Footer>
        <button className='btn btn-secondary' onClick={handleClose}>닫기</button>
        <button className='btn btn-primary' onClick={handleConfirm}>확인</button>
      </Modal.Footer>
    </Modal>
  );
};

export default CarListPopup;
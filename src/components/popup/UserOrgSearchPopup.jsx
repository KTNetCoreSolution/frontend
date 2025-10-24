import React, { useState, useEffect, useRef } from "react";
import Modal from 'react-bootstrap/Modal';
import MainSearch from "../main/MainSearch";
import { fetchData } from "../../utils/dataUtils";
import { handleDownloadExcel } from '../../utils/tableExcel';
import { createTable } from "../../utils/tableConfig";
import { initialFilters } from '../../utils/tableEvent';
import TableSearch from '../../components/table/TableSearch';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styled from 'styled-components';
import styles from "./UserOrgSearchPopup.module.css";

const TableWrapper = styled.div``;

const getFieldOptions = () => [
  { value: "ORG", label: "조직명" }, { value: "EMP", label: "이름" },
];

const UserOrgSearchPopup = ({ show, onHide, onSave }) => {
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [filters, setFilters] = useState({ searchField: "ORG", searchText: "" });
  const [tableFilters, setTableFilters] = useState(initialFilters([
    { id: "filterSelect", label: "", type: "select", options: [
      { value: "", label: "선택" },
      { value: "SECTIONNM", label: "업무분야" },
      { value: "EMPNO", label: "사원번호" },
      { value: "EMPNM", label: "이름" },
      { value: "ORGNM", label: "조직" }
    ] },
    { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" }
  ]));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [rowCount, setRowCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const searchConfig = {
    areas: [
      { type: "search", fields: [
        { id: "searchField", type: "select", row: 1, label: "구분", labelVisible: true, options: getFieldOptions(), width: "80px", height: "30px", backgroundColor: "#ffffff", color: "#000000", enabled: true },
        { id: "searchText", type: "text", row: 1, label: "", labelVisible: false, placeholder: "검색값을 입력하세요", maxLength: 100, width: "200px", height: "30px", backgroundColor: "#ffffff", color: "#000000", enabled: true },
      ]},
      { type: "buttons", fields: [
        { id: "searchBtn", type: "button", row: 1, label: "검색", eventType: "search", width: "80px", height: "30px", backgroundColor: "#00c4b4", color: "#ffffff", enabled: true },
      ]},
    ],
  };

  useEffect(() => {
    if (!show) return;

    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        setTableStatus("error");
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
          }, editable: false },
          { headerHozAlign: "center", hozAlign: "center", title: "순번", field: "seq", sorter: "number", width: 60, formatter: (cell) => cell.getRow().getData().seq },
          { headerHozAlign: "center", hozAlign: "center", title: "사원번호", field: "EMPNO", sorter: "string", width: 80 },
          { headerHozAlign: "center", hozAlign: "center", title: "이름", field: "EMPNM", sorter: "string", width: 140 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직코드", field: "ORGCD", sorter: "string", width: 80 },
          { headerHozAlign: "center", hozAlign: "left", title: "조직", field: "ORGNM", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "업무분야코드", field: "SECTIONCD", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "업무분야", field: "SECTIONNM", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직1코드", field: "ORGCD1", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직1", field: "ORGNM1", sorter: "string", width: 130 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직2코드", field: "ORGCD2", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직2", field: "ORGNM2", sorter: "string", width: 130 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직3코드", field: "ORGCD3", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직3", field: "ORGNM3", sorter: "string", width: 130 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직4코드", field: "ORGCD4", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직4", field: "ORGNM4", sorter: "string", width: 130 },
        ], [], { height: '400px', headerHozAlign: "center", headerFilter: true, layout: 'fitColumns', index: "seq" });
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
    initializeTable();
    return () => {
      if (tableInstance.current) {
        tableInstance.current.destroy();
        tableInstance.current = null;
        setTableStatus("initializing");
        setRowCount(0);
      }
    };
  }, [show]);

  useEffect(() => {
    if (tableInstance.current && tableStatus === "ready" && !loading) {
      tableInstance.current.setData(data);
      setRowCount(data.length);
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
      const params = { pGUBUN: filters.searchField || "", pSEARCH: filters.searchText || "", pDEBUG: "F" };

      const response = await fetchData("common/userinfo/orgList", params);

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

  useEffect(() => {
    if (!tableInstance.current || tableStatus !== "ready") return;
    const { filterSelect, filterText } = tableFilters;
    try {
      if (filterText && filterSelect) {
        tableInstance.current.setFilter(filterSelect, "like", filterText);
      } else if (filterText) {
        tableInstance.current.setFilter([
          { field: "SECTIONNM", type: "like", value: filterText },
          { field: "EMPNO", type: "like", value: filterText },
          { field: "EMPNM", type: "like", value: filterText },
          { field: "ORGNM", type: "like", value: filterText }
        ], "or");
      } else {
        tableInstance.current.clearFilter();
      }
      setRowCount(tableInstance.current.getDataCount());
    } catch (err) {
      console.error('필터 적용 실패:', err);
    }
  }, [tableFilters, tableStatus]);

  const handleDynamicEvent = (eventType) => {
    if (eventType === "search") handleSearch();
  };

  const handleConfirm = () => {
    if (onSave) {
      const selectedData = data.find((row) => row.select === "Y") || null;
      onSave(selectedData ? [selectedData] : []);
    }
    onHide();
  };

  const onDownloadExcel = () => {
    handleDownloadExcel(tableInstance.current, tableStatus, "사용자조직정보.xlsx");
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.customModal}>
      <Modal.Header closeButton>
        <Modal.Title>사용자조직 검색</Modal.Title>
      </Modal.Header>
      <Modal.Body className={`${styles.modalBody} modal-body`}>
        <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
        <TableSearch
          filterFields={[
            { id: "filterSelect", label: "", type: "select", options: [
              { value: "", label: "선택" },
              { value: "SECTIONNM", label: "업무분야" },
              { value: "EMPNO", label: "사원번호" },
              { value: "EMPNM", label: "이름" },
              { value: "ORGNM", label: "조직" }
            ] },
            { id: "filterText", label: "", type: "text", placeholder: "검색값을 입력하세요", width: "200px" }
          ]}
          filters={tableFilters}
          setFilters={setTableFilters}
          rowCount={rowCount}
          onDownloadExcel={onDownloadExcel}
          buttonStyles={styles}
        />
        <TableWrapper>
          {tableStatus === "initializing" && <div>초기화 중...</div>}
          {loading && <div>로딩 중...</div>}
          {tableStatus === "error" && <div>데이터 로드 실패</div>}
          <div
            ref={tableRef}
            className={styles.tableSection}
            style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible", height: '400px' }}
          />
        </TableWrapper>
        <div className={styles.inputButtonWrapper}>
        <button className={`btn text-bg-secondary`} onClick={onHide}>
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

export default UserOrgSearchPopup;
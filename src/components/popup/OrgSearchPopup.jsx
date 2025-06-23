import React, { useState, useEffect, useRef } from "react";
import MainSearch from "../main/MainSearch";
import { createTable } from '../../utils/tableConfig';
import { errorMsgPopup } from '../../utils/errorMsgPopup';
import styled from 'styled-components';
import styles from "./OrgSearchPopup.module.css";
import useStore from '../../store/store';
import { fetchData } from '../../utils/dataUtils';
import { updateChildrenRecursive } from '../../utils/tableUtils';
import { convertOrgInfoToHierarchy } from '../../utils/hierarchyJsonUtils';

const TableWrapper = styled.div`
  .tabulator-header .tabulator-col {
    min-height: 20px;
    line-height: 12px;
  }

  .tabulator-row {
    line-height: 12px;
  }
`;

const getMonthOptions = () => {
  const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  return [{ value: currentMonth, label: currentMonth, disabled: true }];
};

const OrgSearchPopup = ({ onClose, onConfirm }) => {
  const { user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);
  const [filters, setFilters] = useState({ searchField: "EMPNO", mdate: new Date().toISOString().slice(0, 7).replace('-', ''), searchText: "" });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [hasSearched, setHasSearched] = useState(false);

  const searchConfig = {
    areas: [
      { type: "search", fields: [
        { id: "mdate", type: "select", row: 1, label: "월", labelVisible: true, options: getMonthOptions(), width: "100px", height: "30px", backgroundColor: "#ffffff", color: "#000000", enabled: true },
      ]},
      { type: "buttons", fields: [
        { id: "searchBtn", type: "button", row: 1, label: "검색", eventType: "search", width: "80px", height: "30px", backgroundColor: "#00c4b4", color: "#ffffff", enabled: true },
      ]},
    ],
  };

  useEffect(() => {
    setIsOpen(true);
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!tableRef.current) {
        console.warn("테이블 컨테이너가 준비되지 않았습니다.");
        return;
      }
      try {
        tableInstance.current = createTable(tableRef.current, [
        { headerHozAlign: "center", hozAlign: "left", title: "조직명", field: "ORGNM", sorter: "string", width: 200, frozen: true, responsive:0},
        { frozen: true, headerHozAlign: "center", hozAlign: "center", title: "작업", field: "select", width: 80, 
          formatter: (cell) => {
            const rowData = cell.getRow().getData();
            const seqKey = "seq";  // 노드 식별자
            const selectKey = "select";  // 업데이트할 필드
            const targetSeq = rowData[seqKey]; // 클릭된 row의 seq 값
            const div = document.createElement("div");
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.justifyContent = "center";
            div.style.gap = "5px";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = rowData.select === "Y";
            checkbox.onclick = (e) => {
              e.stopPropagation();
              const currentPage = tableInstance.current.getPage(); // 현재 페이지 번호 저장
              const allRows = tableInstance.current.getData(); // 테이블 전체 데이터 가져오기

              // "select" 상태 초기화 (모두 "N")
              const updatedTreeData = allRows.map(row =>
                  updateChildrenRecursive([row], seqKey, null, selectKey, "N")[0]
              ).map(row =>
                  updateChildrenRecursive([row], seqKey, targetSeq, selectKey, "Y")[0]
              );
              
              tableInstance.current.setData(updatedTreeData); // 데이터를 새로 설정
              tableInstance.current.setPage(currentPage); // 이전 페이지로 이동
            };
            const span = document.createElement("span");
            span.innerText = "선택";
            span.style.cursor = "pointer";
            span.onclick = (e) => {
              e.stopPropagation();
              const currentPage = tableInstance.current.getPage(); // 현재 페이지 번호 저장
              const allRows = tableInstance.current.getData(); // 테이블 전체 데이터 가져오기

              // "select" 상태 초기화 (모두 "N")
              const updatedTreeData = allRows.map(row =>
                  updateChildrenRecursive([row], seqKey, null, selectKey, "N")[0]
              ).map(row =>
                  updateChildrenRecursive([row], seqKey, targetSeq, selectKey, "Y")[0]
              );
              
              tableInstance.current.setData(updatedTreeData); // 데이터를 새로 설정
              tableInstance.current.setPage(currentPage); // 이전 페이지로 이동
            };
            div.appendChild(checkbox);
            div.appendChild(span);
            return div;
          }
        },
        { headerHozAlign: "center", hozAlign: "center", title: "순번", field: "seq", sorter: "number", width: 60, editable: false, formatter: (cell) => cell.getRow().getData().seq },
        { headerHozAlign: "center", hozAlign: "center", title: "조직코드", field: "ORGCD", sorter: "string", width: 100 },
        { headerHozAlign: "center", hozAlign: "center", title: "상위조직코드", field: "UPPERORGCD", sorter: "string", width: 120},
        { headerHozAlign: "center", hozAlign: "center", title: "조직레벨", field: "ORGLEVEL", sorter: "number", width: 80, responsive:4 },
        { headerHozAlign: "center", hozAlign: "center", title: "월", field: "MDATE", sorter: "string", width: 80, visible:false },
        { headerHozAlign: "center", hozAlign: "center", title: "사원번호", field: "EMPNO", sorter: "string", width: 100, visible:false },
        { headerHozAlign: "center", hozAlign: "center", title: "이름", field: "EMPNM", sorter: "string", width: 80, visible:false },
        { headerHozAlign: "center", hozAlign: "center", title: "소속조직코드", field: "OWN_ORGCD", sorter: "string", width: 120, visible:false },
        { headerHozAlign: "center", hozAlign: "left", title: "소속조직", field: "OWN_ORGNM", sorter: "string", width: 120, visible:false },
      ], [], { 
        height: '40vh', headerHozAlign: "center", headerFilter: true, layout: 'fitColumns', index: "seq", 
        dataTree: true,
        dataTreeStartExpanded: true,
        movableRows: false
      });
      if (!tableInstance.current) throw new Error("createTable returned undefined or null");

      // rowClick 이벤트 생성
      tableInstance.current.on("rowClick", async (e, row) => {
          try {
                const rowData = row.getData(); // 클릭된 row의 데이터 가져오기
                const seqKey = "seq";            // Primary Key (index)
                const selectKey = "select";     // 업데이트 대상 필드
                const targetSeq = rowData[seqKey]; // 클릭된 row의 seq 값
                const currentPage = await tableInstance.current.getPage(); // 현재 페이지 번호 저장
                const allRows = tableInstance.current.getData(); // 전체 데이터 가져오기

                // "select" 상태 초기화 (모두 "N")
                const updatedTreeData = allRows.map(row =>
                    updateChildrenRecursive([row], seqKey, null, selectKey, "N")[0]
                ).map(row =>
                    updateChildrenRecursive([row], seqKey, targetSeq, selectKey, "Y")[0]
                );
                
                await tableInstance.current.setData(updatedTreeData); // 데이터를 새로 설정
                await setData(updatedTreeData); // React 상태 동기화
                await tableInstance.current.setPage(currentPage); // 이전 페이지로 이동
          } catch (error) {
              console.error("Error occurred while updating rowData on rowClick:", error);
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
      }
    };
  }, []);

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
        const params = {
          pGUBUN: filters.searchField || "EMPNO",
          pMDATE: filters.mdate || "",
          pSEARCH: user?.empNo || "",
          pDEBUG: "F"
        };

        const response = await fetchData("common/orginfo/list", params);
  
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
        const hierarchicalData = convertOrgInfoToHierarchy(responseData);
        let seqCounter = 1;
        const assignSeq = (nodes) => {
          return nodes.map((item) => {
            const newItem = { ...item, seq: seqCounter++, select: "N" };
            if (item._children && Array.isArray(item._children)) {
              newItem._children = assignSeq(item._children);
            }
            return newItem;
          });
        };

        const dataWithSeq = assignSeq(hierarchicalData);

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
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      // 계층적 데이터에서 select === "Y"인 모든 행을 재귀적으로 수집
      const collectSelected = (nodes) => {
        let selected = [];
        nodes.forEach((node) => {
          if (node.select === "Y") {
            selected.push(node);
          }
          if (node._children && Array.isArray(node._children)) {
            selected = [...selected, ...collectSelected(node._children)];
          }
        });
        return selected;
      };

      const selectedData = collectSelected(data);
      onConfirm(selectedData); // 선택된 데이터 전달
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popupContainer}>
        <div className={styles.header}>
          <h3>조직 검색</h3>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        <div className={styles.searchSection}>
          <MainSearch config={searchConfig} filters={filters} setFilters={setFilters} onEvent={handleDynamicEvent} />
        </div>
        <TableWrapper>
          {tableStatus === "initializing" && <div className={styles.loading}>초기화 중...</div>}
          {loading && <div className={styles.loading}>로딩 중...</div>}
          <div
            ref={tableRef}
            className={styles.tableSection}
            style={{ visibility: loading || tableStatus !== "ready" ? "hidden" : "visible" }}
          />
        </TableWrapper>
        <div className={styles.buttonContainer}>
          <button className={`${styles.btn} ${styles.btnSecondary} btn btn-secondary`} onClick={handleClose}>
            닫기
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary} btn text-bg-success`} onClick={handleConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrgSearchPopup;
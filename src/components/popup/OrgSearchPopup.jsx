import React, { useState, useEffect, useRef } from "react";
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

const OrgSearchPopup = ({ onClose, onConfirm }) => {
  const { user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const tableRef = useRef(null);
  const tableInstance = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState("initializing");
  const [_rowCount, setRowCount] = useState(0);

  useEffect(() => {
    setIsOpen(true);
    const initializeTable = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!tableRef.current) return;

      try {
        tableInstance.current = createTable(tableRef.current, [
          { headerHozAlign: "center", hozAlign: "left", title: "조직명", field: "ORGNM", sorter: "string", width: 200, frozen: true },
          {
            frozen: true,
            headerHozAlign: "center",
            hozAlign: "center",
            title: "작업",
            field: "select",
            width: 80,
            formatter: (cell) => {
              const rowData = cell.getRow().getData();
              const seqKey = "seq";
              const selectKey = "select";
              const targetSeq = rowData[seqKey];
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
                const currentPage = tableInstance.current.getPage();
                const allRows = tableInstance.current.getData();
                const updatedTreeData = allRows
                  .map((row) => updateChildrenRecursive([row], seqKey, null, selectKey, "N")[0])
                  .map((row) => updateChildrenRecursive([row], seqKey, targetSeq, selectKey, "Y")[0]);
                tableInstance.current.setData(updatedTreeData);
                setData(updatedTreeData);
                tableInstance.current.setPage(currentPage);
              };
              const span = document.createElement("span");
              span.innerText = "선택";
              span.style.cursor = "pointer";
              span.onclick = checkbox.onclick;
              div.appendChild(checkbox);
              div.appendChild(span);
              return div;
            },
          },
          { headerHozAlign: "center", hozAlign: "center", title: "순번", field: "seq", sorter: "number", width: 60 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직코드", field: "ORGCD", sorter: "string", width: 100 },
          { headerHozAlign: "center", hozAlign: "center", title: "상위조직코드", field: "UPPERORGCD", sorter: "string", width: 120 },
          { headerHozAlign: "center", hozAlign: "center", title: "조직레벨", field: "ORGLEVEL", sorter: "number", width: 80 },
        ], [], {
          height: '420px',
          headerHozAlign: "center",
          layout: 'fitColumns',
          index: "seq",
          dataTree: true,
          dataTreeStartExpanded: (row, level) => {
            return level <= 0; // 레벨 0(1레벨)만 펼침
          },
          movableRows: false,
          pagination: false,
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
    if (tableStatus === "ready" && !loading) {
      const loadData = async () => {
        setLoading(true);
        try {
          const params = {
            pGUBUN: "EMPNO",
            pMDATE: new Date().toISOString().slice(0, 7).replace("-", ""),
            pSEARCH: user?.empNo || "",
            pDEBUG: "F",
          };

          const response = await fetchData("common/orginfo/list", params);

          if (!response.success || response.errMsg) {
            errorMsgPopup(response.message || "데이터를 가져오는 중 오류가 발생했습니다.");
            setData([]);
            return;
          }

          const responseData = Array.isArray(response.data) ? response.data : [];
          const hierarchicalData = convertOrgInfoToHierarchy(responseData);

          let seqCounter = 1;
          const assignSeq = (nodes) =>
            nodes.map((item) => {
              const newItem = { ...item, seq: seqCounter++, select: "N" };
              if (item._children) {
                newItem._children = assignSeq(item._children);
              }
              return newItem;
            });

          const finalData = assignSeq(hierarchicalData);
          setData(finalData);
        } catch {
          errorMsgPopup("데이터를 가져오는 중 오류가 발생했습니다.");
          setData([]);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [tableStatus, user?.empNo]);

  useEffect(() => {
    if (tableInstance.current && tableStatus === "ready" && !loading) {
      tableInstance.current.setData(data);
      setRowCount(tableInstance.current.getDataCount() || 0);
      if (data.length === 0) {
        tableInstance.current.alert("데이터가 없습니다.", "info");
      } else {
        tableInstance.current.clearAlert();
      }
    }
  }, [data, tableStatus, loading]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      const collectSelected = (nodes) => {
        let selected = [];
        nodes.forEach((node) => {
          if (node.select === "Y") selected.push(node);
          if (node._children) selected = [...selected, ...collectSelected(node._children)];
        });
        return selected;
      };
      onConfirm(collectSelected(data));
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popupContainer}>
        <div className={styles.header}>
          <h3>조직</h3>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <TableWrapper className={styles.tableWrapper}>
          {tableStatus === "initializing" && <div className={styles.loading}>초기화 중...</div>}
          {loading && <div className={styles.loading}>로딩 중...</div>}
          <div ref={tableRef} className={styles.tableSection} />
        </TableWrapper>

        <div className={styles.buttonContainer}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleClose}>닫기</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleConfirm}>확인</button>
        </div>
      </div>
    </div>
  );
};

export default OrgSearchPopup;